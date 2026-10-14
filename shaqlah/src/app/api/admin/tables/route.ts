import { handler } from "@/lib/api";
import { queryOne } from "@/lib/db";
import { audit } from "@/lib/audit";
import { tableSchema } from "@/lib/admin-schemas";

export const POST = handler({ auth: "admin", schema: tableSchema }, async ({ body, user, ip }) => {
  const r = await queryOne<any>("INSERT INTO restaurant_tables(name,capacity,area,active) VALUES ($1,$2,$3,$4) RETURNING id", [body.name, body.capacity, body.area, body.active]);
  await audit(user, "table.create", "table", r.id, body, ip);
  return { id: r.id };
});
