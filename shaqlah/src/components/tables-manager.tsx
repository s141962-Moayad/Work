"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Field, Spinner, Toggle } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { AREA_AR } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/utils";

interface T { id: number; name: string; capacity: number; area: "indoor" | "outdoor"; active: boolean }
interface B { id: number; starts_at: string; ends_at: string; applies_to: string; reason: string }

const toLocalInput = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Muscat", dateStyle: "short", timeStyle: "short" }).format(d).replace(" ", "T");
const APPLIES: Record<string, string> = { all: "الطلبات والحجوزات", pickup: "الاستلام (الطلبات) فقط", reservations: "الحجوزات فقط" };

export function TablesManager({ tables, blocked }: { tables: T[]; blocked: B[] }) {
  const router = useRouter();
  const [t, setT] = useState<(Partial<T> & { isNew?: boolean }) | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const now = new Date();
  const [b, setB] = useState({ startsAt: toLocalInput(now), endsAt: toLocalInput(new Date(now.getTime() + 24 * 3600_000)), appliesTo: "all", reason: "" });

  const saveT = async () => {
    if (!t) return;
    setBusy(true); setErr(null);
    const body = { name: t.name ?? "", capacity: t.capacity ?? 2, area: t.area ?? "indoor", active: t.active ?? true };
    try { await api(t.isNew ? "/api/admin/tables" : `/api/admin/tables/${t.id}`, { method: t.isNew ? "POST" : "PUT", body }); toast("تم الحفظ."); setT(null); router.refresh(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const addBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin/blocked", { body: { startsAt: new Date(`${b.startsAt}:00+04:00`).toISOString(), endsAt: new Date(`${b.endsAt}:00+04:00`).toISOString(), appliesTo: b.appliesTo, reason: b.reason } });
      toast("تم إغلاق الفترة."); setB({ ...b, reason: "" }); router.refresh();
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  };

  const total = tables.filter((x) => x.active).reduce((a, x) => a + x.capacity, 0);
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-black">الطاولات</h2><p className="text-sm text-ink-muted">السعة الإجمالية الفعّالة: {formatNumber(total)} مقعدًا</p></div>
          <button className="btn-primary" onClick={() => { setErr(null); setT({ isNew: true, name: "", capacity: 4, area: "indoor", active: true }); }}>+ إضافة طاولة</button>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[520px]"><thead className="border-b border-ink/10 bg-paper"><tr><th className="th">الطاولة</th><th className="th">السعة</th><th className="th">النوع</th><th className="th">الحالة</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-ink/5">{tables.map((x) => (
              <tr key={x.id}><td className="td font-bold">{x.name}</td><td className="td">{formatNumber(x.capacity)}</td><td className="td">{AREA_AR[x.area]}</td>
                <td className="td"><span className={`chip ${x.active ? "bg-emerald-100 text-emerald-800" : "bg-ink/10 text-ink-muted"}`}>{x.active ? "فعّالة" : "معطّلة"}</span></td>
                <td className="td"><div className="flex gap-2"><button className="btn-outline btn-sm" onClick={() => { setErr(null); setT({ ...x }); }}>تعديل</button>
                  <button className="btn-ghost btn-sm !text-red-600" onClick={async () => { if (!confirm(`حذف ${x.name}؟`)) return; try { await api(`/api/admin/tables/${x.id}`, { method: "DELETE" }); router.refresh(); } catch (e: any) { toast(e.message, "err"); } }}>حذف</button></div></td></tr>))}</tbody></table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-black">حظر تواريخ وأوقات</h2>
        <p className="text-sm text-ink-muted">أغلق فترة (إجازة، مناسبة خاصة، صيانة…) فلا يظهر للعملاء أي موعد استلام أو حجز خلالها.</p>
        <form onSubmit={addBlock} className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="من"><input type="datetime-local" className="input" dir="ltr" value={b.startsAt} onChange={(e) => setB({ ...b, startsAt: e.target.value })} required /></Field>
          <Field label="إلى"><input type="datetime-local" className="input" dir="ltr" value={b.endsAt} onChange={(e) => setB({ ...b, endsAt: e.target.value })} required /></Field>
          <Field label="يشمل"><select className="input" value={b.appliesTo} onChange={(e) => setB({ ...b, appliesTo: e.target.value })}>{Object.entries(APPLIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="السبب (اختياري)"><input className="input" value={b.reason} onChange={(e) => setB({ ...b, reason: e.target.value })} maxLength={120} /></Field>
          <div className="flex items-end"><button className="btn-dark w-full" disabled={busy}>{busy ? <Spinner /> : null} حظر الفترة</button></div>
        </form>
        <div className="card divide-y divide-ink/5">
          {blocked.length === 0 && <p className="p-6 text-center text-sm text-ink-muted">لا توجد فترات محظورة.</p>}
          {blocked.map((x) => (
            <div key={x.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div><b>{formatDateTime(x.starts_at)}</b> ← <b>{formatDateTime(x.ends_at)}</b><div className="text-xs text-ink-muted">{APPLIES[x.applies_to]}{x.reason ? ` — ${x.reason}` : ""}</div></div>
              <button className="btn-ghost btn-sm !text-red-600" onClick={async () => { await api(`/api/admin/blocked/${x.id}`, { method: "DELETE" }).catch((e) => toast(e.message, "err")); router.refresh(); }}>رفع الحظر</button>
            </div>))}
        </div>
      </section>

      <Modal open={!!t} onClose={() => setT(null)} title={t?.isNew ? "إضافة طاولة" : "تعديل طاولة"}
        footer={<div className="flex justify-end gap-2"><button className="btn-ghost" onClick={() => setT(null)}>إلغاء</button><button className="btn-primary" disabled={busy} onClick={saveT}>{busy ? <Spinner /> : null} حفظ</button></div>}>
        {t && <div className="space-y-4">
          {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{err}</p>}
          <Field label="اسم الطاولة"><input className="input" value={t.name ?? ""} onChange={(e) => setT({ ...t, name: e.target.value })} maxLength={40} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="السعة (عدد المقاعد)"><input className="input" type="number" min={1} max={40} dir="ltr" value={t.capacity ?? 2} onChange={(e) => setT({ ...t, capacity: Number(e.target.value) })} /></Field>
            <Field label="نوع الجلسة"><select className="input" value={t.area} onChange={(e) => setT({ ...t, area: e.target.value as any })}><option value="indoor">داخلية</option><option value="outdoor">خارجية</option></select></Field>
          </div>
          <Toggle label="طاولة فعّالة (متاحة للحجز)" checked={t.active ?? true} onChange={(v) => setT({ ...t, active: v })} />
        </div>}
      </Modal>
    </div>
  );
}
