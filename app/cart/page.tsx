'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase, CartItem } from '@/lib/supabase';
import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { Button, Empty, Skeleton, useToast } from '@/components/ui';
import { money } from '@/lib/utils';
import { useWholesalePricing, effectivePrice } from '@/lib/pricing';
import { Minus, Plus, Trash2, PackageX } from 'lucide-react';

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const { wholesaleActive } = useWholesalePricing();
  const toast = useToast();
  const router = useRouter();

  async function load() {
    const sb = supabase();
    const { data: userData } = await sb.auth.getUser();
    if (!userData.user) {
      router.push('/login');
      return;
    }
    const { data } = await sb.from('cart_items').select('*, products(*)').eq('user_id', userData.user.id);
    setItems((data as any) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateQty(productId: string, qty: number) {
    const sb = supabase();
    if (qty <= 0) {
      await sb.from('cart_items').delete().eq('product_id', productId);
    } else {
      await sb.from('cart_items').update({ qty }).eq('product_id', productId);
    }
    load();
  }

  const lineTotal = (i: CartItem) => (i.products ? effectivePrice(i.products, wholesaleActive) : 0) * i.qty;
  const total = items.reduce((s, i) => s + lineTotal(i), 0);

  async function checkout() {
    setPlacing(true);
    const sb = supabase();
    const { data: userData } = await sb.auth.getUser();
    if (!userData.user) return;
    const { data: order, error } = await sb.from('orders').insert({ user_id: userData.user.id, total }).select().single();
    if (error || !order) {
      toast(error?.message || 'Checkout failed', 'bad');
      setPlacing(false);
      return;
    }
    // Lock in whichever price applied at checkout time (wholesale or regular),
    // so later price changes never retroactively alter a placed order.
    const rows = items.map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      qty: i.qty,
      price: i.products ? effectivePrice(i.products, wholesaleActive) : 0,
    }));
    await sb.from('order_items').insert(rows);
    await sb.from('cart_items').delete().eq('user_id', userData.user.id);
    setPlacing(false);
    toast('Order placed!', 'good');
    router.push('/account');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <div className="max-w-3xl mx-auto px-4 py-10 flex-1 w-full">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="font-display text-2xl text-ink">Your cart</h1>
          {wholesaleActive && <span className="text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-accent/10 text-accent2">Wholesale pricing applied</span>}
        </div>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        ) : items.length === 0 ? (
          <Empty title="Your cart is empty" hint="Browse the catalog to add parts." />
        ) : (
          <div className="space-y-4">
            {items.map((i) => (
              <div key={i.product_id} className="flex gap-4 border border-line rounded-lg p-3 bg-panel">
                <div className="w-20 h-20 bg-panel2 rounded-md relative overflow-hidden shrink-0">
                  {i.products?.image_url ? (
                    <Image src={i.products.image_url} alt={i.products.name} fill className="object-cover" />
                  ) : <div className="w-full h-full flex items-center justify-center text-muted"><PackageX size={20} /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink font-medium truncate">{i.products?.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-semibold text-accent2 text-sm">{i.products ? money(effectivePrice(i.products, wholesaleActive)) : ''}</p>
                    {wholesaleActive && i.products?.wholesale_price != null && (
                      <p className="text-xs text-muted line-through">{money(i.products.price)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center border border-line rounded-md">
                      <button onClick={() => updateQty(i.product_id, i.qty - 1)} className="p-1.5 text-muted hover:text-ink"><Minus size={12} /></button>
                      <span className="w-6 text-center font-mono text-xs">{i.qty}</span>
                      <button onClick={() => updateQty(i.product_id, i.qty + 1)} className="p-1.5 text-muted hover:text-ink"><Plus size={12} /></button>
                    </div>
                    <button onClick={() => updateQty(i.product_id, 0)} className="text-muted hover:text-bad p-1"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-4 border-t border-line">
              <span className="font-medium text-lg text-ink">Total: <span className="text-accent2 font-semibold">{money(total)}</span></span>
              <Button onClick={checkout} disabled={placing}>{placing ? 'Placing order…' : 'Place order'}</Button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
