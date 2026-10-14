"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, uuid } from "@/lib/client";
import { rememberRef } from "@/lib/cart-store";
import { ErrorText, Field, Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { cn, formatDate, formatNumber, formatTime, normalizePhone, relativeDayLabel, weekdayOf, LOCALE } from "@/lib/utils";
import { WEEKDAYS_AR } from "@/lib/constants";

interface Avail {
  enabled: boolean;
  maxParty: number;
  durationMinutes: number;
  days: { date: string; closed: boolean }[];
  closed?: boolean;
  slots: { start: string; time: string; indoor: boolean; outdoor: boolean }[];
}

export interface ExistingReservation {
  number: string;
  token: string | null;
  customer_name: string;
  phone: string;
  party_size: number;
  area_pref: "any" | "indoor" | "outdoor";
  notes: string | null;
  start_at: string | Date;
  id: number;
}

const AREAS = [
  { v: "any", label: "لا يهم", icon: "✨" },
  { v: "indoor", label: "جلسة داخلية", icon: "🛋️" },
  { v: "outdoor", label: "جلسة خارجية", icon: "🌴" },
] as const;

export function ReservationForm({
  defaults, existing, onDone,
}: { defaults?: { name: string; phone: string; email: string }; existing?: ExistingReservation; onDone?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(existing?.customer_name ?? defaults?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? defaults?.phone ?? "");
  const [email, setEmail] = useState(defaults?.email ?? "");
  const [party, setParty] = useState(existing?.party_size ?? 2);
  const [area, setArea] = useState<"any" | "indoor" | "outdoor">(existing?.area_pref ?? "any");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [date, setDate] = useState<string | null>(existing ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Muscat" }).format(new Date(existing.start_at)) : null);
  const [time, setTime] = useState<string | null>(
    existing ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Muscat", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(existing.start_at)) : null,
  );
  const [avail, setAvail] = useState<Avail | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [idem] = useState(uuid);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const qs = new URLSearchParams({ party: String(party), area });
    if (date) qs.set("date", date);
    if (existing) qs.set("exclude", String(existing.id));
    api<Avail>(`/api/reservations/availability?${qs}`)
      .then((r) => {
        if (!alive) return;
        setAvail(r);
        if (!date) setDate(r.days.find((d) => !d.closed)?.date ?? null);
        if (time && date && !r.slots.some((s) => s.time === time)) setTime(null);
      })
      .catch((e) => alive && setFormError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, party, area]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "الرجاء إدخال الاسم الكامل.";
    if (!normalizePhone(phone)) errs.phone = "رقم الهاتف غير صحيح. أدخل رقمًا عُمانيًا مكوّنًا من ٨ أرقام.";
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "البريد الإلكتروني غير صحيح.";
    if (!date) errs.date = "اختر تاريخ الحجز.";
    if (!time) errs.time = "اختر وقت الحجز.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      if (existing) {
        await api(`/api/reservations/${existing.number}${existing.token ? `?k=${existing.token}` : ""}`, { method: "PATCH", body: { date, time, partySize: party, area, notes: notes || null } });
        toast("تم تعديل الحجز بنجاح.");
        onDone?.();
        router.refresh();
      } else {
        const r = await api<{ number: string; token: string }>("/api/reservations", {
          body: { name, phone, email, date, time, partySize: party, area, notes: notes || null, idempotencyKey: idem },
        });
        rememberRef({ kind: "reservation", number: r.number, token: r.token });
        router.push(`/reservations/${r.number}?k=${r.token}&new=1`);
      }
    } catch (err: any) {
      setBusy(false);
      setFormError(err.message);
      if (err.field === "time") setTime(null);
    }
  };

  if (avail && !avail.enabled) {
    return <div className="card p-8 text-center font-bold">حجز الطاولات متوقف مؤقتًا. يرجى التواصل معنا مباشرة.</div>;
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {formError && <div role="alert" className="rounded-2xl bg-red-50 p-4 font-bold text-red-700">{formError}</div>}

      <section className="card space-y-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الاسم الكامل" error={errors.name}>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} disabled={!!existing} autoComplete="name" maxLength={80} />
          </Field>
          <Field label="رقم الهاتف" error={errors.phone}>
            <input className="input" type="tel" inputMode="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!!existing} placeholder="9XXX XXXX" autoComplete="tel" />
          </Field>
          {!existing && (
            <div className="sm:col-span-2">
              <Field label="البريد الإلكتروني (اختياري)" error={errors.email} hint="لإرسال تأكيد الحجز">
                <input className="input" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </Field>
            </div>
          )}
        </div>

        <div>
          <span className="label">عدد الأشخاص</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full border border-ink/15 bg-white">
              <button type="button" className="size-11 text-xl font-bold" onClick={() => setParty((p) => Math.max(1, p - 1))} aria-label="إنقاص">−</button>
              <output className="w-10 text-center text-lg font-extrabold tabular-nums" aria-live="polite">{formatNumber(party)}</output>
              <button type="button" className="size-11 text-xl font-bold" onClick={() => setParty((p) => Math.min(avail?.maxParty ?? 20, p + 1))} aria-label="زيادة">+</button>
            </div>
            {avail && <span className="text-xs text-ink-muted">الحد الأقصى {formatNumber(avail.maxParty)} أشخاص للحجز الواحد</span>}
          </div>
        </div>

        <div>
          <span className="label">نوع الجلسة</span>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="نوع الجلسة">
            {AREAS.map((a) => (
              <button type="button" key={a.v} role="radio" aria-checked={area === a.v} onClick={() => setArea(a.v)}
                className={cn("rounded-2xl border px-2 py-3 text-sm font-bold transition", area === a.v ? "border-brand bg-brand-light ring-2 ring-brand/30" : "border-ink/10 bg-white hover:border-brand/50")}>
                <span className="block text-2xl" aria-hidden>{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="mb-3 text-lg font-extrabold">تاريخ الحجز</h2>
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-2" role="radiogroup" aria-label="تاريخ الحجز">
          {avail?.days.slice(0, 30).map((d) => {
            const dd = new Date(`${d.date}T12:00:00+04:00`);
            const rel = relativeDayLabel(dd);
            return (
              <button type="button" key={d.date} role="radio" aria-checked={date === d.date} disabled={d.closed} onClick={() => { setDate(d.date); setTime(null); }}
                className={cn("flex min-w-20 shrink-0 flex-col items-center rounded-2xl border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40", date === d.date ? "border-brand bg-brand text-white" : "border-ink/10 bg-white hover:border-brand")}>
                <span className="text-xs opacity-80">{rel === "اليوم" || rel === "غدًا" ? rel : WEEKDAYS_AR[weekdayOf(d.date)]}</span>
                <span>{new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", timeZone: "Asia/Muscat" }).format(dd)}</span>
                {d.closed && <span className="text-[10px]">مغلق</span>}
              </button>
            );
          })}
          {!avail && <div className="skeleton h-16 w-full" />}
        </div>
        <ErrorText>{errors.date}</ErrorText>

        <h2 className="mb-3 mt-5 text-lg font-extrabold">وقت الحجز {date && <span className="text-sm font-medium text-ink-muted">— {formatDate(`${date}T12:00:00+04:00`)}</span>}</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-ink-muted"><Spinner /> جارٍ تحميل الأوقات المتاحة…</div>
        ) : avail && avail.slots.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="وقت الحجز">
            {avail.slots.map((s) => (
              <button type="button" key={s.start} role="radio" aria-checked={time === s.time} onClick={() => setTime(s.time)}
                className={cn("rounded-xl border px-2 py-2.5 text-sm font-bold tabular-nums transition", time === s.time ? "border-brand bg-brand text-white" : "border-ink/10 bg-white hover:border-brand")}>
                {formatTime(s.start)}
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-paper p-4 text-sm text-ink-muted">{avail?.closed ? "المطعم مغلق في هذا اليوم." : avail && party > avail.maxParty ? "عدد الأشخاص أكبر من سعة أكبر طاولة. يرجى التواصل معنا لترتيب حجز خاص." : "لا توجد أوقات متاحة لهذا اليوم بالمواصفات المختارة. جرّب يومًا أو نوع جلسة آخر."}</p>
        )}
        <ErrorText>{errors.time}</ErrorText>
        {avail && <p className="mt-3 text-xs text-ink-muted">مدة الجلوس المحجوزة: {formatNumber(avail.durationMinutes)} دقيقة تقريبًا.</p>}
      </section>

      <section className="card p-5 sm:p-6">
        <Field label="ملاحظات إضافية (اختياري)" hint="مثال: مناسبة خاصة، كرسي أطفال، حساسية غذائية…">
          <textarea className="input min-h-20" maxLength={500} value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </section>

      <button className="btn-primary btn-lg w-full sm:w-auto" disabled={busy}>
        {busy ? <><Spinner /> جارٍ الحفظ…</> : existing ? "حفظ التعديلات" : "تأكيد الحجز"}
      </button>
    </form>
  );
}
