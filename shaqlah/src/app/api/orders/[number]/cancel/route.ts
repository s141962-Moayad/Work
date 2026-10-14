import { handler } from "@/lib/api";
import { loadOrderForRequest } from "@/lib/order-access";
import { cancelOrderByCustomer } from "@/lib/orders";

export const POST = handler({ rate: ["order-cancel", 10, 10 * 60_000] }, async ({ params, user, query }) => {
  const o = await loadOrderForRequest(params.number, user, query.get("k"));
  await cancelOrderByCustomer(o.id);
  return { cancelled: true };
});
