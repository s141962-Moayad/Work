"use client";
import { api } from "./client";
import { cart } from "./cart-store";

/** Rebuilds the cart from a previous order using today's prices; unavailable dishes are skipped. */
export async function reorder(number: string, token?: string | null): Promise<{ added: number; skipped: number }> {
  const { lines } = await api<{ lines: any[] }>(`/api/orders/${encodeURIComponent(number)}/reorder${token ? `?k=${token}` : ""}`, { body: {} });
  let work = [...lines];
  let skipped = 0;
  for (let attempt = 0; attempt < 6 && work.length; attempt++) {
    try {
      const q = await api<any>("/api/cart/quote", { body: { items: work } });
      cart.replaceAll(
        q.lines.map((l: any, i: number) => ({
          itemId: work[i].itemId,
          name: l.name,
          image: null,
          icon: "🍽️",
          variantId: work[i].variantId ?? null,
          variantName: l.variantName,
          addons: l.addons,
          unitPrice: l.unitPrice,
          quantity: work[i].quantity,
          notes: work[i].notes ?? "",
        })),
      );
      return { added: work.length, skipped: skipped + (lines.length - work.length - skipped) };
    } catch (e: any) {
      const idx = e.extra?.lineIndex;
      if (typeof idx !== "number") throw e;
      work = work.filter((_, i) => i !== idx);
      skipped++;
    }
  }
  return { added: 0, skipped: lines.length };
}
