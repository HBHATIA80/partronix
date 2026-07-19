'use client';
import { createContext, useContext, useState, useCallback, ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

// ---------- Button ----------
export function Button({ className, variant = 'primary', size = 'md', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'outline'; size?: 'sm' | 'md' }) {
  const variants = {
    primary: 'bg-accent text-base hover:bg-accent2 disabled:opacity-40',
    outline: 'border border-line text-ink hover:border-accent',
    ghost: 'text-muted hover:text-ink',
    danger: 'bg-bad text-white hover:opacity-90',
  };
  const sizes = { sm: 'text-xs px-3 py-1.5', md: 'text-sm px-4 py-2.5' };
  return (
    <button
      className={cn('rounded-md font-medium transition-colors inline-flex items-center justify-center gap-2', variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

// ---------- Input ----------
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-md bg-panel2 border border-line px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-accent transition-colors',
        className
      )}
      {...props}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="block text-xs font-mono uppercase tracking-wide text-muted mb-1.5">{children}</label>;
}

// ---------- Badge ----------
export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'good' | 'bad' | 'accent' }) {
  const tones = {
    default: 'bg-panel2 text-muted border-line',
    good: 'bg-good/10 text-good border-good/30',
    bad: 'bg-bad/10 text-bad border-bad/30',
    accent: 'bg-accent/10 text-accent2 border-accent/30',
  };
  return <span className={cn('text-[11px] font-mono uppercase tracking-wide px-2 py-0.5 rounded border', tones[tone])}>{children}</span>;
}

// ---------- Dialog ----------
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-panel border border-line p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-ink">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------- Tabs ----------
export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex gap-1 border-b border-line overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            'px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
            active === t.key ? 'border-accent text-accent2' : 'border-transparent text-muted hover:text-ink'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Table ----------
export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-panel2 text-left">
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5 font-mono text-xs uppercase tracking-wide text-muted whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={head.length} className="px-4 py-8 text-center text-muted text-sm">No records yet.</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line hover:bg-panel2/50">
              {r.map((c, j) => <td key={j} className="px-4 py-2.5 align-middle">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Skeleton ----------
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-panel2 rounded-md', className)} />;
}

// ---------- Toast ----------
type Toast = { id: number; message: string; tone: 'good' | 'bad' | 'default' };
const ToastCtx = createContext<(message: string, tone?: Toast['tone']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast['tone'] = 'default') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'rounded-md border px-4 py-3 text-sm shadow-lg bg-panel',
              t.tone === 'good' && 'border-good/40 text-good',
              t.tone === 'bad' && 'border-bad/40 text-bad',
              t.tone === 'default' && 'border-line text-ink'
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Empty state ----------
export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="text-center py-16 border border-dashed border-line rounded-lg">
      <p className="font-display text-ink">{title}</p>
      {hint && <p className="text-sm text-muted mt-1">{hint}</p>}
    </div>
  );
}
