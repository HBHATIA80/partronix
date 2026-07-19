'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabase';

type PricingState = { wholesaleActive: boolean; loading: boolean };
const PricingContext = createContext<PricingState>({ wholesaleActive: false, loading: true });

export const useWholesalePricing = () => useContext(PricingContext);

export function PricingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PricingState>({ wholesaleActive: false, loading: true });

  useEffect(() => {
    const sb = supabase();
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return setState({ wholesaleActive: false, loading: false });
      const { data: profile } = await sb
        .from('profiles')
        .select('is_wholesaler, wholesaler_status')
        .eq('id', data.user.id)
        .single();
      setState({
        wholesaleActive: !!(profile?.is_wholesaler && profile?.wholesaler_status === 'approved'),
        loading: false,
      });
    });
  }, []);

  return <PricingContext.Provider value={state}>{children}</PricingContext.Provider>;
}

// Picks wholesale price when it applies and is actually set, otherwise falls back
// to the regular price — used everywhere a product price is shown or charged.
export function effectivePrice(product: { price: number; wholesale_price?: number | null }, wholesaleActive: boolean) {
  return wholesaleActive && product.wholesale_price != null ? product.wholesale_price : product.price;
}
