import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { syncPaymentForOrder } from "@/lib/payments";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/api";

/**
 * Payment-provider webhook. The payload is treated purely as a *hint*: we extract a
 * checkout reference, then ask the provider for the authoritative status server-side.
 * A forged request therefore cannot mark an order as paid.
 */
export async function POST(req: Request) {
  if (!rateLimit(`webhook:${clientIp(req)}`, 60, 60_000)) return NextResponse.json({ ok: false }, { status: 429 });
  let ref: string | undefined;
  try {
    const body: any = await req.json();
    ref = body?.data?.session_id ?? body?.session_id ?? body?.data?.id;
  } catch {}
  if (typeof ref !== "string" || ref.length > 100) return NextResponse.json({ ok: true });
  const pay = await queryOne<{ order_id: number }>("SELECT order_id FROM payments WHERE provider_ref=$1", [ref]);
  if (pay) await syncPaymentForOrder(pay.order_id).catch((e) => console.error("[webhook]", e));
  return NextResponse.json({ ok: true });
}
