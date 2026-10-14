import { redirect } from "next/navigation";
import { queryOne } from "@/lib/db";
import { syncPaymentForOrder } from "@/lib/payments";

export const metadata = { title: "نتيجة الدفع", robots: { index: false } };

/**
 * The customer lands here after the hosted payment page. We never trust the redirect
 * itself: the payment status is re-verified with the provider server-side first.
 */
export default async function PaymentReturn({ searchParams }: { searchParams: Promise<{ order?: string; k?: string }> }) {
  const { order, k } = await searchParams;
  if (!order || !k) redirect("/orders");
  const o = await queryOne<any>("SELECT id, number, access_token FROM orders WHERE number=$1", [order]);
  if (!o || o.access_token !== k) redirect("/orders");
  const state = await syncPaymentForOrder(o.id).catch(() => "pending");
  redirect(`/orders/${o.number}?k=${k}&pay=${state}${state === "paid" ? "&new=1" : ""}`);
}
