'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Input, Label, Button, useToast, Dialog } from '@/components/ui';
import { hashAnswer } from '@/lib/utils';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const sb = supabase();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast(error.message, 'bad');
    toast('Welcome back!', 'good');
    router.push('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-lg border border-line bg-panel p-6">
        <h1 className="font-display text-2xl text-ink">Log in</h1>
        <div>
          <Label>Email</Label>
          <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label>Password</Label>
          <Input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button className="w-full" disabled={loading}>{loading ? 'Signing in…' : 'Log in'}</Button>
        <div className="flex items-center justify-between text-xs text-muted">
          <button type="button" onClick={() => setResetOpen(true)} className="text-accent">Forgot password?</button>
          <Link href="/signup" className="text-accent">Create account</Link>
        </div>
      </form>
      <ResetDialog open={resetOpen} onClose={() => setResetOpen(false)} />
    </div>
  );
}

function ResetDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<'lookup' | 'question' | 'requested'>('lookup');
  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [userId, setUserId] = useState('');
  const toast = useToast();

  async function lookup() {
    const sb = supabase();
    // Secret question is fetched via a security-definer RPC so we never expose
    // the profiles table (or any other user's data) to anonymous visitors.
    const { data, error } = await sb.rpc('get_secret_question', { p_email: email });
    if (error || !data) {
      toast('No account found for that email', 'bad');
      return;
    }
    setQuestion(data.question);
    setUserId(data.user_id);
    setStep('question');
  }

  async function verifyAndReset() {
    const sb = supabase();
    const answerHash = await hashAnswer(answer);
    const { data, error } = await sb.rpc('reset_password_with_secret', {
      p_user_id: userId,
      p_answer_hash: answerHash,
      p_new_password: newPassword,
    });
    if (error || !data) {
      toast('Answer did not match', 'bad');
      return;
    }
    toast('Password reset — you can log in now', 'good');
    onClose();
  }

  async function requestAdminReset() {
    const sb = supabase();
    const { error } = await sb.rpc('request_admin_reset', { p_email: email });
    if (error) return toast(error.message, 'bad');
    setStep('requested');
  }

  return (
    <Dialog open={open} onClose={onClose} title="Reset password">
      {step === 'lookup' && (
        <div className="space-y-3">
          <Label>Account email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          <Button className="w-full" onClick={lookup}>Continue with secret question</Button>
          <Button className="w-full" variant="outline" onClick={requestAdminReset}>Request admin reset instead</Button>
        </div>
      )}
      {step === 'question' && (
        <div className="space-y-3">
          <p className="text-sm text-ink">{question}</p>
          <Input placeholder="Your answer" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <Input placeholder="New password" type="password" minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <Button className="w-full" onClick={verifyAndReset}>Reset password</Button>
        </div>
      )}
      {step === 'requested' && (
        <p className="text-sm text-muted">Your request was sent to an admin. You'll be able to log in with a new password once it's approved.</p>
      )}
    </Dialog>
  );
}
