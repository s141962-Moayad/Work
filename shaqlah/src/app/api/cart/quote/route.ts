import { z } from "zod";
import { handler } from "@/lib/api";
import { pool } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { priceCart } from "@/lib/pricing";
import { cartLineSchema } from "@/lib/orders";

const schema = z.object({
  items: z.array(cartLineSchema).min(1, "السلة فارغة.").max(60),
  couponCode: z.string().max(40).optional().nullable(),
});

/** Server-side price calculation for the cart / checkout summary (no client prices are trusted). */
export const POST = handler({ schema, rate: ["quote", 120, 60_000] }, async ({ body }) => {
  const settings = await getSettings();
  const p = await priceCart(pool(), body.items as any, body.couponCode, settings);
  return {
    ...p,
    ordering: { enabled: settings.ordering.enabled },
  };
});
