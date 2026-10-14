import nodemailer from "nodemailer";
import { pool, query, type Db } from "./db";
import { getSettings, integrationStatus } from "./settings";
import { formatDateTime } from "./utils";

/* ───────── message catalogue (Arabic) ───────── */
export type OrderEvent = "created" | "accepted" | "preparing" | "ready" | "delivered" | "cancelled" | "paid" | "payment_failed";
export type ReservationEvent = "created" | "confirmed" | "cancelled" | "modified";

const ORDER_MSG: Record<OrderEvent, string> = {
  created: "تم استلام طلبك بنجاح!",
  accepted: "تم تأكيد طلبك.",
  preparing: "طلبك الآن قيد التحضير.",
  ready: "طلبك جاهز للاستلام!",
  delivered: "تم تسليم طلبك، بالهناء والعافية!",
  cancelled: "تم إلغاء طلبك.",
  paid: "تم استلام الدفع بنجاح.",
  payment_failed: "لم تكتمل عملية الدفع. يمكنك إعادة المحاولة من صفحة الطلب.",
};
const RES_MSG: Record<ReservationEvent, string> = {
  created: "تم استلام طلب حجزك وهو بانتظار التأكيد.",
  confirmed: "تم تأكيد حجز طاولتك.",
  cancelled: "تم إلغاء الحجز.",
  modified: "تم تعديل حجزك وهو بانتظار التأكيد.",
};

export interface Outbound {
  userId: string | null;
  phone: string | null;
  email: string | null;
  subject: string;
  text: string;
}

interface OrderRef {
  id: number;
  number: string;
  user_id: string | null;
  phone: string;
  email: string | null;
  pickup_at: Date;
}
interface ReservationRef {
  id: number;
  number: string;
  user_id: string | null;
  phone: string;
  email: string | null;
  start_at: Date;
}

async function insert(
  db: Db,
  n: {
    audience: "customer" | "admin";
    userId?: string | null;
    orderId?: number | null;
    reservationId?: number | null;
    kind: string;
    title: string;
    body?: string;
    link?: string | null;
  },
) {
  await db.query(
    `INSERT INTO notifications(audience,user_id,order_id,reservation_id,kind,title,body,link)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [n.audience, n.userId ?? null, n.orderId ?? null, n.reservationId ?? null, n.kind, n.title, n.body ?? "", n.link ?? null],
  );
}

/* ───────── in-app records ───────── */
export async function recordOrderNotification(db: Db, o: OrderRef, ev: OrderEvent): Promise<Outbound> {
  const title = ORDER_MSG[ev];
  const body = `رقم الطلب ${o.number} — موعد الاستلام: ${formatDateTime(o.pickup_at)}`;
  await insert(db, { audience: "customer", userId: o.user_id, orderId: o.id, kind: `order.${ev}`, title, body, link: `/orders/${o.number}` });
  return { userId: o.user_id, phone: o.phone, email: o.email, subject: `شقلح — ${title}`, text: `${title}\n${body}` };
}

export async function recordReservationNotification(db: Db, r: ReservationRef, ev: ReservationEvent): Promise<Outbound> {
  const title = RES_MSG[ev];
  const body = `رقم الحجز ${r.number} — الموعد: ${formatDateTime(r.start_at)}`;
  await insert(db, { audience: "customer", userId: r.user_id, reservationId: r.id, kind: `reservation.${ev}`, title, body, link: `/reservations/${r.number}` });
  return { userId: r.user_id, phone: r.phone, email: r.email, subject: `شقلح — ${title}`, text: `${title}\n${body}` };
}

export async function notifyAdmins(
  db: Db,
  n: { kind: string; title: string; body?: string; link?: string; orderId?: number; reservationId?: number },
) {
  await insert(db, { audience: "admin", ...n });
}

/* ───────── external channels (email / SMS / WhatsApp) ───────── */
let mailer: ReturnType<typeof nodemailer.createTransport> | null = null;
function getMailer() {
  if (!mailer) {
    mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return mailer;
}

const intl = (p: string) => `+968${p}`;

/**
 * Sends the message through every channel that is (a) enabled in the restaurant
 * settings, (b) configured with credentials in the environment and (c) allowed by the
 * customer's preferences. Failures are logged and never break the calling flow.
 */
export async function pushExternal(o: Outbound): Promise<void> {
  try {
    const [settings, prefsRow] = await Promise.all([
      getSettings(),
      o.userId ? query<{ notify_prefs: any }>("SELECT notify_prefs FROM users WHERE id=$1", [o.userId]) : Promise.resolve([]),
    ]);
    const prefs = prefsRow[0]?.notify_prefs as undefined | { email?: boolean; sms?: boolean; whatsapp?: boolean };
    const st = integrationStatus();
    const jobs: Promise<unknown>[] = [];
    const allow = (ch: "email" | "sms" | "whatsapp") => settings.notifications[ch] && (!prefs || prefs[ch] === true);

    if (o.email && st.smtp && allow("email")) {
      jobs.push(
        getMailer().sendMail({ from: process.env.SMTP_FROM, to: o.email, subject: o.subject, text: o.text }),
      );
    }
    if (o.phone && st.sms && allow("sms")) {
      const sid = process.env.TWILIO_ACCOUNT_SID!;
      jobs.push(
        fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: "Basic " + Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: intl(o.phone), From: process.env.TWILIO_FROM!, Body: o.text }),
          signal: AbortSignal.timeout(6000),
        }).then((r) => r.ok || Promise.reject(new Error(`twilio ${r.status}`))),
      );
    }
    if (o.phone && st.whatsapp && allow("whatsapp")) {
      jobs.push(
        fetch(`https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: `968${o.phone}`,
            type: "template",
            template: {
              name: process.env.WHATSAPP_TEMPLATE_NAME,
              language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "ar" },
              components: [{ type: "body", parameters: [{ type: "text", text: o.text.replace(/\n/g, " — ") }] }],
            },
          }),
          signal: AbortSignal.timeout(6000),
        }).then((r) => r.ok || Promise.reject(new Error(`whatsapp ${r.status}`))),
      );
    }
    const results = await Promise.allSettled(jobs);
    for (const r of results) if (r.status === "rejected") console.error("[notify]", r.reason);
  } catch (e) {
    console.error("[notify]", e);
  }
}

/** Convenience wrappers used outside of transactions. */
export async function notifyOrder(o: OrderRef, ev: OrderEvent) {
  const out = await recordOrderNotification(pool(), o, ev);
  await pushExternal(out);
}
export async function notifyReservation(r: ReservationRef, ev: ReservationEvent) {
  const out = await recordReservationNotification(pool(), r, ev);
  await pushExternal(out);
}
