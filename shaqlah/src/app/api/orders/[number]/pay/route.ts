import { handler, ApiError } from "@/lib/api";
import { loadOrderForRequest } from "@/lib/order-access";
import { startOnlinePayment, syncPaymentForOrder } from "@/lib/payments";

/** Retry (or resume) the online payment of an unpaid order. */
export const POST = handler({ rate: ["order-pay", 10, 10 * 60_000] }, async ({ params, user, query }) => {
  const o = await loadOrderForRequest(params.number, user, query.get("k"));
  if (o.payment_method === "cash") throw new ApiError(400, "هذا الطلب يُدفع عند الاستلام.");
  if (o.status !== "pending") throw new ApiError(400, "لا يمكن الدفع لهذا الطلب.");
  const state = await syncPaymentForOrder(o.id).catch(() => "pending");
  if (state === "paid") return { redirectUrl: null, paid: true };
  const redirectUrl = await startOnlinePayment({ id: o.id, number: o.number, total: o.total, access_token: o.access_token });
  return { redirectUrl, paid: false };
});
