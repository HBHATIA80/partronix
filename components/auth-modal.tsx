'use client';
import Link from 'next/link';
import { ArrowLeft, X } from 'lucide-react';

export function AuthModal({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-accent/5 via-white to-panel2">
      <Link
        href="/"
        className="fixed top-6 left-6 flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink transition-colors"
      >
        <ArrowLeft size={16} /> Back to home
      </Link>
      <div className="w-full max-w-sm relative animate-[fadeIn_0.2s_ease-out]">
        <Link
          href="/"
          aria-label="Close"
          className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-panel border border-line flex items-center justify-center text-muted hover:text-ink shadow-md z-10 transition-colors"
        >
          <X size={16} />
        </Link>
        <div className="rounded-2xl border border-line bg-panel shadow-2xl shadow-ink/10 p-6 sm:p-7">
          {children}
        </div>
      </div>
    </div>
  );
}
