import type { Metadata } from "next";
import { getSiteContext } from "@/lib/site";
import { availableMethods } from "@/lib/payments";
import { CheckoutForm } from "@/components/checkout-form";
import { getOpenStatus } from "@/lib/hours";

export const metadata: Metadata = { title: "إتمام الطلب" };

export default async function CheckoutPage() {
  const { settings, user } = await getSiteContext();
  return (
    <CheckoutForm
      methods={availableMethods(settings)}
      ordering={settings.ordering.enabled}
      openStatus={getOpenStatus(settings)}
      defaults={{ name: user?.name ?? "", phone: user?.phone ?? "", email: user?.email ?? "" }}
      loggedIn={!!user}
    />
  );
}
