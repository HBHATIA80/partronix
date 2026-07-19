'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase, Product, Category, Brand } from '@/lib/supabase';
import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { ProductCard } from '@/components/product-card';
import { Skeleton, Empty, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { CheckCircle2, Wrench, Truck, PackageOpen, ArrowUpDown, GitCompare, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const PAGE_SIZE = 24;
type SortKey = 'newest' | 'price_asc' | 'price_desc';

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(searchParams.get('category'));
  const [brandId, setBrandId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const sb = supabase();
    Promise.all([
      sb.from('categories').select('*').order('name'),
      sb.from('brands').select('*').order('name'),
    ]).then(([c, b]) => {
      setCategories(c.data || []);
      setBrands(b.data || []);
    });
  }, []);

  // debounce live search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const runQuery = useCallback((sb: ReturnType<typeof supabase>, from: number, to: number) => {
    let q = sb.from('products').select('*, categories(name), brands(name)', { count: 'exact' });
    if (debounced) q = q.ilike('name', `%${debounced}%`);
    if (categoryId) q = q.eq('category_id', categoryId);
    if (brandId) q = q.eq('brand_id', brandId);
    if (sortBy === 'price_asc') q = q.order('price', { ascending: true });
    else if (sortBy === 'price_desc') q = q.order('price', { ascending: false });
    else q = q.order('created_at', { ascending: false });
    return q.range(from, to);
  }, [debounced, categoryId, brandId, sortBy]);

  // filters/search/sort changed — reset to page 1
  useEffect(() => {
    setLoading(true);
    const sb = supabase();
    runQuery(sb, 0, PAGE_SIZE - 1).then(({ data, count }) => {
      setProducts((data as any) || []);
      setTotal(count || 0);
      setLoading(false);
    });
  }, [runQuery]);

  async function loadMore() {
    setLoadingMore(true);
    const sb = supabase();
    const { data } = await runQuery(sb, products.length, products.length + PAGE_SIZE - 1);
    setProducts((prev) => [...prev, ...((data as any) || [])]);
    setLoadingMore(false);
  }

  function selectCategory(id: string | null) {
    setCategoryId(id);
    router.replace(id ? `/?category=${id}#catalog` : '/');
  }

  const hasFilters = categoryId || brandId || debounced;

  return (
    <div className="min-h-screen flex flex-col">
      <Nav query={query} onQuery={setQuery} />

      <section className="max-w-6xl mx-auto px-4 pt-14 pb-10 text-center">
        <h1 className="font-display text-3xl md:text-[2.75rem] leading-[1.15] text-ink max-w-2xl mx-auto">
         Screens||Spare-Parts||Accessories
        </h1>
        <p className="text-muted mt-3 max-w-lg mx-auto text-[15px] leading-relaxed">
          Every screen, battery, and board on this site has been checked against the
          model it's listed for.
        </p>
        <div className="flex flex-wrap gap-x-8 gap-y-3 mt-7 text-sm text-muted justify-center">
          <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-good" /> Tested before listing</span>
          <span className="flex items-center gap-2"><Wrench size={16} className="text-good" /> Sourced for repair techs</span>
          <span className="flex items-center gap-2"><Truck size={16} className="text-good" /> Same-day dispatch</span>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-14">
        <Link
          href="/compatibility"
          className="group flex flex-col sm:flex-row items-center gap-4 sm:gap-6 rounded-2xl border border-accent/30 bg-accent/5 px-6 py-6 hover:border-accent transition-colors"
        >
          <span className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
            <GitCompare size={22} className="text-accent2" />
          </span>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-display text-lg text-ink">Not sure if a part fits your phone?</p>
            <p className="text-sm text-muted mt-0.5">Search your model to see every other device it shares a display or battery with.</p>
          </div>
          <span className="flex items-center gap-1.5 text-sm font-medium text-accent2 shrink-0">
            Check compatibility <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>
      </section>

      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-14">
          <div className="flex gap-6 md:gap-10 overflow-x-auto pb-2 justify-center flex-wrap">
            {categories.map((c) => (
              <button key={c.id} onClick={() => selectCategory(c.id)} className="flex flex-col items-center gap-2.5 shrink-0 group">
                <span className="w-20 h-20 rounded-full bg-panel2 border border-line flex items-center justify-center overflow-hidden group-hover:border-accent transition-colors relative">
                  {c.image_url ? (
                    <Image src={c.image_url} alt={c.name} fill className="object-cover" />
                  ) : (
                    <PackageOpen size={26} className="text-accent2" />
                  )}
                </span>
                <span className="text-xs font-medium text-ink/80 group-hover:text-accent2 text-center max-w-[6rem]">{c.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="text-center mb-8">
            <p className="text-accent2 text-xs font-semibold uppercase tracking-wide">Shop by category</p>
            <h2 className="font-display text-2xl md:text-3xl text-ink mt-1">Popular right now</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {categories.slice(0, 3).map((c) => (
              <button
                key={c.id}
                onClick={() => selectCategory(c.id)}
                className="relative rounded-2xl overflow-hidden bg-panel2 border border-line aspect-[4/5] text-left group"
              >
                {c.image_url && (
                  <Image src={c.image_url} alt={c.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
                <div className="absolute bottom-0 left-0 p-5">
                  <p className="text-white/80 text-xs uppercase tracking-wide">Category</p>
                  <p className="font-display text-white text-xl">{c.name}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section id="catalog" className="max-w-6xl mx-auto px-4 pb-20 flex-1 w-full scroll-mt-20">
        <div className="flex gap-2 flex-wrap items-center mb-4">
          <FilterChip active={!categoryId} onClick={() => selectCategory(null)}>All categories</FilterChip>
          {categories.map((c) => (
            <FilterChip key={c.id} active={categoryId === c.id} onClick={() => selectCategory(c.id === categoryId ? null : c.id)}>{c.name}</FilterChip>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap items-center mb-6">
          <FilterChip active={!brandId} onClick={() => setBrandId(null)}>All brands</FilterChip>
          {brands.map((b) => (
            <FilterChip key={b.id} active={brandId === b.id} onClick={() => setBrandId(b.id === brandId ? null : b.id)}>{b.name}</FilterChip>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted">
            {loading ? 'Searching…' : `${total.toLocaleString('en-IN')} part${total === 1 ? '' : 's'}${hasFilters ? ' found' : ' in stock'}`}
          </p>
          <div className="relative">
            <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="pl-8 pr-3 py-1.5 rounded-full border border-line text-xs font-medium text-ink bg-panel appearance-none cursor-pointer"
            >
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)}
          </div>
        ) : products.length === 0 ? (
          <Empty title="No parts match that search" hint={hasFilters ? 'Try clearing a filter.' : 'Check back soon — new stock is added regularly.'} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
            {products.length < total && (
              <div className="flex flex-col items-center gap-2 mt-8">
                <p className="text-xs text-muted">Showing {products.length} of {total.toLocaleString('en-IN')}</p>
                <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Load more parts'}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <Footer />
    </div>
  );
}

function FilterChip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-xs font-medium px-3.5 py-1.5 rounded-full border transition-colors',
        active ? 'bg-accent text-white border-accent' : 'border-line text-muted hover:text-ink hover:border-ink/40'
      )}
    >
      {children}
    </button>
  );
}
