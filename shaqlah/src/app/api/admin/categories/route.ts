import { handler } from "@/lib/api";
import { queryOne } from "@/lib/db";
import { audit } from "@/lib/audit";
import { categorySchema } from "@/lib/admin-schemas";

const slug = (n: string) => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + n.length;

export const POST = handler({ auth: "admin", schema: categorySchema }, async ({ body, user, ip }) => {
  const row = await queryOne<any>(
    "INSERT INTO categories(slug,name_ar,icon,image,sort,active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    [slug(body.name), body.name, body.icon, body.image ?? null, body.sort, body.active],
  );
  await audit(user, "category.create", "category", row.id, { name: body.name }, ip);
  return { id: row.id };
});
