-- SHAQLAH database schema (PostgreSQL 14+)
-- Idempotent: safe to run repeatedly (see scripts/migrate.ts).

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ───────────────────────── Roles & users ─────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id    SMALLINT PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,         -- customer | staff | admin
  label_ar TEXT NOT NULL
);
INSERT INTO roles (id, name, label_ar) VALUES
  (1, 'customer', 'عميل'),
  (2, 'staff',    'موظف'),
  (3, 'admin',    'مدير')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id       SMALLINT NOT NULL REFERENCES roles(id) DEFAULT 1,
  name          TEXT NOT NULL,
  phone         TEXT UNIQUE,           -- normalized, 8 digits (Oman)
  email         TEXT UNIQUE,           -- lower-cased
  password_hash TEXT NOT NULL,
  notify_prefs  JSONB NOT NULL DEFAULT '{"inApp":true,"email":false,"sms":false,"whatsapp":false}',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_contact_chk CHECK (phone IS NOT NULL OR email IS NOT NULL)
);

-- ───────────────────────── Menu ─────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id        SERIAL PRIMARY KEY,
  slug      TEXT NOT NULL UNIQUE,
  name_ar   TEXT NOT NULL,
  icon      TEXT NOT NULL DEFAULT '🍽️',
  image     TEXT,
  sort      INT NOT NULL DEFAULT 0,
  active    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS menu_items (
  id            SERIAL PRIMARY KEY,
  category_id   INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name_ar       TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  base_price    NUMERIC(10,3) NOT NULL CHECK (base_price >= 0),
  old_price     NUMERIC(10,3) CHECK (old_price IS NULL OR old_price >= 0), -- struck-through price for offers
  image         TEXT,
  available     BOOLEAN NOT NULL DEFAULT TRUE,
  featured      BOOLEAN NOT NULL DEFAULT FALSE,
  best_seller   BOOLEAN NOT NULL DEFAULT FALSE,
  prep_minutes  INT NOT NULL DEFAULT 10 CHECK (prep_minutes BETWEEN 0 AND 240),
  allergens     TEXT[] NOT NULL DEFAULT '{}',
  is_sample     BOOLEAN NOT NULL DEFAULT FALSE,   -- seeded demo data, to be replaced by the owner
  sort          INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS menu_items_category_idx ON menu_items(category_id);

-- Sizes. price_delta is added to base_price.
CREATE TABLE IF NOT EXISTS item_variants (
  id          SERIAL PRIMARY KEY,
  item_id     INT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name_ar     TEXT NOT NULL,
  price_delta NUMERIC(10,3) NOT NULL DEFAULT 0,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  sort        INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS item_variants_item_idx ON item_variants(item_id);

CREATE TABLE IF NOT EXISTS add_ons (
  id        SERIAL PRIMARY KEY,
  item_id   INT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name_ar   TEXT NOT NULL,
  price     NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (price >= 0),
  available BOOLEAN NOT NULL DEFAULT TRUE,
  sort      INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS add_ons_item_idx ON add_ons(item_id);

CREATE TABLE IF NOT EXISTS favorites (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id INT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

-- ───────────────────────── Coupons ─────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id           SERIAL PRIMARY KEY,
  code         TEXT NOT NULL UNIQUE,
  description_ar TEXT NOT NULL DEFAULT '',
  type         TEXT NOT NULL CHECK (type IN ('percent','fixed')),
  value        NUMERIC(10,3) NOT NULL CHECK (value > 0),
  min_order    NUMERIC(10,3) NOT NULL DEFAULT 0,
  max_discount NUMERIC(10,3),
  starts_at    TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  usage_limit  INT,
  used_count   INT NOT NULL DEFAULT 0,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────── Orders ─────────────────────────
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS reservation_number_seq START 1001;

-- One row per pickup time slot that has at least one order. used_count is
-- incremented atomically (INSERT .. ON CONFLICT .. WHERE used_count < capacity)
-- so two customers can never overbook the same slot.
CREATE TABLE IF NOT EXISTS pickup_slots (
  id         SERIAL PRIMARY KEY,
  slot_start TIMESTAMPTZ NOT NULL UNIQUE,
  used_count INT NOT NULL DEFAULT 0 CHECK (used_count >= 0)
);

CREATE TABLE IF NOT EXISTS orders (
  id              SERIAL PRIMARY KEY,
  number          TEXT NOT NULL UNIQUE,         -- SHQ-1001
  access_token    TEXT NOT NULL,                -- random, lets guests open their order
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name   TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','accepted','preparing','ready','delivered','cancelled')),
  pickup_mode     TEXT NOT NULL CHECK (pickup_mode IN ('asap','scheduled')),
  pickup_at       TIMESTAMPTZ NOT NULL,
  slot_id         INT REFERENCES pickup_slots(id),
  prep_minutes    INT NOT NULL DEFAULT 15,
  subtotal        NUMERIC(10,3) NOT NULL,
  discount        NUMERIC(10,3) NOT NULL DEFAULT 0,
  fee             NUMERIC(10,3) NOT NULL DEFAULT 0,
  tax             NUMERIC(10,3) NOT NULL DEFAULT 0,
  total           NUMERIC(10,3) NOT NULL,
  coupon_id       INT REFERENCES coupons(id),
  coupon_code     TEXT,
  payment_method  TEXT NOT NULL CHECK (payment_method IN ('cash','card','apple_pay')),
  payment_status  TEXT NOT NULL DEFAULT 'unpaid'
                  CHECK (payment_status IN ('unpaid','pending','paid','failed','refunded','partially_refunded')),
  notes           TEXT,
  cancel_reason   TEXT,
  idempotency_key TEXT UNIQUE,
  late_notified   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_pickup_idx ON orders(pickup_at);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id            SERIAL PRIMARY KEY,
  order_id      INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id       INT REFERENCES menu_items(id) ON DELETE SET NULL,
  variant_id    INT,
  addon_ids     INT[] NOT NULL DEFAULT '{}',
  name_ar       TEXT NOT NULL,                  -- snapshot
  variant_name  TEXT,
  addons        JSONB NOT NULL DEFAULT '[]',    -- snapshot [{id,name,price}]
  unit_price    NUMERIC(10,3) NOT NULL,         -- base + variant + addons
  quantity      INT NOT NULL CHECK (quantity BETWEEN 1 AND 50),
  line_total    NUMERIC(10,3) NOT NULL,
  notes         TEXT
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);

-- ───────────────────────── Payments ─────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id            SERIAL PRIMARY KEY,
  order_id      INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,                  -- cash | thawani
  provider_ref  TEXT,                           -- checkout session id
  provider_payment_id TEXT,                     -- needed for refunds
  method        TEXT NOT NULL,
  amount        NUMERIC(10,3) NOT NULL,
  refunded_amount NUMERIC(10,3) NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'OMR',
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','paid','failed','cancelled','refunded','partially_refunded')),
  failure_reason TEXT,
  raw           JSONB,                          -- provider response (never card data)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_order_idx ON payments(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_ref_idx ON payments(provider, provider_ref) WHERE provider_ref IS NOT NULL;

-- ───────────────────────── Tables & reservations ─────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  capacity INT NOT NULL CHECK (capacity BETWEEN 1 AND 40),
  area     TEXT NOT NULL CHECK (area IN ('indoor','outdoor')),
  active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS reservations (
  id            SERIAL PRIMARY KEY,
  number        TEXT NOT NULL UNIQUE,           -- RSV-1001
  access_token  TEXT NOT NULL,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  table_id      INT NOT NULL REFERENCES restaurant_tables(id),
  customer_name TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT,
  party_size    INT NOT NULL CHECK (party_size BETWEEN 1 AND 40),
  area_pref     TEXT NOT NULL DEFAULT 'any' CHECK (area_pref IN ('any','indoor','outdoor')),
  start_at      TIMESTAMPTZ NOT NULL,
  end_at        TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','confirmed','completed','cancelled','no_show')),
  notes         TEXT,
  idempotency_key TEXT UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reservations_range_chk CHECK (end_at > start_at),
  -- A table can never hold two live reservations that overlap in time.
  CONSTRAINT reservations_no_overlap EXCLUDE USING gist (
    table_id WITH =,
    tstzrange(start_at, end_at) WITH &&
  ) WHERE (status IN ('pending','confirmed'))
);
CREATE INDEX IF NOT EXISTS reservations_start_idx ON reservations(start_at);
CREATE INDEX IF NOT EXISTS reservations_user_idx ON reservations(user_id);

-- Dates/times the owner closes for pickup and/or reservations.
CREATE TABLE IF NOT EXISTS blocked_periods (
  id         SERIAL PRIMARY KEY,
  starts_at  TIMESTAMPTZ NOT NULL,
  ends_at    TIMESTAMPTZ NOT NULL,
  applies_to TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all','pickup','reservations')),
  reason     TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

-- ───────────────────────── Notifications, settings, audit ─────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id             SERIAL PRIMARY KEY,
  audience       TEXT NOT NULL CHECK (audience IN ('customer','admin')),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  order_id       INT REFERENCES orders(id) ON DELETE CASCADE,
  reservation_id INT REFERENCES reservations(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL,
  title          TEXT NOT NULL,
  body           TEXT NOT NULL DEFAULT '',
  link           TEXT,
  read           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS notifications_admin_idx ON notifications(audience, read);

CREATE TABLE IF NOT EXISTS business_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name  TEXT,
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  TEXT,
  details    JSONB,
  ip         TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  message    TEXT NOT NULL,
  handled    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
