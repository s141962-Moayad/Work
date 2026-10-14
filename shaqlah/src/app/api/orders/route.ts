import { handler } from "@/lib/api";
import { createOrder, createOrderSchema } from "@/lib/orders";

export const POST = handler({ schema: createOrderSchema, rate: ["order", 20, 10 * 60_000] }, async ({ body, user }) => {
  return createOrder(body, user);
});
