"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Field, Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { ROLE_AR } from "@/lib/constants";
import { formatDateTime, formatPhone } from "@/lib/utils";

interface U { id: string; name: string; phone: string | null; email: string | null; role: string; active: boolean; created_at: string }

export function TeamManager({ users, me }: { users: U[]; me: string }) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", phone: "", email: "", password: "", role: "staff" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const patch = async (id: string, body: object) => { try { await api(`/api/admin/users/${id}`, { method: "PATCH", body }); router.refresh(); } catch (e: any) { toast(e.message, "err"); } };
  return (
    <div className="space-y-6">
      <form className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr(null);
        try { await api("/api/admin/users", { body: f }); toast("تم إنشاء الحساب."); setF({ name: "", phone: "", email: "", password: "", role: "staff" }); router.refresh(); } catch (er: any) { setErr(er.message); } finally { setBusy(false); }
      }}>
        <h2 className="font-extrabold sm:col-span-2 lg:col-span-3">إضافة موظف أو مدير</h2>
        {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700 sm:col-span-2 lg:col-span-3">{err}</p>}
        <Field label="الاسم"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={80} /></Field>
        <Field label="رقم الهاتف"><input className="input" type="tel" dir="ltr" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="9XXX XXXX" /></Field>
        <Field label="البريد الإلكتروني"><input className="input" type="email" dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="كلمة المرور (٨ أحرف+)"><input className="input" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={8} autoComplete="new-password" /></Field>
        <Field label="الصلاحية" hint="الموظف: الطلبات والحجوزات والرسائل. المدير: كل شيء."><select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="staff">موظف</option><option value="admin">مدير</option></select></Field>
        <div className="flex items-end"><button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner /> : null} إنشاء الحساب</button></div>
      </form>
      <div className="card overflow-x-auto"><table className="w-full min-w-[640px]"><thead className="border-b border-ink/10 bg-paper"><tr><th className="th">الاسم</th><th className="th">التواصل</th><th className="th">الصلاحية</th><th className="th">الحالة</th><th className="th">أُنشئ</th></tr></thead>
        <tbody className="divide-y divide-ink/5">{users.map((u) => (
          <tr key={u.id}><td className="td font-bold">{u.name}{u.id === me && <span className="chip ms-2 bg-brand-light text-brand">أنت</span>}</td>
            <td className="td text-xs">{u.phone && <div><bdi className="ltr">{formatPhone(u.phone)}</bdi></div>}{u.email && <div><bdi className="ltr">{u.email}</bdi></div>}</td>
            <td className="td">{u.id === me ? ROLE_AR[u.role] : <select className="input !min-h-9 !w-auto !py-1" value={u.role} onChange={(e) => patch(u.id, { role: e.target.value })}>{["customer", "staff", "admin"].map((r) => <option key={r} value={r}>{ROLE_AR[r]}</option>)}</select>}</td>
            <td className="td">{u.id === me ? "فعّال" : <button className={`chip !px-3 !py-1.5 ${u.active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`} onClick={() => patch(u.id, { active: !u.active })}>{u.active ? "فعّال" : "موقوف"}</button>}</td>
            <td className="td text-xs">{formatDateTime(u.created_at)}</td></tr>))}</tbody></table></div>
    </div>
  );
}
