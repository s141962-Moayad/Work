"use client";
import { useEffect, useRef, useState } from "react";
import { api, ClientApiError } from "./client";
import type { CartLine } from "./cart-store";

export interface Quote {
  lines: { unitPrice: number; lineTotal: number; name: string; variantName: string | null; addons: { id: number; name: string; price: number }[]; quantity: number }[];
  subtotal: number;
  discount: number;
  fee: number;
  tax: number;
  total: number;
  vatIncluded: boolean;
  prepMinutes: number;
  coupon: { code: string; description: string } | null;
}

export const toPayloadLines = (lines: CartLine[]) =>
  lines.map((l) => ({ itemId: l.itemId, variantId: l.variantId, addonIds: l.addons.map((a) => a.id), quantity: l.quantity, notes: l.notes || null }));

/** Server-authoritative pricing for the current cart (debounced). */
export function useQuote(lines: CartLine[], coupon: string | null) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<{ message: string; lineIndex?: number; field?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  const sig = JSON.stringify([toPayloadLines(lines), coupon]);

  useEffect(() => {
    if (!lines.length) {
      setQuote(null);
      setError(null);
      return;
    }
    const my = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const q = await api<Quote>("/api/cart/quote", { body: { items: toPayloadLines(lines), couponCode: coupon } });
        if (my !== seq.current) return;
        setQuote(q);
        setError(null);
      } catch (e: any) {
        if (my !== seq.current) return;
        const ce = e as ClientApiError;
        setError({ message: ce.message, lineIndex: ce.extra?.lineIndex, field: ce.field });
        if (ce.field !== "coupon") setQuote(null);
      } finally {
        if (my === seq.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return { quote, error, loading };
}
