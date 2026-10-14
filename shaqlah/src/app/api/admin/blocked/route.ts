import { handler } from "@/lib/api";
import { queryOne } from "@/lib/db";
import { audit } from "@/lib/audit";
import { blockedSchema } from "@/lib/admin-schemas";

export const POST = handler({ auth: "admin", schema: blockedSchema }, async ({ body, user, ip }) => {
  const r = await queryOne<any>("INSERT INTO blocked_periods(starts_at,ends_at,applies_to,reason) VALUES ($1,$2,$3,$4) RETURNING id", [body.startsAt, body.endsAt, body.appliesTo, body.reason]);
  await audit(user, "blocked.create", "blocked_period", r.id, body, ip);
  return { id: r.id };
});
