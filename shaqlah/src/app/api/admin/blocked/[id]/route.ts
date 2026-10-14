import { handler } from "@/lib/api";
import { query } from "@/lib/db";
import { audit } from "@/lib/audit";

export const DELETE = handler({ auth: "admin" }, async ({ params, user, ip }) => {
  await query("DELETE FROM blocked_periods WHERE id=$1", [params.id]);
  await audit(user, "blocked.delete", "blocked_period", params.id, undefined, ip);
  return { deleted: true };
});
