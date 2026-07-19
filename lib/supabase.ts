'use client';

import { createBrowserClient } from '@supabase/ssr';

export function supabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/* =========================================================
   PRODUCTS
========================================================= */

export type Product = {
  id: string;
  name: string;
  description: string | null;

  price: number;
  stock: number;

  image_url: string | null;

  category_id: string | null;
  brand_id: string | null;

  created_at?: string;
  updated_at?: string;

  categories?: {
    name: string;
  } | null;

  brands?: {
    name: string;
  } | null;
};

/* =========================================================
   CATEGORY
========================================================= */

export type Category = {
  id: string;

  name: string;

  image_url: string | null;

  created_at?: string;
};

/* =========================================================
   BRAND
========================================================= */

export type Brand = {
  id: string;

  name: string;

  logo_url: string | null;

  created_at?: string;
};

/* =========================================================
   MODEL
========================================================= */

export type Model = {
  id: string;

  name: string;

  brand_id: string | null;

  created_at?: string;

  brands?: {
    name: string;
  } | null;
};

/* =========================================================
   COMPATIBILITY GROUP
========================================================= */

export type CompatibilityGroup = {
  id: string;

  name: string;

  part_type: 'display' | 'battery' | 'other';

  notes: string | null;

  created_at?: string;

  compatibility_group_models?: {
    model_id: string;
  }[];
};

/* =========================================================
   CART
========================================================= */

export type CartItem = {
  user_id: string;

  product_id: string;

  qty: number;

  products?: Product;
};

/* =========================================================
   ORDER
========================================================= */

export type OrderItem = {
  product_id: string;

  qty: number;

  price: number;

  products?: {
    name: string;
  } | null;
};

export type Order = {
  id: string;

  user_id: string;

  status: 'placed' | 'dispatched' | 'delivered';

  total: number;

  created_at: string;

  order_items?: OrderItem[];
};