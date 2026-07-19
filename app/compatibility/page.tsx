'use client';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { supabase, Model } from '@/lib/supabase';
import { Badge, Empty, Skeleton } from '@/components/ui';
import { Search, Smartphone, GitCompare, Battery, MonitorSmartphone } from 'lucide-react';

type GroupResult = {
  partType: 'display' | 'battery' | 'other';
  notes: string | null;
  members: { id: string; name: string; brands?: { name: string } | null }[];
};

const PART_LABEL: Record<string, { label: string; icon: any }> = {
  display: { label: 'Compatible displays', icon: MonitorSmartphone },
  battery: { label: 'Compatible batteries', icon: Battery },
  other: { label: 'Also compatible', icon: GitCompare },
};

export default function CompatibilityPage() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [matches, setMatches] = useState<Model[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Model | null>(null);
  const [groups, setGroups] = useState<GroupResult[] | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debounced) {
      setMatches([]);
      return;
    }
    setSearching(true);
    supabase()
      .from('models')
      .select('*, brands(name)')
      .ilike('name', `%${debounced}%`)
      .order('name')
      .limit(15)
      .then(({ data }) => {
        setMatches((data as any) || []);
        setSearching(false);
      });
  }, [debounced]);

  async function selectModel(model: Model) {
    setSelected(model);
    setMatches([]);
    setQuery('');
    setLoadingGroups(true);
    const sb = supabase();

    const { data: memberships } = await sb
      .from('compatibility_group_models')
      .select('group_id, compatibility_groups(part_type, notes)')
      .eq('model_id', model.id);

    const groupRows = (memberships || []) as any[];
    const results: GroupResult[] = await Promise.all(
      groupRows.map(async (g) => {
        const { data: members } = await sb
          .from('compatibility_group_models')
          .select('models(id, name, brands(name))')
          .eq('group_id', g.group_id)
          .neq('model_id', model.id);
        return {
          partType: g.compatibility_groups.part_type,
          notes: g.compatibility_groups.notes,
          members: (members || []).map((m: any) => m.models).filter(Boolean),
        };
      })
    );
    setGroups(results.filter((r) => r.members.length > 0));
    setLoadingGroups(false);
  }

  function reset() {
    setSelected(null);
    setGroups(null);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />

      <section className="max-w-2xl mx-auto px-4 pt-14 pb-10 text-center">
        <span className="inline-flex items-center gap-2 text-accent2 text-xs font-semibold uppercase tracking-wide bg-accent/10 px-3 py-1 rounded-full">
          <GitCompare size={14} /> Compatibility checker
        </span>
        <h1 className="font-display text-3xl md:text-4xl text-ink mt-4">Will this part fit your phone?</h1>
        <p className="text-muted mt-3 text-[15px] leading-relaxed">
          Search your device model to see every other model that shares the same display, battery, or other part —
          so you know exactly what else is compatible before you buy.
        </p>
      </section>

      <section className="max-w-2xl mx-auto px-4 pb-24 flex-1 w-full">
        {!selected ? (
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type your device model, e.g. iPhone 11 Pro"
              className="w-full rounded-full border border-line bg-panel2 pl-12 pr-4 py-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent"
            />

            {debounced && (
              <div className="mt-3 rounded-xl border border-line bg-panel divide-y divide-line overflow-hidden">
                {searching ? (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-5 w-1/2" />
                  </div>
                ) : matches.length === 0 ? (
                  <p className="p-4 text-sm text-muted">No models found for "{debounced}".</p>
                ) : (
                  matches.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => selectModel(m)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-panel2 transition-colors"
                    >
                      <Smartphone size={16} className="text-accent2 shrink-0" />
                      <span className="text-sm text-ink">{m.name}</span>
                      {m.brands?.name && <span className="text-xs text-muted ml-auto">{m.brands.name}</span>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-xl border border-line bg-panel2 px-4 py-3">
              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-accent2" />
                <span className="font-medium text-ink">{selected.name}</span>
              </div>
              <button onClick={reset} className="text-xs text-accent2 hover:underline">Search another model</button>
            </div>

            {loadingGroups ? (
              <div className="space-y-3"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-16" /></div>
            ) : !groups || groups.length === 0 ? (
              <Empty title="No documented compatibility yet" hint="Your admin hasn't linked this model to any interchangeable parts yet — check back soon." />
            ) : (
              groups.map((g, i) => {
                const meta = PART_LABEL[g.partType];
                const Icon = meta.icon;
                return (
                  <div key={i} className="rounded-xl border border-line bg-panel p-5 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <Icon size={22} className="text-accent2" />
                      <h2 className="font-display text-2xl text-ink">{meta.label}</h2>
                    </div>
                    {g.notes && <p className="text-sm text-muted">{g.notes}</p>}
                    <div className="flex flex-wrap gap-2.5">
                      {g.members.map((m) => (
                        <span
                          key={m.id}
                          className="text-sm font-medium px-3.5 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent2"
                        >
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
