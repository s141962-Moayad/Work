import { z } from "zod";
import { cleanText, normalizePhone, isValidDateStr } from "./utils";

export const text = (label: string, min = 1, max = 200) =>
  z
    .string({ error: `${label} مطلوب.` })
    .transform(cleanText)
    .pipe(z.string().min(min, `${label} مطلوب.`).max(max, `${label} طويل جدًا (الحد الأقصى ${max} حرفًا).`));

export const optText = (label: string, max = 500) =>
  z
    .string()
    .transform(cleanText)
    .pipe(z.string().max(max, `${label} طويل جدًا (الحد الأقصى ${max} حرفًا).`))
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const phone = z
  .string({ error: "رقم الهاتف مطلوب." })
  .transform((v) => normalizePhone(v))
  .pipe(z.string({ error: "رقم الهاتف غير صحيح. أدخل رقمًا عُمانيًا مكوّنًا من ٨ أرقام." }));

export const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.string().email("البريد الإلكتروني غير صحيح.").max(160));

export const optEmail = z
  .union([email, z.literal("")])
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const dateStr = z.string({ error: "التاريخ مطلوب." }).refine(isValidDateStr, "التاريخ غير صحيح.");
export const timeStr = z.string({ error: "الوقت مطلوب." }).regex(/^([01]\d|2[0-3]):[0-5]\d$/, "الوقت غير صحيح.");
export const password = z
  .string({ error: "كلمة المرور مطلوبة." })
  .min(8, "كلمة المرور يجب ألا تقل عن ٨ أحرف.")
  .max(100, "كلمة المرور طويلة جدًا.");

export const id = z.coerce.number().int().positive();
export const money = z.coerce.number({ error: "السعر غير صحيح." }).min(0, "السعر لا يمكن أن يكون سالبًا.").max(100000, "السعر مرتفع جدًا.");
