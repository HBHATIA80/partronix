'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Input, Label, Button, useToast } from '@/components/ui';
import { AuthModal } from '@/components/auth-modal';
import { hashAnswer, cn } from '@/lib/utils';

export default function Signup() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', question: '', answer: '',
    isWholesaler: false, shopName: '', shopAddress: '',
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const sb = supabase();
    const { data, error } = await sb.auth.signUp({ email: form.email, password: form.password });
    if (error || !data.user) {
      toast(error?.message || 'Sign up failed', 'bad');
      setLoading(false);
      return;
    }
    const answerHash = await hashAnswer(form.answer);
    const { error: profileErr } = await sb.from('profiles').insert({
      id: data.user.id,
      name: form.name,
      phone: form.phone,
      secret_question: form.question,
      secret_answer_hash: answerHash,
      is_wholesaler: form.isWholesaler,
      wholesaler_status: form.isWholesaler ? 'pending' : null,
      shop_name: form.isWholesaler ? form.shopName : null,
      shop_address: form.isWholesaler ? form.shopAddress : null,
    });
    setLoading(false);
    if (profileErr) {
      toast(profileErr.message, 'bad');
      return;
    }
    toast(form.isWholesaler ? 'Account created — wholesaler request sent to admin' : 'Account created — welcome!', 'good');
    router.push('/');
  }

  return (
    <AuthModal>
      <form onSubmit={onSubmit} className="space-y-4">
        <h1 className="font-display text-2xl text-ink">Create account</h1>
        <div>
          <Label>Full name</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>Email</Label>
          <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <Label>Password</Label>
          <Input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>

        <div>
          <Label>Are you a wholesaler?</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, isWholesaler: false })}
              className={cn(
                'flex-1 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors',
                !form.isWholesaler ? 'bg-accent text-white border-accent' : 'border-line text-muted hover:text-ink'
              )}
            >
              No, I'm a customer
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, isWholesaler: true })}
              className={cn(
                'flex-1 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors',
                form.isWholesaler ? 'bg-accent text-white border-accent' : 'border-line text-muted hover:text-ink'
              )}
            >
              Yes, wholesaler
            </button>
          </div>
        </div>

        {form.isWholesaler && (
          <div className="space-y-4 rounded-md border border-accent/30 bg-accent/5 p-3.5">
            <div>
              <Label>Shop name</Label>
              <Input required placeholder="e.g. Bhatia Mobile Spares" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
            </div>
            <div>
              <Label>Shop address</Label>
              <Input required placeholder="Shop no., street, city" value={form.shopAddress} onChange={(e) => setForm({ ...form, shopAddress: e.target.value })} />
            </div>
            <p className="text-xs text-muted">An admin reviews wholesaler requests — wholesale pricing unlocks once approved.</p>
          </div>
        )}

        <div>
          <Label>Secret question (used to reset your password)</Label>
          <Input required placeholder="e.g. Name of your first pet?" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
        </div>
        <div>
          <Label>Secret answer</Label>
          <Input required value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
        </div>
        <Button className="w-full" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</Button>
        <p className="text-xs text-muted text-center">
          Already have an account? <Link href="/login" className="text-accent2">Log in</Link>
        </p>
      </form>
    </AuthModal>
  );
}
