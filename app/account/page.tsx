'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Order } from '@/lib/supabase';
import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { Button, Badge, Table, Empty, Skeleton } from '@/components/ui';
import { money } from '@/lib/utils';

const statusTone: Record<Order['status'], 'default' | 'good' | 'accent'> = {
  placed: 'default',
  dispatched: 'accent',
  delivered: 'good',
};

export default function Account() {
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const sb = supabase();
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.push('/login');
      const [{ data: p }, { data: o }] = await Promise.all([
        sb.from('profiles').select('*').eq('id', data.user.id).single(),
        sb.from('orders').select('*, order_items(*, products(name))').eq('user_id', data.user.id).order('created_at', { ascending: false }),
      ]);
      setProfile({ ...p, email: data.user.email });
      setOrders((o as any) || []);
      setLoading(false);
    });
  }, [router]);

  async function logout() {
    await supabase().auth.signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen"><Nav />
        <div className="max-w-3xl mx-auto px-4 py-10 space-y-3">
          <Skeleton className="h-24" /><Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8 flex-1 w-full">
        <div className="flex items-start justify-between border border-line rounded-lg p-5 bg-panel">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl text-ink">{profile?.name}</h1>
              {profile?.is_wholesaler && profile?.wholesaler_status === 'approved' && <Badge tone="good">Wholesaler</Badge>}
              {profile?.is_wholesaler && profile?.wholesaler_status === 'pending' && <Badge tone="accent">Wholesaler — pending approval</Badge>}
            </div>
            <p className="text-sm text-muted mt-1">{profile?.email}</p>
            {profile?.phone && <p className="text-sm text-muted">{profile.phone}</p>}
            {profile?.is_wholesaler && (
              <div className="text-sm text-muted mt-2 space-y-0.5">
                {profile?.shop_name && <p className="text-ink font-medium">{profile.shop_name}</p>}
                {profile?.shop_address && <p>{profile.shop_address}</p>}
              </div>
            )}
            {profile?.status === 'reset_requested' && (
              <p className="mt-2"><Badge tone="accent">Password reset pending admin approval</Badge></p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={logout}>Log out</Button>
        </div>

        <div>
          <h2 className="font-display text-lg text-ink mb-3">Order history</h2>
          {orders.length === 0 ? (
            <Empty title="No orders yet" hint="Items you order will show up here." />
          ) : (
            <Table
              head={['Order', 'Items', 'Total', 'Status', 'Placed']}
              rows={orders.map((o) => [
                <span key="id" className="font-mono text-xs text-muted">{o.id.slice(0, 8)}</span>,
                <span key="items">{(o.order_items || []).map((it) => it.products?.name).join(', ')}</span>,
                <span key="total" className="font-semibold text-accent2">{money(o.total)}</span>,
                <Badge key="status" tone={statusTone[o.status]}>{o.status}</Badge>,
                <span key="date" className="text-xs text-muted">{new Date(o.created_at).toLocaleDateString()}</span>,
              ])}
            />
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
