import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/server-auth";
import { query } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "سجل التدقيق" };

const ACTIONS: Record<string, string> = {
  "order.status": "تغيير حالة طلب", "order.refund": "استرداد مبلغ", "item.create": "إضافة صنف", "item.update": "تعديل صنف", "item.delete": "حذف صنف", "item.clear-sample": "حذف الأصناف التجريبية",
  "category.create": "إضافة قسم", "category.update": "تعديل قسم", "category.delete": "حذف قسم", "coupon.create": "إضافة كوبون", "coupon.update": "تعديل كوبون", "coupon.delete": "حذف كوبون",
  "table.create": "إضافة طاولة", "table.update": "تعديل طاولة", "table.delete": "حذف طاولة", "blocked.create": "حظر فترة", "blocked.delete": "رفع حظر", "reservation.update": "تعديل حجز",
  "settings.update": "تعديل الإعدادات", "user.create": "إنشاء مستخدم", "user.update": "تعديل مستخدم", upload: "رفع صورة",
};

export default async function AdminAudit() {
  await requireAdminPage();
  const rows = await query(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT 300`);
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">سجل التدقيق</h1>
      <p className="text-sm text-ink-muted">يسجّل النظام الإجراءات الإدارية المهمة (آخر ٣٠٠ إجراء).</p>
      <div className="card overflow-x-auto"><table className="w-full min-w-[720px]"><thead className="border-b border-ink/10 bg-paper"><tr><th className="th">الوقت</th><th className="th">المستخدم</th><th className="th">الإجراء</th><th className="th">العنصر</th><th className="th">التفاصيل</th></tr></thead>
        <tbody className="divide-y divide-ink/5">{rows.map((r) => (
          <tr key={r.id}><td className="td whitespace-nowrap text-xs">{formatDateTime(r.created_at)}</td><td className="td font-bold">{r.user_name ?? "—"}</td><td className="td">{ACTIONS[r.action] ?? r.action}</td><td className="td text-xs">{r.entity} {r.entity_id}</td>
            <td className="td max-w-xs truncate text-xs text-ink-muted" title={r.details ? JSON.stringify(r.details) : ""}><bdi className="ltr">{r.details ? JSON.stringify(r.details) : ""}</bdi></td></tr>))}
          {rows.length === 0 && <tr><td colSpan={5} className="td py-10 text-center text-ink-muted">لا توجد سجلات.</td></tr>}</tbody></table></div>
    </div>
  );
}
