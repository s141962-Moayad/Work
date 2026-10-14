import { z } from "zod";
import { handler, ApiError } from "@/lib/api";
import { queryOne, query } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { optEmail, password, text } from "@/lib/validation";
import { normalizePhone } from "@/lib/utils";

const schema = z.object({
  name: text("الاسم", 2, 80).optional(),
  phone: z.string().optional().nullable().transform((v) => (v ? normalizePhone(v) ?? "invalid" : null)),
  email: optEmail,
  prefs: z.object({ email: z.boolean(), sms: z.boolean(), whatsapp: z.boolean() }).optional(),
  currentPassword: z.string().max(100).optional(),
  newPassword: password.optional(),
});

export const PATCH = handler({ auth: "user", schema, rate: ["account", 30, 10 * 60_000] }, async ({ user, body }) => {
  const u = user!;
  if (body.phone === "invalid") throw new ApiError(400, "رقم الهاتف غير صحيح. أدخل رقمًا عُمانيًا مكوّنًا من ٨ أرقام.", { field: "phone" });
  const phoneNo = body.phone ?? null;
  if (!phoneNo && !body.email) throw new ApiError(400, "يجب أن يبقى رقم الهاتف أو البريد الإلكتروني.", { field: "phone" });
  if (phoneNo && (await queryOne("SELECT 1 FROM users WHERE phone=$1 AND id<>$2", [phoneNo, u.id]))) throw new ApiError(409, "رقم الهاتف مستخدم في حساب آخر.", { field: "phone" });
  if (body.email && (await queryOne("SELECT 1 FROM users WHERE email=$1 AND id<>$2", [body.email, u.id]))) throw new ApiError(409, "البريد الإلكتروني مستخدم في حساب آخر.", { field: "email" });

  if (body.newPassword) {
    const row = await queryOne<any>("SELECT password_hash FROM users WHERE id=$1", [u.id]);
    if (!body.currentPassword || !(await verifyPassword(body.currentPassword, row.password_hash))) {
      throw new ApiError(400, "كلمة المرور الحالية غير صحيحة.", { field: "currentPassword" });
    }
    await query("UPDATE users SET password_hash=$2 WHERE id=$1", [u.id, await hashPassword(body.newPassword)]);
  }
  await query(
    `UPDATE users SET name=COALESCE($2,name), phone=$3, email=$4, notify_prefs = notify_prefs || $5::jsonb WHERE id=$1`,
    [u.id, body.name ?? null, phoneNo, body.email, JSON.stringify(body.prefs ?? {})],
  );
  return { saved: true };
});
