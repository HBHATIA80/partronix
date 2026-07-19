'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search, ShoppingCart, UserCircle, Smartphone, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui';
import { supabase, Category } from '@/lib/supabase';

export function Nav({ query, onQuery }: { query?: string; onQuery?: (q: string) => void }) {
  const [cartCount, setCartCount] = useState(0);
  const [signedIn, setSignedIn] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const sb = supabase();
    sb.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      if (data.user) {
        sb.from('cart_items').select('qty').eq('user_id', data.user.id).then(({ data: rows }) => {
          setCartCount((rows || []).reduce((s, r: any) => s + r.qty, 0));
        });
      }
    });
    sb.from('categories').select('*').order('name').limit(6).then(({ data }) => setCategories(data || []));
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-line">
      <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-display text-xl text-ink shrink-0">
          <span className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center">
            <Smartphone size={18} className="text-accent2" />
          </span>
          partronix.IN
        </Link>

        {categories.length > 0 && (
          <nav className="hidden lg:flex items-center gap-6 shrink-0">
            {categories.map((c) => (
              <Link key={c.id} href={`/?category=${c.id}#catalog`} className="text-sm text-ink/80 hover:text-accent2 transition-colors">
                {c.name}
              </Link>
            ))}
            <span className="flex items-center gap-1 text-sm text-ink/80 hover:text-accent2 cursor-default">
              More <ChevronDown size={14} />
            </span>
          </nav>
        )}

        {onQuery !== undefined && (
          <div className="relative flex-1 max-w-sm ml-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search parts, brands, categories…"
              className="pl-9 bg-panel2 border-transparent"
            />
          </div>
        )}
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/cart" className="relative text-ink/70 hover:text-accent2">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-accent text-white text-[10px] font-semibold rounded-full w-4 h-4 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          <Link href={signedIn ? '/account' : '/login'} className="text-ink/70 hover:text-accent2">
            <UserCircle size={20} />
          </Link>
        </div>
      </div>
    </header>
  );
}
