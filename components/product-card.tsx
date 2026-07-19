import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/lib/supabase';
import { Badge } from '@/components/ui';
import { money } from '@/lib/utils';
import { PackageX } from 'lucide-react';

export function ProductCard({ p }: { p: Product }) {
  const outOfStock = p.stock <= 0;
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
      </div>
      <div className="p-3.5 space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {p.brands?.name && <Badge tone="accent">{p.brands.name}</Badge>}
          {p.categories?.name && <Badge>{p.categories.name}</Badge>}
        </div>
        <p className="text-sm text-ink font-medium leading-snug line-clamp-2">{p.name}</p>
        <span className="text-accent2 font-semibold text-sm block">{money(p.price)}</span>
      </div>
    </Link>
  );
}
