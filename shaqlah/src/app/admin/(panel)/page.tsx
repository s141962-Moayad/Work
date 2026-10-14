import Link from "next/link";
import { requireStaffPage } from "@/lib/server-auth";
import { getDashboard } from "@/lib/reports";
import { query } from "@/lib/db";
import { BarChart, HBars } from "@/components/charts";
import { Price } from "@/components/brand";
import { ORDER_STATUS_AR, ORDER_STATUS_TONE, ORDER_STATUSES, type OrderStatus } from "@/lib/constants";
import { LOCALE, formatNumber, formatPrice, formatShortDate, formatTime } from "@/lib/utils";

export default async function AdminDashboard() {
  const user = await requireStaffPage();
  const isAdmin = user.role === "admin";
  const d = await getDashboard();
  const upcoming = await query(`SELECT id, number, customer_name, pickup_at, status, total FROM orders WHERE status IN ('pending','accepted','preparing','ready') ORDER BY pickup_at LIMIT 8`);
  const k = d.kpi;

  const cards: { label: string; value: React.ReactNode; hint?: string; tone?: string; admin?: boolean; href?: string }[] = [
    { label: "إجمالي المبيعات", value: <Price value={k.total_sales} />, admin: true, hint: "غير شاملة الطلبات الملغاة" },
    { label: "الإيرادات الشهرية", value: <Price value={k.month_revenue} />, admin: true, hint: "الشهر الحالي" },
    { label: "طلبات اليوم", value: formatNumber(Number(k.today_orders)), href: "/admin/orders" },
    { label: "الطلبات الجديدة", value: formatNumber(Number(k.new_orders)), tone: Number(k.new_orders) > 0 ? "ring-2 ring-brand" : "", hint: "بانتظار التأكيد", href: "/admin/orders?status=pending" },
    { label: "الحجوزات القادمة", value: formatNumber(Number(k.upcoming_reservations)), href: "/admin/reservations" },
    { label: "متوسط قيمة الطلب", value: <Price value={k.avg_order} />, admin: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-black">مرحبًا {user.name} 👋</h1>
        {d.late > 0 && <Link href="/admin/orders?status=pending" className="chip !px-4 !py-2 bg-red-100 text-red-700">⚠️ يوجد {formatNumber(d.late)} طلب متأخر</Link>}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {cards.filter((c) => !c.admin || isAdmin).map((c) => {
          const inner = (
            <div className={`card h-full p-4 ${c.tone ?? ""}`}>
              <p className="text-xs font-bold text-ink-muted">{c.label}</p>
              <p className="mt-2 text-xl font-black tabular-nums sm:text-2xl">{c.value}</p>
              {c.hint && <p className="mt-1 text-[11px] text-ink-muted">{c.hint}</p>}
            </div>
          );
          return c.href ? <Link key={c.label} href={c.href} className="transition hover:-translate-y-0.5">{inner}</Link> : <div key={c.label}>{inner}</div>;
        })}
      </div>

      {isAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card p-5">
            <h2 className="mb-1 font-extrabold">المبيعات اليومية — آخر ١٤ يومًا</h2>
            <p className="mb-3 text-xs text-ink-muted">اليوم: {formatPrice(k.today_sales)}</p>
            <BarChart ariaLabel="المبيعات اليومية آخر ١٤ يومًا" data={d.daily.map((r: any) => {
              const at = `${r.day}T12:00:00+04:00`;
              return { label: new Intl.DateTimeFormat(LOCALE, { day: "numeric", timeZone: "Asia/Muscat" }).format(new Date(at)), value: r.sales, display: formatPrice(r.sales), tip: `${formatShortDate(at)}: ${formatPrice(r.sales)} — ${formatNumber(r.orders)} طلب` };
            })} />
          </section>
          <section className="card p-5">
            <h2 className="mb-3 font-extrabold">الإيرادات الشهرية — آخر ٦ أشهر</h2>
            <BarChart ariaLabel="الإيرادات الشهرية آخر ٦ أشهر" data={d.monthly.map((r: any) => ({ label: new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: "Asia/Muscat" }).format(new Date(`${r.month}T12:00:00+04:00`)), value: r.revenue, display: formatPrice(r.revenue), tip: formatPrice(r.revenue) }))} />
          </section>
          <section className="card p-5">
            <h2 className="mb-3 font-extrabold">أكثر الوجبات طلبًا (٣٠ يومًا)</h2>
            {d.top.length === 0 ? <p className="py-6 text-center text-sm text-ink-muted">لا توجد بيانات بعد.</p> : <HBars ariaLabel="أكثر الوجبات طلبًا" data={d.top.map((t) => ({ label: t.name, value: t.qty, display: `${formatNumber(t.qty)} طلب` }))} />}
          </section>
          <section className="card p-5">
            <h2 className="mb-3 font-extrabold">الطلبات حسب الحالة (٣٠ يومًا)</h2>
            <ul className="flex flex-wrap gap-2">
              {ORDER_STATUSES.map((s) => (
                <li key={s} className={`chip !px-3 !py-2 !text-sm ${ORDER_STATUS_TONE[s as OrderStatus]}`}>{ORDER_STATUS_AR[s as OrderStatus]}: {formatNumber(d.byStatus.find((x) => x.status === s)?.n ?? 0)}</li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-extrabold">الطلبات القادمة</h2><Link href="/admin/orders" className="text-sm font-bold text-brand">كل الطلبات ←</Link></div>
        {upcoming.length === 0 ? <p className="py-6 text-center text-sm text-ink-muted">لا توجد طلبات نشطة حاليًا.</p> : (
          <ul className="divide-y divide-ink/10">
            {upcoming.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm hover:text-brand">
                  <b><bdi className="ltr">{o.number}</bdi></b><span>{o.customer_name}</span>
                  <span>⏰ {formatTime(o.pickup_at)}</span>
                  <span className={`chip ${ORDER_STATUS_TONE[o.status as OrderStatus]}`}>{ORDER_STATUS_AR[o.status as OrderStatus]}</span>
                  <Price value={o.total} className="font-bold" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
