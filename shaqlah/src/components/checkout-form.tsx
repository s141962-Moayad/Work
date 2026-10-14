"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, uuid } from "@/lib/client";
import { cart, rememberRef, useCart } from "@/lib/cart-store";
import { toPayloadLines, useQuote } from "@/lib/use-quote";
import { Price } from "@/components/brand";
import { Row } from "@/components/cart-view";
import { ErrorText, Field, Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { cn, formatDate, formatNumber, formatTime, normalizePhone, relativeDayLabel, weekdayOf, LOCALE } from "@/lib/utils";
import { WEEKDAYS_AR } from "@/lib/constants";

interface Slot { start: string; time: string; nextDay: boolean; remaining: number }
interface SlotsResp { prepMinutes: number; days: { date: string; closed: boolean }[]; next?: Slot[]; slots?: Slot[]; closed?: boolean }

export function CheckoutForm({
  methods, ordering, openStatus, defaults, loggedIn,
}: {
  methods: { cash: boolean; card: boolean; apple_pay: boolean };
  ordering: boolean;
  openStatus: { open: boolean; text: string };
  defaults: { name: string; phone: string; email: string };
  loggedIn: boolean;
}) {
  const router = useRouter();
  const lines = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [name, setName] = useState(defaults.name);
  const [phone, setPhone] = useState(defaults.phone);
  const [email, setEmail] = useState(defaults.email);
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<"asap" | "scheduled">("asap");
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const firstMethod = (["cash", "card", "apple_pay"] as const).find((m) => methods[m]) ?? "cash";
  const [payment, setPayment] = useState<"cash" | "card" | "apple_pay">(firstMethod);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | null>(null);
  const [couponErr, setCouponErr] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [idem] = useState(uuid);

  const { quote, error: quoteError, loading: quoting } = useQuote(lines, coupon);
  useEffect(() => {
    if (quoteError?.field === "coupon") {
      setCouponErr(quoteError.message);
      setCoupon(null);
    }
  }, [quoteError]);

  /* ───── pickup slots ───── */
  const [slots, setSlots] = useState<SlotsResp | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const linesSig = useMemo(() => JSON.stringify(toPayloadLines(lines)), [lines]);

  useEffect(() => {
    if (!lines.length) return;
    let alive = true;
    setSlotsLoading(true);
    api<SlotsResp>("/api/pickup/slots", { body: { items: toPayloadLines(lines), date: mode === "scheduled" && date ? date : undefined } })
      .then((r) => {
        if (!alive) return;
        setSlots(r);
        if (mode === "scheduled" && !date) {
          const firstOpen = r.days.find((d) => !d.closed);
          if (firstOpen) setDate(firstOpen.date);
        }
        if (slot && r.slots && !r.slots.some((s) => s.start === slot)) setSlot(null);
      })
      .catch((e) => alive && setFormError(e.message))
      .finally(() => alive && setSlotsLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesSig, mode, date]);

  const nextSlot = slots?.next?.[0];

  const applyCoupon = () => {
    setCouponErr(null);
    setCoupon(couponInput.trim() ? couponInput.trim() : null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "الرجاء إدخال الاسم.";
    if (!normalizePhone(phone)) errs.phone = "رقم الهاتف غير صحيح. أدخل رقمًا عُمانيًا مكوّنًا من ٨ أرقام.";
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "البريد الإلكتروني غير صحيح.";
    if (mode === "scheduled" && !slot) errs.pickup = "يرجى اختيار موعد الاستلام.";
    if (mode === "asap" && !nextSlot) errs.pickup = "لا تتوفر مواعيد استلام حاليًا.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.querySelector("[data-error]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ number: string; token: string; redirectUrl: string | null }>("/api/orders", {
        body: {
          items: toPayloadLines(lines),
          customer: { name, phone, email },
          pickup: { mode, slotStart: mode === "scheduled" ? slot : undefined },
          paymentMethod: payment,
          couponCode: coupon,
          notes: notes || null,
          idempotencyKey: idem,
        },
      });
      rememberRef({ kind: "order", number: r.number, token: r.token });
      cart.clear();
      if (r.redirectUrl) window.location.href = r.redirectUrl;
      else router.push(`/orders/${r.number}?k=${r.token}&new=1`);
    } catch (err: any) {
      setBusy(false);
      setFormError(err.message);
      if (err.field === "pickup") setSlot(null);
      toast(err.message, "err");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (!mounted) return <div className="container-x py-10"><div className="skeleton h-64" /></div>;
  if (!lines.length) {
    return (
      <div className="container-x py-16 text-center">
        <div className="text-6xl">🛒</div>
        <h1 className="mt-3 text-2xl font-black">سلتك فارغة</h1>
        <Link href="/menu" className="btn-primary mt-5">تصفّح القائمة</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="container-x py-8">
      <h1 className="mb-6 text-3xl font-black">إتمام الطلب</h1>
      {!ordering && <div role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">الطلب الإلكتروني متوقف مؤقتًا. نعتذر عن الإزعاج.</div>}
      {formError && <div role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{formError}</div>}
      {!openStatus.open && <div className="mb-4 rounded-2xl bg-gold-light p-4 text-sm font-semibold">🕒 {openStatus.text} — يمكنك جدولة الاستلام لموعد قادم.</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* contact */}
          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-extrabold">١. بيانات التواصل</h2>
            {!loggedIn && <p className="mb-4 rounded-xl bg-paper p-3 text-sm text-ink-muted">تطلب كضيف بدون حساب. <Link className="font-bold text-brand underline" href="/login?next=/checkout">سجّل الدخول</Link> لحفظ بياناتك وطلباتك.</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div data-error={errors.name ? "" : undefined}>
                <Field label="الاسم" error={errors.name}>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
                </Field>
              </div>
              <div data-error={errors.phone ? "" : undefined}>
                <Field label="رقم الهاتف" error={errors.phone} hint="نتواصل معك على هذا الرقم عند جاهزية الطلب">
                  <input className="input" type="tel" inputMode="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9XXX XXXX" autoComplete="tel" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="البريد الإلكتروني (اختياري)" error={errors.email} hint="لإرسال تأكيد الطلب">
                  <input className="input" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </Field>
              </div>
            </div>
          </section>

          {/* pickup */}
          <section className="card p-5 sm:p-6" data-error={errors.pickup ? "" : undefined}>
            <h2 className="mb-1 text-lg font-extrabold">٢. موعد الاستلام من المطعم</h2>
            <p className="mb-4 text-sm text-ink-muted">⏱ مدة التحضير التقريبية: {slots ? formatNumber(slots.prepMinutes) : "…"} دقيقة</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Choice active={mode === "asap"} onClick={() => setMode("asap")} title="في أقرب وقت ممكن" desc={slotsLoading && !slots ? "جارٍ الحساب…" : nextSlot ? `أقرب موعد: ${relativeDayLabel(new Date(nextSlot.start))} ${formatTime(nextSlot.start)}` : "لا تتوفر مواعيد حاليًا"} icon="⚡" />
              <Choice active={mode === "scheduled"} onClick={() => setMode("scheduled")} title="تحديد موعد الاستلام" desc="اختر اليوم والوقت المناسبين لك" icon="📅" />
            </div>

            {mode === "scheduled" && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-extrabold">اختر اليوم</h3>
                <div className="scrollbar-none flex gap-2 overflow-x-auto pb-2" role="radiogroup" aria-label="يوم الاستلام">
                  {slots?.days.map((d) => (
                    <button type="button" key={d.date} role="radio" aria-checked={date === d.date} disabled={d.closed}
                      onClick={() => { setDate(d.date); setSlot(null); }}
                      className={cn("flex min-w-20 shrink-0 flex-col items-center rounded-2xl border px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40", date === d.date ? "border-brand bg-brand text-white" : "border-ink/10 bg-white hover:border-brand")}>
                      <span className="text-xs opacity-80">{relativeDayLabel(new Date(`${d.date}T12:00:00+04:00`)) === "اليوم" ? "اليوم" : relativeDayLabel(new Date(`${d.date}T12:00:00+04:00`)) === "غدًا" ? "غدًا" : WEEKDAYS_AR[weekdayOf(d.date)]}</span>
                      <span>{new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", timeZone: "Asia/Muscat" }).format(new Date(`${d.date}T12:00:00+04:00`))}</span>
                      {d.closed && <span className="text-[10px]">مغلق</span>}
                    </button>
                  ))}
                </div>
                <h3 className="mb-2 mt-4 text-sm font-extrabold">المواعيد المتاحة {date && <span className="font-medium text-ink-muted">— {formatDate(`${date}T12:00:00+04:00`)}</span>}</h3>
                {slotsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-ink-muted"><Spinner /> جارٍ تحميل المواعيد…</div>
                ) : slots?.slots && slots.slots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5" role="radiogroup" aria-label="وقت الاستلام">
                    {slots.slots.map((s) => (
                      <button type="button" key={s.start} role="radio" aria-checked={slot === s.start} onClick={() => setSlot(s.start)}
                        className={cn("rounded-xl border px-2 py-2.5 text-sm font-bold tabular-nums transition", slot === s.start ? "border-brand bg-brand text-white" : "border-ink/10 bg-white hover:border-brand")}>
                        {formatTime(s.start)}
                        {s.nextDay && <span className="block text-[10px] font-medium opacity-70">بعد منتصف الليل</span>}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-paper p-4 text-sm text-ink-muted">{slots?.closed ? "المطعم مغلق في هذا اليوم." : "لا توجد مواعيد متاحة في هذا اليوم. جرّب يومًا آخر."}</p>
                )}
              </div>
            )}
            <ErrorText>{errors.pickup}</ErrorText>
          </section>

          {/* payment */}
          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-extrabold">٣. طريقة الدفع</h2>
            <div className="grid gap-3" role="radiogroup" aria-label="طريقة الدفع">
              {methods.cash && <Choice active={payment === "cash"} onClick={() => setPayment("cash")} title="الدفع عند الاستلام" desc="ادفع نقدًا أو بالبطاقة عند استلام طلبك من المطعم" icon="💵" />}
              {methods.card && <Choice active={payment === "card"} onClick={() => setPayment("card")} title="بطاقة مصرفية" desc="دفع إلكتروني آمن عبر صفحة مزوّد الدفع — لا نخزّن بيانات بطاقتك" icon="💳" />}
              {methods.apple_pay && <Choice active={payment === "apple_pay"} onClick={() => setPayment("apple_pay")} title="Apple Pay" desc="يتم الدفع عبر صفحة الدفع الآمنة لدى مزوّد الدفع" icon="" />}
              {!methods.card && !methods.apple_pay && <p className="text-xs text-ink-muted">الدفع الإلكتروني غير متاح حاليًا.</p>}
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <Field label="ملاحظات على الطلب (اختياري)">
              <textarea className="input min-h-20" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </section>
        </div>

        {/* summary */}
        <aside className="card h-fit space-y-3 p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-extrabold">ملخص الطلب</h2>
          <ul className="space-y-2 border-b border-dashed border-ink/15 pb-3 text-sm">
            {lines.map((l, i) => (
              <li key={l.key} className="flex justify-between gap-2">
                <span className="min-w-0">
                  <span className="font-bold">{formatNumber(l.quantity)}× {l.name}</span>
                  {(l.variantName || l.addons.length > 0) && <span className="block truncate text-xs text-ink-muted">{[l.variantName, ...l.addons.map((a) => a.name)].filter(Boolean).join("، ")}</span>}
                </span>
                <Price value={quote?.lines[i]?.lineTotal ?? l.unitPrice * l.quantity} className="font-bold" />
              </li>
            ))}
          </ul>

          <div>
            <label className="label" htmlFor="coupon">كود الخصم</label>
            <div className="flex gap-2">
              <input id="coupon" className="input uppercase" dir="ltr" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="CODE" maxLength={40} />
              <button type="button" className="btn-dark btn-sm shrink-0" onClick={applyCoupon}>تطبيق</button>
            </div>
            <ErrorText>{couponErr}</ErrorText>
            {quote?.coupon && <p className="mt-1.5 text-sm font-bold text-emerald-700">✔ تم تطبيق الكود {quote.coupon.code}</p>}
          </div>

          <Row label="المجموع الفرعي" value={quote ? <Price value={quote.subtotal} /> : <Spinner />} />
          {quote && quote.discount > 0 && <Row label="الخصم" value={<span className="text-emerald-700">−<Price value={quote.discount} /></span>} />}
          {quote && quote.fee > 0 && <Row label="رسوم الخدمة" value={<Price value={quote.fee} />} />}
          {quote && <Row label={quote.vatIncluded ? "منها ضريبة القيمة المضافة" : "ضريبة القيمة المضافة"} value={<Price value={quote.tax} />} muted />}
          <div className="border-t border-dashed border-ink/15 pt-3">
            <Row label="الإجمالي" value={quote ? <Price value={quote.total} className="text-xl font-black text-brand" /> : "—"} bold />
          </div>
          {quoteError && quoteError.field !== "coupon" && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{quoteError.message} <Link href="/cart" className="underline">العودة للسلة</Link></p>}

          <button type="submit" className="btn-primary btn-lg w-full" disabled={busy || !quote || quoting || !ordering}>
            {busy ? <><Spinner /> جارٍ تأكيد الطلب…</> : payment === "cash" ? "تأكيد الطلب" : "تأكيد الطلب والدفع"}
          </button>
          <p className="text-center text-xs text-ink-muted">بالضغط على «تأكيد الطلب» فأنت توافق على <Link className="underline" href="/terms">الشروط والأحكام</Link> و<Link className="underline" href="/cancellation-policy">سياسة الإلغاء</Link>.</p>
        </aside>
      </div>
    </form>
  );
}

function Choice({ active, onClick, title, desc, icon }: { active: boolean; onClick: () => void; title: string; desc: string; icon: string }) {
  return (
    <button type="button" role="radio" aria-checked={active} onClick={onClick}
      className={cn("flex items-start gap-3 rounded-2xl border p-4 text-start transition", active ? "border-brand bg-brand-light ring-2 ring-brand/30" : "border-ink/10 bg-white hover:border-brand/50")}>
      <span className="text-2xl" aria-hidden>{icon || "🍎"}</span>
      <span>
        <span className="block font-extrabold">{title}</span>
        <span className="mt-0.5 block text-xs leading-6 text-ink-muted">{desc}</span>
      </span>
    </button>
  );
}
