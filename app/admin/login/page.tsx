'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Input, Label, Button, useToast } from '@/components/ui';
import { AuthModal } from '@/components/auth-modal';
import { ShieldCheck } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const sb = supabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      setLoading(false);
      return toast(error?.message || 'Login failed', 'bad');
    }
    const { data: adminRow } = await sb.from('admins').select('status').eq('id', data.user.id).single();
    setLoading(false);
    if (!adminRow) {
      await sb.auth.signOut();
      return toast('No admin account found for this login', 'bad');
    }
    if (adminRow.status !== 'approved') {
      await sb.auth.signOut();
      return toast('Your admin account is awaiting approval', 'bad');
    }
    toast('Welcome back', 'good');
    router.push('/admin/dashboard');
  }

  return (
    <AuthModal>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex items-center gap-2 text-accent2"><ShieldCheck size={20} /><h1 className="font-display text-xl text-ink">Admin login</h1></div>
        <div><Label>Email</Label><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><Label>Password</Label><Input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button className="w-full" disabled={loading}>{loading ? 'Signing in…' : 'Log in'}</Button>
        <p className="text-xs text-muted text-center">New admin? <Link href="/admin/signup" className="text-accent2">Request access</Link></p>
      </form>
    </AuthModal>
  );
}
