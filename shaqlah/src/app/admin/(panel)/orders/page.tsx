import type { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { OrderActions } from "@/components/order-actions";
import { Price } from "@/components/brand";
import { EmptyState } from "@/components/ui/misc";
import { ORDER_STATUSES, ORDER_STATUS_AR, ORDER_STATUS_TONE, PAYMENT_METHOD_AR, PAYMENT_STATUS_AR, type OrderStatus } from "@/lib/constants";
import { formatDateTime, formatNumber, formatTime, isValidDateStr, relativeDayLabel, formatPhone } from "@/lib/utils";
import { expireStaleOnlineOrders } from "@/lib/orders";

export const metadata: Metadata = { title: "الطلبات" };
const PAGE = 40;

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; from?: string; to?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  await expireStaleOnlineOrders().catch(() => {});
  const where: string[] = [];
  const args: unknown[] = [];
  if (sp.status && (ORDER_STATUSES as readonly string[]).includes(sp.status)) { args.push(sp.status); where.push(`status = $${args.length}`); }
  if (sp.status === "active") { where.push(`status IN ('pending','accepted','preparing','ready')`); }
  if (sp.from && isValidDateStr(sp.from)) { args.push(sp.from); where.push(`(created_at AT TIME ZONE 'Asia/Muscat')::date >= $${args.length}`); }
  if (sp.to && isValidDateStr(sp.to)) { args.push(sp.to); where.push(`(created_at AT TIME ZONE 'Asia/Muscat')::date <= $${args.length}`); }
  if (sp.q?.trim()) { args.push(`%${sp.q.trim().replace(/[%_]/g, "")}%`); where.push(`(number ILIKE $${args.length} OR customer_name ILIKE $${args.length} OR phone ILIKE $${args.length})`); }
  const page = Math.max(1, Number(sp.page) || 1);
  const rows = await query(
    `SELECT id, number, customer_name, phone, status, pickup_at, pickup_mode, total, payment_method, payment_status, created_at,
            (SELECT count(*)::int FROM order_items i WHERE i.order_id = orders.id) AS lines
       FROM orders ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY CASE WHEN status IN ('pending') THEN 0 ELSE 1 END, CASE WHEN status IN ('accepted','preparing','ready') THEN pickup_at END ASC NULLS LAST, id DESC
      LIMIT ${PAGE + 1} OFFSET ${(page - 1) * PAGE}`,
    args,
  );
  const hasMore = rows.length > PAGE;
  const list = rows.slice(0, PAGE);
  const qs = (p: number) => { const u = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]); u.set("page", String(p)); return u.toString(); };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">الطلبات</h1>
      <form className="card flex flex-wrap items-end gap-3 p-4" role="search">
        <label className="min-w-40 flex-1"><span className="label">بحث</span><input name="q" defaultValue={sp.q} className="input" placeholder="رقم الطلب / الاسم / الهاتف" /></label>
        <label><span className="label">الحالة</span>
          <select name="status" defaultValue={sp.status ?? ""} className="input">
            <option value="">الكل</option><option value="active">النشطة فقط</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_AR[s]}</option>)}
          </select></label>
        <label><span className="label">من تاريخ</span><input type="date" name="from" defaultValue={sp.from} className="input" /></label>
        <label><span className="label">إلى تاريخ</span><input type="date" name="to" defaultValue={sp.to} className="input" /></label>
        <button className="btn-dark">تصفية</button>
        <Link href="/admin/orders" className="btn-ghost">مسح</Link>
      </form>

      {list.length === 0 ? <EmptyState icon="🧾" title="لا توجد طلبات مطابقة" /> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-ink/10 bg-paper">
              <tr><th className="th">رقم الطلب</th><th className="th">العميل</th><th className="th">موعد الاستلام</th><th className="th">الإجمالي</th><th className="th">الدفع</th><th className="th">الحالة</th><th className="th">الإجراء</th></tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {list.map((o) => (
                <tr key={o.id} className={o.status === "pending" ? "bg-amber-50/60" : ""}>
                  <td className="td"><Link href={`/admin/orders/${o.id}`} className="font-black hover:text-brand"><bdi className="ltr">{o.number}</bdi></Link><div className="text-[11px] text-ink-muted">{formatDateTime(o.created_at)} · {formatNumber(o.lines)} أصناف</div></td>
                  <td className="td"><div className="font-bold">{o.customer_name}</div><a href={`tel:+968${o.phone}`} className="text-xs text-ink-muted"><bdi className="ltr">{formatPhone(o.phone)}</bdi></a></td>
                  <td className="td"><div className="font-bold">{relativeDayLabel(o.pickup_at)} {formatTime(o.pickup_at)}</div><div className="text-[11px] text-ink-muted">{o.pickup_mode === "asap" ? "أقرب وقت" : "موعد محدد"}</div></td>
                  <td className="td"><Price value={o.total} className="font-bold" /></td>
                  <td className="td text-xs"><div>{PAYMENT_METHOD_AR[o.payment_method]}</div><div className="font-bold">{PAYMENT_STATUS_AR[o.payment_status]}</div></td>
                  <td className="td"><span className={`chip ${ORDER_STATUS_TONE[o.status as OrderStatus]}`}>{ORDER_STATUS_AR[o.status as OrderStatus]}</span></td>
                  <td className="td"><OrderActions compact id={o.id} status={o.status} awaitingPayment={o.payment_method !== "cash" && o.payment_status !== "paid"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-between">
        {page > 1 ? <Link className="btn-outline btn-sm" href={`/admin/orders?${qs(page - 1)}`}>→ السابق</Link> : <span />}
        {hasMore && <Link className="btn-outline btn-sm" href={`/admin/orders?${qs(page + 1)}`}>التالي ←</Link>}
      </div>
    </div>
  );
}
