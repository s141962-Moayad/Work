import { toBaisa } from "../utils";
import type { PaymentProvider } from "./types";

/**
 * Thawani Pay (Oman) hosted-checkout adapter.
 *  - Card details are entered on Thawani's hosted page – they never touch this server.
 *  - Apple Pay is offered by the hosted page when it is enabled on the merchant account.
 *  - Amounts are sent in baisa (1 OMR = 1000 baisa).
 * Credentials come from the environment (THAWANI_SECRET_KEY / THAWANI_PUBLISHABLE_KEY).
 * Always run the full flow against the UAT environment first and compare with the
 * provider's current API documentation before going live.
 */
function base() {
  if (process.env.THAWANI_BASE_URL) return process.env.THAWANI_BASE_URL.replace(/\/$/, "");
  return process.env.THAWANI_ENV === "live" ? "https://checkout.thawani.om" : "https://uatcheckout.thawani.om";
}

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${base()}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "thawani-api-key": process.env.THAWANI_SECRET_KEY!,
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(`thawani ${res.status}: ${json?.description ?? json?.code ?? "request failed"}`);
  }
  return json;
}

export const thawani: PaymentProvider = {
  name: "thawani",

  async createCheckout({ orderNumber, amount, returnUrl, cancelUrl }) {
    const amountB = toBaisa(amount);
    if (amountB < 100) throw new Error("amount below the provider minimum (0.100 OMR)");
    const json = await call("/checkout/session", {
      method: "POST",
      body: JSON.stringify({
        client_reference_id: orderNumber,
        mode: "payment",
        products: [{ name: `Order ${orderNumber}`, quantity: 1, unit_amount: amountB }],
        success_url: returnUrl,
        cancel_url: cancelUrl,
        metadata: { order: orderNumber },
      }),
    });
    const ref: string = json.data.session_id;
    return { ref, redirectUrl: `${base()}/pay/${ref}?key=${process.env.THAWANI_PUBLISHABLE_KEY}`, raw: { session_id: ref } };
  },

  async fetchStatus(ref) {
    const json = await call(`/checkout/session/${encodeURIComponent(ref)}`);
    const d = json.data ?? {};
    const status = d.payment_status === "paid" ? "paid" : d.payment_status === "cancelled" ? "cancelled" : d.payment_status === "unpaid" ? "pending" : "pending";
    let paymentId: string | undefined;
    if (status === "paid" && d.invoice) {
      try {
        const p = await call(`/payments?checkout_invoice=${encodeURIComponent(d.invoice)}`);
        paymentId = p.data?.[0]?.payment_id;
      } catch (e) {
        console.error("[thawani] payment lookup", e);
      }
    }
    return { status, paymentId, raw: { payment_status: d.payment_status, invoice: d.invoice } };
  },

  async refund({ paymentId, reason }) {
    if (!paymentId) throw new Error("missing provider payment id");
    const json = await call("/refunds", {
      method: "POST",
      body: JSON.stringify({ payment_id: paymentId, reason: reason.slice(0, 100), metadata: {} }),
    });
    return { ok: true, raw: { refund_id: json.data?.refund_id } };
  },
};
