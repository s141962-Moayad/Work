import { beforeEach, describe, expect, it } from "vitest";
import { query, queryOne } from "@/lib/db";
import { computeTotals, couponDiscountBaisa } from "@/lib/pricing";
import { createOrder, changeOrderStatus, cancelOrderByCustomer, type CreateOrderInput } from "@/lib/orders";
import { listSlots, nextSlots } from "@/lib/pickup";
import { getSettings } from "@/lib/settings";
import { normalizePhone, muscatDate } from "@/lib/utils";
import { IDEM, NOW, resetDb, seedMenu, setSettings } from "./helpers";

type M = Awaited<ReturnType<typeof seedMenu>>;
let m: M;

const base = (over: Partial<CreateOrderInput> = {}): CreateOrderInput => ({
  items: [{ itemId: m.item, quantity: 2, variantId: undefined as any, addonIds: [] } as any],
  customer: { name: "أحمد", phone: "91234567", email: null },
  pickup: { mode: "asap" },
  paymentMethod: "cash",
  couponCode: null,
  notes: null,
  idempotencyKey: IDEM(),
  ...over,
});

beforeEach(async () => {
  await resetDb();
  m = await seedMenu();
});

describe("pure helpers", () => {
  it("normalizes Omani phone numbers and Arabic digits", () => {
    expect(normalizePhone("+968 9123 4567")).toBe("91234567");
    expect(normalizePhone("٩١٢٣٤٥٦٧")).toBe("91234567");
    expect(normalizePhone("0096892345678")).toBe("92345678");
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("51234567")).toBeNull();
  });
  it("computes VAT-inclusive and exclusive totals in baisa", () => {
    expect(computeTotals(10000, 0, { vatPercent: 5, vatIncluded: true, serviceFee: 0 })).toEqual({ fee: 0, tax: 476, total: 10000 });
    expect(computeTotals(10000, 1000, { vatPercent: 5, vatIncluded: false, serviceFee: 0.5 })).toEqual({ fee: 500, tax: 475, total: 9975 });
  });
  it("caps coupon discounts", () => {
    expect(couponDiscountBaisa({ type: "percent", value: 50, max_discount: 1 }, 10000)).toBe(1000);
    expect(couponDiscountBaisa({ type: "fixed", value: 99, max_discount: null }, 5000)).toBe(5000);
  });
});

describe("placing orders", () => {
  it("prices the order on the server from database values", async () => {
    const r = await createOrder(base({ items: [{ itemId: m.item, variantId: m.dbl, addonIds: [m.cheese], quantity: 2 } as any] }), null, NOW);
    expect(r.number).toBe("SHQ-1001");
    const o = await queryOne("SELECT * FROM orders WHERE number=$1", [r.number]);
    // (2.500 + 1.200 + 0.300) × 2 = 8.000 ; 5% VAT included
    expect(o.subtotal).toBe(8);
    expect(o.total).toBe(8);
    expect(o.tax).toBeCloseTo(0.381, 3);
    expect(o.status).toBe("pending");
    const it = await queryOne("SELECT * FROM order_items WHERE order_id=$1", [o.id]);
    expect(it.unit_price).toBe(4);
    expect(it.variant_name).toBe("دبل");
  });

  it("rejects unavailable items and add-ons that belong to another dish", async () => {
    await expect(createOrder(base({ items: [{ itemId: m.off, quantity: 1 } as any] }), null, NOW)).rejects.toThrow(/غير متاح/);
    await expect(createOrder(base({ items: [{ itemId: m.item, quantity: 1, addonIds: [m.otherAddon] } as any] }), null, NOW)).rejects.toThrow(/غير متاحة/);
    const count = await queryOne("SELECT count(*)::int AS n FROM orders");
    expect(count.n).toBe(0);
  });

  it("is idempotent on double submission", async () => {
    const input = base();
    const a = await createOrder(input, null, NOW);
    const b = await createOrder(input, null, NOW);
    expect(b.number).toBe(a.number);
    expect(b.duplicate).toBe(true);
    expect((await queryOne("SELECT count(*)::int AS n FROM orders")).n).toBe(1);
  });

  it("asap picks the earliest slot after the preparation time", async () => {
    const r = await createOrder(base(), null, NOW);
    const o = await queryOne("SELECT * FROM orders WHERE number=$1", [r.number]);
    // prep = 5 base + 10 item + 1 extra = 16 min → 15:16 → next grid slot 15:30 Muscat = 11:30Z
    expect(o.prep_minutes).toBe(16);
    expect(o.pickup_at.toISOString()).toBe("2026-10-14T11:30:00.000Z");
  });

  it("rejects past, too-early, off-grid and out-of-hours scheduled pickups", async () => {
    const sched = (iso: string) => base({ pickup: { mode: "scheduled", slotStart: iso } });
    await expect(createOrder(sched("2026-10-14T10:00:00Z"), null, NOW)).rejects.toThrow(/الماضي/);
    await expect(createOrder(sched("2026-10-14T11:15:00Z"), null, NOW)).rejects.toThrow(/مبكر/);
    await expect(createOrder(sched("2026-10-14T13:07:00Z"), null, NOW)).rejects.toThrow(/خارج ساعات العمل/);
    await expect(createOrder(sched("2026-10-14T21:00:00Z"), null, NOW)).rejects.toThrow(/خارج ساعات العمل/); // 01:00 Muscat, closed
    const ok = await createOrder(sched("2026-10-14T15:30:00Z"), null, NOW); // 19:30 Muscat
    const o = await queryOne("SELECT pickup_at, pickup_mode FROM orders WHERE number=$1", [ok.number]);
    expect(o.pickup_mode).toBe("scheduled");
    expect(o.pickup_at.toISOString()).toBe("2026-10-14T15:30:00.000Z");
  });

  it("never exceeds kitchen capacity per slot, even under concurrency", async () => {
    await setSettings({ ordering: { capacityPerSlot: 2 } as any });
    const slot = "2026-10-14T15:30:00Z";
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => createOrder(base({ pickup: { mode: "scheduled", slotStart: slot } }), null, NOW)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    const failures = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(failures.every((f) => /امتلأ/.test(f.reason.message))).toBe(true);
    expect((await queryOne("SELECT used_count FROM pickup_slots WHERE slot_start=$1", [slot])).used_count).toBe(2);
    // the full slot is no longer offered
    const s = await listSlots((await import("@/lib/db")).pool(), "2026-10-14", 16, await getSettings(), NOW);
    expect(s.slots.find((x) => x.start === "2026-10-14T15:30:00.000Z")).toBeUndefined();
  });

  it("hides slots inside blocked periods and outside opening hours", async () => {
    await query(`INSERT INTO blocked_periods(starts_at,ends_at,applies_to) VALUES ('2026-10-14T14:00:00Z','2026-10-14T16:00:00Z','pickup')`);
    const { pool } = await import("@/lib/db");
    const s = await listSlots(pool(), "2026-10-14", 16, await getSettings(), NOW);
    const times = s.slots.map((x) => x.time);
    expect(times).not.toContain("19:00");
    expect(times).toContain("21:00");
    expect(times.every((t) => t >= "15:30" && t <= "22:45")).toBe(true);
    await setSettings({ hours: Array(7).fill({ closed: true, open: "10:00", close: "23:00" }) as any });
    expect((await listSlots(pool(), "2026-10-14", 16, await getSettings(), NOW)).closed).toBe(true);
    await expect(createOrder(base(), null, NOW)).rejects.toThrow(/لا تتوفر مواعيد/);
  });

  it("applies coupons, enforces limits/expiry and counts usage", async () => {
    await query(`INSERT INTO coupons(code,type,value,usage_limit) VALUES ('SAVE10','percent',10,1)`);
    const r = await createOrder(base({ couponCode: "save10" }), null, NOW);
    const o = await queryOne("SELECT * FROM orders WHERE number=$1", [r.number]);
    expect(o.subtotal).toBe(5);
    expect(o.discount).toBe(0.5);
    expect(o.total).toBe(4.5);
    await expect(createOrder(base({ couponCode: "SAVE10" }), null, NOW)).rejects.toThrow(/استنفاد/);
    await query(`INSERT INTO coupons(code,type,value,expires_at) VALUES ('OLD','fixed',1,'2020-01-01')`);
    await expect(createOrder(base({ couponCode: "OLD" }), null, NOW)).rejects.toThrow(/انتهت/);
    await query(`INSERT INTO coupons(code,type,value,min_order) VALUES ('BIG','fixed',1,50)`);
    await expect(createOrder(base({ couponCode: "BIG" }), null, NOW)).rejects.toThrow(/الحد الأدنى/);
    await expect(createOrder(base({ couponCode: "NOPE" }), null, NOW)).rejects.toThrow(/غير صحيح/);
  });

  it("refuses card payment when no provider is configured", async () => {
    await expect(createOrder(base({ paymentMethod: "card" }), null, NOW)).rejects.toThrow(/غير متاحة/);
  });
});

describe("order lifecycle", () => {
  it("walks through the statuses, notifies the customer and marks cash as paid on delivery", async () => {
    const r = await createOrder(base(), null, NOW);
    const id = (await queryOne("SELECT id FROM orders WHERE number=$1", [r.number])).id;
    await changeOrderStatus(id, "accepted");
    await changeOrderStatus(id, "preparing");
    await changeOrderStatus(id, "ready");
    await changeOrderStatus(id, "delivered");
    const o = await queryOne("SELECT status, payment_status FROM orders WHERE id=$1", [id]);
    expect(o).toEqual({ status: "delivered", payment_status: "paid" });
    const titles = (await query("SELECT title FROM notifications WHERE audience='customer' AND order_id=$1 ORDER BY id", [id])).map((n) => n.title);
    expect(titles).toEqual(["تم استلام طلبك بنجاح!", "تم تأكيد طلبك.", "طلبك الآن قيد التحضير.", "طلبك جاهز للاستلام!", "تم تسليم طلبك، بالهناء والعافية!"]);
    const admin = await query("SELECT title FROM notifications WHERE audience='admin'");
    expect(admin.map((n) => n.title)).toContain("طلب جديد!");
    await expect(changeOrderStatus(id, "pending")).rejects.toThrow(/لا يمكن/);
  });

  it("releases the pickup slot and coupon use when an order is cancelled", async () => {
    await query(`INSERT INTO coupons(code,type,value,usage_limit) VALUES ('ONCE','fixed',0.5,1)`);
    const r = await createOrder(base({ couponCode: "ONCE" }), null, NOW);
    const o = await queryOne("SELECT id, slot_id FROM orders WHERE number=$1", [r.number]);
    await cancelOrderByCustomer(o.id, NOW);
    expect((await queryOne("SELECT used_count FROM pickup_slots WHERE id=$1", [o.slot_id])).used_count).toBe(0);
    expect((await queryOne("SELECT used_count FROM coupons WHERE code='ONCE'")).used_count).toBe(0);
    const titles = (await query("SELECT title FROM notifications WHERE audience='admin'")).map((n) => n.title);
    expect(titles).toContain("تم إلغاء طلب.");
  });

  it("does not let customers cancel once the kitchen started", async () => {
    const r = await createOrder(base(), null, NOW);
    const id = (await queryOne("SELECT id FROM orders WHERE number=$1", [r.number])).id;
    await changeOrderStatus(id, "preparing");
    await expect(cancelOrderByCustomer(id, NOW)).rejects.toThrow(/بعد بدء تحضيره/);
  });

  it("lists upcoming slots for 'as soon as possible'", async () => {
    const { pool } = await import("@/lib/db");
    const slots = await nextSlots(pool(), 16, await getSettings(), NOW, 3);
    expect(slots.map((s) => s.time)).toEqual(["15:30", "15:45", "16:00"]);
    expect(muscatDate(NOW)).toBe("2026-10-14");
  });
});
