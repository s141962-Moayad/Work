import { ApiError } from "./api";
import type { SessionUser } from "./auth";
import { canAccessOrder, getOrderFull, publicOrder } from "./orders";

export async function loadOrderForRequest(number: string, user: SessionUser | null, token: string | null | undefined) {
  const o = await getOrderFull({ number });
  // Same response for "missing" and "forbidden" so order numbers cannot be probed.
  if (!o || !(await canAccessOrder(o, user, token))) throw new ApiError(404, "لم نعثر على الطلب. تأكد من رقم الطلب ورقم الهاتف.");
  return o;
}
export { publicOrder };
