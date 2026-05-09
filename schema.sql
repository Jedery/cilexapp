-- ============================================================
-- CILEX IBIZA — Supabase Schema  (idempotent, run any time)
-- Paste this into Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── TRIGGER: auto-update updated_at ───────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────
-- 1. TEAM
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team (
  id         TEXT        PRIMARY KEY,
  firstname  TEXT        NOT NULL,
  lastname   TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'altro',
  phone      TEXT,
  email      TEXT,
  notes      TEXT,
  pin        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER team_updated_at
  BEFORE UPDATE ON team
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- 2. PRODUCTS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          TEXT           PRIMARY KEY,
  name        TEXT           NOT NULL,
  description TEXT,
  price       NUMERIC(10,2)  NOT NULL DEFAULT 0,
  emoji       TEXT           DEFAULT '📦',
  color       TEXT           DEFAULT '#1A1A1A',
  duration    TEXT,
  notes       TEXT,
  timeslots   TEXT,
  commission  NUMERIC(5,2)   NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- 3. LOCATIONS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
  id         SERIAL      PRIMARY KEY,
  name       TEXT        UNIQUE NOT NULL,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 4. BOOKINGS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id             TEXT           PRIMARY KEY,
  -- customer
  name           TEXT           NOT NULL,
  email          TEXT           NOT NULL,
  phone          TEXT,
  language       TEXT,
  -- product (name kept for display; product_id is the relational FK)
  product_name   TEXT,
  product_id     TEXT           REFERENCES products(id) ON DELETE SET NULL,
  pax            INTEGER        NOT NULL DEFAULT 1 CHECK (pax > 0),
  date           DATE,
  time_slot      TEXT,
  -- agent
  agent_name     TEXT,
  agent_id       TEXT           REFERENCES team(id) ON DELETE SET NULL,
  -- location
  location       TEXT,
  -- payment
  payment_method TEXT,
  payment_status TEXT           NOT NULL DEFAULT 'pending'
                                CHECK (payment_status IN ('pending','confirmed','cancelled')),
  total          NUMERIC(10,2),
  deposit        NUMERIC(10,2)  NOT NULL DEFAULT 0,
  notes          TEXT,
  -- timestamps
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_bookings_agent_id       ON bookings(agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_date           ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_product_id     ON bookings(product_id);

-- ─────────────────────────────────────────────────────────────────
-- 5. NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT        PRIMARY KEY,
  type       TEXT        NOT NULL DEFAULT 'system-info'
                          CHECK (type IN ('system-urgent','system-warning','system-info','message')),
  title      TEXT        NOT NULL,
  body       TEXT,
  -- audience: JSON string ('all','superadmin','everyone') OR JSON array of team IDs
  audience   JSONB       NOT NULL DEFAULT '"all"'::jsonb,
  from_id    TEXT        REFERENCES team(id) ON DELETE SET NULL,
  from_name  TEXT,
  booking_id TEXT        REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at  ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_booking_id  ON notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_from_id     ON notifications(from_id);

-- ─────────────────────────────────────────────────────────────────
-- 6. NOTIFICATION READ STATUS
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notif_read (
  user_id    TEXT        NOT NULL REFERENCES team(id)          ON DELETE CASCADE,
  notif_id   TEXT        NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, notif_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_read_user_id ON notif_read(user_id);

-- ─────────────────────────────────────────────────────────────────
-- 7. APP SETTINGS  (permissions, money_hidden, …)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL DEFAULT 'null'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY  (open for now — lock down before prod)
-- ============================================================
ALTER TABLE team          ENABLE ROW LEVEL SECURITY;
ALTER TABLE products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notif_read    ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team'          AND policyname='allow_all') THEN CREATE POLICY allow_all ON team          FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='products'      AND policyname='allow_all') THEN CREATE POLICY allow_all ON products      FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='locations'     AND policyname='allow_all') THEN CREATE POLICY allow_all ON locations     FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bookings'      AND policyname='allow_all') THEN CREATE POLICY allow_all ON bookings      FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='allow_all') THEN CREATE POLICY allow_all ON notifications FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notif_read'    AND policyname='allow_all') THEN CREATE POLICY allow_all ON notif_read    FOR ALL USING (true) WITH CHECK (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_settings'  AND policyname='allow_all') THEN CREATE POLICY allow_all ON app_settings  FOR ALL USING (true) WITH CHECK (true); END IF;
END $$;

-- ============================================================
-- SEED: default locations
-- ============================================================
INSERT INTO locations (name, sort_order) VALUES
  ('Cala Comte',        0),
  ('Playa d''en Bossa', 1),
  ('Ibiza Town',        2),
  ('San Antonio',       3),
  ('Talamanca',         4)
ON CONFLICT (name) DO NOTHING;
