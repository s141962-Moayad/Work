import { pool, type Db } from "./db";
import type { SessionUser } from "./auth";

export async function audit(
  user: SessionUser | null,
  action: string,
  entity: string,
  entityId: string | number | null,
  details?: Record<string, unknown>,
  ip?: string,
  db: Db = pool(),
) {
  try {
    await db.query(
      `INSERT INTO audit_logs(user_id, user_name, action, entity, entity_id, details, ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [user?.id ?? null, user?.name ?? null, action, entity, entityId == null ? null : String(entityId), details ? JSON.stringify(details) : null, ip ?? null],
    );
  } catch (e) {
    console.error("[audit]", e);
  }
}
