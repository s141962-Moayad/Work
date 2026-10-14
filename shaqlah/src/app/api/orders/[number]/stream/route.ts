import { handler } from "@/lib/api";
import { loadOrderForRequest, publicOrder } from "@/lib/order-access";
import { getOrderFull } from "@/lib/orders";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Server-Sent Events: pushes the full order whenever it (or its payment) changes. */
export const GET = handler({ rate: ["order-stream", 30, 60_000] }, async ({ req, params, user, query }) => {
  const first = await loadOrderForRequest(params.number, user, query.get("k"));
  const enc = new TextEncoder();
  let stopped = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (s: string) => {
        if (!stopped) controller.enqueue(enc.encode(s));
      };
      let version = "";
      const tick = async () => {
        try {
          const v = await queryOne<{ v: string }>(
            `SELECT (extract(epoch from o.updated_at)::text || ':' || (SELECT count(*) FROM notifications n WHERE n.order_id=o.id)) AS v FROM orders o WHERE o.id=$1`,
            [first.id],
          );
          if (v && v.v !== version) {
            version = v.v;
            const full = await getOrderFull({ id: first.id });
            if (full) send(`data: ${JSON.stringify(publicOrder(full))}\n\n`);
          } else {
            send(`: keep-alive\n\n`);
          }
        } catch {
          /* transient DB error – try again on the next tick */
        }
      };
      send("retry: 3000\n\n");
      await tick();
      const timer = setInterval(tick, 2500);
      const close = () => {
        stopped = true;
        clearInterval(timer);
        try { controller.close(); } catch {}
      };
      req.signal.addEventListener("abort", close);
      setTimeout(close, 10 * 60_000); // EventSource reconnects automatically
    },
    cancel() {
      stopped = true;
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
  });
});
