-- ============================================================
-- PARTSHOP SCHEMA — run once in Supabase SQL editor
-- ============================================================
create extension if not exists "pgcrypto";

-- ---------- PROFILES (extends auth.users for shop customers) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  secret_question text not null,
  secret_answer_hash text not null,
  status text not null default 'active' check (status in ('active','reset_requested')),
  created_at timestamptz not null default now()
);

-- ---------- ADMINS (separate role table, still backed by auth.users) ----------
create table public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending','approved')),
  created_at timestamptz not null default now()
);

-- ---------- CATALOG ----------
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  logo_url text,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  image_url text,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  stock integer not null default 0,
  image_url text,
  category_id uuid references public.categories(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  created_at timestamptz not null default now()
);
create index products_search_idx on public.products using gin (to_tsvector('english', name || ' ' || coalesce(description,'')));

-- ---------- CART ----------
create table public.cart_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  qty integer not null default 1 check (qty > 0),
  primary key (user_id, product_id)
);

-- ---------- ORDERS ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'placed' check (status in ('placed','dispatched','delivered')),
  total numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.order_items (
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete set null,
  qty integer not null,
  price numeric(10,2) not null,
  primary key (order_id, product_id)
);

-- ---------- PASSWORD RESET REQUESTS (admin-mediated) ----------
create table public.reset_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','completed')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- HELPER: is the current user an approved admin?
-- ============================================================
create or replace function public.is_approved_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.admins where id = auth.uid() and status = 'approved'
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reset_requests enable row level security;

-- Profiles: user reads/updates own row; admins read/update all
create policy "profile_self_select" on public.profiles for select using (auth.uid() = id or public.is_approved_admin());
create policy "profile_self_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profile_self_update" on public.profiles for update using (auth.uid() = id or public.is_approved_admin());

-- Admins: self can read own row (to check pending/approved); approved admins can read/update all (approve others)
create policy "admin_self_select" on public.admins for select using (auth.uid() = id or public.is_approved_admin());
create policy "admin_self_insert" on public.admins for insert with check (auth.uid() = id);
create policy "admin_approve_update" on public.admins for update using (public.is_approved_admin());

-- Catalog: public read, admin write
create policy "brands_public_read" on public.brands for select using (true);
create policy "brands_admin_write" on public.brands for insert with check (public.is_approved_admin());
create policy "brands_admin_update" on public.brands for update using (public.is_approved_admin());
create policy "brands_admin_delete" on public.brands for delete using (public.is_approved_admin());

create policy "categories_public_read" on public.categories for select using (true);
create policy "categories_admin_write" on public.categories for insert with check (public.is_approved_admin());
create policy "categories_admin_update" on public.categories for update using (public.is_approved_admin());
create policy "categories_admin_delete" on public.categories for delete using (public.is_approved_admin());

create policy "products_public_read" on public.products for select using (true);
create policy "products_admin_write" on public.products for insert with check (public.is_approved_admin());
create policy "products_admin_update" on public.products for update using (public.is_approved_admin());
create policy "products_admin_delete" on public.products for delete using (public.is_approved_admin());

-- Cart: user owns their own cart only
create policy "cart_owner_all" on public.cart_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Orders: user reads/creates own; admin reads/updates all (dispatch)
create policy "orders_owner_select" on public.orders for select using (auth.uid() = user_id or public.is_approved_admin());
create policy "orders_owner_insert" on public.orders for insert with check (auth.uid() = user_id);
create policy "orders_admin_update" on public.orders for update using (public.is_approved_admin());

create policy "order_items_visible" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_approved_admin()))
);
create policy "order_items_insert" on public.order_items for insert with check (
  exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);

-- Reset requests: user creates own; admin reads/updates all
create policy "reset_owner_insert" on public.reset_requests for insert with check (auth.uid() = user_id);
create policy "reset_owner_select" on public.reset_requests for select using (auth.uid() = user_id or public.is_approved_admin());
create policy "reset_admin_update" on public.reset_requests for update using (public.is_approved_admin());

-- ============================================================
-- SECRET-QUESTION RESET RPCs (security definer — bypass RLS safely,
-- only returning/mutating the minimum needed, never leaking other data)
-- ============================================================

-- Step 1: look up the secret question by email (no auth required)
create or replace function public.get_secret_question(p_email text)
returns table(user_id uuid, question text) language sql security definer as $$
  select p.id, p.secret_question
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(u.email) = lower(p_email)
  limit 1;
$$;

-- Step 2: verify the hashed answer and set a new password
create or replace function public.reset_password_with_secret(p_user_id uuid, p_answer_hash text, p_new_password text)
returns boolean language plpgsql security definer as $$
declare match boolean;
begin
  select (secret_answer_hash = p_answer_hash) into match from public.profiles where id = p_user_id;
  if not match then
    return false;
  end if;
  -- pgcrypto's bcrypt matches Supabase Auth's own password hashing scheme
  update auth.users set encrypted_password = crypt(p_new_password, gen_salt('bf')) where id = p_user_id;
  update public.profiles set status = 'active' where id = p_user_id;
  return true;
end;
$$;

-- Alternate path: flag the account for an admin to reset manually
create or replace function public.request_admin_reset(p_email text)
returns boolean language plpgsql security definer as $$
declare uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then return false; end if;
  update public.profiles set status = 'reset_requested' where id = uid;
  insert into public.reset_requests (user_id) values (uid);
  return true;
end;
$$;

-- ============================================================
-- STORAGE (product/category/brand images)
-- ============================================================
insert into storage.buckets (id, name, public) values ('images','images', true)
on conflict (id) do nothing;

create policy "images_public_read" on storage.objects for select using (bucket_id = 'images');
create policy "images_admin_write" on storage.objects for insert with check (bucket_id = 'images' and public.is_approved_admin());
create policy "images_admin_update" on storage.objects for update using (bucket_id = 'images' and public.is_approved_admin());
create policy "images_admin_delete" on storage.objects for delete using (bucket_id = 'images' and public.is_approved_admin());

-- ============================================================
-- NOTE: the very first admin must be approved manually once, e.g.:
--   update public.admins set status = 'approved' where email = 'you@example.com';
-- ============================================================
