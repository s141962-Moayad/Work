import { handler } from "@/lib/api";
import { loadOrderForRequest, publicOrder } from "@/lib/order-access";
import { expireStaleOnlineOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

export const GET = handler({ rate: ["order-get", 120, 60_000] }, async ({ params, user, query }) => {
  await expireStaleOnlineOrders().catch(() => {});
  return publicOrder(await loadOrderForRequest(params.number, user, query.get("k")));
});
