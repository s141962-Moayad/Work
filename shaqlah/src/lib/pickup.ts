import type { Db } from "./db";
import type { Settings } from "./settings";
import { ApiError } from "./api";
import { addDays, hhmmToMin, muscatDate, muscatDayStart, muscatTime, weekdayOf } from "./utils";

export interface PickupSlot {
  start: string; // ISO
  time: string; // Muscat "HH:MM"
  nextDay: boolean; // after midnight of the selected business day
  remaining: number;
}

/** Opening window for a business day, in minutes since that day's midnight (end may exceed 1440). */
export function openingWindow(date: string, settings: Settings): { start: number; end: number } | null {
  const h = settings.hours[weekdayOf(date)];
  if (!h || h.closed) return null;
  const start = hhmmToMin(h.open);
  let end = hhmmToMin(h.close);
  if (end <= start) end += 1440;
  return { start, end };
}

/** Every bookable start time of a business day (ignores "now", blocks and capacity). */
export function slotGrid(date: string, settings: Settings): Date[] {
  const w = openingWindow(date, settings);
  if (!w) return [];
  const { slotIntervalMinutes: step, lastPickupBeforeCloseMinutes: before } = settings.ordering;
  const day0 = muscatDayStart(date).getTime();
  const out: Date[] = [];
  for (let m = w.start; m <= w.end - before; m += step) out.push(new Date(day0 + m * 60_000));
  return out;
}

async function blockedRanges(db: Db, from: Date, to: Date, kind: "pickup" | "reservations") {
  const { rows } = await db.query(
    `SELECT starts_at, ends_at FROM blocked_periods
      WHERE applies_to IN ('all', $3) AND starts_at < $2 AND ends_at > $1`,
    [from, to, kind],
  );
  return rows as { starts_at: Date; ends_at: Date }[];
}
export const blockedFor = blockedRanges;

export async function listSlots(
  db: Db,
  date: string,
  prepMinutes: number,
  settings: Settings,
  now = new Date(),
): Promise<{ closed: boolean; slots: PickupSlot[] }> {
  const grid = slotGrid(date, settings);
  if (!grid.length) return { closed: true, slots: [] };
  const earliest = now.getTime() + prepMinutes * 60_000;
  const horizon = muscatDayStart(addDays(muscatDate(now), settings.ordering.maxDaysAhead + 1)).getTime();
  const first = grid[0];
  const last = grid[grid.length - 1];
  const usage = await db.query(`SELECT slot_start, used_count FROM pickup_slots WHERE slot_start BETWEEN $1 AND $2`, [first, last]);
  const blocked = await blockedRanges(db, first, new Date(last.getTime() + 1), "pickup");
  const used = new Map<number, number>(usage.rows.map((r: any) => [r.slot_start.getTime(), r.used_count]));
  const dayEnd = muscatDayStart(addDays(date, 1)).getTime();
  const slots: PickupSlot[] = [];
  for (const s of grid) {
    const t = s.getTime();
    if (t < earliest || t >= horizon) continue;
    if (blocked.some((b) => t >= b.starts_at.getTime() && t < b.ends_at.getTime())) continue;
    const remaining = settings.ordering.capacityPerSlot - (used.get(t) ?? 0);
    if (remaining <= 0) continue;
    slots.push({ start: s.toISOString(), time: muscatTime(s), nextDay: t >= dayEnd, remaining });
  }
  return { closed: false, slots };
}

/** Next available slots across the coming days (used by "as soon as possible"). */
export async function nextSlots(db: Db, prepMinutes: number, settings: Settings, now = new Date(), limit = 6): Promise<PickupSlot[]> {
  const today = muscatDate(now);
  const out: PickupSlot[] = [];
  const seen = new Set<string>();
  for (let d = -1; d <= settings.ordering.maxDaysAhead && out.length < limit; d++) {
    const { slots } = await listSlots(db, addDays(today, d), prepMinutes, settings, now);
    for (const s of slots) {
      if (!seen.has(s.start)) {
        seen.add(s.start);
        out.push(s);
      }
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start)).slice(0, limit);
}

/** Atomically takes one unit of capacity in a slot. Returns slot id, or null when the slot is full. */
export async function claimSlot(db: Db, start: Date, capacity: number): Promise<number | null> {
  const { rows } = await db.query(
    `INSERT INTO pickup_slots(slot_start, used_count) VALUES ($1, 1)
     ON CONFLICT (slot_start) DO UPDATE SET used_count = pickup_slots.used_count + 1
       WHERE pickup_slots.used_count < $2
     RETURNING id`,
    [start, capacity],
  );
  return rows[0]?.id ?? null;
}

export async function releaseSlot(db: Db, slotId: number | null) {
  if (slotId) await db.query(`UPDATE pickup_slots SET used_count = GREATEST(used_count - 1, 0) WHERE id = $1`, [slotId]);
}

export interface PickupChoice {
  mode: "asap" | "scheduled";
  slotStart?: string; // ISO from the slots API (scheduled)
}

/**
 * Server-side validation + reservation of pickup capacity. Must run inside the
 * order transaction so a failed order never keeps a slot.
 */
export async function reservePickup(
  db: Db,
  choice: PickupChoice,
  prepMinutes: number,
  settings: Settings,
  now = new Date(),
): Promise<{ slotId: number; pickupAt: Date }> {
  const cap = settings.ordering.capacityPerSlot;
  if (choice.mode === "asap") {
    const candidates = await nextSlots(db, prepMinutes, settings, now, 8);
    for (const c of candidates) {
      const id = await claimSlot(db, new Date(c.start), cap);
      if (id) return { slotId: id, pickupAt: new Date(c.start) };
    }
    throw new ApiError(409, "لا تتوفر مواعيد استلام حاليًا. يرجى المحاولة لاحقًا أو اختيار موعد آخر.", { field: "pickup" });
  }

  if (!choice.slotStart) throw new ApiError(400, "يرجى اختيار موعد الاستلام.", { field: "pickup" });
  const start = new Date(choice.slotStart);
  if (Number.isNaN(start.getTime())) throw new ApiError(400, "موعد الاستلام غير صحيح.", { field: "pickup" });
  if (start.getTime() < now.getTime()) throw new ApiError(400, "لا يمكن اختيار موعد في الماضي.", { field: "pickup" });
  if (start.getTime() < now.getTime() + prepMinutes * 60_000) {
    throw new ApiError(400, `الموعد المختار مبكر جدًا؛ يحتاج طلبك إلى ${prepMinutes} دقيقة تحضير على الأقل.`, { field: "pickup" });
  }
  const d = muscatDate(start);
  const valid = [addDays(d, -1), d].some((bd) => slotGrid(bd, settings).some((g) => g.getTime() === start.getTime()));
  if (!valid) throw new ApiError(400, "الموعد المختار خارج ساعات العمل.", { field: "pickup" });
  const horizon = muscatDayStart(addDays(muscatDate(now), settings.ordering.maxDaysAhead + 1)).getTime();
  if (start.getTime() >= horizon) throw new ApiError(400, "لا يمكن الحجز لموعد بعيد إلى هذا الحد.", { field: "pickup" });
  const blocked = await blockedRanges(db, start, new Date(start.getTime() + 1), "pickup");
  if (blocked.length) throw new ApiError(409, "المطعم غير متاح للاستلام في هذا الموعد.", { field: "pickup" });
  const id = await claimSlot(db, start, cap);
  if (!id) throw new ApiError(409, "عذرًا، امتلأ هذا الموعد. يرجى اختيار موعد آخر.", { field: "pickup" });
  return { slotId: id, pickupAt: start };
}
