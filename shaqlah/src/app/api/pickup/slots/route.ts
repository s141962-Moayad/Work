import { z } from "zod";
import { handler } from "@/lib/api";
import { pool } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { priceCart } from "@/lib/pricing";
import { cartLineSchema } from "@/lib/orders";
import { listSlots, nextSlots, openingWindow } from "@/lib/pickup";
import { addDays, muscatDate } from "@/lib/utils";
import { dateStr } from "@/lib/validation";

const schema = z.object({
  items: z.array(cartLineSchema).min(1).max(60),
  date: dateStr.optional(),
});

/**
 * Returns the estimated preparation time and the *available* pickup slots only.
 * Without `date`: the next few slots overall plus the list of selectable days.
 */
export const POST = handler({ schema, rate: ["slots", 120, 60_000] }, async ({ body }) => {
  const settings = await getSettings();
  const now = new Date();
  const { prepMinutes } = await priceCart(pool(), body.items as any, null, settings);
  const today = muscatDate(now);
  const days = Array.from({ length: settings.ordering.maxDaysAhead + 1 }, (_, i) => {
    const date = addDays(today, i);
    return { date, closed: !openingWindow(date, settings) };
  });
  if (!body.date) {
    return { prepMinutes, days, next: await nextSlots(pool(), prepMinutes, settings, now, 6) };
  }
  if (!days.some((d) => d.date === body.date)) return { prepMinutes, days, closed: true, slots: [] };
  const r = await listSlots(pool(), body.date, prepMinutes, settings, now);
  return { prepMinutes, days, ...r };
});
