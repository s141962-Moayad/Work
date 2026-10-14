import { handler } from "@/lib/api";
import { loadOrderForRequest } from "@/lib/order-access";

/** Rebuilds cart lines from a previous order; only dishes that still exist are returned. */
export const POST = handler({ rate: ["reorder", 30, 60_000] }, async ({ params, user, query }) => {
  const o = await loadOrderForRequest(params.number, user, query.get("k"));
  return {
    lines: o.items
      .filter((i: any) => i.item_id)
      .map((i: any) => ({ itemId: i.item_id, variantId: i.variant_id, addonIds: i.addon_ids, quantity: i.quantity, notes: i.notes })),
  };
});
