import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/server-auth";
import { getOrderFull } from "@/lib/orders";
import { OrderActions } from "@/components/order-actions";
import { RefundForm } from "@/components/refund-form";
import { Price } from "@/components/brand";
import { Row } from "@/components/cart-view";
import { ORDER_STATUS_AR, ORDER_STATUS_TONE, PAYMENT_METHOD_AR, PAYMENT_STATUS_AR, type OrderStatus } from "@/lib/constants";
import { formatDateTime, formatNumber, formatPhone, formatTime, relativeDayLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "تفاصيل الطلب" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireStaffPage();
  const { id } = await params;
  const o = await getOrderFull({ id: Number(id) });
  if (!o) notFound();
  const pay = o.payment as any;
  const remaining = pay ? Math.round((pay.amount - pay.refunded_amount) * 1000) / 1000 : 0;
  const canRefund = user.role === "admin" && pay && ["paid", "partially_refunded"].includes(pay.status) && remaining > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="btn-ghost btn-sm">→ الطلبات</Link>
          <h1 className="text-2xl font-black"><bdi className="ltr">{o.number}</bdi></h1>
          <span className={`chip !text-sm ${ORDER_STATUS_TONE[o.status as OrderStatus]}`}>{ORDER_STATUS_AR[o.status as OrderStatus]}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/orders/${o.id}/receipt`} className="btn-outline btn-sm">🖨️ طباعة الإيصال</Link>
        </div>
      </div>

      <div className="card p-5"><OrderActions id={o.id} status={o.status} awaitingPayment={o.payment_method !== "cash" && o.payment_status !== "paid"} />
        {o.payment_method !== "cash" && o.payment_status !== "paid" && o.status === "pending" && <p className="mt-2 text-sm font-bold text-amber-700">⏳ بانتظار تأكيد الدفع الإلكتروني. لا يمكن قبول الطلب قبل ذلك.</p>}
        {o.cancel_reason && <p className="mt-2 text-sm">سبب الإلغاء: {o.cancel_reason}</p>}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-3 font-extrabold">الأصناف</h2>
          <ul className="divide-y divide-ink/10">
            {o.items.map((it: any) => (
              <li key={it.id} className="flex justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-bold">{formatNumber(it.quantity)}× {it.name_ar}</p>
                  {(it.variant_name || it.addons.length > 0) && <p className="text-xs text-ink-muted">{[it.variant_name, ...it.addons.map((a: any) => `+ ${a.name}`)].filter(Boolean).join(" · ")}</p>}
                  {it.notes && <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold">📝 {it.notes}</p>}
                </div>
                <Price value={it.line_total} className="font-bold" />
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-2 border-t border-dashed border-ink/15 pt-3">
            <Row label="المجموع الفرعي" value={<Price value={o.subtotal} />} />
            {o.discount > 0 && <Row label={`الخصم (${o.coupon_code})`} value={<span>−<Price value={o.discount} /></span>} />}
            {o.fee > 0 && <Row label="رسوم الخدمة" value={<Price value={o.fee} />} />}
            <Row label="ضريبة القيمة المضافة" value={<Price value={o.tax} />} muted />
            <Row label="الإجمالي" value={<Price value={o.total} className="text-xl font-black text-brand" />} bold />
          </div>
          {o.notes && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold">📝 ملاحظات العميل: {o.notes}</p>}
        </section>

        <div className="space-y-5">
          <section className="card space-y-2 p-5 text-sm">
            <h2 className="mb-1 font-extrabold">العميل والاستلام</h2>
            <p><b>{o.customer_name}</b></p>
            <p><a className="font-bold text-brand" href={`tel:+968${o.phone}`}><bdi className="ltr">{formatPhone(o.phone)}</bdi></a></p>
            {o.email && <p><bdi className="ltr">{o.email}</bdi></p>}
            <div className="rounded-2xl bg-brand-light p-3"><p className="text-xs text-ink-muted">موعد الاستلام</p><p className="text-lg font-black text-brand">{relativeDayLabel(o.pickup_at)} — {formatTime(o.pickup_at)}</p><p className="text-xs text-ink-muted">{o.pickup_mode === "asap" ? "في أقرب وقت ممكن" : "موعد محدد"} · تحضير {formatNumber(o.prep_minutes)} د</p></div>
            <p className="text-xs text-ink-muted">تاريخ الطلب: {formatDateTime(o.created_at)}</p>
          </section>
          <section className="card p-5 text-sm">
            <h2 className="mb-2 font-extrabold">الدفع</h2>
            <p>{PAYMENT_METHOD_AR[o.payment_method]}</p>
            <p className="font-bold">{PAYMENT_STATUS_AR[o.payment_status]}</p>
            {pay?.refunded_amount > 0 && <p className="text-xs text-ink-muted">المسترد: <Price value={pay.refunded_amount} /></p>}
            {pay?.failure_reason && <p className="text-xs text-red-600">{pay.failure_reason}</p>}
            {canRefund && <RefundForm id={o.id} remaining={remaining} online={pay.provider !== "cash"} />}
          </section>
          <section className="card p-5 text-sm">
            <h2 className="mb-2 font-extrabold">سجل الإشعارات للعميل</h2>
            <ul className="space-y-2">{o.notifications.map((n: any) => <li key={n.id} className="border-s-2 border-brand ps-3"><b>{n.title}</b><span className="block text-xs text-ink-muted">{formatDateTime(n.created_at)}</span></li>)}</ul>
          </section>
        </div>
      </div>
    </div>
  );
}
