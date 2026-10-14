import { handler } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { expireStaleOnlineOrders, flagLateOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Live feed for the dashboard: emits when orders / reservations / notifications change. */
export const GET = handler({ auth: "staff" }, async ({ req }) => {
  const enc = new TextEncoder();
  let stopped = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (s: string) => {
        if (!stopped) controller.enqueue(enc.encode(s));
      };
      let version = "";
      let lastNotifId = -1;
      let n = 0;
      const tick = async () => {
        try {
          if (n++ % 10 === 0) {
            await flagLateOrders();
            await expireStaleOnlineOrders();
          }
          const v = await queryOne<any>(
            `SELECT
               COALESCE((SELECT max(extract(epoch from updated_at)) FROM orders),0)::text || ':' ||
               COALESCE((SELECT max(extract(epoch from updated_at)) FROM reservations),0)::text || ':' ||
               COALESCE((SELECT max(id) FROM notifications WHERE audience='admin'),0)::text AS v,
               COALESCE((SELECT max(id) FROM notifications WHERE audience='admin'),0) AS last_id,
               (SELECT count(*) FROM notifications WHERE audience='admin' AND NOT read) AS unread`,
          );
          if (v && v.v !== version) {
            const first = version === "";
            version = v.v;
            let fresh: any[] = [];
            if (!first && lastNotifId >= 0) {
              fresh = await query(`SELECT id, kind, title, body, link FROM notifications WHERE audience='admin' AND id > $1 ORDER BY id`, [lastNotifId]);
            }
            lastNotifId = v.last_id;
            send(`data: ${JSON.stringify({ unread: v.unread, fresh })}\n\n`);
          } else {
            send(`: keep-alive\n\n`);
          }
        } catch {
          /* retry next tick */
        }
      };
      send("retry: 3000\n\n");
      await tick();
      const timer = setInterval(tick, 3000);
      const close = () => {
        stopped = true;
        clearInterval(timer);
        try { controller.close(); } catch {}
      };
      req.signal.addEventListener("abort", close);
      setTimeout(close, 10 * 60_000);
    },
    cancel() {
      stopped = true;
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
  });
});
