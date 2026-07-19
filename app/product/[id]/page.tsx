'use client';
import { useEffect, useState, useRef, MouseEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase, Product } from '@/lib/supabase';
import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { Button, Badge, Skeleton, useToast } from '@/components/ui';
import { money } from '@/lib/utils';
import { useWholesalePricing, effectivePrice } from '@/lib/pricing';
import { PackageX, Minus, Plus } from 'lucide-react';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const imageBoxRef = useRef<HTMLDivElement>(null);
  const { wholesaleActive } = useWholesalePricing();
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    supabase().from('products').select('*, categories(name), brands(name)').eq('id', id).single().then(({ data }) => {
      setProduct(data as any);
      setLoading(false);
    });
  }, [id]);

  async function addToCart() {
    const sb = supabase();
    const { data: userData } = await sb.auth.getUser();
    if (!userData.user) {
      toast('Log in to add items to your cart', 'bad');
      router.push('/login');
      return;
    }
    const { error } = await sb.from('cart_items').upsert(
      { user_id: userData.user.id, product_id: id, qty },
      { onConflict: 'user_id,product_id' }
    );
    if (error) return toast(error.message, 'bad');
    toast('Added to cart', 'good');
  }

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const box = imageBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <div className="max-w-4xl mx-auto px-4 py-10 flex-1 w-full">
        {loading || !product ? (
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square" />
            <div className="space-y-3"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-1/3" /></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="relative">
              <div
                ref={imageBoxRef}
                onMouseEnter={() => setZoomed(true)}
                onMouseLeave={() => setZoomed(false)}
                onMouseMove={handleMouseMove}
                className={`aspect-square bg-panel2 rounded-lg relative overflow-hidden border border-line ${product.image_url ? 'cursor-zoom-in' : ''}`}
              >
                {product.image_url ? (
                  <Image src={product.image_url} alt={product.name} fill className="object-contain p-4" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted"><PackageX size={40} /></div>
                )}
                {zoomed && product.image_url && (
                  <div
                    className="hidden lg:block absolute border-2 border-accent bg-accent/10 pointer-events-none"
                    style={{ width: '36%', height: '36%', left: `calc(${origin.x}% - 18%)`, top: `calc(${origin.y}% - 18%)` }}
                  />
                )}
              </div>

              {zoomed && product.image_url && (
                <div
                  className="hidden lg:block absolute top-0 left-full ml-4 w-full h-full rounded-lg border border-line shadow-xl bg-white z-30"
                  style={{
                    backgroundImage: `url(${product.image_url})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '260% 260%',
                    backgroundPosition: `${origin.x}% ${origin.y}%`,
                  }}
                />
              )}
            </div>
            <div className="space-y-4">
              <div className="flex gap-1.5">
                {product.brands?.name && <Badge tone="accent">{product.brands.name}</Badge>}
                {product.categories?.name && <Badge>{product.categories.name}</Badge>}
              </div>
              <h1 className="font-display text-2xl text-ink">{product.name}</h1>
              <p className="text-muted text-sm leading-relaxed">{product.description}</p>
              <div className="flex items-center gap-3">
                <div className="font-display text-2xl text-accent2">{money(effectivePrice(product, wholesaleActive))}</div>
                {wholesaleActive && product.wholesale_price != null && (
                  <span className="text-sm text-muted line-through">{money(product.price)}</span>
                )}
                {wholesaleActive && product.wholesale_price != null && (
                  <Badge tone="accent">Wholesale price</Badge>
                )}
              </div>
              <p className="text-xs font-mono text-muted flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${product.stock > 0 ? 'bg-good' : 'bg-bad'}`} />
                {product.stock > 0 ? 'In stock, ready to ship' : 'Currently out of stock'}
              </p>
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center border border-line rounded-md">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2 text-muted hover:text-ink"><Minus size={14} /></button>
                  <span className="w-8 text-center font-mono text-sm">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} className="p-2 text-muted hover:text-ink"><Plus size={14} /></button>
                </div>
                <Button onClick={addToCart} disabled={product.stock === 0} className="flex-1">Add to cart</Button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
