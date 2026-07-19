'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/lib/supabase';
import { Badge } from '@/components/ui';
import { money } from '@/lib/utils';
import { useWholesalePricing, effectivePrice } from '@/lib/pricing';
import { PackageX } from 'lucide-react';

export function ProductCard({ p }: { p: Product }) {
  const outOfStock = p.stock <= 0;
  const { wholesaleActive } = useWholesalePricing();
  const price = effectivePrice(p, wholesaleActive);
  const isWholesale = wholesaleActive && p.wholesale_price != null;

  return (
    <Link
      href={`/product/${p.id}`}
      className="group block rounded-2xl border border-line bg-panel overflow-hidden hover:shadow-lg hover:shadow-ink/5 hover:-translate-y-1 transition-all duration-200"
    >
      <div className="aspect-square bg-panel2 relative overflow-hidden">
        {p.image_url ? (
          <Image src={p.image_url} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted"><PackageX size={28} /></div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
            <Badge tone="bad">Out of stock</Badge>
          </div>
        )}
        {isWholesale && !outOfStock && (
          <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent text-white">
            Wholesale
          </span>
        )}
      </div>
      <div className="p-3.5 space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {p.brands?.name && <Badge tone="accent">{p.brands.name}</Badge>}
          {p.categories?.name && <Badge>{p.categories.name}</Badge>}
        </div>
        <p className="text-sm text-ink font-medium leading-snug line-clamp-2">{p.name}</p>
        <div className="flex items-center gap-2">
          <span className="text-accent2 font-semibold text-sm">{money(price)}</span>
          {isWholesale && <span className="text-xs text-muted line-through">{money(p.price)}</span>}
        </div>
      </div>
    </Link>
  );
}
