export interface PaymentProvider {
  name: string;
  createCheckout(a: {
    orderNumber: string;
    amount: number;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<{ ref: string; redirectUrl: string; raw: unknown }>;
  fetchStatus(ref: string): Promise<{ status: "paid" | "pending" | "failed" | "cancelled"; paymentId?: string; raw: unknown }>;
  refund(a: { ref: string; paymentId?: string; amount: number; reason: string }): Promise<{ ok: boolean; raw: unknown }>;
}
