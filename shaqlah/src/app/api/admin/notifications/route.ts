import { handler } from "@/lib/api";
import { query } from "@/lib/db";

export const POST = handler({ auth: "staff" }, async () => {
  await query(`UPDATE notifications SET read=TRUE WHERE audience='admin' AND NOT read`);
  return { done: true };
});
