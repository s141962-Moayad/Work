import { handler } from "@/lib/api";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = handler({ auth: "user" }, async ({ user }) => {
  return query(`SELECT id, title, body, link, read, created_at FROM notifications WHERE audience='customer' AND user_id=$1 ORDER BY id DESC LIMIT 50`, [user!.id]);
});
export const POST = handler({ auth: "user" }, async ({ user }) => {
  await query(`UPDATE notifications SET read=TRUE WHERE audience='customer' AND user_id=$1 AND NOT read`, [user!.id]);
  return { done: true };
});
