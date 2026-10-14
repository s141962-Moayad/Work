import { z } from "zod";
import { text } from "./validation";

export const categorySchema = z.object({
  name: text("اسم القسم", 2, 60),
  icon: text("الأيقونة", 1, 8).default("🍽️"),
  image: z.string().regex(/^\/uploads\/[a-f0-9]{32}\.(png|jpg|webp)$/).nullish(),
  active: z.boolean().default(true),
  sort: z.coerce.number().int().min(0).max(999).default(0),
});


export const couponSchema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "كود الخصم: ٣ إلى ٣٠ حرفًا إنجليزيًا أو أرقامًا."),
    description: z.string().max(120).optional().default(""),
    type: z.enum(["percent", "fixed"]),
    value: z.coerce.number().positive("قيمة الخصم يجب أن تكون أكبر من صفر."),
    minOrder: z.coerce.number().min(0).default(0),
    maxDiscount: z.coerce.number().positive().nullish(),
    startsAt: z.string().nullish(),
    expiresAt: z.string().nullish(),
    usageLimit: z.coerce.number().int().positive().nullish(),
    active: z.boolean().default(true),
  })
  .refine((d) => d.type !== "percent" || d.value <= 100, { message: "نسبة الخصم لا يمكن أن تتجاوز ١٠٠٪.", path: ["value"] });

export const tableSchema = z.object({
  name: text("اسم الطاولة", 1, 40),
  capacity: z.coerce.number().int().min(1, "السعة يجب أن تكون ١ على الأقل.").max(40),
  area: z.enum(["indoor", "outdoor"]),
  active: z.boolean().default(true),
});

export const blockedSchema = z
  .object({
    startsAt: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "تاريخ البداية غير صحيح."),
    endsAt: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "تاريخ النهاية غير صحيح."),
    appliesTo: z.enum(["all", "pickup", "reservations"]),
    reason: z.string().max(120).default(""),
  })
  .refine((d) => new Date(d.endsAt) > new Date(d.startsAt), { message: "وقت النهاية يجب أن يكون بعد وقت البداية.", path: ["endsAt"] });
