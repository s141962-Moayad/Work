import { z } from "zod";
import { pool, query, queryOne, tx, type Db } from "./db";
import { ApiError } from "./api";
import { getSettings, type Settings } from "./settings";
import { blockedFor, openingWindow } from "./pickup";
import { notifyAdmins, pushExternal, recordReservationNotification, type ReservationEvent } from "./notify";
import { addDays, formatDateTime, muscatDate, muscatDayStart, muscatTime, randomToken } from "./utils";
import { dateStr, optText, phone, text, timeStr, optEmail } from "./validation";
import type { SessionUser } from "./auth";
import type { ReservationStatus } from "./constants";

export const reservationSchema = z.object({
  name: text("الاسم الكامل", 2, 80),
  phone,
  email: optEmail,
  date: dateStr,
  time: timeStr,
  partySize: z.coerce.number({ error: "عدد الأشخاص مطلوب." }).int().min(1, "عدد الأشخاص يجب أن يكون ١ على الأقل.").max(40, "عدد الأشخاص كبير جدًا."),
  area: z.enum(["any", "indoor", "outdoor"]).default("any"),
  notes: optText("الملاحظات", 500),
  idempotencyKey: z.string().min(8).max(80),
});
export type ReservationInput = z.infer<typeof reservationSchema>;

export interface ResSlot {
  start: string;
  time: string;
  indoor: boolean;
  outdoor: boolean;
}

function resGrid(date: string, settings: Settings): Date[] {
  const w = openingWindow(date, settings);
  if (!w) return [];
  const { slotIntervalMinutes: step, lastSeatingBeforeCloseMinutes: before } = settings.reservations;
  const day0 = muscatDayStart(date).getTime();
  const out: Date[] = [];
  for (let m = w.start; m <= w.end - before; m += step) out.push(new Date(day0 + m * 60_000));
  return out;
}

export async function maxPartySize(db: Db = pool()) {
  const { rows } = await db.query("SELECT COALESCE(MAX(capacity),0) AS m FROM restaurant_tables WHERE active");
  return rows[0].m as number;
}

export async function reservationAvailability(
  db: Db,
  date: string,
  party: number,
  area: "any" | "indoor" | "outdoor",
  settings: Settings,
  now = new Date(),
  excludeId: number | null = null,
): Promise<{ closed: boolean; slots: ResSlot[] }> {
  const grid = resGrid(date, settings);
  if (!grid.length) return { closed: true, slots: [] };
  const dur = settings.reservations.durationMinutes * 60_000;
  const first = grid[0];
  const last = grid[grid.length - 1];
  const tables = await db.query(`SELECT id, area FROM restaurant_tables WHERE active AND capacity >= $1`, [party]);
  const live = await db.query(
    `SELECT table_id, start_at, end_at FROM reservations
      WHERE status IN ('pending','confirmed') AND start_at < $2 AND end_at > $1 AND ($3::int IS NULL OR id <> $3)`,
    [first, new Date(last.getTime() + dur), excludeId],
  );
  const blocked = await blockedFor(db, first, new Date(last.getTime() + dur), "reservations");
  const earliest = now.getTime() + settings.reservations.minLeadMinutes * 60_000;
  const horizon = muscatDayStart(addDays(muscatDate(now), settings.reservations.maxDaysAhead + 1)).getTime();
  const slots: ResSlot[] = [];
  for (const g of grid) {
    const s = g.getTime();
    const e = s + dur;
    if (s < earliest || s >= horizon) continue;
    if (blocked.some((b) => s < b.ends_at.getTime() && e > b.starts_at.getTime())) continue;
    const free = tables.rows.filter(
      (t: any) => !live.rows.some((r: any) => r.table_id === t.id && s < r.end_at.getTime() && e > r.start_at.getTime()),
    );
    const indoor = free.some((t: any) => t.area === "indoor");
    const outdoor = free.some((t: any) => t.area === "outdoor");
    const okSlot = area === "any" ? indoor || outdoor : area === "indoor" ? indoor : outdoor;
    if (okSlot) slots.push({ start: g.toISOString(), time: muscatTime(g), indoor, outdoor });
  }
  return { closed: false, slots };
}

async function candidateTables(db: Db, start: Date, end: Date, party: number, area: string, excludeId: number | null) {
  const { rows } = await db.query(
    `SELECT t.id FROM restaurant_tables t
      WHERE t.active AND t.capacity >= $1 AND ($2 = 'any' OR t.area = $2)
        AND NOT EXISTS (SELECT 1 FROM reservations r
                         WHERE r.table_id = t.id AND r.status IN ('pending','confirmed')
                           AND tstzrange(r.start_at, r.end_at) && tstzrange($3, $4)
                           AND ($5::int IS NULL OR r.id <> $5))
      ORDER BY t.capacity, t.id`,
    [party, area, start, end, excludeId],
  );
  return rows.map((r: any) => r.id as number);
}

async function validateWhen(
  db: Db, date: string, time: string, party: number, area: string, settings: Settings, now: Date,
): Promise<{ start: Date; end: Date }> {
  if (!settings.reservations.enabled) throw new ApiError(503, "حجز الطاولات متوقف مؤقتًا.");
  const max = await maxPartySize(db);
  if (max === 0) throw new ApiError(503, "لا تتوفر طاولات للحجز حاليًا.");
  if (party > max) throw new ApiError(400, `الحد الأقصى لعدد الأشخاص في الحجز الواحد هو ${max}. للمجموعات الأكبر يرجى التواصل معنا مباشرة.`, { field: "partySize" });
  const { slots } = await reservationAvailability(db, date, party, area as any, settings, now);
  const wanted = slots.find((s) => s.time === time);
  const start = new Date(`${date}T${time}:00+04:00`);
  if (start.getTime() < now.getTime()) throw new ApiError(400, "لا يمكن الحجز في وقت سابق.", { field: "time" });
  if (!wanted) throw new ApiError(409, "هذا الموعد غير متاح. يرجى اختيار وقت آخر.", { field: "time" });
  return { start, end: new Date(start.getTime() + settings.reservations.durationMinutes * 60_000) };
}

const FULL_MSG = "عذرًا، لم يعد هذا الموعد متاحًا. يرجى اختيار وقت آخر.";

export async function createReservation(input: ReservationInput, user: SessionUser | null, now = new Date()) {
  const dup = await queryOne<any>("SELECT number, access_token FROM reservations WHERE idempotency_key=$1", [input.idempotencyKey]);
  if (dup) return { number: dup.number as string, token: dup.access_token as string, duplicate: true };

  const settings = await getSettings();
  const { start, end } = await validateWhen(pool(), input.date, input.time, input.partySize, input.area, settings, now);
  const tables = await candidateTables(pool(), start, end, input.partySize, input.area, null);
  const token = randomToken();
  const status = settings.reservations.autoConfirm ? "confirmed" : "pending";

  for (const tableId of tables) {
    try {
      const res = await tx(async (c) => {
        const num = (await c.query("SELECT nextval('reservation_number_seq') AS n")).rows[0].n;
        const { rows } = await c.query(
          `INSERT INTO reservations(number,access_token,user_id,table_id,customer_name,phone,email,party_size,area_pref,start_at,end_at,status,notes,idempotency_key)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
          [`RSV-${num}`, token, user?.id ?? null, tableId, input.name, input.phone, input.email, input.partySize, input.area, start, end, status, input.notes, input.idempotencyKey],
        );
        const r = rows[0];
        const outbound = await recordReservationNotification(c, r, status === "confirmed" ? "confirmed" : "created");
        await notifyAdmins(c, {
          kind: "reservation.new", title: "حجز طاولة جديد!", reservationId: r.id, link: `/admin/reservations?open=${r.id}`,
          body: `${r.number} — ${input.name} — ${input.partySize} أشخاص — ${formatDateTime(start)}`,
        });
        return { r, outbound };
      });
      void pushExternal(res.outbound);
      return { number: res.r.number as string, token, duplicate: false };
    } catch (e: any) {
      if (e?.code === "23P01") continue; // someone took this table a moment ago → try the next one
      if (e?.code === "23505" && String(e.constraint ?? "").includes("idempotency")) {
        const again = await queryOne<any>("SELECT number, access_token FROM reservations WHERE idempotency_key=$1", [input.idempotencyKey]);
        if (again) return { number: again.number as string, token: again.access_token as string, duplicate: true };
      }
      throw e;
    }
  }
  throw new ApiError(409, FULL_MSG, { field: "time" });
}

export async function getReservation(where: { id?: number; number?: string }) {
  return queryOne<any>(
    `SELECT r.*, t.name AS table_name, t.area AS table_area FROM reservations r JOIN restaurant_tables t ON t.id=r.table_id
      WHERE ${where.id ? "r.id=$1" : "r.number=$1"}`,
    [where.id ?? where.number],
  );
}

export function publicReservation(r: any) {
  const { access_token, idempotency_key, ...rest } = r;
  return rest;
}

export async function canAccessReservation(r: { user_id: string | null; access_token: string }, user: SessionUser | null, token?: string | null) {
  if (user && (user.role === "staff" || user.role === "admin")) return true;
  if (user && r.user_id && r.user_id === user.id) return true;
  return !!token && token === r.access_token;
}

function assertCutoff(r: any, settings: Settings, now: Date, verb: string) {
  const hoursLeft = (r.start_at.getTime() - now.getTime()) / 3_600_000;
  if (hoursLeft < settings.reservations.modifyCutoffHours) {
    throw new ApiError(400, `لا يمكن ${verb} الحجز قبل الموعد بأقل من ${settings.reservations.modifyCutoffHours} ساعة. يرجى التواصل مع المطعم.`);
  }
}

export async function setReservationStatus(id: number, next: ReservationStatus, opts: { byCustomer?: boolean } = {}) {
  const res = await tx(async (c) => {
    const { rows } = await c.query("SELECT * FROM reservations WHERE id=$1 FOR UPDATE", [id]);
    const r = rows[0];
    if (!r) throw new ApiError(404, "الحجز غير موجود.");
    if (r.status === next) return { r, outbound: null };
    const allowed: Record<string, string[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["completed", "no_show", "cancelled"],
      completed: [], cancelled: [], no_show: [],
    };
    if (!allowed[r.status].includes(next)) throw new ApiError(400, "لا يمكن تغيير حالة الحجز إلى هذه الحالة.");
    await c.query("UPDATE reservations SET status=$2, updated_at=now() WHERE id=$1", [id, next]);
    const ev: ReservationEvent | null = next === "confirmed" ? "confirmed" : next === "cancelled" ? "cancelled" : null;
    const outbound = ev ? await recordReservationNotification(c, r, ev) : null;
    if (next === "cancelled" && opts.byCustomer) {
      await notifyAdmins(c, { kind: "reservation.cancelled", title: "تم إلغاء حجز.", reservationId: id, link: `/admin/reservations?open=${id}`, body: r.number });
    }
    return { r: { ...r, status: next }, outbound };
  });
  if (res.outbound) void pushExternal(res.outbound);
  return res.r;
}

export async function cancelReservationByCustomer(id: number, now = new Date()) {
  const settings = await getSettings();
  const r = await queryOne<any>("SELECT * FROM reservations WHERE id=$1", [id]);
  if (!r) throw new ApiError(404, "الحجز غير موجود.");
  if (!["pending", "confirmed"].includes(r.status)) throw new ApiError(400, "لا يمكن إلغاء هذا الحجز.");
  assertCutoff(r, settings, now, "إلغاء");
  return setReservationStatus(id, "cancelled", { byCustomer: true });
}

export const modifySchema = z.object({
  date: dateStr, time: timeStr,
  partySize: z.coerce.number().int().min(1).max(40),
  area: z.enum(["any", "indoor", "outdoor"]),
  notes: optText("الملاحظات", 500),
});

export async function modifyReservation(id: number, p: z.infer<typeof modifySchema>, now = new Date()) {
  const settings = await getSettings();
  const r = await queryOne<any>("SELECT * FROM reservations WHERE id=$1", [id]);
  if (!r) throw new ApiError(404, "الحجز غير موجود.");
  if (!["pending", "confirmed"].includes(r.status)) throw new ApiError(400, "لا يمكن تعديل هذا الحجز.");
  assertCutoff(r, settings, now, "تعديل");

  const max = await maxPartySize();
  if (p.partySize > max) throw new ApiError(400, `الحد الأقصى لعدد الأشخاص هو ${max}.`, { field: "partySize" });
  const { slots } = await reservationAvailability(pool(), p.date, p.partySize, p.area, settings, now, id);
  const start = new Date(`${p.date}T${p.time}:00+04:00`);
  if (!slots.find((s) => s.time === p.time)) throw new ApiError(409, "هذا الموعد غير متاح. يرجى اختيار وقت آخر.", { field: "time" });
  const end = new Date(start.getTime() + settings.reservations.durationMinutes * 60_000);
  let tables = await candidateTables(pool(), start, end, p.partySize, p.area, id);
  if (tables.includes(r.table_id)) tables = [r.table_id, ...tables.filter((t) => t !== r.table_id)]; // keep their table when possible
  const status = settings.reservations.autoConfirm ? "confirmed" : "pending";

  for (const tableId of tables) {
    try {
      const out = await tx(async (c) => {
        const { rows } = await c.query(
          `UPDATE reservations SET table_id=$2,start_at=$3,end_at=$4,party_size=$5,area_pref=$6,notes=$7,status=$8,updated_at=now() WHERE id=$1 RETURNING *`,
          [id, tableId, start, end, p.partySize, p.area, p.notes, status],
        );
        const outbound = await recordReservationNotification(c, rows[0], status === "confirmed" ? "confirmed" : "modified");
        await notifyAdmins(c, { kind: "reservation.modified", title: "تم تعديل حجز.", reservationId: id, link: `/admin/reservations?open=${id}`, body: rows[0].number });
        return outbound;
      });
      void pushExternal(out);
      return;
    } catch (e: any) {
      if (e?.code === "23P01") continue;
      throw e;
    }
  }
  throw new ApiError(409, FULL_MSG, { field: "time" });
}

export async function reassignTable(id: number, tableId: number) {
  const [t, r] = await Promise.all([
    queryOne<any>("SELECT capacity, active FROM restaurant_tables WHERE id=$1", [tableId]),
    queryOne<any>("SELECT party_size FROM reservations WHERE id=$1", [id]),
  ]);
  if (!t || !t.active || !r) throw new ApiError(404, "الطاولة أو الحجز غير موجود.");
  if (t.capacity < r.party_size) throw new ApiError(400, "سعة الطاولة أقل من عدد الأشخاص.");
  try {
    const rows = await query("UPDATE reservations SET table_id=$2, updated_at=now() WHERE id=$1 AND status IN ('pending','confirmed') RETURNING id", [id, tableId]);
    if (!rows.length) throw new ApiError(400, "لا يمكن تغيير طاولة هذا الحجز.");
  } catch (e: any) {
    if (e?.code === "23P01") throw new ApiError(409, "هذه الطاولة محجوزة في نفس الوقت.");
    throw e;
  }
}
