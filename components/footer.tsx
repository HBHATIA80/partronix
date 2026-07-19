import Link from 'next/link';
import { Cpu, Mail, MapPin, Phone } from 'lucide-react';
import { Input, Button } from '@/components/ui';

export function Footer() {
  return (
    <footer className="border-t border-line mt-16">
      <div className="max-w-6xl mx-auto px-4 py-12 grid gap-10 md:grid-cols-[1.2fr_1fr_1fr_1.1fr]">
        <div className="space-y-3 max-w-sm">
          <Link href="/" className="flex items-center gap-2 font-display text-lg text-ink">
            <Cpu size={20} className="text-accent" /> PartShop
          </Link>
          <p className="text-sm text-muted leading-relaxed">
            We stock and test genuine screens, batteries, and boards ourselves before they
            go up for sale — no drop-shipping, no guessing which part fits which model.
          </p>
        </div>
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wide text-muted">Shop</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/" className="hover:text-ink">Browse catalog</Link></li>
            <li><Link href="/cart" className="hover:text-ink">Your cart</Link></li>
            <li><Link href="/account" className="hover:text-ink">Track your order</Link></li>
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wide text-muted">Policies</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li>Shipping & delivery</li>
            <li>Returns & refunds</li>
            <li>Warranty terms</li>
            <li>Privacy policy</li>
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wide text-muted">Stay updated</h3>
          <p className="text-sm text-muted">New stock and restock alerts, no spam.</p>
          <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <Input placeholder="Your email" type="email" className="text-sm" />
            <Button size="sm" className="shrink-0">Join</Button>
          </form>
          <ul className="space-y-2 text-sm text-muted pt-1">
            <li className="flex items-center gap-2"><Phone size={14} /> Mon–Sat, 10am–7pm IST</li>
            <li className="flex items-center gap-2"><Mail size={14} /> support@partshop.example</li>
            <li className="flex items-center gap-2"><MapPin size={14} /> Counter pickup available</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap gap-3 justify-between items-center text-xs text-muted">
          <span>© {new Date().getFullYear()} PartShop. Prices inclusive of applicable taxes.</span>
          <span className="flex items-center gap-3 font-mono uppercase tracking-wide">
            UPI · Cards · Net Banking · COD
          </span>
        </div>
      </div>
    </footer>
  );
}
