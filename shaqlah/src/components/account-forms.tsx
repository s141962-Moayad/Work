"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Field, Spinner, Toggle } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { normalizePhone } from "@/lib/utils";

export function ProfileForm({ user }: { user: { name: string; phone: string | null; email: string | null; notifyPrefs: { email: boolean; sms: boolean; whatsapp: boolean } } }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [prefs, setPrefs] = useState({ email: user.notifyPrefs.email, sms: user.notifyPrefs.sms, whatsapp: user.notifyPrefs.whatsapp });
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "الرجاء إدخال الاسم.";
    if (phone.trim() && !normalizePhone(phone)) errs.phone = "رقم الهاتف غير صحيح.";
    if (!phone.trim() && !email.trim()) errs.phone = "يجب أن يبقى رقم الهاتف أو البريد الإلكتروني.";
    if (next && next.length < 8) errs.next = "كلمة المرور الجديدة يجب ألا تقل عن ٨ أحرف.";
    if (next && !cur) errs.cur = "أدخل كلمة المرور الحالية.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api("/api/account", { method: "PATCH", body: { name, phone, email, prefs, ...(next ? { currentPassword: cur, newPassword: next } : {}) } });
      toast("تم حفظ التغييرات.");
      setCur(""); setNext("");
      router.refresh();
    } catch (err: any) {
      setErrors({ [err.field === "email" ? "email" : err.field === "phone" ? "phone" : err.field === "currentPassword" ? "cur" : "form"]: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="card space-y-4 p-5 sm:p-6">
      <h2 className="text-lg font-extrabold">بياناتي</h2>
      {errors.form && <p role="alert" className="text-sm font-bold text-red-600">{errors.form}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الاسم" error={errors.name}><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>
        <Field label="رقم الهاتف" error={errors.phone}><input className="input" type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9XXX XXXX" /></Field>
        <div className="sm:col-span-2"><Field label="البريد الإلكتروني" error={errors.email}><input className="input" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} /></Field></div>
      </div>
      <div>
        <h3 className="mb-2 font-extrabold">تفضيلات الإشعارات</h3>
        <p className="mb-3 text-xs text-ink-muted">إشعارات التطبيق مفعّلة دائمًا. القنوات الإضافية تعمل عند تفعيلها من المطعم.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <Toggle label="البريد الإلكتروني" checked={prefs.email} onChange={(v) => setPrefs({ ...prefs, email: v })} />
          <Toggle label="رسائل SMS" checked={prefs.sms} onChange={(v) => setPrefs({ ...prefs, sms: v })} />
          <Toggle label="واتساب" checked={prefs.whatsapp} onChange={(v) => setPrefs({ ...prefs, whatsapp: v })} />
        </div>
      </div>
      <details className="rounded-2xl bg-paper p-4">
        <summary className="cursor-pointer font-bold">تغيير كلمة المرور</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="كلمة المرور الحالية" error={errors.cur}><input className="input" type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></Field>
          <Field label="كلمة المرور الجديدة" error={errors.next}><input className="input" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Field>
        </div>
      </details>
      <button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : null} حفظ التغييرات</button>
    </form>
  );
}

export function MarkReadButton() {
  const router = useRouter();
  return (
    <button className="btn-outline btn-sm" onClick={async () => { await api("/api/account/notifications", { body: {} }).catch(() => {}); router.refresh(); }}>
      تحديد الكل كمقروء
    </button>
  );
}
