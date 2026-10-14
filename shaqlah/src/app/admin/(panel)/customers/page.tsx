import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/server-auth";
import { query } from "@/lib/db";
import { Price } from "@/components/brand";
import { formatDateTime, formatNumber, formatPhone } from "@/lib/utils";

export const metadata: Metadata = { title: "العملاء" };

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdminPage();
  const { q } = await searchParams;
  const like = q?.trim() ? `%${q.trim().replace(/[%_]/g, "")}%` : null;
  const registered = await query(
    `SELECT u.id, u.name, u.phone, u.email, u.created_at, count(o.id)::int AS orders,
            COALESCE(sum(o.total) FILTER (WHERE o.status <> 'cancelled'),0) AS spent, max(o.created_at) AS last_order
       FROM users u LEFT JOIN orders o ON o.user_id = u.id
      WHERE u.role_id = 1 AND ($1::text IS NULL OR u.name ILIKE $1 OR u.phone ILIKE $1 OR u.email ILIKE $1)
      GROUP BY u.id ORDER BY u.created_at DESC LIMIT 200`, [like]);
  const guests = await query(
    `SELECT phone, max(customer_name) AS name, count(*)::int AS orders, COALESCE(sum(total) FILTER (WHERE status <> 'cancelled'),0) AS spent, max(created_at) AS last_order
       FROM orders WHERE user_id IS NULL AND ($1::text IS NULL OR customer_name ILIKE $1 OR phone ILIKE $1)
      GROUP BY phone ORDER BY max(created_at) DESC LIMIT 200`, [like]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">العملاء</h1>
      <form className="card flex gap-3 p-4" role="search"><input name="q" defaultValue={q} className="input" placeholder="بحث بالاسم أو الهاتف أو البريد" /><button className="btn-dark">بحث</button></form>
      <section>
        <h2 className="mb-2 font-extrabold">العملاء المسجّلون ({formatNumber(registered.length)})</h2>
        <div className="card overflow-x-auto"><table className="w-full min-w-[700px]"><thead className="border-b border-ink/10 bg-paper"><tr><th className="th">الاسم</th><th className="th">الهاتف</th><th className="th">البريد</th><th className="th">الطلبات</th><th className="th">إجمالي الإنفاق</th><th className="th">آخر طلب</th><th className="th">التسجيل</th></tr></thead>
          <tbody className="divide-y divide-ink/5">{registered.map((c) => <tr key={c.id}><td className="td font-bold">{c.name}</td><td className="td">{c.phone ? <bdi className="ltr">{formatPhone(c.phone)}</bdi> : "—"}</td><td className="td">{c.email ? <bdi className="ltr">{c.email}</bdi> : "—"}</td><td className="td">{formatNumber(c.orders)}</td><td className="td"><Price value={c.spent} /></td><td className="td text-xs">{c.last_order ? formatDateTime(c.last_order) : "—"}</td><td className="td text-xs">{formatDateTime(c.created_at)}</td></tr>)}
            {registered.length === 0 && <tr><td colSpan={7} className="td py-8 text-center text-ink-muted">لا يوجد عملاء مسجّلون.</td></tr>}</tbody></table></div>
      </section>
      <section>
        <h2 className="mb-2 font-extrabold">عملاء بدون حساب (ضيوف) ({formatNumber(guests.length)})</h2>
        <div className="card overflow-x-auto"><table className="w-full min-w-[560px]"><thead className="border-b border-ink/10 bg-paper"><tr><th className="th">الاسم</th><th className="th">الهاتف</th><th className="th">الطلبات</th><th className="th">إجمالي الإنفاق</th><th className="th">آخر طلب</th></tr></thead>
          <tbody className="divide-y divide-ink/5">{guests.map((c) => <tr key={c.phone}><td className="td font-bold">{c.name}</td><td className="td"><bdi className="ltr">{formatPhone(c.phone)}</bdi></td><td className="td">{formatNumber(c.orders)}</td><td className="td"><Price value={c.spent} /></td><td className="td text-xs">{formatDateTime(c.last_order)}</td></tr>)}
            {guests.length === 0 && <tr><td colSpan={5} className="td py-8 text-center text-ink-muted">لا يوجد ضيوف.</td></tr>}</tbody></table></div>
      </section>
    </div>
  );
}
