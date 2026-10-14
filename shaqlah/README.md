# SHAQLAH (شقلح) — Restaurant ordering, pickup scheduling & table reservations

Arabic-first (RTL) restaurant platform for **SHAQLAH**, Sultanate of Oman: customers browse the menu,
customise dishes, order for **scheduled pickup**, pay (cash or online), track the order live and book tables;
the owner runs everything from a secure Arabic dashboard (**لوحة تحكم شقلح**).

> The whole visible UI (site + dashboard) is Arabic/RTL, prices are in **Omani Rial (ر.ع, 3 decimals)**.
> Source code and this documentation are English.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 |
| Database | PostgreSQL 14+ (works with Supabase/Neon/RDS — it is plain Postgres) |
| Auth | Own implementation: bcrypt password hashes, signed JWT in an `HttpOnly; SameSite=Lax; Secure` cookie, roles `customer / staff / admin` |
| Real-time | Server-Sent Events (customer order tracking, admin live feed) — no extra infrastructure |
| PWA | Web manifest (RTL/Arabic), service worker (static assets + offline page), install button (Android prompt, iOS instructions) |
| Payments | Provider adapter; **Thawani Pay** hosted checkout implemented (cards + Apple Pay when enabled on the merchant account) |
| Fonts | Cairo (self-hosted via `@fontsource-variable/cairo`, no Google request) |

## Quick start (development)

```bash
cd shaqlah
cp .env.example .env            # set DATABASE_URL, AUTH_SECRET, ADMIN_EMAIL/ADMIN_PHONE, ADMIN_PASSWORD
createdb shaqlah                # needs the btree_gist + pgcrypto extensions (bundled with PostgreSQL)
npm install
npm run db:setup                # creates tables, default settings, sample tables, first admin, SAMPLE menu
npm run dev                     # http://localhost:3000   ·   admin: http://localhost:3000/admin
```

If `ADMIN_PASSWORD` is empty in development a random one is generated and printed by the seed script.

### Sample data is clearly marked
`npm run db:seed` creates a **sample menu** (16 categories, 56 dishes, placeholder prices) flagged `is_sample`.
Customers see a "قائمة تجريبية" notice while any sample item exists; editing an item in the dashboard turns it into real
data, and **القائمة ← حذف كل الأصناف التجريبية** removes the rest. In production the sample menu is **not** seeded
(`SEED_SAMPLE_MENU=false` is the production default). Sample dishes have no photos: upload real photos per dish in the
dashboard (and a cover image under *الإعدادات ← معلومات المطعم*) — until then branded placeholder tiles are shown.

## What you must provide before going live

| Item | Where |
|---|---|
| Real menu, prices, photos, allergens | Dashboard → قائمة الطعام |
| Restaurant name/logo, phone, address, **map coordinates**, social links | Dashboard → الإعدادات |
| Opening hours, prep times, kitchen capacity, tables, reservation rules | Dashboard → الإعدادات / الطاولات والإتاحة |
| VAT %, service fee (defaults to 5 % VAT included — **confirm your tax status**) | Dashboard → الإعدادات ← الدفع والضرائب |
| `AUTH_SECRET`, `DATABASE_URL`, `APP_URL` (public **https** URL), admin credentials | environment |
| Online payments: a **Thawani Pay** merchant account → `THAWANI_SECRET_KEY`, `THAWANI_PUBLISHABLE_KEY`, `THAWANI_ENV=live` (Apple Pay must be enabled by Thawani on your account) | environment |
| Email (optional): any SMTP account → `SMTP_*` | environment |
| SMS (optional): Twilio account → `TWILIO_*` | environment |
| WhatsApp (optional): Meta WhatsApp Business Cloud API + an **approved message template** with one body variable → `WHATSAPP_*` | environment |
| Legal text review: privacy, terms, cancellation and reservation policies are templates driven by your settings — have them reviewed for your business | `src/app/(site)/*/page.tsx` |

No integration is simulated: **online card/Apple Pay options are hidden from customers until the payment provider is configured**
and enabled in settings; SMS/WhatsApp/email only fire when credentials exist, the channel is enabled and the customer allows it.
Cash on pickup works with zero external accounts.

## Feature map

* **Customer site** — home (hero, categories, offers, featured, best sellers, hours, map, footer), interactive menu
  (search, category/availability/favourites filter, sort, sizes, add-ons, allergens, notes), cart, checkout, order
  confirmation + live tracking, reservations (view/modify/cancel), accounts (profile, order & reservation history,
  favourites, re-order, notification preferences), guest checkout, FAQ/About/Contact/policies, Arabic 404.
* **Scheduled pickup** — "في أقرب وقت ممكن" (earliest slot from prep time + capacity) or "تحديد موعد الاستلام"
  (day + only-available slots). Past times, closed hours, blocked periods and full slots are rejected **on the server**;
  capacity is claimed atomically (`INSERT … ON CONFLICT … WHERE used_count < capacity`), so concurrent orders can never overbook a slot.
* **Order statuses** — بانتظار التأكيد → تم قبول الطلب → قيد التحضير → جاهز للاستلام → تم التسليم / تم إلغاء الطلب.
* **Reservations** — table auto-assignment (smallest fitting table, indoor/outdoor preference), overlap prevention via a
  PostgreSQL **exclusion constraint** (`tstzrange` per table), statuses بانتظار التأكيد / تم تأكيد الحجز / اكتمل / تم إلغاء / لم يحضر.
* **Dashboard** — KPIs & charts, live order board with sound alerts, status actions, receipts (print), refunds, menu/categories/sizes/add-ons/
  images/featured/offers, reservation calendar, tables, blocked dates, coupons (percent/fixed, expiry, usage limit, min order), customers,
  contact messages, staff accounts & roles, audit log, all restaurant settings.
* **Roles** — `staff`: orders, reservations, messages. `admin`: everything. Enforced server-side on every API route and page.

## Security notes

* All prices/totals/discounts/pickup availability are recomputed on the server; the client only sends ids, quantities and notes.
* Duplicate submissions: client idempotency keys (unique constraint) + disabled buttons.
* Cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production; mutating API calls additionally require a same-origin `Origin`.
* Passwords: bcrypt (cost 11). Login is rate-limited per IP and per account; unknown accounts cost the same time as known ones.
* Guests reach their own order/reservation only with an unguessable token (or order number **and** phone). Tokens are never echoed in API payloads.
* Card data never touches this server or database (hosted payment page). Payment status is **always re-verified server-side with the provider**
  — the browser redirect and webhook payloads are only hints. Refund support: automatic full refund when a paid online order is cancelled,
  manual refund from the order page (online: full amount via provider; cash: recorded).
* Uploads: admin only, type decided from file bytes (PNG/JPEG/WebP), random names, 4 MB cap, served with `nosniff`.
* Security headers: CSP, HSTS (prod), `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`.
* Audit log for administrative actions (`/admin/audit`).
* The in-memory rate limiter is per instance; behind several instances add a shared limiter or WAF rules.
* `/uploads` is served from `UPLOAD_DIR`; on serverless hosts replace it with object storage (Supabase Storage/S3) — it is isolated in two files (`api/admin/upload`, `app/uploads`).

## Deployment

Serve the site over **HTTPS** only (payments, PWA install and secure cookies require it).

### Docker (VPS / any container host)
```bash
cp .env.example .env     # AUTH_SECRET, POSTGRES_PASSWORD, APP_URL=https://your-domain, ADMIN_*, payment keys…
docker compose up -d db
docker compose run --rm tools     # migrate + seed (first admin; no sample menu in production)
docker compose up -d app          # then put Caddy/Nginx/Cloudflare with TLS in front of :3000
```
Persist two volumes: `pgdata` (database) and `uploads` (photos). Back up both.

### Node (Render, Railway, Fly, VM…)
`npm ci && npm run build && npm run db:setup && npm start` with the environment variables above
(`DATABASE_SSL=true` for managed Postgres). Set the payment provider's webhook (optional) to `https://your-domain/api/payments/webhook`.

### Payment go-live checklist (Thawani)
1. Test the whole flow with `THAWANI_ENV=uat` and UAT keys (success, cancel, refund).
2. Compare `src/lib/payments/thawani.ts` with the provider's current API documentation — the adapter isolates every provider call.
3. Switch to `live` keys, enable Apple Pay with the provider, enable *بطاقة مصرفية* / *Apple Pay* in the dashboard.

## Testing

```bash
npm run lint                         # type-check
npm test                             # 36 integration tests against a real PostgreSQL (TEST_DATABASE_URL, default shaqlah_test)
npm run build && npm start &         # then:
CHROMIUM_PATH=… npm run test:e2e     # real-browser flow: order → admin accepts → live tracking → reservation → 404 → RTL/mobile overflow
```
Covered: ordering, server-side pricing, cart-line validation, scheduled pickup (past/closed/blocked/full/concurrent), coupons (limits, expiry,
minimum), reservations (concurrent double-booking, DB exclusion constraint, modify/cancel), order status flow & notifications, price edits,
payment success/failure/refund/expiry (provider mocked), role restrictions, CSRF, deactivated users, upload validation, Arabic error messages.

## Project layout

```
db/schema.sql            all tables (users, roles, categories, menu_items, item_variants, add_ons, orders, order_items, pickup_slots,
                         reservations, restaurant_tables, payments, coupons, notifications, business_settings + audit_logs, blocked_periods, …)
scripts/                 migrate, seed (+ sample menu), icon generator, screenshot helper
src/lib/                 pricing, pickup, orders, reservations, payments/, notify, settings, auth, api wrapper
src/app/(site)/          customer pages        src/app/admin/        dashboard        src/app/api/   JSON API
tests/                   vitest integration tests + Playwright e2e
```

Set `NEXT_PUBLIC_DIGITS=latn` (at build time) to show 0123456789 instead of Arabic-Indic digits (٠١٢٣…).
