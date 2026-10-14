import { z } from "zod";
import { handler, ApiError } from "@/lib/api";
import { queryOne } from "@/lib/db";
import { phone, text } from "@/lib/validation";

const schema = z.object({ number: text("رقم الحجز", 3, 20), phone });

export const POST = handler({ schema, rate: ["res-lookup", 10, 10 * 60_000] }, async ({ body }) => {
  const r = await queryOne<any>("SELECT number, access_token FROM reservations WHERE upper(number)=upper($1) AND phone=$2", [body.number, body.phone]);
  if (!r) throw new ApiError(404, "لم نعثر على الحجز. تأكد من رقم الحجز ورقم الهاتف.");
  return { number: r.number, token: r.access_token };
});
