import type { Metadata } from 'next';
import { Baloo_2, Inter, JetBrains_Mono } from 'next/font/google';
import { ToastProvider } from '@/components/ui';
import { PricingProvider } from '@/lib/pricing';
import './globals.css';

const display = Baloo_2({ subsets: ['latin'], variable: '--font-display', weight: ['600', '700', '800'] });
const body = Inter({ subsets: ['latin'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '500'] });

export const metadata: Metadata = {
  title: 'PartShop — Mobile Parts & Accessories',
  description: 'Genuine mobile phone parts, sourced and stocked by category and brand.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-body antialiased">
        <ToastProvider>
          <PricingProvider>{children}</PricingProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
