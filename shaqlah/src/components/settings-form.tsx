"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import type { Settings, SettingsKey } from "@/lib/settings";
import { ImageUpload } from "@/components/image-upload";
import { Field, Spinner, Toggle } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { WEEKDAYS_AR } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Integrations = { thawani: boolean; smtp: boolean; sms: boolean; whatsapp: boolean };
const TABS = [
  ["general", "معلومات المطعم"], ["hours", "ساعات العمل"], ["ordering", "الطلب والاستلام"], ["payments", "الدفع والضرائب"],
  ["reservations", "الحجوزات"], ["notifications", "الإشعارات"], ["social", "التواصل الاجتماعي"],
] as const;
type Tab = (typeof TABS)[number][0];

const num = (v: string) => (v === "" ? ("" as any) : Number(v));
const N = ({ label, value, onChange, hint, step = 1, min = 0 }: { label: string; value: number; onChange: (n: number) => void; hint?: string; step?: number; min?: number }) => (
  <Field label={label} hint={hint}><input className="input" type="number" dir="ltr" min={min} step={step} value={value} onChange={(e) => onChange(num(e.target.value))} /></Field>
);

const Int = ({ name, ok, note }: { name: string; ok: boolean; note: string }) => (
  <div className="flex items-start justify-between gap-3 rounded-xl bg-paper p-3 text-sm"><div><b>{name}</b><p className="text-xs text-ink-muted">{note}</p></div><span className={cn("chip shrink-0", ok ? "bg-emerald-100 text-emerald-800" : "bg-ink/10 text-ink-muted")}>{ok ? "مهيّأ" : "غير مهيّأ"}</span></div>
);

export function SettingsForm({ initial, integrations }: { initial: Settings; integrations: Integrations }) {
  const router = useRouter();
  const [s, setS] = useState<Settings>(initial);
  const [tab, setTab] = useState<Tab>("general");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const patch = <K extends SettingsKey>(k: K, v: Partial<Settings[K]>) => setS((p) => ({ ...p, [k]: { ...(p[k] as any), ...v } }));

  const save = async (groups: SettingsKey[]) => {
    setBusy(true); setErr(null);
    try {
      for (const g of groups) await api("/api/admin/settings", { method: "PUT", body: { group: g, value: s[g] } });
      toast("تم حفظ الإعدادات.");
      router.refresh();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const Save = (groups: SettingsKey[]) => (
    <div className="mt-6 flex items-center gap-3"><button className="btn-primary" disabled={busy} onClick={() => save(groups)}>{busy ? <Spinner /> : null} حفظ التغييرات</button>{err && <p role="alert" className="text-sm font-bold text-red-600">{err}</p>}</div>
  );

  return (
    <div className="space-y-5">
      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1" role="tablist">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-bold", tab === k ? "bg-ink text-white" : "bg-white ring-1 ring-ink/10")} onClick={() => { setTab(k); setErr(null); }}>{l}</button>)}
      </div>

      <div className="card p-5 sm:p-6">
        {tab === "general" && (<>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="اسم المطعم"><input className="input" value={s.general.name} onChange={(e) => patch("general", { name: e.target.value })} maxLength={60} /></Field>
            <Field label="الشعار النصي"><input className="input" value={s.general.slogan} onChange={(e) => patch("general", { slogan: e.target.value })} maxLength={80} /></Field>
            <ImageUpload label="شعار المطعم" value={s.general.logo} onChange={(u) => patch("general", { logo: u })} />
            <ImageUpload label="صورة الغلاف في الصفحة الرئيسية" value={s.general.heroImage} onChange={(u) => patch("general", { heroImage: u })} />
            <Field label="رقم الهاتف"><input className="input" dir="ltr" value={s.general.phone} onChange={(e) => patch("general", { phone: e.target.value })} placeholder="+968 9XXX XXXX" /></Field>
            <Field label="واتساب"><input className="input" dir="ltr" value={s.general.whatsapp} onChange={(e) => patch("general", { whatsapp: e.target.value })} /></Field>
            <Field label="البريد الإلكتروني"><input className="input" type="email" dir="ltr" value={s.general.email} onChange={(e) => patch("general", { email: e.target.value })} /></Field>
            <Field label="العنوان"><input className="input" value={s.general.address} onChange={(e) => patch("general", { address: e.target.value })} maxLength={200} /></Field>
            <Field label="خط العرض (Latitude)" hint="من خرائط جوجل: انقر بزر الفأرة الأيمن على موقعك وانسخ الإحداثيات"><input className="input" dir="ltr" value={s.general.mapLat} onChange={(e) => patch("general", { mapLat: e.target.value })} placeholder="23.5880" /></Field>
            <Field label="خط الطول (Longitude)"><input className="input" dir="ltr" value={s.general.mapLng} onChange={(e) => patch("general", { mapLng: e.target.value })} placeholder="58.3829" /></Field>
            <div className="sm:col-span-2"><Field label="رابط خريطة مضمّن (اختياري)" hint="خرائط جوجل ← مشاركة ← تضمين خريطة ← انسخ قيمة src (يبدأ بـ https://www.google.com/maps/embed?)"><input className="input" dir="ltr" value={s.general.mapEmbedUrl} onChange={(e) => patch("general", { mapEmbedUrl: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="نبذة عن المطعم (صفحة من نحن)"><textarea className="input min-h-28" value={s.general.about} onChange={(e) => patch("general", { about: e.target.value })} maxLength={1500} /></Field></div>
          </div>
          {Save(["general"])}
        </>)}

        {tab === "hours" && (<>
          <p className="mb-4 text-sm text-ink-muted">إذا كان وقت الإغلاق أقل من وقت الفتح (مثلًا ١٨:٠٠ إلى ٠٢:٠٠) فيعني ذلك أن الدوام يمتد بعد منتصف الليل.</p>
          <div className="space-y-2">
            {s.hours.map((h, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 rounded-2xl bg-paper p-3">
                <b className="w-20">{WEEKDAYS_AR[i]}</b>
                <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="size-4 accent-brand" checked={h.closed} onChange={(e) => setS((p) => ({ ...p, hours: p.hours.map((x, j) => (j === i ? { ...x, closed: e.target.checked } : x)) }))} /> مغلق</label>
                {!h.closed && <>
                  <label className="flex items-center gap-2 text-sm">من <input type="time" className="input !w-32" dir="ltr" value={h.open} onChange={(e) => setS((p) => ({ ...p, hours: p.hours.map((x, j) => (j === i ? { ...x, open: e.target.value } : x)) }))} /></label>
                  <label className="flex items-center gap-2 text-sm">إلى <input type="time" className="input !w-32" dir="ltr" value={h.close} onChange={(e) => setS((p) => ({ ...p, hours: p.hours.map((x, j) => (j === i ? { ...x, close: e.target.value } : x)) }))} /></label>
                </>}
              </div>
            ))}
          </div>
          {Save(["hours"])}
        </>)}

        {tab === "ordering" && (<>
          <div className="mb-5 space-y-2">
            <Toggle label="استقبال الطلبات الإلكترونية" hint="أوقفه مؤقتًا لإيقاف الطلب من الموقع" checked={s.ordering.enabled} onChange={(v) => patch("ordering", { enabled: v })} />
            <Toggle label="قبول الطلبات النقدية تلقائيًا" hint="إن كان متوقفًا فيجب قبول كل طلب يدويًا من لوحة التحكم" checked={s.ordering.autoAccept} onChange={(v) => patch("ordering", { autoAccept: v })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <N label="وقت التجهيز الأساسي (دقائق)" hint="يُضاف إلى وقت تحضير أبطأ صنف في الطلب" value={s.ordering.basePrepMinutes} onChange={(n) => patch("ordering", { basePrepMinutes: n })} />
            <N label="وقت إضافي لكل صنف زائد (دقائق)" value={s.ordering.extraPerItemMinutes} onChange={(n) => patch("ordering", { extraPerItemMinutes: n })} />
            <Field label="الفاصل بين مواعيد الاستلام"><select className="input" value={s.ordering.slotIntervalMinutes} onChange={(e) => patch("ordering", { slotIntervalMinutes: Number(e.target.value) })}>{[5, 10, 15, 20, 30, 60].map((n) => <option key={n} value={n}>{n} دقيقة</option>)}</select></Field>
            <N label="سعة المطبخ: أقصى عدد طلبات لكل موعد" min={1} value={s.ordering.capacityPerSlot} onChange={(n) => patch("ordering", { capacityPerSlot: n })} />
            <N label="أقصى عدد أيام للطلب المسبق" value={s.ordering.maxDaysAhead} onChange={(n) => patch("ordering", { maxDaysAhead: n })} />
            <N label="آخر موعد استلام قبل الإغلاق (دقائق)" value={s.ordering.lastPickupBeforeCloseMinutes} onChange={(n) => patch("ordering", { lastPickupBeforeCloseMinutes: n })} />
            <N label="مهلة إلغاء العميل قبل الموعد (دقائق)" value={s.ordering.customerCancelCutoffMinutes} onChange={(n) => patch("ordering", { customerCancelCutoffMinutes: n })} />
            <N label="مهلة إتمام الدفع الإلكتروني (دقائق)" min={5} value={s.ordering.onlinePaymentExpiryMinutes} onChange={(n) => patch("ordering", { onlinePaymentExpiryMinutes: n })} />
            <N label="أقصى عدد أصناف في الطلب" min={1} value={s.ordering.maxItemsPerOrder} onChange={(n) => patch("ordering", { maxItemsPerOrder: n })} />
          </div>
          {Save(["ordering"])}
        </>)}

        {tab === "payments" && (<>
          <h3 className="mb-2 font-extrabold">طرق الدفع</h3>
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            <Toggle label="الدفع عند الاستلام" checked={s.payments.cash} onChange={(v) => patch("payments", { cash: v })} />
            <Toggle label="بطاقة مصرفية (إلكتروني)" checked={s.payments.card} onChange={(v) => patch("payments", { card: v })} />
            <Toggle label="Apple Pay" checked={s.payments.applePay} onChange={(v) => patch("payments", { applePay: v })} />
          </div>
          <Int name="مزوّد الدفع الإلكتروني (Thawani Pay)" ok={integrations.thawani} note={integrations.thawani ? "المفاتيح موجودة في متغيرات البيئة." : "أضف THAWANI_SECRET_KEY و THAWANI_PUBLISHABLE_KEY في متغيرات البيئة. إلى ذلك الحين لن يظهر الدفع الإلكتروني للعملاء. يتطلب Apple Pay تفعيله في حساب التاجر لدى المزوّد."} />
          <h3 className="mb-2 mt-6 font-extrabold">الضرائب والرسوم</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <N label="ضريبة القيمة المضافة (٪)" step={0.1} value={s.finance.vatPercent} onChange={(n) => patch("finance", { vatPercent: n })} hint="اضبطها حسب وضعك الضريبي (٠ إن لم تكن مسجّلًا)" />
            <N label="رسوم الخدمة لكل طلب (ر.ع)" step={0.001} value={s.finance.serviceFee} onChange={(n) => patch("finance", { serviceFee: n })} />
            <div className="flex items-end"><Toggle label="الأسعار شاملة الضريبة" checked={s.finance.vatIncluded} onChange={(v) => patch("finance", { vatIncluded: v })} /></div>
          </div>
          {Save(["payments", "finance"])}
        </>)}

        {tab === "reservations" && (<>
          <div className="mb-5 space-y-2">
            <Toggle label="استقبال الحجوزات" checked={s.reservations.enabled} onChange={(v) => patch("reservations", { enabled: v })} />
            <Toggle label="تأكيد الحجز تلقائيًا" hint="إن كان متوقفًا فتصل الحجوزات «بانتظار التأكيد»" checked={s.reservations.autoConfirm} onChange={(v) => patch("reservations", { autoConfirm: v })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <N label="مدة الجلوس (دقائق)" min={30} value={s.reservations.durationMinutes} onChange={(n) => patch("reservations", { durationMinutes: n })} />
            <Field label="الفاصل بين أوقات الحجز"><select className="input" value={s.reservations.slotIntervalMinutes} onChange={(e) => patch("reservations", { slotIntervalMinutes: Number(e.target.value) })}>{[15, 30, 60].map((n) => <option key={n} value={n}>{n} دقيقة</option>)}</select></Field>
            <N label="أقل مهلة قبل الحجز (دقائق)" value={s.reservations.minLeadMinutes} onChange={(n) => patch("reservations", { minLeadMinutes: n })} />
            <N label="أقصى عدد أيام للحجز المسبق" min={1} value={s.reservations.maxDaysAhead} onChange={(n) => patch("reservations", { maxDaysAhead: n })} />
            <N label="آخر حجز قبل الإغلاق (دقائق)" value={s.reservations.lastSeatingBeforeCloseMinutes} onChange={(n) => patch("reservations", { lastSeatingBeforeCloseMinutes: n })} />
            <N label="مهلة تعديل/إلغاء العميل (ساعات)" value={s.reservations.modifyCutoffHours} onChange={(n) => patch("reservations", { modifyCutoffHours: n })} />
          </div>
          <p className="mt-4 text-sm text-ink-muted">إدارة الطاولات وسعتها وحظر التواريخ من صفحة «الطاولات والإتاحة».</p>
          {Save(["reservations"])}
        </>)}

        {tab === "notifications" && (<>
          <p className="mb-4 text-sm text-ink-muted">إشعارات التطبيق تعمل دائمًا. القنوات الإضافية تتطلب حسابات خارجية وبيانات اعتماد في متغيرات البيئة، وتُرسل فقط لمن سمح بها من العملاء.</p>
          <div className="space-y-3">
            <div className="space-y-2"><Toggle label="البريد الإلكتروني" checked={s.notifications.email} onChange={(v) => patch("notifications", { email: v })} /><Int name="SMTP" ok={integrations.smtp} note="SMTP_HOST و SMTP_FROM (و SMTP_USER / SMTP_PASS)" /></div>
            <div className="space-y-2"><Toggle label="رسائل SMS" checked={s.notifications.sms} onChange={(v) => patch("notifications", { sms: v })} /><Int name="Twilio SMS" ok={integrations.sms} note="TWILIO_ACCOUNT_SID و TWILIO_AUTH_TOKEN و TWILIO_FROM" /></div>
            <div className="space-y-2"><Toggle label="واتساب للأعمال" checked={s.notifications.whatsapp} onChange={(v) => patch("notifications", { whatsapp: v })} /><Int name="WhatsApp Business Cloud API" ok={integrations.whatsapp} note="WHATSAPP_TOKEN و WHATSAPP_PHONE_ID و WHATSAPP_TEMPLATE_NAME (قالب معتمد من Meta)" /></div>
          </div>
          {Save(["notifications"])}
        </>)}

        {tab === "social" && (<>
          <div className="grid gap-4 sm:grid-cols-2">
            {([["instagram", "إنستغرام"], ["x", "إكس (تويتر)"], ["tiktok", "تيك توك"], ["snapchat", "سناب شات"], ["facebook", "فيسبوك"], ["whatsapp", "رابط واتساب"]] as const).map(([k, l]) => (
              <Field key={k} label={l} hint="رابط كامل يبدأ بـ https://"><input className="input" dir="ltr" value={s.social[k]} onChange={(e) => patch("social", { [k]: e.target.value } as any)} /></Field>
            ))}
          </div>
          {Save(["social"])}
        </>)}
      </div>
    </div>
  );
}
