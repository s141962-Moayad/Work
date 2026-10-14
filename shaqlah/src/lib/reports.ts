import { query, queryOne } from "./db";

// "Sales" = orders that were not cancelled and are either cash or actually paid online.
const SALES = `status <> 'cancelled' AND (payment_method = 'cash' OR payment_status IN ('paid','refunded','partially_refunded'))`;
const DAY = `(created_at AT TIME ZONE 'Asia/Muscat')::date`;

export async function getDashboard() {
  const [kpi] = await query(`
    SELECT
      COALESCE((SELECT sum(total) FROM orders WHERE ${SALES}),0) AS total_sales,
      (SELECT count(*) FROM orders WHERE ${DAY} = (now() AT TIME ZONE 'Asia/Muscat')::date AND status <> 'cancelled') AS today_orders,
      (SELECT count(*) FROM orders WHERE status = 'pending') AS new_orders,
      (SELECT count(*) FROM reservations WHERE status IN ('pending','confirmed') AND start_at >= now()) AS upcoming_reservations,
      COALESCE((SELECT avg(total) FROM orders WHERE ${SALES}),0) AS avg_order,
      COALESCE((SELECT sum(total) FROM orders WHERE ${SALES} AND date_trunc('month', created_at AT TIME ZONE 'Asia/Muscat') = date_trunc('month', now() AT TIME ZONE 'Asia/Muscat')),0) AS month_revenue,
      COALESCE((SELECT sum(total) FROM orders WHERE ${SALES} AND ${DAY} = (now() AT TIME ZONE 'Asia/Muscat')::date),0) AS today_sales
  `);
  const daily = await query(`
    SELECT to_char(d,'YYYY-MM-DD') AS day, COALESCE(sum(o.total),0) AS sales, count(o.id)::int AS orders
      FROM generate_series((now() AT TIME ZONE 'Asia/Muscat')::date - 13, (now() AT TIME ZONE 'Asia/Muscat')::date, '1 day') d
      LEFT JOIN (SELECT total, id, (created_at AT TIME ZONE 'Asia/Muscat')::date AS cday FROM orders WHERE ${SALES}) o ON o.cday = d::date
     GROUP BY d ORDER BY d`);
  const monthly = await query(`
    SELECT to_char(m,'YYYY-MM-DD') AS month, COALESCE(sum(o.total),0) AS revenue
      FROM generate_series(date_trunc('month', now() AT TIME ZONE 'Asia/Muscat') - interval '5 months', date_trunc('month', now() AT TIME ZONE 'Asia/Muscat'), '1 month') m
      LEFT JOIN (SELECT total, date_trunc('month', created_at AT TIME ZONE 'Asia/Muscat') AS mon FROM orders WHERE ${SALES}) o ON o.mon = m
     GROUP BY m ORDER BY m`);
  const top = await query(`
    SELECT oi.name_ar AS name, sum(oi.quantity)::int AS qty, sum(oi.line_total) AS revenue
      FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.status <> 'cancelled' AND o.created_at > now() - interval '30 days'
     GROUP BY oi.name_ar ORDER BY qty DESC LIMIT 8`);
  const byStatus = await query(`SELECT status, count(*)::int AS n FROM orders WHERE created_at > now() - interval '30 days' GROUP BY status`);
  const late = await queryOne(`SELECT count(*)::int AS n FROM orders WHERE status IN ('pending','accepted','preparing') AND pickup_at < now()`);
  return { kpi, daily, monthly, top, byStatus, late: late?.n ?? 0 };
}
