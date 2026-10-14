import { z } from "zod";
import { handler } from "@/lib/api";
import { query } from "@/lib/db";
import { id } from "@/lib/validation";

const schema = z.object({ itemId: id, favorite: z.boolean() });

export const GET = handler({ auth: "user" }, async ({ user }) => {
  const rows = await query("SELECT item_id FROM favorites WHERE user_id=$1", [user!.id]);
  return rows.map((r) => r.item_id as number);
});
export const POST = handler({ auth: "user", schema, rate: ["fav", 120, 60_000] }, async ({ user, body }) => {
  if (body.favorite) {
    await query("INSERT INTO favorites(user_id,item_id) SELECT $1,id FROM menu_items WHERE id=$2 ON CONFLICT DO NOTHING", [user!.id, body.itemId]);
  } else {
    await query("DELETE FROM favorites WHERE user_id=$1 AND item_id=$2", [user!.id, body.itemId]);
  }
  return { favorite: body.favorite };
});
