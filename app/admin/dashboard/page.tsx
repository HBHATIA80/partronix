'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase, Product, Category, Brand, Order, Model, CompatibilityGroup } from '@/lib/supabase';
import { Tabs, Button, Input, Label, Dialog, Table, Badge, Skeleton, useToast, Empty } from '@/components/ui';
import { BulkUploadDialog } from '@/components/bulk-upload-dialog';
import { money } from '@/lib/utils';
import { ShieldCheck, Plus, Pencil, Trash2, PackageX, LogOut, UploadCloud, GitCompare } from 'lucide-react';

const TABS = [
  { key: 'products', label: 'Products' },
  { key: 'catalog', label: 'Categories & Brands' },
  { key: 'compatibility', label: 'Compatibility' },
  { key: 'orders', label: 'Orders' },
  { key: 'approvals', label: 'Approvals' },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState('products');
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const router = useRouter();

  useEffect(() => {
    const sb = supabase();
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.push('/admin/login');
      const { data: row } = await sb.from('admins').select('status').eq('id', data.user.id).single();
      if (row?.status !== 'approved') return router.push('/admin/login');
      setEmail(data.user.email || '');
      setReady(true);
    });
  }, [router]);

  async function logout() {
    await supabase().auth.signOut();
    router.push('/admin/login');
  }

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-muted">Checking access…</div>;

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-base/95 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-accent2">
            <ShieldCheck size={20} /><h1 className="font-display text-lg text-ink">Admin dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted hidden sm:inline">{email}</span>
            <Button variant="outline" size="sm" onClick={logout}><LogOut size={14} /> Log out</Button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4"><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {tab === 'products' && <ProductsTab />}
        {tab === 'catalog' && <CatalogTab />}
        {tab === 'compatibility' && <CompatibilityTab />}
        {tab === 'orders' && <OrdersTab />}
        {tab === 'approvals' && <ApprovalsTab />}
      </div>
    </div>
  );
}

// ============================================================ PRODUCTS
function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    const sb = supabase();
    const [p, c, b] = await Promise.all([
      sb.from('products').select('*, categories(name), brands(name)').order('created_at', { ascending: false }),
      sb.from('categories').select('*').order('name'),
      sb.from('brands').select('*').order('name'),
    ]);
    setProducts((p.data as any) || []);
    setCategories(c.data || []);
    setBrands(b.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(form: Partial<Product>, imageFile: File | null) {
    const sb = supabase();
    let image_url = form.image_url;
    if (imageFile) {
      const path = `products/${Date.now()}-${imageFile.name}`;
      const { error: upErr } = await sb.storage.from('images').upload(path, imageFile);
      if (upErr) return toast(upErr.message, 'bad');
      image_url = sb.storage.from('images').getPublicUrl(path).data.publicUrl;
    }
    // Only send real product columns — strip the joined `categories`/`brands`
    // relation objects that come along when editing (select('*, categories(name), brands(name))')),
    // since those aren't actual columns and Postgres rejects them.
    const { id, categories, brands, ...rest } = form as any;
    const payload = { ...rest, image_url };
    const { error } = id
      ? await sb.from('products').update(payload).eq('id', id)
      : await sb.from('products').insert(payload);
    if (error) return toast(error.message, 'bad');
    toast('Product saved', 'good');
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase().from('products').delete().eq('id', id);
    if (error) return toast(error.message, 'bad');
    toast('Product deleted', 'good');
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-display text-lg text-ink">Products</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)}><UploadCloud size={16} /> Bulk upload</Button>
          <Button onClick={() => setEditing({})}><Plus size={16} /> New product</Button>
        </div>
      </div>
      {loading ? <Skeleton className="h-64" /> : products.length === 0 ? (
        <Empty title="No products yet" hint="Add your first product to populate the storefront." />
      ) : (
        <Table
          head={['Image', 'Name', 'Category', 'Brand', 'Price', 'Stock', '']}
          rows={products.map((p) => [
            <div key="img" className="w-10 h-10 bg-panel2 rounded relative overflow-hidden">{p.image_url ? <Image src={p.image_url} alt="" fill className="object-cover" /> : <PackageX size={16} className="m-auto mt-2.5 text-muted" />}</div>,
            <span key="n">{p.name}</span>,
            <span key="c">{p.categories?.name || '—'}</span>,
            <span key="b">{p.brands?.name || '—'}</span>,
            <span key="p" className="font-mono text-accent2">{money(p.price)}</span>,
            <span key="s" className="font-mono">{p.stock}</span>,
            <div key="a" className="flex gap-2">
              <button onClick={() => setEditing(p)} className="text-muted hover:text-ink"><Pencil size={14} /></button>
              <button onClick={() => remove(p.id)} className="text-muted hover:text-bad"><Trash2 size={14} /></button>
            </div>,
          ])}
        />
      )}
      {editing && <ProductDialog product={editing} categories={categories} brands={brands} onClose={() => setEditing(null)} onSave={save} />}
      {bulkOpen && (
        <BulkUploadDialog
          categories={categories}
          brands={brands}
          onClose={() => setBulkOpen(false)}
          onDone={load}
        />
      )}
    </div>
  );
}

function ProductDialog({ product, categories, brands, onClose, onSave }: { product: Partial<Product>; categories: Category[]; brands: Brand[]; onClose: () => void; onSave: (f: Partial<Product>, img: File | null) => void }) {
  const [form, setForm] = useState<Partial<Product>>(product);
  const [file, setFile] = useState<File | null>(null);
  return (
    <Dialog open onClose={onClose} title={product.id ? 'Edit product' : 'New product'}>
      <div className="space-y-3">
        <div><Label>Name</Label><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Description</Label><Input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Price (₹)</Label><Input type="number" step="1" min="0" value={form.price ?? ''} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })} /></div>
          <div><Label>Stock</Label><Input type="number" value={form.stock ?? ''} onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category</Label>
            <select className="w-full rounded-md bg-panel2 border border-line px-3 py-2.5 text-sm text-ink" value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}>
              <option value="">None</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Brand</Label>
            <select className="w-full rounded-md bg-panel2 border border-line px-3 py-2.5 text-sm text-ink" value={form.brand_id || ''} onChange={(e) => setForm({ ...form, brand_id: e.target.value || null })}>
              <option value="">None</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <div><Label>Image</Label><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm text-muted" /></div>
        <Button className="w-full" onClick={() => onSave(form, file)}>Save product</Button>
      </div>
    </Dialog>
  );
}

// ============================================================ CATEGORIES & BRANDS
function CatalogTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCat, setEditingCat] = useState<Partial<Category> | null>(null);
  const [editingBrand, setEditingBrand] = useState<Partial<Brand> | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    const sb = supabase();
    const [c, b] = await Promise.all([sb.from('categories').select('*').order('name'), sb.from('brands').select('*').order('name')]);
    setCategories(c.data || []);
    setBrands(b.data || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function uploadImage(file: File, folder: string) {
    const sb = supabase();
    const path = `${folder}/${Date.now()}-${file.name}`;
    await sb.storage.from('images').upload(path, file);
    return sb.storage.from('images').getPublicUrl(path).data.publicUrl;
  }

  async function saveCategory(form: Partial<Category>, file: File | null) {
    const sb = supabase();
    const image_url = file ? await uploadImage(file, 'categories') : form.image_url;
    const { error } = form.id ? await sb.from('categories').update({ ...form, image_url }).eq('id', form.id) : await sb.from('categories').insert({ ...form, image_url });
    if (error) return toast(error.message, 'bad');
    toast('Category saved', 'good');
    setEditingCat(null);
    load();
  }

  async function saveBrand(form: Partial<Brand>, file: File | null) {
    const sb = supabase();
    const logo_url = file ? await uploadImage(file, 'brands') : form.logo_url;
    const { error } = form.id ? await sb.from('brands').update({ ...form, logo_url }).eq('id', form.id) : await sb.from('brands').insert({ ...form, logo_url });
    if (error) return toast(error.message, 'bad');
    toast('Brand saved', 'good');
    setEditingBrand(null);
    load();
  }

  async function removeCategory(id: string) { await supabase().from('categories').delete().eq('id', id); load(); }
  async function removeBrand(id: string) { await supabase().from('brands').delete().eq('id', id); load(); }

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-display text-lg text-ink">Categories</h2>
          <Button size="sm" onClick={() => setEditingCat({})}><Plus size={14} /> New</Button>
        </div>
        <Table head={['Name', '']} rows={categories.map((c) => [
          <span key="n">{c.name}</span>,
          <div key="a" className="flex gap-2"><button onClick={() => setEditingCat(c)} className="text-muted hover:text-ink"><Pencil size={14} /></button><button onClick={() => removeCategory(c.id)} className="text-muted hover:text-bad"><Trash2 size={14} /></button></div>,
        ])} />
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-display text-lg text-ink">Brands</h2>
          <Button size="sm" onClick={() => setEditingBrand({})}><Plus size={14} /> New</Button>
        </div>
        <Table head={['Name', '']} rows={brands.map((b) => [
          <span key="n">{b.name}</span>,
          <div key="a" className="flex gap-2"><button onClick={() => setEditingBrand(b)} className="text-muted hover:text-ink"><Pencil size={14} /></button><button onClick={() => removeBrand(b.id)} className="text-muted hover:text-bad"><Trash2 size={14} /></button></div>,
        ])} />
      </div>
      {editingCat && <NameImageDialog title={editingCat.id ? 'Edit category' : 'New category'} item={editingCat} imageKey="image_url" onClose={() => setEditingCat(null)} onSave={saveCategory} />}
      {editingBrand && <NameImageDialog title={editingBrand.id ? 'Edit brand' : 'New brand'} item={editingBrand} imageKey="logo_url" onClose={() => setEditingBrand(null)} onSave={saveBrand} />}
    </div>
  );
}

function NameImageDialog<T extends { name?: string }>({ title, item, imageKey, onClose, onSave }: { title: string; item: Partial<T> & Record<string, any>; imageKey: string; onClose: () => void; onSave: (f: any, file: File | null) => void }) {
  const [form, setForm] = useState<any>(item);
  const [file, setFile] = useState<File | null>(null);
  return (
    <Dialog open onClose={onClose} title={title}>
      <div className="space-y-3">
        <div><Label>Name</Label><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Image</Label><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm text-muted" /></div>
        <Button className="w-full" onClick={() => onSave(form, file)}>Save</Button>
      </div>
    </Dialog>
  );
}

// ============================================================ COMPATIBILITY
function CompatibilityTab() {
  const [models, setModels] = useState<Model[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [groups, setGroups] = useState<(CompatibilityGroup & { memberCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingModel, setEditingModel] = useState<Partial<Model> | null>(null);
  const [editingGroup, setEditingGroup] = useState<Partial<CompatibilityGroup> | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    const sb = supabase();
    const [m, b, g] = await Promise.all([
      sb.from('models').select('*, brands(name)').order('name'),
      sb.from('brands').select('*').order('name'),
      sb.from('compatibility_groups').select('*, compatibility_group_models(model_id)').order('created_at', { ascending: false }),
    ]);
    setModels((m.data as any) || []);
    setBrands(b.data || []);
    setGroups(((g.data as any) || []).map((row: any) => ({ ...row, memberCount: row.compatibility_group_models?.length || 0 })));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function saveModel(form: Partial<Model>) {
    const sb = supabase();
    const { id, brands: _b, ...rest } = form as any;
    const { error } = id ? await sb.from('models').update(rest).eq('id', id) : await sb.from('models').insert(rest);
    if (error) return toast(error.message, 'bad');
    toast('Model saved', 'good');
    setEditingModel(null);
    load();
  }

  async function removeModel(id: string) {
    const { error } = await supabase().from('models').delete().eq('id', id);
    if (error) return toast(error.message, 'bad');
    toast('Model deleted', 'good');
    load();
  }

  async function saveGroup(form: Partial<CompatibilityGroup>, memberIds: string[]) {
    const sb = supabase();
    const { id, ...rest } = form as any;
    let groupId = id;
    if (groupId) {
      const { error } = await sb.from('compatibility_groups').update(rest).eq('id', groupId);
      if (error) return toast(error.message, 'bad');
    } else {
      const { data, error } = await sb.from('compatibility_groups').insert(rest).select().single();
      if (error) return toast(error.message, 'bad');
      groupId = data.id;
    }
    // Reconcile membership: clear and re-insert is simplest and safe at this scale.
    await sb.from('compatibility_group_models').delete().eq('group_id', groupId);
    if (memberIds.length > 0) {
      await sb.from('compatibility_group_models').insert(memberIds.map((model_id) => ({ group_id: groupId, model_id })));
    }
    toast('Compatibility group saved', 'good');
    setEditingGroup(null);
    load();
  }

  async function removeGroup(id: string) {
    const { error } = await supabase().from('compatibility_groups').delete().eq('id', id);
    if (error) return toast(error.message, 'bad');
    toast('Group deleted', 'good');
    load();
  }

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-display text-lg text-ink">Device models</h2>
            <p className="text-sm text-muted">The list customers search against on the compatibility page.</p>
          </div>
          <Button size="sm" onClick={() => setEditingModel({})}><Plus size={14} /> New model</Button>
        </div>
        {models.length === 0 ? <Empty title="No models yet" hint="Add the device models your parts fit." /> : (
          <Table head={['Name', 'Brand', '']} rows={models.map((m) => [
            <span key="n">{m.name}</span>,
            <span key="b">{m.brands?.name || '—'}</span>,
            <div key="a" className="flex gap-2">
              <button onClick={() => setEditingModel(m)} className="text-muted hover:text-ink"><Pencil size={14} /></button>
              <button onClick={() => removeModel(m.id)} className="text-muted hover:text-bad"><Trash2 size={14} /></button>
            </div>,
          ])} />
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-display text-lg text-ink">Compatibility groups</h2>
            <p className="text-sm text-muted">Models in the same group share an interchangeable part.</p>
          </div>
          <Button size="sm" onClick={() => setEditingGroup({})}><Plus size={14} /> New group</Button>
        </div>
        {groups.length === 0 ? <Empty title="No compatibility groups yet" hint="Group models that share a display, battery, or other part." /> : (
          <Table head={['Name', 'Part type', 'Notes', 'Models', '']} rows={groups.map((g) => [
            <span key="name" className="font-medium text-ink">{g.name}</span>,
            <Badge key="t" tone="accent">{g.part_type}</Badge>,
            <span key="n" className="text-xs text-muted">{g.notes || '—'}</span>,
            <span key="c">{g.memberCount}</span>,
            <div key="a" className="flex gap-2">
              <button onClick={() => setEditingGroup(g)} className="text-muted hover:text-ink"><Pencil size={14} /></button>
              <button onClick={() => removeGroup(g.id)} className="text-muted hover:text-bad"><Trash2 size={14} /></button>
            </div>,
          ])} />
        )}
      </div>

      {editingModel && (
        <ModelDialog model={editingModel} brands={brands} onClose={() => setEditingModel(null)} onSave={saveModel} />
      )}
      {editingGroup && (
        <GroupDialog group={editingGroup} models={models} onClose={() => setEditingGroup(null)} onSave={saveGroup} />
      )}
    </div>
  );
}

function ModelDialog({ model, brands, onClose, onSave }: { model: Partial<Model>; brands: Brand[]; onClose: () => void; onSave: (f: Partial<Model>) => void }) {
  const [form, setForm] = useState<Partial<Model>>(model);
  return (
    <Dialog open onClose={onClose} title={model.id ? 'Edit model' : 'New model'}>
      <div className="space-y-3">
        <div><Label>Model name</Label><Input placeholder="e.g. iPhone 11 Pro" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div>
          <Label>Brand</Label>
          <select className="w-full rounded-md bg-panel2 border border-line px-3 py-2.5 text-sm text-ink" value={form.brand_id || ''} onChange={(e) => setForm({ ...form, brand_id: e.target.value || null })}>
            <option value="">None</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <Button className="w-full" onClick={() => onSave(form)}>Save model</Button>
      </div>
    </Dialog>
  );
}

function GroupDialog({ group, models, onClose, onSave }: { group: Partial<CompatibilityGroup> & { compatibility_group_models?: { model_id: string }[] }; models: Model[]; onClose: () => void; onSave: (f: Partial<CompatibilityGroup>, memberIds: string[]) => void }) {
  const [form, setForm] = useState<Partial<CompatibilityGroup>>({ name: group.name || '', part_type: group.part_type || 'display', notes: group.notes || '', id: group.id });
  const [selected, setSelected] = useState<Set<string>>(
    new Set((group.compatibility_group_models || []).map((r) => r.model_id))
  );
  const [search, setSearch] = useState('');

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const filtered = models.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open onClose={onClose} title={group.id ? 'Edit compatibility group' : 'New compatibility group'}>
      <div className="space-y-3">
        <div>
          <Label>Group name</Label>
          <Input
            placeholder="e.g. iPhone XS / 11 Pro OLED assembly"
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <p className="text-xs text-muted mt-1">Something you'll recognize later — this is what shows in the list, not customers.</p>
        </div>
        <div>
          <Label>Part type</Label>
          <select className="w-full rounded-md bg-panel2 border border-line px-3 py-2.5 text-sm text-ink" value={form.part_type} onChange={(e) => setForm({ ...form, part_type: e.target.value as CompatibilityGroup['part_type'] })}>
            <option value="display">Display</option>
            <option value="battery">Battery</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div><Label>Notes (optional)</Label><Input placeholder="e.g. OLED assembly, same connector" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        <div>
          <Label>Models in this group ({selected.size} selected)</Label>
          <Input placeholder="Search models…" value={search} onChange={(e) => setSearch(e.target.value)} className="mb-2" />
          <div className="max-h-48 overflow-y-auto border border-line rounded-md divide-y divide-line">
            {filtered.length === 0 ? (
              <p className="p-3 text-xs text-muted">No models match.</p>
            ) : filtered.map((m) => (
              <label key={m.id} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-panel2">
                <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} className="accent-accent" />
                <span className="text-ink">{m.name}</span>
              </label>
            ))}
          </div>
        </div>
        <Button className="w-full" disabled={!form.name?.trim()} onClick={() => onSave(form, [...selected])}>Save group</Button>
      </div>
    </Dialog>
  );
}

// ============================================================ ORDERS
function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = useCallback(async () => {
    const { data } = await supabase().from('orders').select('*, order_items(*, products(name))').order('created_at', { ascending: false });
    setOrders((data as any) || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function dispatch(id: string) {
    const { error } = await supabase().from('orders').update({ status: 'dispatched' }).eq('id', id);
    if (error) return toast(error.message, 'bad');
    toast('Order marked as dispatched — the customer will see this update', 'good');
    load();
  }

  async function deliver(id: string) {
    const { error } = await supabase().from('orders').update({ status: 'delivered' }).eq('id', id);
    if (error) return toast(error.message, 'bad');
    toast('Order marked as delivered', 'good');
    load();
  }

  if (loading) return <Skeleton className="h-64" />;
  if (orders.length === 0) return <Empty title="No orders yet" />;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg text-ink">Orders</h2>
      <Table
        head={['Order', 'Items', 'Total', 'Status', '']}
        rows={orders.map((o) => [
          <span key="id" className="font-mono text-xs text-muted">{o.id.slice(0, 8)}</span>,
          <span key="items" className="text-xs">{(o.order_items || []).map((it) => it.products?.name).join(', ')}</span>,
          <span key="total" className="font-mono text-accent2">{money(o.total)}</span>,
          <Badge key="s" tone={o.status === 'delivered' ? 'good' : o.status === 'dispatched' ? 'accent' : 'default'}>{o.status}</Badge>,
          <div key="a" className="flex gap-2">
            {o.status === 'placed' && <Button size="sm" variant="outline" onClick={() => dispatch(o.id)}>Dispatch</Button>}
            {o.status === 'dispatched' && <Button size="sm" variant="outline" onClick={() => deliver(o.id)}>Mark delivered</Button>}
          </div>,
        ])}
      />
    </div>
  );
}

// ============================================================ APPROVALS
function ApprovalsTab() {
  const [pendingAdmins, setPendingAdmins] = useState<any[]>([]);
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetDialog, setResetDialog] = useState<{ userId: string; name: string } | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    const sb = supabase();
    const [a, r] = await Promise.all([
      sb.from('admins').select('*').eq('status', 'pending'),
      sb.from('reset_requests').select('*, profiles(name)').eq('status', 'pending'),
    ]);
    setPendingAdmins(a.data || []);
    setResetRequests((r.data as any) || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function approveAdmin(id: string) {
    const { error } = await supabase().from('admins').update({ status: 'approved' }).eq('id', id);
    if (error) return toast(error.message, 'bad');
    toast('Admin approved', 'good');
    load();
  }

  async function submitReset(newPassword: string) {
    if (!resetDialog) return;
    const sb = supabase();
    const { data: session } = await sb.auth.getSession();
    const res = await fetch('/api/admin-reset', {
      method: 'POST',
      body: JSON.stringify({ adminAccessToken: session.session?.access_token, userId: resetDialog.userId, newPassword }),
    });
    const json = await res.json();
    if (!res.ok) return toast(json.error || 'Reset failed', 'bad');
    toast('Password reset for user', 'good');
    setResetDialog(null);
    load();
  }

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h2 className="font-display text-lg text-ink">Pending admin approvals</h2>
        {pendingAdmins.length === 0 ? <Empty title="No pending admin requests" /> : (
          <Table head={['Email', '']} rows={pendingAdmins.map((a) => [
            <span key="e">{a.email}</span>,
            <Button key="b" size="sm" onClick={() => approveAdmin(a.id)}>Approve</Button>,
          ])} />
        )}
      </div>
      <div className="space-y-3">
        <h2 className="font-display text-lg text-ink">Password reset requests</h2>
        {resetRequests.length === 0 ? <Empty title="No pending reset requests" /> : (
          <Table head={['User', '']} rows={resetRequests.map((r) => [
            <span key="u">{r.profiles?.name || r.user_id}</span>,
            <Button key="b" size="sm" onClick={() => setResetDialog({ userId: r.user_id, name: r.profiles?.name })}>Set new password</Button>,
          ])} />
        )}
      </div>
      {resetDialog && <ResetPasswordDialog name={resetDialog.name} onClose={() => setResetDialog(null)} onSubmit={submitReset} />}
    </div>
  );
}

function ResetPasswordDialog({ name, onClose, onSubmit }: { name: string; onClose: () => void; onSubmit: (p: string) => void }) {
  const [password, setPassword] = useState('');
  return (
    <Dialog open onClose={onClose} title={`Reset password for ${name}`}>
      <div className="space-y-3">
        <div><Label>New password</Label><Input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button className="w-full" onClick={() => onSubmit(password)}>Set new password</Button>
      </div>
    </Dialog>
  );
}
