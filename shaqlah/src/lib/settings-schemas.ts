import { z } from "zod";
import type { Settings, SettingsKey } from "./settings";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "صيغة الوقت غير صحيحة.");
const str = (max: number) => z.string().trim().max(max, "النص طويل جدًا.");
const url = z.string().trim().max(300).refine((v) => v === "" || /^https?:\/\//i.test(v), "الرابط يجب أن يبدأ بـ https://");
const img = z.string().regex(/^\/uploads\/[a-f0-9]{32}\.(png|jpg|webp)$/).nullable();
const int = (min: number, max: number, label: string) =>
  z.coerce.number({ error: `${label} غير صحيح.` }).int(`${label} يجب أن يكون عددًا صحيحًا.`).min(min, `${label}: الحد الأدنى ${min}.`).max(max, `${label}: الحد الأقصى ${max}.`);

export const settingsSchemas: { [K in SettingsKey]: z.ZodType<Settings[K]> } = {
  general: z.object({
    name: str(60).min(1, "اسم المطعم مطلوب."),
    slogan: str(80),
    logo: img,
    heroImage: img,
    phone: str(30),
    whatsapp: str(30),
    email: z.union([z.literal(""), z.string().trim().email("البريد الإلكتروني غير صحيح.")]),
    address: str(200),
    mapLat: z.string().trim().regex(/^(-?\d{1,2}(\.\d+)?)?$/, "خط العرض غير صحيح."),
    mapLng: z.string().trim().regex(/^(-?\d{1,3}(\.\d+)?)?$/, "خط الطول غير صحيح."),
    mapEmbedUrl: z.string().trim().refine((v) => v === "" || /^https:\/\/www\.google\.com\/maps\/embed\?/.test(v), "رابط خرائط جوجل المضمّن يجب أن يبدأ بـ https://www.google.com/maps/embed?"),
    about: str(1500),
  }),
  social: z.object({ instagram: url, x: url, tiktok: url, snapchat: url, facebook: url, whatsapp: url }),
  hours: z.array(z.object({ closed: z.boolean(), open: hhmm, close: hhmm })).length(7),
  ordering: z.object({
    enabled: z.boolean(),
    autoAccept: z.boolean(),
    basePrepMinutes: int(0, 120, "وقت التجهيز الأساسي"),
    extraPerItemMinutes: int(0, 10, "الوقت الإضافي لكل صنف"),
    slotIntervalMinutes: z.coerce.number().refine((v) => [5, 10, 15, 20, 30, 60].includes(v), "فاصل المواعيد غير صحيح."),
    capacityPerSlot: int(1, 100, "سعة المطبخ لكل موعد"),
    maxDaysAhead: int(0, 30, "أقصى عدد أيام للطلب المسبق"),
    lastPickupBeforeCloseMinutes: int(0, 180, "آخر موعد قبل الإغلاق"),
    customerCancelCutoffMinutes: int(0, 720, "مهلة إلغاء الطلب"),
    onlinePaymentExpiryMinutes: int(5, 240, "مهلة الدفع الإلكتروني"),
    maxItemsPerOrder: int(1, 200, "أقصى عدد أصناف للطلب"),
  }),
  finance: z.object({
    vatPercent: z.coerce.number().min(0, "نسبة الضريبة غير صحيحة.").max(30, "نسبة الضريبة غير صحيحة."),
    vatIncluded: z.boolean(),
    serviceFee: z.coerce.number().min(0, "رسوم الخدمة غير صحيحة.").max(100),
  }),
  payments: z.object({ cash: z.boolean(), card: z.boolean(), applePay: z.boolean() }).refine((p) => p.cash || p.card || p.applePay, "يجب تفعيل طريقة دفع واحدة على الأقل."),
  reservations: z.object({
    enabled: z.boolean(),
    autoConfirm: z.boolean(),
    durationMinutes: int(30, 360, "مدة الجلوس"),
    slotIntervalMinutes: z.coerce.number().refine((v) => [15, 30, 60].includes(v), "فاصل مواعيد الحجز غير صحيح."),
    minLeadMinutes: int(0, 2880, "أقل مهلة قبل الحجز"),
    maxDaysAhead: int(1, 180, "أقصى عدد أيام للحجز المسبق"),
    lastSeatingBeforeCloseMinutes: int(0, 240, "آخر حجز قبل الإغلاق"),
    modifyCutoffHours: int(0, 72, "مهلة تعديل/إلغاء الحجز"),
  }),
  notifications: z.object({ email: z.boolean(), sms: z.boolean(), whatsapp: z.boolean() }),
} as any;
