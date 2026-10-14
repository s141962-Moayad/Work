import { z } from "zod";
import { handler } from "@/lib/api";
import { query } from "@/lib/db";

export const PATCH = handler({ auth: "staff", schema: z.object({ handled: z.boolean() }) }, async ({ params, body }) => {
  await query("UPDATE contact_messages SET handled=$2 WHERE id=$1", [params.id, body.handled]);
  return { saved: true };
});
