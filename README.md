# PartShop

Full-stack mobile-parts e-commerce app: live search, category/brand catalog, cart & checkout,
order dispatch tracking, and a separate approval-gated admin panel — built on Next.js 14 + Supabase.

## 1. Supabase setup

1. Create a project at supabase.com.
2. Open **SQL Editor** → paste the entire contents of `schema.sql` → run it.
   This creates all tables, RLS policies, the `images` storage bucket, and the
   password-reset RPCs.
3. In **Authentication → Providers → Email**, turn off "Confirm email" for a
   frictionless demo (or leave it on and just confirm via the email link).
4. Copy your Project URL, anon key, and service_role key into `.env.local`
   (see `.env.example`).

## 2. First admin

Sign up once at `/admin/signup`, then approve yourself directly in SQL Editor:

```sql
update public.admins set status = 'approved' where email = 'you@example.com';
```

Every admin after that gets approved from the **Approvals** tab in `/admin/dashboard`.

## 3. Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase keys
npm run dev                  # http://localhost:3000
```

## 4. Push to GitHub

```bash
git init
git add .
git commit -m "PartShop: full-stack e-commerce with admin panel"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## 5. Deploy to Vercel

```bash
npm i -g vercel
vercel               # link/create project, follow prompts
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel --prod
```

(Or connect the GitHub repo directly in the Vercel dashboard and add the same
three environment variables under Project Settings → Environment Variables.)

## How it's wired

- **Pages (11 total):** `/`, `/login`, `/signup`, `/product/[id]`, `/cart`, `/account`,
  `/admin/login`, `/admin/signup`, `/admin/dashboard` (one page, four tabs:
  Products / Categories & Brands / Orders / Approvals), plus one API route
  (`/api/admin-reset`) for the service-role password reset.
- **Auth:** Supabase Auth for both users and admins, kept distinct via a
  separate `admins` table with a `pending` → `approved` gate, enforced by RLS
  and re-checked on every admin login.
- **Password reset:** secret-question flow runs entirely through two
  security-definer Postgres RPCs (`get_secret_question`,
  `reset_password_with_secret`) so the browser never touches raw auth
  internals. The "request admin reset" path flags the account; an admin sets
  a new password from the Approvals tab, which calls the one server route
  that holds the service-role key.
- **Storage:** all product/category/brand images go to a public `images`
  bucket; only approved admins can write to it (RLS on `storage.objects`).
- **Bulk product upload:** the Products tab has a "Bulk upload" button for
  importing hundreds or thousands of products at once from an Excel (.xlsx)
  or CSV file. Required columns are `Name` and `Price`; optional columns are
  `Description`, `Stock`, `Category`, `Brand`, and `Image URL`. Category and
  Brand are matched by name (case-insensitive) against your existing catalog
  and auto-created if they don't exist yet. A "Download a template file"
  link in the upload dialog gives you the exact column headers to fill in.
  Uploads are sent in batches of 300 rows to stay well under request size
  limits — for a few thousand products this takes well under a minute.
  Note: this only sets `image_url` if your sheet already has direct image
  URLs (e.g. from a previous catalog); it doesn't upload image files — those
  still go through the per-product edit dialog for now.
- **Search & filters:** debounced live search (`ilike` on product name) plus
  category/brand chip filters, combined in one query on the home page.
