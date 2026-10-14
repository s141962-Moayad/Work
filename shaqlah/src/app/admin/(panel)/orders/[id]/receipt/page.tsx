import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/server-auth";
import { getOrderFull } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { PrintButton } from "@/components/print-button";
import { PAYMENT_METHOD_AR, PAYMENT_STATUS_AR } from "@/lib/constants";
import { formatDateTime, formatNumber, formatPhone, formatPrice } from "@/lib/utils";

export const metadata = { title: "إيصال الطلب" };

export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const [o, s] = await Promise.all([getOrderFull({ id: Number(id) }), getSettings()]);
  if (!o) notFound();
  const line = <hr className="my-3 border-dashed border-ink/40" />;
  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-4 flex gap-2 no-print"><PrintButton auto /></div>
      <article className="bg-white p-5 text-sm leading-7 shadow-card print:shadow-none">
        <header className="text-center">
          <h1 className="text-2xl font-black">{s.general.name}</h1>
          <p className="text-xs">{s.general.address}</p>
          {s.general.phone && <p className="text-xs"><bdi className="ltr">{s.general.phone}</bdi></p>}
        </header>
        {line}
        <p>رقم الطلب: <b><bdi className="ltr">{o.number}</bdi></b></p>
        <p>التاريخ: {formatDateTime(o.created_at)}</p>
        <p>العميل: {o.customer_name} — <bdi className="ltr">{formatPhone(o.phone)}</bdi></p>
        <p>موعد الاستلام: <b>{formatDateTime(o.pickup_at)}</b></p>
        {line}
        <ul className="space-y-1.5">
          {o.items.map((it: any) => (
            <li key={it.id}>
              <div className="flex justify-between"><span>{formatNumber(it.quantity)}× {it.name_ar}{it.variant_name ? ` (${it.variant_name})` : ""}</span><bdi>{formatPrice(it.line_total)}</bdi></div>
              {it.addons.length > 0 && <div className="ps-4 text-xs">+ {it.addons.map((a: any) => a.name).join("، ")}</div>}
              {it.notes && <div className="ps-4 text-xs">ملاحظة: {it.notes}</div>}
            </li>
          ))}
        </ul>
        {line}
        <div className="flex justify-between"><span>المجموع الفرعي</span><bdi>{formatPrice(o.subtotal)}</bdi></div>
        {o.discount > 0 && <div className="flex justify-between"><span>الخصم</span><bdi>−{formatPrice(o.discount)}</bdi></div>}
        {o.fee > 0 && <div className="flex justify-between"><span>رسوم الخدمة</span><bdi>{formatPrice(o.fee)}</bdi></div>}
        <div className="flex justify-between"><span>{s.finance.vatIncluded ? "منها ضريبة القيمة المضافة" : "ضريبة القيمة المضافة"}</span><bdi>{formatPrice(o.tax)}</bdi></div>
        <div className="mt-1 flex justify-between text-lg font-black"><span>الإجمالي</span><bdi>{formatPrice(o.total)}</bdi></div>
        {line}
        <p>الدفع: {PAYMENT_METHOD_AR[o.payment_method]} — {PAYMENT_STATUS_AR[o.payment_status]}</p>
        {o.notes && <p>ملاحظات: {o.notes}</p>}
        <p className="mt-4 text-center text-xs">شكرًا لزيارتكم — {s.general.slogan}</p>
      </article>
    </div>
  );
}
