import { handler } from "@/lib/api";
import { tx } from "@/lib/db";
import { audit } from "@/lib/audit";
import { itemSchema, saveItem } from "@/lib/item-save";

export const POST = handler({ auth: "admin", schema: itemSchema }, async ({ body, user, ip }) => {
  const id = await tx((c) => saveItem(c, body, null));
  await audit(user, "item.create", "menu_item", id, { name: body.name, price: body.price }, ip);
  return { id };
});
