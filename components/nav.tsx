'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Search, ShoppingCart, UserCircle, Smartphone, Home as HomeIcon, ChevronLeft, ChevronRight, PackageOpen } from 'lucide-react';
import { Input } from '@/components/ui';
import { supabase, Category } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export function Nav({ query, onQuery }: { query?: string; onQuery?: (q: string) => void }) {
  const [cartCount, setCartCount] = useState(0);
  const [signedIn, setSignedIn] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined' || pathname !== '/') {
      setActiveCategory(null);
      return;
    }
    setActiveCategory(new URLSearchParams(window.location.search).get('category'));
  }, [pathname]);

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
    sb.from('categories').select('*').is('parent_id', null).order('name').then(({ data }) => setCategories(data || []));
  }, []);

  function scroll(dir: 1 | -1) {
    scrollerRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-line">
      <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-display text-xl text-ink shrink-0">
          <span className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center">
            <Smartphone size={18} className="text-accent2" />
          </span>
          PartShop
        </Link>

        {onQuery !== undefined && (
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search parts, brands, categories…"
              className="pl-9 bg-panel2 border-transparent"
            />
          </div>
        )}

        <div className="flex items-center gap-3 ml-auto shrink-0">
          {!signedIn && (
            <Link href="/signup" className="hidden sm:inline-flex items-center rounded-full bg-accent text-white text-xs font-semibold px-4 py-2 hover:bg-accent2 transition-colors">
              Sign up
            </Link>
          )}
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

      {categories.length > 0 && (
        <div className="border-t border-line bg-panel2/50">
          <div className="max-w-6xl mx-auto px-2 relative flex items-center">
            <button onClick={() => scroll(-1)} className="hidden md:flex shrink-0 w-8 h-8 items-center justify-center text-muted hover:text-ink">
              <ChevronLeft size={18} />
            </button>
            <div ref={scrollerRef} className="flex-1 flex gap-2 overflow-x-auto py-2.5 px-1 scroll-smooth" style={{ scrollbarWidth: 'none' }}>
              <Link
                href="/"
                className={cn(
                  'flex items-center gap-2 shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  !activeCategory ? 'border-accent bg-accent/10 text-accent2' : 'border-line bg-white text-ink/80 hover:border-ink/30'
                )}
              >
                <HomeIcon size={16} /> Home
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/?category=${c.id}#catalog`}
                  className={cn(
                    'flex items-center gap-2 shrink-0 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                    activeCategory === c.id ? 'border-accent bg-accent/10 text-accent2' : 'border-line bg-white text-ink/80 hover:border-ink/30'
                  )}
                >
                  <PackageOpen size={16} /> {c.name}
                </Link>
              ))}
            </div>
            <button onClick={() => scroll(1)} className="hidden md:flex shrink-0 w-8 h-8 items-center justify-center text-muted hover:text-ink">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
