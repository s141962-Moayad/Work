"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { Field, Spinner } from "@/components/ui/misc";
import { normalizePhone } from "@/lib/utils";

export function ContactForm() {
  const [v, setV] = useState({ name: "", phone: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<any>) => setV({ ...v, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errs: Record<string, string> = {};
    if (v.name.trim().length < 2) errs.name = "الرجاء إدخال الاسم.";
    if (!v.phone.trim() && !v.email.trim()) errs.phone = "أدخل رقم الهاتف أو البريد الإلكتروني للرد عليك.";
    if (v.phone.trim() && !normalizePhone(v.phone)) errs.phone = "رقم الهاتف غير صحيح.";
    if (v.email.trim() && !/^\S+@\S+\.\S+$/.test(v.email.trim())) errs.email = "البريد الإلكتروني غير صحيح.";
    if (v.message.trim().length < 5) errs.message = "اكتب رسالتك (٥ أحرف على الأقل).";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api("/api/contact", { body: v });
      setSent(true);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) return <div className="card p-8 text-center"><div className="text-5xl">✅</div><h2 className="mt-3 text-xl font-black">تم إرسال رسالتك</h2><p className="mt-1 text-ink-muted">شكرًا لتواصلك، سنرد عليك في أقرب وقت.</p></div>;
  return (
    <form onSubmit={submit} noValidate className="card space-y-4 p-6">
      {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{formError}</p>}
      <Field label="الاسم" error={errors.name}><input className="input" value={v.name} onChange={set("name")} maxLength={80} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="رقم الهاتف" error={errors.phone}><input className="input" type="tel" dir="ltr" value={v.phone} onChange={set("phone")} placeholder="9XXX XXXX" /></Field>
        <Field label="البريد الإلكتروني" error={errors.email}><input className="input" type="email" dir="ltr" value={v.email} onChange={set("email")} /></Field>
      </div>
      <Field label="رسالتك" error={errors.message}><textarea className="input min-h-32" value={v.message} onChange={set("message")} maxLength={1500} /></Field>
      <button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : null} إرسال الرسالة</button>
    </form>
  );
}
