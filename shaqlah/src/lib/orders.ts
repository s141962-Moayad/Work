import type { PoolClient } from "pg";
import { z } from "zod";
import { pool, query, queryOne, tx } from "./db";
import { ApiError } from "./api";
import { getSettings } from "./settings";
import { priceCart, type CartLineInput } from "./pricing";
import { reservePickup, releaseSlot } from "./pickup";
import { availableMethods, startOnlinePayment, refundOrder, syncPaymentForOrder } from "./payments";
import { notifyAdmins, pushExternal, recordOrderNotification, type OrderEvent } from "./notify";
import { randomToken, formatDateTime } from "./utils";
import { ORDER_STATUSES, type OrderStatus } from "./constants";
import { email as emailSchema, optText, phone, text, id as idSchema } from "./validation";
import type { SessionUser } from "./auth";

export const cartLineSchema = z.object({
  itemId: idSchema,
  variantId: idSchema.nullish(),
  addonIds: z.array(idSchema).max(30).optional(),
  quantity: z.coerce.number().int().min(1, "الكمية يجب أن تكون ١ على الأقل.").max(50, "الكمية كبيرة جدًا."),
  notes: optText("الملاحظات", 300),
});

export const createOrderSchema = z.object({
  items: z.array(cartLineSchema).min(1, "السلة فارغة.").max(60),
  customer: z.object({
    name: text("الاسم", 2, 80),
    phone,
    email: z.union([emailSchema, z.literal("")]).optional().transform((v) => v || null),
  }),
  pickup: z.object({
    mode: z.enum(["asap", "scheduled"], { error: "يرجى اختيار طريقة الاستلام." }),
    slotStart: z.string().optional(),
  }),
  paymentMethod: z.enum(["cash", "card", "apple_pay"], { error: "يرجى اختيار طريقة الدفع." }),
  couponCode: z.string().max(40).optional().nullable(),
  notes: optText("الملاحظات", 500),
  idempotencyKey: z.string().min(8).max(80),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

const asLines = (items: CreateOrderInput["items"]): CartLineInput[] => items;

export async function createOrder(input: CreateOrderInput, user: SessionUser | null, now = new Date()) {
  // Duplicate submission (double click / retry) → return the order we already created.
  const dup = await queryOne<any>("SELECT number, access_token, payment_method FROM orders WHERE idempotency_key=$1", [input.idempotencyKey]);
  if (dup) return { number: dup.number, token: dup.access_token, redirectUrl: null as string | null, duplicate: true };

  const settings = await getSettings();
  if (!settings.ordering.enabled) throw new ApiError(503, "الطلب الإلكتروني متوقف مؤقتًا. نعتذر عن الإزعاج.");
  const methods = availableMethods(settings);
  if (!methods[input.paymentMethod]) throw new ApiError(400, "طريقة الدفع المختارة غير متاحة حاليًا.", { field: "paymentMethod" });

  const token = randomToken();
  const online = input.paymentMethod !== "cash";

  let created: { order: any; outbound: Awaited<ReturnType<typeof recordOrderNotification>> };
  try {
    created = await tx(async (c: PoolClient) => {
      const pricing = await priceCart(c, asLines(input.items), input.couponCode, settings, { lockCoupon: true });
      if (online && pricing.total < 0.1) throw new ApiError(400, "الحد الأدنى للدفع الإلكتروني هو ٠٫١٠٠ ر.ع.");
      const { slotId, pickupAt } = await reservePickup(c, input.pickup, pricing.prepMinutes, settings, now);

      const num = (await c.query("SELECT nextval('order_number_seq') AS n")).rows[0].n;
      const number = `SHQ-${num}`;
      const autoAccept = settings.ordering.autoAccept && !online;
      const { rows } = await c.query(
        `INSERT INTO orders(number, access_token, user_id, customer_name, phone, email, status, pickup_mode, pickup_at, slot_id,
           prep_minutes, subtotal, discount, fee, tax, total, coupon_id, coupon_code, payment_method, payment_status, notes, idempotency_key)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING *`,
        [
          number, token, user?.id ?? null, input.customer.name, input.customer.phone, input.customer.email,
          autoAccept ? "accepted" : "pending", input.pickup.mode, pickupAt, slotId, pricing.prepMinutes,
          pricing.subtotal, pricing.discount, pricing.fee, pricing.tax, pricing.total,
          pricing.coupon?.id ?? null, pricing.coupon?.code ?? null, input.paymentMethod, online ? "pending" : "unpaid",
          input.notes, input.idempotencyKey,
        ],
      );
      const order = rows[0];
      for (const l of pricing.lines) {
        await c.query(
          `INSERT INTO order_items(order_id,item_id,variant_id,addon_ids,name_ar,variant_name,addons,unit_price,quantity,line_total,notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [order.id, l.itemId, l.variantId, l.addonIds, l.name, l.variantName, JSON.stringify(l.addons), l.unitPrice, l.quantity, l.lineTotal, l.notes],
        );
      }
      if (pricing.coupon) await c.query("UPDATE coupons SET used_count = used_count + 1 WHERE id=$1", [pricing.coupon.id]);
      await c.query(
        `INSERT INTO payments(order_id, provider, method, amount, status) VALUES ($1,$2,$3,$4,'pending')`,
        [order.id, online ? "thawani" : "cash", input.paymentMethod, pricing.total],
      );
      const outbound = await recordOrderNotification(c, order, "created");
      if (autoAccept) await recordOrderNotification(c, order, "accepted");
      await notifyAdmins(c, {
        kind: "order.new", title: "طلب جديد!", orderId: order.id, link: `/admin/orders/${order.id}`,
        body: `${number} — ${input.customer.name} — استلام ${formatDateTime(pickupAt)}`,
      });
      return { order, outbound };
    });
  } catch (e: any) {
    if (e?.code === "23505" && String(e.constraint ?? "").includes("idempotency")) {
      const again = await queryOne<any>("SELECT number, access_token FROM orders WHERE idempotency_key=$1", [input.idempotencyKey]);
      if (again) return { number: again.number, token: again.access_token, redirectUrl: null as string | null, duplicate: true };
    }
    throw e;
  }

  let redirectUrl: string | null = null;
  if (online) {
    try {
      redirectUrl = await startOnlinePayment({ id: created.order.id, number: created.order.number, total: created.order.total, access_token: token });
    } catch (e) {
      console.error("[payment:start]", e);
      await query(`UPDATE orders SET payment_status='failed' WHERE id=$1`, [created.order.id]);
    }
  }
  void pushExternal(created.outbound);
  return { number: created.order.number as string, token, redirectUrl, duplicate: false };
}

/* ───────── status transitions ───────── */
const ADMIN_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["accepted", "preparing", "cancelled"],
  accepted: ["preparing", "ready", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered", "preparing", "cancelled"],
  delivered: [],
  cancelled: [],
};
export const statusSchema = z.enum(ORDER_STATUSES);

const EVENT_FOR: Partial<Record<OrderStatus, OrderEvent>> = {
  accepted: "accepted", preparing: "preparing", ready: "ready", delivered: "delivered", cancelled: "cancelled",
};

export async function changeOrderStatus(orderId: number, next: OrderStatus, opts: { reason?: string | null; byCustomer?: boolean } = {}) {
  const result = await tx(async (c) => {
    const { rows } = await c.query("SELECT * FROM orders WHERE id=$1 FOR UPDATE", [orderId]);
    const order = rows[0];
    if (!order) throw new ApiError(404, "الطلب غير موجود.");
    if (order.status === next) return { order, changed: false };
    if (!ADMIN_TRANSITIONS[order.status as OrderStatus].includes(next)) {
      throw new ApiError(400, "لا يمكن تغيير حالة الطلب إلى هذه الحالة.");
    }
    if (order.status === "pending" && next !== "cancelled" && order.payment_method !== "cash" && order.payment_status !== "paid") {
      throw new ApiError(400, "لم يتم تأكيد دفع هذا الطلب بعد.");
    }
    await c.query(
      `UPDATE orders SET status=$2, cancel_reason = CASE WHEN $2='cancelled' THEN $3 ELSE cancel_reason END, updated_at=now() WHERE id=$1`,
      [orderId, next, opts.reason ?? null],
    );
    if (next === "cancelled") {
      await releaseSlot(c, order.slot_id);
      if (order.coupon_id) await c.query("UPDATE coupons SET used_count = GREATEST(used_count-1,0) WHERE id=$1", [order.coupon_id]);
      await notifyAdmins(c, { kind: "order.cancelled", title: "تم إلغاء طلب.", orderId, link: `/admin/orders/${orderId}`, body: `${order.number}${opts.byCustomer ? " — ألغاه العميل" : ""}` });
    }
    if (next === "delivered" && order.payment_method === "cash" && order.payment_status === "unpaid") {
      await c.query("UPDATE orders SET payment_status='paid' WHERE id=$1", [orderId]);
      await c.query("UPDATE payments SET status='paid', updated_at=now() WHERE order_id=$1 AND provider='cash'", [orderId]);
    }
    const ev = EVENT_FOR[next];
    const outbound = ev ? await recordOrderNotification(c, { ...order, status: next }, ev) : null;
    return { order: { ...order, status: next }, changed: true, outbound };
  });
  if (result.changed && (result as any).outbound) void pushExternal((result as any).outbound);

  // A cancelled order that was already paid online is refunded in full.
  if (result.changed && next === "cancelled" && ["paid"].includes(result.order.payment_status) && result.order.payment_method !== "cash") {
    try {
      await refundOrder(orderId, null, "Order cancelled");
    } catch (e) {
      console.error("[auto-refund]", e);
      await notifyAdmins(pool(), { kind: "refund.failed", title: "يلزم استرداد يدوي", orderId, link: `/admin/orders/${orderId}`, body: `تعذّر الاسترداد التلقائي للطلب ${result.order.number}` });
    }
  }
  return result.order;
}

/** Customer-side cancellation, according to the published cancellation policy. */
export async function cancelOrderByCustomer(orderId: number, now = new Date()) {
  const settings = await getSettings();
  const o = await queryOne<any>("SELECT * FROM orders WHERE id=$1", [orderId]);
  if (!o) throw new ApiError(404, "الطلب غير موجود.");
  if (!["pending", "accepted"].includes(o.status)) {
    throw new ApiError(400, "لا يمكن إلغاء الطلب بعد بدء تحضيره. يرجى التواصل مع المطعم.");
  }
  const minutesLeft = (o.pickup_at.getTime() - now.getTime()) / 60000;
  if (o.status === "accepted" && minutesLeft < settings.ordering.customerCancelCutoffMinutes) {
    throw new ApiError(400, `لا يمكن إلغاء الطلب قبل موعد الاستلام بأقل من ${settings.ordering.customerCancelCutoffMinutes} دقيقة.`);
  }
  return changeOrderStatus(orderId, "cancelled", { reason: "ألغاه العميل", byCustomer: true });
}

/* ───────── queries ───────── */
export async function getOrderFull(where: { id?: number; number?: string }) {
  const o = await queryOne<any>(`SELECT * FROM orders WHERE ${where.id ? "id=$1" : "number=$1"}`, [where.id ?? where.number]);
  if (!o) return null;
  const [items, payment, notes] = await Promise.all([
    query("SELECT * FROM order_items WHERE order_id=$1 ORDER BY id", [o.id]),
    queryOne("SELECT id, provider, method, status, amount, refunded_amount, failure_reason FROM payments WHERE order_id=$1 ORDER BY id DESC LIMIT 1", [o.id]),
    query("SELECT id, title, body, created_at FROM notifications WHERE audience='customer' AND order_id=$1 ORDER BY id DESC LIMIT 30", [o.id]),
  ]);
  return { ...o, items, payment, notifications: notes };
}

export type OrderFull = NonNullable<Awaited<ReturnType<typeof getOrderFull>>>;

/** Strips fields the customer must never see. */
export function publicOrder(o: OrderFull) {
  const { access_token, idempotency_key, late_notified, ...rest } = o as any;
  return rest;
}

export async function canAccessOrder(o: { user_id: string | null; access_token: string }, user: SessionUser | null, token: string | null | undefined) {
  if (user && (user.role === "staff" || user.role === "admin")) return true;
  if (user && o.user_id && o.user_id === user.id) return true;
  return !!token && token.length === o.access_token.length && token === o.access_token;
}

/** Cancels unpaid online orders whose payment window expired and frees their pickup slot. */
export async function expireStaleOnlineOrders() {
  const settings = await getSettings();
  const stale = await query<{ id: number }>(
    `SELECT id FROM orders WHERE status='pending' AND payment_method<>'cash' AND payment_status IN ('pending','failed')
       AND created_at < now() - ($1 || ' minutes')::interval`,
    [settings.ordering.onlinePaymentExpiryMinutes],
  );
  for (const s of stale) {
    try {
      // Last-moment provider check so a customer who paid just now is not cancelled.
      const state = await syncPaymentForOrder(s.id).catch(() => "pending");
      if (state !== "paid") await changeOrderStatus(s.id, "cancelled", { reason: "انتهت مهلة الدفع الإلكتروني" });
    } catch (e) {
      console.error("[expire]", e);
    }
  }
}

/** Raises one "late order" admin notification per overdue order. */
export async function flagLateOrders() {
  const late = await query<any>(
    `UPDATE orders SET late_notified = TRUE
      WHERE late_notified = FALSE AND status IN ('pending','accepted','preparing')
        AND pickup_at < now() - interval '10 minutes'
      RETURNING id, number`,
  );
  for (const o of late) {
    await notifyAdmins(pool(), { kind: "order.late", title: "يوجد طلب متأخر.", orderId: o.id, link: `/admin/orders/${o.id}`, body: o.number });
  }
}

