"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { rememberRef } from "@/lib/cart-store";
import { ORDER_FLOW, ORDER_STATUS_AR, ORDER_STATUS_TONE, PAYMENT_METHOD_AR, PAYMENT_STATUS_AR, type OrderStatus } from "@/lib/constants";
import { cn, formatDateTime, formatNumber, formatTime, relativeDayLabel } from "@/lib/utils";
import { Price } from "@/components/brand";
import { Row } from "@/components/cart-view";
import { ReorderButton } from "@/components/reorder-button";
import { Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";

export interface OrderData {
  id: number;
  number: string;
  status: OrderStatus;
  customer_name: string;
  phone: string;
  pickup_mode: "asap" | "scheduled";
  pickup_at: string | Date;
  created_at: string | Date;
  prep_minutes: number;
  subtotal: number;
  discount: number;
  fee: number;
  tax: number;
  total: number;
  coupon_code: string | null;
  payment_method: string;
  payment_status: string;
  notes: string | null;
  cancel_reason: string | null;
  items: { id: number; name_ar: string; variant_name: string | null; addons: { name: string; price: number }[]; quantity: number; unit_price: number; line_total: number; notes: string | null }[];
  payment: { status: string; failure_reason: string | null } | null;
  notifications: { id: number; title: string; body: string; created_at: string | Date }[];
}

const STEP_ICON: Record<string, string> = { pending: "🕒", accepted: "✅", preparing: "👨‍🍳", ready: "🛍️", delivered: "🎉" };

export function OrderView({ initial, token, isNew, vatIncluded }: { initial: OrderData; token: string | null; isNew: boolean; vatIncluded: boolean }) {
  const router = useRouter();
  const [o, setO] = useState<OrderData>(initial);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState<null | "cancel" | "pay">(null);

  useEffect(() => {
    if (token) rememberRef({ kind: "order", number: initial.number, token });
  }, [token, initial.number]);

  useEffect(() => {
    if (["delivered", "cancelled"].includes(o.status)) return;
    const es = new EventSource(`/api/orders/${encodeURIComponent(initial.number)}/stream${token ? `?k=${token}` : ""}`);
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (m) => {
      try {
        const next: OrderData = JSON.parse(m.data);
        setO((prev) => {
          if (prev.status !== next.status) toast(`${ORDER_STATUS_AR[next.status]} — ${next.number}`, "info");
          return next;
        });
      } catch {}
    };
    return () => es.close();
  }, [initial.number, token, o.status]);

  const k = token ? `?k=${token}` : "";
  const pickup = new Date(o.pickup_at);
  const online = o.payment_method !== "cash";
  const needsPayment = online && o.status === "pending" && ["pending", "failed", "unpaid"].includes(o.payment_status);
  const canCancel = o.status === "pending" || o.status === "accepted";
  const stepIdx = ORDER_FLOW.indexOf(o.status);

  const pay = async () => {
    setBusy("pay");
    try {
      const r = await api<{ redirectUrl: string | null; paid: boolean }>(`/api/orders/${encodeURIComponent(o.number)}/pay${k}`, { body: {} });
      if (r.redirectUrl) window.location.href = r.redirectUrl;
      else router.refresh();
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy(null);
    }
  };
  const cancel = async () => {
    if (!confirm("هل أنت متأكد من إلغاء الطلب؟")) return;
    setBusy("cancel");
    try {
      await api(`/api/orders/${encodeURIComponent(o.number)}/cancel${k}`, { body: {} });
      toast("تم إلغاء الطلب.");
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="container-x max-w-4xl py-8">
      {isNew && (
        <div className="mb-6 animate-pop rounded-4xl bg-gradient-to-l from-emerald-600 to-emerald-500 p-6 text-center text-white no-print">
          <div className="text-5xl">🎉</div>
          <h1 className="mt-2 text-2xl font-black">تم استلام طلبك بنجاح!</h1>
          <p className="mt-1 text-white/90">رقم طلبك <bdi className="ltr font-black">{o.number}</bdi> — احتفظ به لتتبّع طلبك.</p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-ink p-5 text-white">
          <div>
            <p className="text-xs text-white/60">رقم الطلب</p>
            <p className="text-2xl font-black"><bdi className="ltr">{o.number}</bdi></p>
          </div>
          <div className="text-end">
            <span className={cn("chip !text-sm", ORDER_STATUS_TONE[o.status])}>{ORDER_STATUS_AR[o.status]}</span>
            {live && o.status !== "delivered" && o.status !== "cancelled" && <p className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-emerald-300"><span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> تحديث مباشر</p>}
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Info label="اسم العميل" value={o.customer_name} />
          <Info label="موعد الاستلام" value={<>{relativeDayLabel(pickup)} — {formatTime(pickup)}</>} sub={o.pickup_mode === "asap" ? "في أقرب وقت ممكن" : "موعد محدد"} strong />
          <Info label="مدة التحضير التقريبية" value={`${formatNumber(o.prep_minutes)} دقيقة`} />
        </div>

        {o.status === "cancelled" ? (
          <div className="mx-5 mb-5 rounded-2xl bg-red-50 p-4 text-center font-bold text-red-700">
            ❌ {ORDER_STATUS_AR.cancelled}{o.cancel_reason ? ` — ${o.cancel_reason}` : ""}
          </div>
        ) : (
          <ol className="mx-5 mb-6 grid grid-cols-5 gap-1" aria-label="مراحل الطلب">
            {ORDER_FLOW.map((s, i) => {
              const done = i <= stepIdx;
              return (
                <li key={s} className="flex flex-col items-center text-center" aria-current={i === stepIdx ? "step" : undefined}>
                  <div className="flex w-full items-center">
                    <span className={cn("h-1 flex-1 rounded-full", i === 0 ? "opacity-0" : done ? "bg-brand" : "bg-ink/10")} />
                    <span className={cn("flex size-11 items-center justify-center rounded-full text-xl transition", done ? "bg-brand text-white shadow-card" : "bg-ink/10 grayscale", i === stepIdx && "ring-4 ring-brand/25")}>{STEP_ICON[s]}</span>
                    <span className={cn("h-1 flex-1 rounded-full", i === ORDER_FLOW.length - 1 ? "opacity-0" : i < stepIdx ? "bg-brand" : "bg-ink/10")} />
                  </div>
                  <span className={cn("mt-2 text-[11px] font-bold leading-4 sm:text-xs", done ? "text-ink" : "text-ink-muted")}>{ORDER_STATUS_AR[s]}</span>
                </li>
              );
            })}
          </ol>
        )}

        {o.status === "ready" && <div className="mx-5 mb-5 rounded-2xl bg-emerald-50 p-4 text-center font-extrabold text-emerald-800">🛍️ طلبك جاهز للاستلام! تفضّل بزيارتنا.</div>}

        {needsPayment && (
          <div className="mx-5 mb-5 flex flex-col items-center gap-3 rounded-2xl bg-amber-50 p-4 text-center no-print">
            <p className="font-bold text-amber-900">
              {o.payment_status === "failed" ? "لم تكتمل عملية الدفع." : "طلبك بانتظار إتمام الدفع الإلكتروني."}{o.payment?.failure_reason ? ` (${o.payment.failure_reason})` : ""} لن يبدأ تحضير الطلب قبل تأكيد الدفع.
            </p>
            <button className="btn-primary" onClick={pay} disabled={busy === "pay"}>{busy === "pay" ? <Spinner /> : "💳"} {o.payment_status === "failed" ? "إعادة محاولة الدفع" : "إتمام الدفع"}</button>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-5">
        <section className="card p-5 md:col-span-3">
          <h2 className="mb-3 text-lg font-extrabold">تفاصيل الطلب</h2>
          <ul className="divide-y divide-ink/10">
            {o.items.map((it) => (
              <li key={it.id} className="flex justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-bold">{formatNumber(it.quantity)}× {it.name_ar}</p>
                  {(it.variant_name || it.addons.length > 0) && <p className="text-xs text-ink-muted">{[it.variant_name, ...it.addons.map((a) => a.name)].filter(Boolean).join("، ")}</p>}
                  {it.notes && <p className="text-xs text-ink-muted">📝 {it.notes}</p>}
                </div>
                <Price value={it.line_total} className="font-bold" />
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-2 border-t border-dashed border-ink/15 pt-3">
            <Row label="المجموع الفرعي" value={<Price value={o.subtotal} />} />
            {o.discount > 0 && <Row label={`الخصم${o.coupon_code ? ` (${o.coupon_code})` : ""}`} value={<span className="text-emerald-700">−<Price value={o.discount} /></span>} />}
            {o.fee > 0 && <Row label="رسوم الخدمة" value={<Price value={o.fee} />} />}
            <Row label={vatIncluded ? "منها ضريبة القيمة المضافة" : "ضريبة القيمة المضافة"} value={<Price value={o.tax} />} muted />
            <Row label="الإجمالي" value={<Price value={o.total} className="text-xl font-black text-brand" />} bold />
          </div>
          {o.notes && <p className="mt-3 rounded-xl bg-paper p-3 text-sm">📝 ملاحظاتك: {o.notes}</p>}
        </section>

        <div className="space-y-6 md:col-span-2">
          <section className="card p-5">
            <h2 className="mb-3 text-lg font-extrabold">الدفع</h2>
            <p className="text-sm">{PAYMENT_METHOD_AR[o.payment_method]}</p>
            <p className="mt-1 text-sm font-bold">{PAYMENT_STATUS_AR[o.payment_status] ?? o.payment_status}</p>
          </section>
          <section className="card p-5">
            <h2 className="mb-3 text-lg font-extrabold">سجل الإشعارات</h2>
            {o.notifications.length === 0 ? <p className="text-sm text-ink-muted">لا توجد إشعارات بعد.</p> : (
              <ul className="space-y-3">
                {o.notifications.map((n) => (
                  <li key={n.id} className="border-s-2 border-brand ps-3 text-sm">
                    <p className="font-bold">{n.title}</p>
                    <p className="text-xs text-ink-muted">{formatDateTime(n.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 no-print">
        <button className="btn-outline" onClick={() => window.print()}>🖨️ طباعة الإيصال</button>
        <ReorderButton number={o.number} token={token} className="btn-outline" />
        {canCancel && <button className="btn-outline !text-red-600" onClick={cancel} disabled={busy === "cancel"}>{busy === "cancel" ? <Spinner /> : "✖"} إلغاء الطلب</button>}
        <Link href="/menu" className="btn-ghost">العودة إلى القائمة</Link>
      </div>
      <p className="mt-3 text-xs text-ink-muted no-print">للتعديل على طلب قيد التحضير يرجى التواصل مع المطعم. راجع <Link className="underline" href="/cancellation-policy">سياسة إلغاء الطلبات</Link>.</p>
    </div>
  );
}

function Info({ label, value, sub, strong }: { label: string; value: React.ReactNode; sub?: string; strong?: boolean }) {
  return (
    <div className={cn("rounded-2xl bg-paper p-4", strong && "ring-2 ring-brand/30")}>
      <p className="text-xs text-ink-muted">{label}</p>
      <p className={cn("mt-1 font-extrabold", strong && "text-lg text-brand")}>{value}</p>
      {sub && <p className="text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}
