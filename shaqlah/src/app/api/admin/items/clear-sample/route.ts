import { handler } from "@/lib/api";
import { query } from "@/lib/db";
import { audit } from "@/lib/audit";

/** Removes every item still flagged as sample data (used when the owner is ready to enter the real menu). */
export const POST = handler({ auth: "admin" }, async ({ user, ip }) => {
  const rows = await query("DELETE FROM menu_items WHERE is_sample RETURNING id");
  await audit(user, "item.clear-sample", "menu_item", null, { count: rows.length }, ip);
  return { deleted: rows.length };
});
