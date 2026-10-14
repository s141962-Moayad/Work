import { z } from "zod";
import { handler } from "@/lib/api";
import { audit } from "@/lib/audit";
import { refundOrder } from "@/lib/payments";
import { money, optText } from "@/lib/validation";

const schema = z.object({ amount: money.optional(), reason: optText("السبب", 200) });

export const POST = handler({ auth: "admin", schema, rate: ["refund", 20, 10 * 60_000] }, async ({ params, body, user, ip }) => {
  const id = Number(params.id);
  const r = await refundOrder(id, body.amount ?? null, body.reason ?? "Refund");
  await audit(user, "order.refund", "order", id, { ...r, reason: body.reason }, ip);
  return r;
});
