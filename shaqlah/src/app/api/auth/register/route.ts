import { z } from "zod";
import { NextResponse } from "next/server";
import { handler, ApiError } from "@/lib/api";
import { queryOne } from "@/lib/db";
import { hashPassword, signSession, sessionCookie } from "@/lib/auth";
import { optEmail, password, phone, text } from "@/lib/validation";
import { normalizePhone } from "@/lib/utils";

const schema = z
  .object({
    name: text("الاسم", 2, 80),
    phone: z.string().optional().transform((v) => (v ? normalizePhone(v) ?? "invalid" : null)),
    email: optEmail,
    password,
  })
  .refine((d) => d.phone !== "invalid", { message: "رقم الهاتف غير صحيح. أدخل رقمًا عُمانيًا مكوّنًا من ٨ أرقام.", path: ["phone"] })
  .refine((d) => d.phone || d.email, { message: "يرجى إدخال رقم الهاتف أو البريد الإلكتروني.", path: ["phone"] });

export const POST = handler({ schema, rate: ["register", 10, 60 * 60_000] }, async ({ body }) => {
  const phoneNo = body.phone === "invalid" ? null : body.phone;
  if (phoneNo && (await queryOne("SELECT 1 FROM users WHERE phone=$1", [phoneNo]))) throw new ApiError(409, "رقم الهاتف مسجّل مسبقًا. جرّب تسجيل الدخول.", { field: "phone" });
  if (body.email && (await queryOne("SELECT 1 FROM users WHERE email=$1", [body.email]))) throw new ApiError(409, "البريد الإلكتروني مسجّل مسبقًا. جرّب تسجيل الدخول.", { field: "email" });
  const u = await queryOne<any>(
    "INSERT INTO users(role_id,name,phone,email,password_hash) VALUES (1,$1,$2,$3,$4) RETURNING id",
    [body.name, phoneNo, body.email, await hashPassword(body.password)],
  );
  // Attach earlier guest orders/reservations made with the same phone number.
  if (phoneNo) {
    await queryOne("UPDATE orders SET user_id=$1 WHERE user_id IS NULL AND phone=$2", [u.id, phoneNo]);
    await queryOne("UPDATE reservations SET user_id=$1 WHERE user_id IS NULL AND phone=$2", [u.id, phoneNo]);
  }
  const res = NextResponse.json({ ok: true, data: { id: u.id } });
  res.headers.append("Set-Cookie", sessionCookie(await signSession(u.id, "customer")));
  return res;
});
