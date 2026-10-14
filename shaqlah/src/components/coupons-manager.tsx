"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Field, Spinner, Toggle } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { Price } from "@/components/brand";
import { formatDateTime, formatNumber } from "@/lib/utils";

interface C { id: number; code: string; description_ar: string; type: "percent" | "fixed"; value: number; min_order: number; max_discount: number | null; starts_at: string | null; expires_at: string | null; usage_limit: number | null; used_count: number; active: boolean }
type Draft = { id?: number; code: string; description: string; type: "percent" | "fixed"; value: string; minOrder: string; maxDiscount: string; startsAt: string; expiresAt: string; usageLimit: string; active: boolean };

const local = (iso: string | null) => (iso ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Muscat", dateStyle: "short", timeStyle: "short" }).format(new Date(iso)).replace(" ", "T") : "");
const empty: Draft = { code: "", description: "", type: "percent", value: "10", minOrder: "0", maxDiscount: "", startsAt: "", expiresAt: "", usageLimit: "", active: true };

export function CouponsManager({ coupons }: { coupons: C[] }) {
  const router = useRouter();
  const [d, setD] = useState<Draft | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const open = (c?: C) => { setErr(null); setD(c ? { id: c.id, code: c.code, description: c.description_ar, type: c.type, value: String(c.value), minOrder: String(c.min_order), maxDiscount: c.max_discount == null ? "" : String(c.max_discount), startsAt: local(c.starts_at), expiresAt: local(c.expires_at), usageLimit: c.usage_limit == null ? "" : String(c.usage_limit), active: c.active } : empty); };
  const save = async () => {
    if (!d) return;
    setBusy(true); setErr(null);
    const body = {
      code: d.code, description: d.description, type: d.type, value: d.value, minOrder: d.minOrder || 0, maxDiscount: d.maxDiscount || null,
      startsAt: d.startsAt ? new Date(`${d.startsAt}:00+04:00`).toISOString() : null, expiresAt: d.expiresAt ? new Date(`${d.expiresAt}:00+04:00`).toISOString() : null,
      usageLimit: d.usageLimit || null, active: d.active,
    };
    try { await api(d.id ? `/api/admin/coupons/${d.id}` : "/api/admin/coupons", { method: d.id ? "PUT" : "POST", body }); toast("تم حفظ الكوبون."); setD(null); router.refresh(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const status = (c: C) => !c.active ? ["معطّل", "bg-ink/10 text-ink-muted"] : c.expires_at && new Date(c.expires_at) < new Date() ? ["منتهي", "bg-red-100 text-red-700"] : c.usage_limit != null && c.used_count >= c.usage_limit ? ["مستنفد", "bg-amber-100 text-amber-800"] : ["فعّال", "bg-emerald-100 text-emerald-800"];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-black">الكوبونات والعروض</h1><button className="btn-primary" onClick={() => open()}>+ كوبون جديد</button></div>
      <div className="card flex flex-wrap items-center justify-between gap-3 border-s-4 border-gold p-4 text-sm">
        <span><b>العروض الخاصة:</b> تُدار من قائمة الطعام — ضع «السعر قبل الخصم» لأي صنف ليظهر كعرض خاص بشارة وسعر مشطوب في الصفحة الرئيسية وقسم «العروض الخاصة».</span>
        <Link href="/admin/menu" className="btn-outline btn-sm">إدارة العروض ←</Link>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px]"><thead className="border-b border-ink/10 bg-paper"><tr><th className="th">الكود</th><th className="th">الخصم</th><th className="th">الحد الأدنى</th><th className="th">الاستخدام</th><th className="th">الصلاحية</th><th className="th">الحالة</th><th className="th" /></tr></thead>
          <tbody className="divide-y divide-ink/5">
            {coupons.map((c) => { const [s, tone] = status(c); return (
              <tr key={c.id}>
                <td className="td"><b className="ltr font-mono">{c.code}</b><div className="text-[11px] text-ink-muted">{c.description_ar}</div></td>
                <td className="td font-bold">{c.type === "percent" ? <>{formatNumber(c.value)}٪{c.max_discount ? <span className="text-xs font-normal text-ink-muted"> (حتى <Price value={c.max_discount} />)</span> : null}</> : <Price value={c.value} />}</td>
                <td className="td">{c.min_order > 0 ? <Price value={c.min_order} /> : "—"}</td>
                <td className="td tabular-nums">{formatNumber(c.used_count)}{c.usage_limit != null ? ` / ${formatNumber(c.usage_limit)}` : ""}</td>
                <td className="td text-xs">{c.expires_at ? `حتى ${formatDateTime(c.expires_at)}` : "مفتوحة"}</td>
                <td className="td"><span className={`chip ${tone}`}>{s}</span></td>
                <td className="td"><div className="flex gap-2"><button className="btn-outline btn-sm" onClick={() => open(c)}>تعديل</button>
                  <button className="btn-ghost btn-sm !text-red-600" onClick={async () => { if (!confirm(`حذف الكوبون ${c.code}؟`)) return; await api(`/api/admin/coupons/${c.id}`, { method: "DELETE" }).catch((e) => toast(e.message, "err")); router.refresh(); }}>حذف</button></div></td>
              </tr>); })}
            {coupons.length === 0 && <tr><td colSpan={7} className="td py-10 text-center text-ink-muted">لا توجد كوبونات بعد.</td></tr>}
          </tbody></table>
      </div>
      <Modal open={!!d} onClose={() => setD(null)} title={d?.id ? "تعديل كوبون" : "كوبون جديد"}
        footer={<div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setD(null)}>إلغاء</button><button className="btn-primary" disabled={busy} onClick={save}>{busy ? <Spinner /> : null} حفظ</button></div>}>
        {d && <div className="space-y-4">
          {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{err}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الكود" hint="أحرف إنجليزية وأرقام"><input className="input uppercase" dir="ltr" value={d.code} onChange={(e) => setD({ ...d, code: e.target.value })} maxLength={30} /></Field>
            <Field label="وصف (اختياري)"><input className="input" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} maxLength={120} /></Field>
            <Field label="نوع الخصم"><select className="input" value={d.type} onChange={(e) => setD({ ...d, type: e.target.value as any })}><option value="percent">نسبة مئوية ٪</option><option value="fixed">مبلغ ثابت (ر.ع)</option></select></Field>
            <Field label={d.type === "percent" ? "النسبة (٪)" : "المبلغ (ر.ع)"}><input className="input" type="number" step="0.001" min="0" dir="ltr" value={d.value} onChange={(e) => setD({ ...d, value: e.target.value })} /></Field>
            <Field label="الحد الأدنى للطلب (ر.ع)"><input className="input" type="number" step="0.001" min="0" dir="ltr" value={d.minOrder} onChange={(e) => setD({ ...d, minOrder: e.target.value })} /></Field>
            {d.type === "percent" && <Field label="أقصى خصم (ر.ع)" hint="اختياري"><input className="input" type="number" step="0.001" min="0" dir="ltr" value={d.maxDiscount} onChange={(e) => setD({ ...d, maxDiscount: e.target.value })} /></Field>}
            <Field label="يبدأ من"><input className="input" type="datetime-local" dir="ltr" value={d.startsAt} onChange={(e) => setD({ ...d, startsAt: e.target.value })} /></Field>
            <Field label="ينتهي في"><input className="input" type="datetime-local" dir="ltr" value={d.expiresAt} onChange={(e) => setD({ ...d, expiresAt: e.target.value })} /></Field>
            <Field label="حد الاستخدام الكلي" hint="فارغ = بدون حد"><input className="input" type="number" min="1" dir="ltr" value={d.usageLimit} onChange={(e) => setD({ ...d, usageLimit: e.target.value })} /></Field>
          </div>
          <Toggle label="الكوبون فعّال" checked={d.active} onChange={(v) => setD({ ...d, active: v })} />
        </div>}
      </Modal>
    </div>
  );
}
