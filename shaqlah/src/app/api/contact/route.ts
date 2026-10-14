import { z } from "zod";
import { handler, ApiError } from "@/lib/api";
import { pool } from "@/lib/db";
import { notifyAdmins } from "@/lib/notify";
import { optEmail, text } from "@/lib/validation";
import { normalizePhone } from "@/lib/utils";

const schema = z.object({
  name: text("الاسم", 2, 80),
  phone: z.string().optional().transform((v) => (v ? normalizePhone(v) ?? "invalid" : null)),
  email: optEmail,
  message: text("الرسالة", 5, 1500),
});

export const POST = handler({ schema, rate: ["contact", 5, 60 * 60_000] }, async ({ body }) => {
  if (body.phone === "invalid") throw new ApiError(400, "رقم الهاتف غير صحيح.", { field: "phone" });
  if (!body.phone && !body.email) throw new ApiError(400, "يرجى إدخال رقم الهاتف أو البريد الإلكتروني للرد عليك.", { field: "phone" });
  await pool().query("INSERT INTO contact_messages(name,phone,email,message) VALUES ($1,$2,$3,$4)", [body.name, body.phone, body.email, body.message]);
  await notifyAdmins(pool(), { kind: "contact.new", title: "رسالة جديدة من العملاء", body: body.name, link: "/admin/messages" });
  return { sent: true };
});
