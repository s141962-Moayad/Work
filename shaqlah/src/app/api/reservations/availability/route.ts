import { z } from "zod";
import { handler } from "@/lib/api";
import { pool } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { maxPartySize, reservationAvailability } from "@/lib/reservations";
import { addDays, muscatDate } from "@/lib/utils";
import { dateStr } from "@/lib/validation";
import { openingWindow } from "@/lib/pickup";

const schema = z.object({
  date: dateStr.optional(),
  party: z.coerce.number().int().min(1).max(40).default(2),
  area: z.enum(["any", "indoor", "outdoor"]).default("any"),
  exclude: z.coerce.number().int().optional(),
});

export const GET = handler({ schema, rate: ["res-avail", 120, 60_000] }, async ({ body }) => {
  const settings = await getSettings();
  const now = new Date();
  const today = muscatDate(now);
  const days = Array.from({ length: settings.reservations.maxDaysAhead + 1 }, (_, i) => {
    const date = addDays(today, i);
    return { date, closed: !openingWindow(date, settings) };
  });
  const max = await maxPartySize();
  const base = { enabled: settings.reservations.enabled, maxParty: max, days, durationMinutes: settings.reservations.durationMinutes };
  if (!body.date || !settings.reservations.enabled || body.party > max) return { ...base, closed: false, slots: [] };
  if (!days.some((d) => d.date === body.date)) return { ...base, closed: true, slots: [] };
  return { ...base, ...(await reservationAvailability(pool(), body.date, body.party, body.area, settings, now, body.exclude ?? null)) };
});
