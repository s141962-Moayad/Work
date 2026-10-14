"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cart, cartCount, useCart } from "@/lib/cart-store";
import { useQuote } from "@/lib/use-quote";
import { FoodImage, Price } from "@/components/brand";
import { EmptyState, Spinner } from "@/components/ui/misc";
import { formatNumber } from "@/lib/utils";

export function CartView() {
  const lines = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { quote, error, loading } = useQuote(lines, null);

  if (!mounted) return <div className="container-x py-10"><div className="skeleton h-64" /></div>;
  if (!lines.length) {
    return (
      <div className="container-x py-12">
        <EmptyState icon="🛒" title="سلتك فارغة">
          <p className="mb-4">لم تُضف أي وجبة بعد. تصفّح القائمة واختر ما يناسب مزاجك.</p>
          <Link href="/menu" className="btn-primary">تصفّح قائمة الطعام</Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="container-x py-8">
      <h1 className="mb-6 text-3xl font-black">سلة الطلبات <span className="text-lg font-bold text-ink-muted">({formatNumber(cartCount(lines))} أصناف)</span></h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <ul className="space-y-3 lg:col-span-2">
          {lines.map((l, idx) => {
            const q = quote?.lines[idx];
            const bad = error?.lineIndex === idx;
            return (
              <li key={l.key} className={`card flex gap-4 p-4 ${bad ? "ring-2 ring-red-500" : ""}`}>
                <div className="size-20 shrink-0 overflow-hidden rounded-2xl sm:size-24"><FoodImage src={l.image} icon={l.icon} alt={l.name} seed={l.itemId} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-extrabold">{l.name}</h2>
                      {l.variantName && <p className="text-xs text-ink-muted">الحجم: {l.variantName}</p>}
                      {l.addons.length > 0 && <p className="text-xs text-ink-muted">إضافات: {l.addons.map((a) => a.name).join("، ")}</p>}
                    </div>
                    <button onClick={() => cart.remove(l.key)} className="btn-ghost btn-sm text-red-600" aria-label={`حذف ${l.name}`}>🗑 حذف</button>
                  </div>
                  <input className="input mt-2 !min-h-9 !py-1 text-xs" placeholder="ملاحظات للتحضير (اختياري)" maxLength={300} value={l.notes} onChange={(e) => cart.update(l.key, { notes: e.target.value })} aria-label={`ملاحظات ${l.name}`} />
                  {bad && <p role="alert" className="mt-2 text-sm font-bold text-red-600">{error?.message}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center rounded-full border border-ink/15 bg-white">
                      <button className="size-9 text-lg font-bold" onClick={() => cart.setQty(l.key, l.quantity - 1)} aria-label="إنقاص الكمية">−</button>
                      <span className="w-8 text-center font-bold tabular-nums">{formatNumber(l.quantity)}</span>
                      <button className="size-9 text-lg font-bold" onClick={() => cart.setQty(l.key, l.quantity + 1)} aria-label="زيادة الكمية">+</button>
                    </div>
                    <div className="text-end">
                      {q && <span className="block text-[11px] text-ink-muted"><Price value={q.unitPrice} /> للقطعة</span>}
                      <Price value={q ? q.lineTotal : l.unitPrice * l.quantity} className="text-lg font-extrabold text-brand" />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="card h-fit space-y-3 p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-extrabold">ملخص الطلب</h2>
          {error && error.lineIndex === undefined && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error.message}</p>}
          <Row label="المجموع الفرعي" value={quote ? <Price value={quote.subtotal} /> : loading ? <Spinner /> : "—"} />
          {quote && quote.fee > 0 && <Row label="رسوم الخدمة" value={<Price value={quote.fee} />} />}
          {quote && <Row label={quote.vatIncluded ? "منها ضريبة القيمة المضافة" : "ضريبة القيمة المضافة"} value={<Price value={quote.tax} />} muted />}
          <div className="border-t border-dashed border-ink/15 pt-3">
            <Row label="الإجمالي" value={quote ? <Price value={quote.total} className="text-xl font-black text-brand" /> : "—"} bold />
          </div>
          {quote && <p className="text-xs text-ink-muted">⏱ مدة التحضير التقريبية: {formatNumber(quote.prepMinutes)} دقيقة. يمكنك إضافة كود خصم في الخطوة التالية.</p>}
          <Link href="/checkout" aria-disabled={!quote} className={`btn-primary btn-lg w-full ${!quote ? "pointer-events-none opacity-50" : ""}`}>
            متابعة إتمام الطلب
          </Link>
          <Link href="/menu" className="btn-ghost w-full text-sm">+ إضافة المزيد من الأصناف</Link>
        </aside>
      </div>
    </div>
  );
}

export function Row({ label, value, bold, muted }: { label: string; value: React.ReactNode; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 text-sm ${bold ? "font-extrabold" : "font-semibold"} ${muted ? "text-ink-muted" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
