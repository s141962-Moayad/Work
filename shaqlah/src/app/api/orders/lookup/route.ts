import { z } from "zod";
import { handler, ApiError } from "@/lib/api";
import { queryOne } from "@/lib/db";
import { phone, text } from "@/lib/validation";

const schema = z.object({ number: text("رقم الطلب", 3, 20), phone });

/** Secure guest lookup: needs both the order number and the phone used for the order. */
export const POST = handler({ schema, rate: ["lookup", 10, 10 * 60_000] }, async ({ body }) => {
  const o = await queryOne<any>("SELECT number, access_token FROM orders WHERE upper(number)=upper($1) AND phone=$2", [body.number, body.phone]);
  if (!o) throw new ApiError(404, "لم نعثر على الطلب. تأكد من رقم الطلب ورقم الهاتف.");
  return { number: o.number, token: o.access_token };
});
