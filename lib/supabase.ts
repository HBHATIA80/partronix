'use client';
import { createBrowserClient } from '@supabase/ssr';

export function supabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  wholesale_price: number | null;
  stock: number;
  image_url: string | null;
  category_id: string | null;
  brand_id: string | null;
  categories?: { name: string } | null;
  brands?: { name: string } | null;
};

export type Category = { id: string; name: string; image_url: string | null; parent_id: string | null };
export type Brand = { id: string; name: string; logo_url: string | null };
export type Model = { id: string; name: string; brand_id: string | null; brands?: { name: string } | null };
export type CompatibilityGroup = { id: string; name: string; part_type: 'display' | 'battery' | 'other'; notes: string | null };
export type CartItem = { user_id: string; product_id: string; qty: number; products?: Product };
export type Order = {
  id: string;
  user_id: string;
  status: 'placed' | 'dispatched' | 'delivered';
  total: number;
  created_at: string;
  order_items?: { product_id: string; qty: number; price: number; products?: { name: string } }[];
};
