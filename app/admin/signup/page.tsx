'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Input, Label, Button, useToast } from '@/components/ui';
import { ShieldCheck } from 'lucide-react';

export default function AdminSignup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const sb = supabase();
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error || !data.user) {
      setLoading(false);
      return toast(error?.message || 'Sign up failed', 'bad');
    }
    const { error: adminErr } = await sb.from('admins').insert({ id: data.user.id, email });
    setLoading(false);
    if (adminErr) return toast(adminErr.message, 'bad');
    toast('Request submitted — an approved admin must approve your access', 'good');
    router.push('/admin/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-base">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-lg border border-line bg-panel p-6">
        <div className="flex items-center gap-2 text-accent"><ShieldCheck size={20} /><h1 className="font-display text-xl text-ink">Request admin access</h1></div>
        <div><Label>Email</Label><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><Label>Password</Label><Input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button className="w-full" disabled={loading}>{loading ? 'Submitting…' : 'Request access'}</Button>
        <p className="text-xs text-muted text-center">Your account stays pending until an existing admin approves it.</p>
      </form>
    </div>
  );
}
