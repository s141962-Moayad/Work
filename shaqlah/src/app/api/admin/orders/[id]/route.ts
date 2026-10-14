import { z } from "zod";
import { handler } from "@/lib/api";
import { audit } from "@/lib/audit";
import { changeOrderStatus, statusSchema } from "@/lib/orders";
import { optText } from "@/lib/validation";

const schema = z.object({ status: statusSchema, reason: optText("السبب", 200) });

export const PATCH = handler({ auth: "staff", schema }, async ({ params, body, user, ip }) => {
  const id = Number(params.id);
  const o = await changeOrderStatus(id, body.status, { reason: body.reason });
  await audit(user, "order.status", "order", id, { status: body.status, reason: body.reason }, ip);
  return { status: o.status };
});
