import { pool, queryOne, tx } from "../db";
import { ApiError } from "../api";
import { getSettings, integrationStatus, type Settings } from "../settings";
import { notifyOrder } from "../notify";
import { thawani } from "./thawani";
import type { PaymentProvider } from "./types";

export function onlineProvider(): PaymentProvider | null {
  return integrationStatus().thawani ? thawani : null;
}

/** Payment methods the customer may actually use right now. */
export function availableMethods(settings: Settings) {
  const online = !!onlineProvider();
  return {
    cash: settings.payments.cash,
    card: online && settings.payments.card,
    apple_pay: online && settings.payments.applePay,
  };
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Creates a hosted-checkout session for an order and records it. Returns the URL to redirect to. */
export async function startOnlinePayment(order: { id: number; number: string; total: number; access_token: string }): Promise<string> {
  const provider = onlineProvider();
  if (!provider) throw new ApiError(503, "الدفع الإلكتروني غير متاح حاليًا.");
  const returnUrl = `${appUrl()}/payment/return?order=${encodeURIComponent(order.number)}&k=${order.access_token}`;
  const cancelUrl = returnUrl + "&cancelled=1";
  const checkout = await provider.createCheckout({ orderNumber: order.number, amount: order.total, returnUrl, cancelUrl });
  await pool().query(
    `UPDATE payments SET provider=$2, provider_ref=$3, status='pending', raw=$4, updated_at=now()
      WHERE id = (SELECT id FROM payments WHERE order_id=$1 ORDER BY id DESC LIMIT 1)`,
    [order.id, provider.name, checkout.ref, JSON.stringify(checkout.raw)],
  );
  await pool().query(`UPDATE orders SET payment_status='pending', updated_at=now() WHERE id=$1`, [order.id]);
  return checkout.redirectUrl;
}

/**
 * Re-checks the payment with the provider (the only source of truth – the browser
 * redirect and webhook payloads are never trusted) and updates the order.
 */
export async function syncPaymentForOrder(orderId: number): Promise<"paid" | "pending" | "failed"> {
  const provider = onlineProvider();
  const pay = await queryOne<any>(`SELECT * FROM payments WHERE order_id=$1 AND provider <> 'cash' ORDER BY id DESC LIMIT 1`, [orderId]);
  if (!pay || !pay.provider_ref || !provider) return "pending";
  if (pay.status === "paid" || pay.status === "refunded" || pay.status === "partially_refunded") return "paid";

  const r = await provider.fetchStatus(pay.provider_ref);
  if (r.status === "paid") {
    const changed = await tx(async (c) => {
      const u = await c.query(
        `UPDATE payments SET status='paid', provider_payment_id=COALESCE($2, provider_payment_id), raw=$3, updated_at=now()
          WHERE id=$1 AND status <> 'paid' RETURNING id`,
        [pay.id, r.paymentId ?? null, JSON.stringify(r.raw)],
      );
      if (!u.rowCount) return false;
      await c.query(`UPDATE orders SET payment_status='paid', updated_at=now() WHERE id=$1`, [orderId]);
      return true;
    });
    if (changed) {
      const o = await queryOne<any>(`SELECT * FROM orders WHERE id=$1`, [orderId]);
      if (o) {
        await notifyOrder(o, "paid");
        const settings = await getSettings();
        if (settings.ordering.autoAccept && o.status === "pending") {
          await pool().query(`UPDATE orders SET status='accepted', updated_at=now() WHERE id=$1`, [orderId]);
          await notifyOrder(o, "accepted");
        }
      }
    }
    return "paid";
  }
  if (r.status === "cancelled" || r.status === "failed") {
    const changed = await pool().query(
      `UPDATE payments SET status='failed', failure_reason=$2, raw=$3, updated_at=now() WHERE id=$1 AND status NOT IN ('failed','paid') RETURNING id`,
      [pay.id, r.status === "cancelled" ? "ألغى العميل عملية الدفع" : "رفض مزوّد الدفع العملية", JSON.stringify(r.raw)],
    );
    if (changed.rowCount) {
      await pool().query(`UPDATE orders SET payment_status='failed', updated_at=now() WHERE id=$1 AND payment_status<>'paid'`, [orderId]);
      const o = await queryOne<any>(`SELECT * FROM orders WHERE id=$1`, [orderId]);
      if (o) await notifyOrder(o, "payment_failed");
    }
    return "failed";
  }
  return "pending";
}

/** Refund (full or partial). Online payments go through the provider; cash refunds are recorded manually. */
export async function refundOrder(orderId: number, amount: number | null, reason: string): Promise<{ refunded: number; manual: boolean }> {
  const pay = await queryOne<any>(
    `SELECT p.*, o.number FROM payments p JOIN orders o ON o.id=p.order_id WHERE p.order_id=$1 AND p.status IN ('paid','partially_refunded') ORDER BY p.id DESC LIMIT 1`,
    [orderId],
  );
  if (!pay) throw new ApiError(400, "لا توجد دفعة مدفوعة قابلة للاسترداد لهذا الطلب.");
  const remaining = Math.round((pay.amount - pay.refunded_amount) * 1000) / 1000;
  const amt = amount ?? remaining;
  if (amt <= 0 || amt > remaining + 1e-9) throw new ApiError(400, "مبلغ الاسترداد غير صحيح.");

  let manual = true;
  if (pay.provider !== "cash") {
    const provider = onlineProvider();
    if (!provider) throw new ApiError(503, "مزوّد الدفع غير مهيّأ، لا يمكن تنفيذ الاسترداد.");
    // Provider refunds are full-amount; partial refunds must be handled in the provider dashboard.
    if (Math.abs(amt - remaining) > 1e-9 || pay.refunded_amount > 0) {
      throw new ApiError(400, "الاسترداد الجزئي للمدفوعات الإلكترونية يتم من لوحة مزوّد الدفع.");
    }
    try {
      await provider.refund({ ref: pay.provider_ref, paymentId: pay.provider_payment_id ?? undefined, amount: amt, reason });
    } catch (e) {
      console.error("[refund]", e);
      throw new ApiError(502, "تعذّر تنفيذ الاسترداد لدى مزوّد الدفع. حاول لاحقًا أو نفّذه من لوحة المزوّد.");
    }
    manual = false;
  }
  const newRefunded = Math.round((pay.refunded_amount + amt) * 1000) / 1000;
  const full = newRefunded >= pay.amount - 1e-9;
  await tx(async (c) => {
    await c.query(`UPDATE payments SET refunded_amount=$2, status=$3, updated_at=now() WHERE id=$1`, [pay.id, newRefunded, full ? "refunded" : "partially_refunded"]);
    await c.query(`UPDATE orders SET payment_status=$2, updated_at=now() WHERE id=$1`, [orderId, full ? "refunded" : "partially_refunded"]);
  });
  return { refunded: amt, manual };
}

