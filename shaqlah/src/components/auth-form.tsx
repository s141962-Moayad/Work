"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { Field, Spinner } from "@/components/ui/misc";
import { normalizePhone } from "@/lib/utils";

export function AuthForm({ mode, next = "/account", admin = false }: { mode: "login" | "register"; next?: string; admin?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const register = mode === "register";

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/account";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errs: Record<string, string> = {};
    if (register) {
      if (name.trim().length < 2) errs.name = "الرجاء إدخال الاسم.";
      if (!phone.trim() && !email.trim()) errs.phone = "أدخل رقم الهاتف أو البريد الإلكتروني.";
      if (phone.trim() && !normalizePhone(phone)) errs.phone = "رقم الهاتف غير صحيح. أدخل رقمًا عُمانيًا مكوّنًا من ٨ أرقام.";
      if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "البريد الإلكتروني غير صحيح.";
      if (pw.length < 8) errs.pw = "كلمة المرور يجب ألا تقل عن ٨ أحرف.";
    } else {
      if (id.trim().length < 3) errs.id = "أدخل رقم الهاتف أو البريد الإلكتروني.";
      if (!pw) errs.pw = "كلمة المرور مطلوبة.";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      if (register) await api("/api/auth/register", { body: { name, phone, email, password: pw } });
      else await api("/api/auth/login", { body: { identifier: id, password: pw, admin } });
      router.push(admin ? "/admin" : safeNext);
      router.refresh();
    } catch (err: any) {
      setFormError(err.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="card mx-auto w-full max-w-md space-y-4 p-6 sm:p-8">
      <h1 className="text-2xl font-black">{admin ? "دخول لوحة التحكم" : register ? "إنشاء حساب جديد" : "تسجيل الدخول"}</h1>
      {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{formError}</p>}
      {register ? (
        <>
          <Field label="الاسم" error={errors.name}><input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} /></Field>
          <Field label="رقم الهاتف" error={errors.phone} hint="أدخل رقم هاتفك أو بريدك الإلكتروني (أحدهما على الأقل)">
            <input className="input" type="tel" inputMode="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9XXX XXXX" autoComplete="tel" />
          </Field>
          <Field label="البريد الإلكتروني" error={errors.email}><input className="input" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
        </>
      ) : (
        <Field label="رقم الهاتف أو البريد الإلكتروني" error={errors.id}>
          <input className="input" dir="ltr" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" />
        </Field>
      )}
      <Field label="كلمة المرور" error={errors.pw} hint={register ? "٨ أحرف على الأقل" : undefined}>
        <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={register ? "new-password" : "current-password"} />
      </Field>
      <button className="btn-primary btn-lg w-full" disabled={busy}>{busy ? <Spinner /> : null} {register ? "إنشاء الحساب" : "دخول"}</button>
      {!admin && (
        <p className="text-center text-sm text-ink-muted">
          {register ? <>لديك حساب؟ <Link className="font-bold text-brand" href={`/login?next=${encodeURIComponent(safeNext)}`}>سجّل الدخول</Link></> : <>ليس لديك حساب؟ <Link className="font-bold text-brand" href={`/register?next=${encodeURIComponent(safeNext)}`}>أنشئ حسابًا</Link></>}
        </p>
      )}
      {!admin && <p className="text-center text-xs text-ink-muted">يمكنك أيضًا الطلب كضيف بدون حساب.</p>}
    </form>
  );
}
