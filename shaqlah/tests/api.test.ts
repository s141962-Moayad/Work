import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { query, queryOne } from "@/lib/db";
import { createReservation, cancelReservationByCustomer, modifyReservation, setReservationStatus } from "@/lib/reservations";
import { createOrder, changeOrderStatus } from "@/lib/orders";
import { syncPaymentForOrder } from "@/lib/payments";
import { IDEM, NOW, makeUser, resetDb, seedMenu, seedTables, setSettings } from "./helpers";

import { POST as loginPOST } from "@/app/api/auth/login/route";
import { POST as registerPOST } from "@/app/api/auth/register/route";
import { GET as adminStream } from "@/app/api/admin/stream/route";
import { PATCH as adminOrderPATCH } from "@/app/api/admin/orders/[id]/route";
import { POST as itemsPOST } from "@/app/api/admin/items/route";
import { PUT as itemPUT } from "@/app/api/admin/items/[id]/route";
import { POST as quotePOST } from "@/app/api/cart/quote/route";
import { PUT as settingsPUT } from "@/app/api/admin/settings/route";
import { POST as uploadPOST } from "@/app/api/admin/upload/route";
import { POST as ordersPOST } from "@/app/api/orders/route";
import { GET as orderGET } from "@/app/api/orders/[number]/route";
import { POST as lookupPOST } from "@/app/api/orders/lookup/route";

const call = (h: any, url: string, init: RequestInit & { cookie?: string; params?: Record<string, string> } = {}) => {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.body && !headers.has("content-type") && typeof init.body === "string") headers.set("content-type", "application/json");
  const { cookie: _c, params: _p, signal, ...rest } = init;
  const req = new NextRequest(`http://localhost${url}`, { ...rest, signal: signal ?? undefined, headers });
  return h(req, { params: Promise.resolve(init.params ?? {}) }) as Promise<Response>;
};
const json = (o: unknown) => JSON.stringify(o);

let m: Awaited<ReturnType<typeof seedMenu>>;
beforeEach(async () => {
  await resetDb();
  m = await seedMenu();
});

const orderInput = (over: any = {}) => ({
  items: [{ itemId: m.item, quantity: 1 }],
  customer: { name: "أحمد", phone: "91234567", email: "" },
  pickup: { mode: "asap" },
  paymentMethod: "cash",
  idempotencyKey: IDEM(),
  ...over,
});

describe("table reservations", () => {
  const input = (over: any = {}) => ({ name: "سالم", phone: "92345678", email: null, date: "2026-10-15", time: "19:00", partySize: 2, area: "any" as const, notes: null, idempotencyKey: IDEM(), ...over });

  it("never double-books a table, even with simultaneous requests", async () => {
    await seedTables([["طاولة ١", 4, "indoor"]]);
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => createReservation(input(), null, NOW)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((results.filter((r) => r.status === "rejected") as PromiseRejectedResult[]).every((r) => /غير متاح|لم يعد/.test(r.reason.message))).toBe(true);
    expect((await queryOne("SELECT count(*)::int AS n FROM reservations")).n).toBe(1);
  });

  it("the database itself rejects overlapping reservations on a table (exclusion constraint)", async () => {
    await seedTables([["طاولة ١", 4, "indoor"]]);
    const t = (await queryOne("SELECT id FROM restaurant_tables")).id;
    const ins = (s: string, e: string, st = "confirmed") => query(`INSERT INTO reservations(number,access_token,table_id,customer_name,phone,party_size,start_at,end_at,status) VALUES ('X'||random(),'t',$1,'a','91234567',2,$2,$3,$4)`, [t, s, e, st]);
    await ins("2026-10-15T15:00:00Z", "2026-10-15T16:30:00Z");
    await expect(ins("2026-10-15T16:00:00Z", "2026-10-15T17:30:00Z")).rejects.toMatchObject({ code: "23P01" });
    await ins("2026-10-15T16:30:00Z", "2026-10-15T18:00:00Z"); // back-to-back is fine
    await ins("2026-10-15T15:30:00Z", "2026-10-15T16:00:00Z", "cancelled"); // cancelled ones do not block
  });

  it("uses another table when the first is taken, then reports full", async () => {
    await seedTables([["١", 2, "indoor"], ["٢", 4, "outdoor"]]);
    const a = await createReservation(input({ partySize: 2 }), null, NOW);
    const b = await createReservation(input({ partySize: 2 }), null, NOW);
    const tables = await query("SELECT table_id FROM reservations ORDER BY id");
    expect(new Set(tables.map((t) => t.table_id)).size).toBe(2);
    expect(a.number).not.toBe(b.number);
    await expect(createReservation(input({ partySize: 2 }), null, NOW)).rejects.toThrow(/غير متاح/);
  });

  it("validates party size, past times, closed hours and area", async () => {
    await seedTables([["١", 2, "indoor"], ["٢", 6, "outdoor"]]);
    await expect(createReservation(input({ partySize: 9 }), null, NOW)).rejects.toThrow(/الحد الأقصى/);
    await expect(createReservation(input({ date: "2026-10-14", time: "15:00" }), null, NOW)).rejects.toThrow(/غير متاح|سابق/);
    await expect(createReservation(input({ time: "03:00" }), null, NOW)).rejects.toThrow(/غير متاح/);
    await createReservation(input({ area: "outdoor", partySize: 2 }), null, NOW);
    const r = await queryOne("SELECT t.area FROM reservations r JOIN restaurant_tables t ON t.id=r.table_id");
    expect(r.area).toBe("outdoor");
  });

  it("supports confirm / cancel / modify and frees the table on cancel", async () => {
    await seedTables([["١", 4, "indoor"]]);
    const { number } = await createReservation(input(), null, NOW);
    const r = await queryOne("SELECT id, status FROM reservations WHERE number=$1", [number]);
    expect(r.status).toBe("pending");
    await setReservationStatus(r.id, "confirmed");
    await modifyReservation(r.id, { date: "2026-10-15", time: "20:00", partySize: 3, area: "any", notes: null }, NOW);
    const after = await queryOne("SELECT status, start_at, party_size FROM reservations WHERE id=$1", [r.id]);
    expect(after.status).toBe("pending"); // modified → needs re-confirmation
    expect(after.party_size).toBe(3);
    expect(after.start_at.toISOString()).toBe("2026-10-15T16:00:00.000Z");
    await cancelReservationByCustomer(r.id, NOW);
    await createReservation(input({ time: "20:00" }), null, NOW); // slot is free again
    const titles = (await query("SELECT title FROM notifications WHERE audience='customer' ORDER BY id")).map((n) => n.title);
    expect(titles).toEqual(expect.arrayContaining(["تم تأكيد حجز طاولتك.", "تم إلغاء الحجز."]));
    expect((await query("SELECT title FROM notifications WHERE audience='admin'")).map((n) => n.title)).toContain("حجز طاولة جديد!");
  });

  it("blocked periods remove reservation availability", async () => {
    await seedTables([["١", 4, "indoor"]]);
    await query(`INSERT INTO blocked_periods(starts_at,ends_at,applies_to) VALUES ('2026-10-15T00:00:00Z','2026-10-16T00:00:00Z','reservations')`);
    await expect(createReservation(input(), null, NOW)).rejects.toThrow(/غير متاح/);
  });
});

describe("access control", () => {
  it("rejects anonymous and customer access to admin APIs; allows staff only where intended", async () => {
    const customer = await makeUser(1, "c@x.com");
    const staff = await makeUser(2, "s@x.com");
    const admin = await makeUser(3, "a@x.com");
    expect((await call(adminStream, "/api/admin/stream")).status).toBe(401);
    expect((await call(adminStream, "/api/admin/stream", { cookie: customer.cookie })).status).toBe(403);
    const item = { categoryId: m.cat, name: "صنف جديد", description: "", price: 1.5, available: true, featured: false, bestSeller: false, prepMinutes: 5, allergens: [], variants: [], addons: [] };
    expect((await call(itemsPOST, "/api/admin/items", { method: "POST", body: json(item) })).status).toBe(401);
    expect((await call(itemsPOST, "/api/admin/items", { method: "POST", body: json(item), cookie: customer.cookie })).status).toBe(403);
    expect((await call(itemsPOST, "/api/admin/items", { method: "POST", body: json(item), cookie: staff.cookie })).status).toBe(403);
    expect((await call(itemsPOST, "/api/admin/items", { method: "POST", body: json(item), cookie: admin.cookie })).status).toBe(200);
    const s = await call(settingsPUT, "/api/admin/settings", { method: "PUT", body: json({ group: "social", value: {} }), cookie: staff.cookie });
    expect(s.status).toBe(403);
    expect((await query("SELECT action FROM audit_logs")).map((r) => r.action)).toContain("item.create");
  });

  it("blocks cross-site (CSRF) writes even with a valid cookie, and tampered/invalid sessions", async () => {
    const admin = await makeUser(3, "a@x.com");
    const body = json({ group: "social", value: {} });
    const r = await call(settingsPUT, "/api/admin/settings", { method: "PUT", body, cookie: admin.cookie, headers: { origin: "https://evil.example", host: "localhost" } });
    expect(r.status).toBe(403);
    const bad = await call(adminStream, "/api/admin/stream", { cookie: admin.cookie.slice(0, -3) + "xyz" });
    expect(bad.status).toBe(401);
  });

  it("deactivated users lose access immediately", async () => {
    const staff = await makeUser(2, "s@x.com");
    await query("UPDATE users SET active=false WHERE id=$1", [staff.id]);
    expect((await call(adminStream, "/api/admin/stream", { cookie: staff.cookie })).status).toBe(401);
  });

  it("rejects non-image uploads", async () => {
    const admin = await makeUser(3, "a@x.com");
    const fd = new FormData();
    fd.append("file", new File(["<script>alert(1)</script>"], "x.png", { type: "image/png" }));
    const r = await call(uploadPOST, "/api/admin/upload", { method: "POST", body: fd, cookie: admin.cookie });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toMatch(/غير مدعومة/);
  });
});

describe("authentication", () => {
  it("registers (phone or email), logs in, and rejects bad credentials", async () => {
    const reg = await call(registerPOST, "/api/auth/register", { method: "POST", body: json({ name: "منى", phone: "٩٢٣٤٥٦٧٨", email: "", password: "password123" }) });
    expect(reg.status).toBe(200);
    expect(reg.headers.get("set-cookie")).toMatch(/shq_session=.+HttpOnly/);
    expect((await call(registerPOST, "/api/auth/register", { method: "POST", body: json({ name: "منى", phone: "92345678", password: "password123" }) })).status).toBe(409);
    expect((await call(registerPOST, "/api/auth/register", { method: "POST", body: json({ name: "منى", password: "password123" }) })).status).toBe(400);
    const ok = await call(loginPOST, "/api/auth/login", { method: "POST", body: json({ identifier: "+968 9234 5678", password: "password123" }) });
    expect(ok.status).toBe(200);
    const bad = await call(loginPOST, "/api/auth/login", { method: "POST", body: json({ identifier: "92345678", password: "wrong-password" }) });
    expect(bad.status).toBe(401);
    expect((await bad.json()).error).toBe("بيانات الدخول غير صحيحة.");
    const adminOnly = await call(loginPOST, "/api/auth/login", { method: "POST", body: json({ identifier: "92345678", password: "password123", admin: true }) });
    expect(adminOnly.status).toBe(403);
  });
});

describe("orders over HTTP", () => {
  it("returns Arabic validation errors and protects order details", async () => {
    const bad = await call(ordersPOST, "/api/orders", { method: "POST", body: json(orderInput({ customer: { name: "أ", phone: "123" } })) });
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toMatch(/[؀-ۿ]/);

    const ok = await call(ordersPOST, "/api/orders", { method: "POST", body: json(orderInput()) });
    expect(ok.status).toBe(200);
    const { number, token } = (await ok.json()).data;
    expect((await call(orderGET, `/api/orders/${number}`, { params: { number } })).status).toBe(404); // no token
    expect((await call(orderGET, `/api/orders/${number}?k=wrong`, { params: { number } })).status).toBe(404);
    const good = await call(orderGET, `/api/orders/${number}?k=${token}`, { params: { number } });
    expect(good.status).toBe(200);
    expect(JSON.stringify(await good.json())).not.toContain(token); // access token never echoed back
    expect((await call(lookupPOST, "/api/orders/lookup", { method: "POST", body: json({ number, phone: "99999999" }) })).status).toBe(404);
    expect((await call(lookupPOST, "/api/orders/lookup", { method: "POST", body: json({ number: number.toLowerCase(), phone: "+968 9123 4567" }) })).status).toBe(200);
  });

  it("staff can update the order status through the API", async () => {
    const staff = await makeUser(2, "s@x.com");
    const { number } = await createOrder({ ...orderInput(), items: [{ itemId: m.item, quantity: 1 }] } as any, null, NOW);
    const id = (await queryOne("SELECT id FROM orders WHERE number=$1", [number])).id;
    const r = await call(adminOrderPATCH, `/api/admin/orders/${id}`, { method: "PATCH", body: json({ status: "accepted" }), cookie: staff.cookie, params: { id: String(id) } });
    expect(r.status).toBe(200);
    expect((await queryOne("SELECT status FROM orders WHERE id=$1", [id])).status).toBe("accepted");
    const bad = await call(adminOrderPATCH, `/api/admin/orders/${id}`, { method: "PATCH", body: json({ status: "pending" }), cookie: staff.cookie, params: { id: String(id) } });
    expect(bad.status).toBe(400);
  });
});

describe("editing prices", () => {
  it("a price edited by the admin is what the next order is charged", async () => {
    const admin = await makeUser(3, "a@x.com");
    const body = { categoryId: m.cat, name: "برجر لحم", description: "", price: 3.25, available: true, featured: false, bestSeller: false, prepMinutes: 10, allergens: [], variants: [], addons: [] };
    const r = await call(itemPUT, `/api/admin/items/${m.item}`, { method: "PUT", body: json(body), cookie: admin.cookie, params: { id: String(m.item) } });
    expect(r.status).toBe(200);
    const q = await call(quotePOST, "/api/cart/quote", { method: "POST", body: json({ items: [{ itemId: m.item, quantity: 2 }] }) });
    expect((await q.json()).data.subtotal).toBe(6.5);
    // the item became "real" (no longer sample) and its sizes were removed as requested
    expect((await query("SELECT 1 FROM item_variants WHERE item_id=$1", [m.item])).length).toBe(0);
    // marking it unavailable blocks ordering
    await call(itemPUT, `/api/admin/items/${m.item}`, { method: "PUT", body: json({ ...body, available: false }), cookie: admin.cookie, params: { id: String(m.item) } });
    const q2 = await call(quotePOST, "/api/cart/quote", { method: "POST", body: json({ items: [{ itemId: m.item, quantity: 1 }] }) });
    expect(q2.status).toBe(400);
    expect((await q2.json()).error).toMatch(/غير متاح/);
  });
});

describe("online payments (provider mocked)", () => {
  const realFetch = globalThis.fetch;
  let sessionStatus = "unpaid";
  beforeEach(() => {
    process.env.THAWANI_SECRET_KEY = "sk_test";
    process.env.THAWANI_PUBLISHABLE_KEY = "pk_test";
    sessionStatus = "unpaid";
    vi.stubGlobal("fetch", async (url: string, init?: any) => {
      const u = String(url);
      const ok = (data: any) => new Response(JSON.stringify({ success: true, code: 2004, data }), { status: 200 });
      if (u.endsWith("/checkout/session") && init?.method === "POST") return ok({ session_id: "chk_123" });
      if (u.includes("/checkout/session/chk_123")) return ok({ payment_status: sessionStatus, invoice: "inv1" });
      if (u.includes("/payments?")) return ok([{ payment_id: "pay_9" }]);
      if (u.endsWith("/refunds")) return ok({ refund_id: "r1" });
      return realFetch(url, init);
    });
  });
  afterEach(() => {
    delete process.env.THAWANI_SECRET_KEY;
    delete process.env.THAWANI_PUBLISHABLE_KEY;
    vi.unstubAllGlobals();
  });

  const place = async () => {
    const r = await createOrder(orderInput({ paymentMethod: "card" }) as any, null, NOW);
    const o = await queryOne("SELECT * FROM orders WHERE number=$1", [r.number]);
    return { r, o };
  };

  it("creates a hosted checkout, never trusts the redirect, and confirms only after provider verification", async () => {
    const { r, o } = await place();
    expect(r.redirectUrl).toContain("/pay/chk_123?key=pk_test");
    expect(o.payment_status).toBe("pending");
    await expect(changeOrderStatus(o.id, "accepted")).rejects.toThrow(/لم يتم تأكيد دفع/);
    expect(await syncPaymentForOrder(o.id)).toBe("pending"); // customer came back but did not pay
    sessionStatus = "paid";
    expect(await syncPaymentForOrder(o.id)).toBe("paid");
    expect(await syncPaymentForOrder(o.id)).toBe("paid"); // idempotent
    expect((await queryOne("SELECT payment_status FROM orders WHERE id=$1", [o.id])).payment_status).toBe("paid");
    expect((await query("SELECT title FROM notifications WHERE order_id=$1 AND title LIKE 'تم استلام الدفع%'", [o.id])).length).toBe(1);
    await changeOrderStatus(o.id, "accepted");
  });

  it("handles a failed/cancelled payment with a clear status and lets the customer retry", async () => {
    const { o } = await place();
    sessionStatus = "cancelled";
    expect(await syncPaymentForOrder(o.id)).toBe("failed");
    const after = await queryOne("SELECT payment_status FROM orders WHERE id=$1", [o.id]);
    expect(after.payment_status).toBe("failed");
    expect((await query("SELECT title FROM notifications WHERE order_id=$1", [o.id])).map((n) => n.title)).toContain("لم تكتمل عملية الدفع. يمكنك إعادة المحاولة من صفحة الطلب.");
    await expect(changeOrderStatus(o.id, "accepted")).rejects.toThrow(/لم يتم تأكيد دفع/);
  });

  it("cancelling a paid online order refunds it and releases the slot", async () => {
    const { o } = await place();
    sessionStatus = "paid";
    await syncPaymentForOrder(o.id);
    await changeOrderStatus(o.id, "cancelled", { reason: "test" });
    const after = await queryOne("SELECT payment_status, slot_id FROM orders WHERE id=$1", [o.id]);
    expect(after.payment_status).toBe("refunded");
    expect((await queryOne("SELECT used_count FROM pickup_slots WHERE id=$1", [after.slot_id])).used_count).toBe(0);
  });

  it("an order whose payment never arrives expires and frees its capacity", async () => {
    const { o } = await place();
    await query("UPDATE orders SET created_at = now() - interval '2 hours' WHERE id=$1", [o.id]);
    const { expireStaleOnlineOrders } = await import("@/lib/orders");
    await expireStaleOnlineOrders();
    expect((await queryOne("SELECT status FROM orders WHERE id=$1", [o.id])).status).toBe("cancelled");
  });

  it("never stores card data: payments table holds only provider references", async () => {
    await place();
    const cols = (await query("SELECT column_name FROM information_schema.columns WHERE table_name='payments'")).map((c) => c.column_name);
    expect(cols.some((c) => /card|pan|cvv|expiry/i.test(c))).toBe(false);
  });
});

describe("opening hours & ordering switch", () => {
  it("rejects orders when online ordering is switched off", async () => {
    await setSettings({ ordering: { enabled: false } as any });
    await expect(createOrder(orderInput() as any, null, NOW)).rejects.toThrow(/متوقف/);
  });
});
