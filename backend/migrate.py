"""
Run once to bring the database schema up to date with the current backend code.
Safe to re-run — uses ADD COLUMN IF NOT EXISTS and CREATE TABLE IF NOT EXISTS.
"""
import psycopg
from app.core.config import settings

conn = psycopg.connect(settings.db_conninfo)
cur = conn.cursor()

# ── erp.suppliers ─────────────────────────────────────────────────────────────
cur.execute("ALTER TABLE erp.suppliers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(100)")
cur.execute("ALTER TABLE erp.suppliers ADD COLUMN IF NOT EXISTS phone VARCHAR(50)")
cur.execute("ALTER TABLE erp.suppliers ADD COLUMN IF NOT EXISTS email VARCHAR(100)")
cur.execute("ALTER TABLE erp.suppliers ADD COLUMN IF NOT EXISTS address TEXT")
cur.execute("ALTER TABLE erp.suppliers ADD COLUMN IF NOT EXISTS halal_certified BOOLEAN NOT NULL DEFAULT TRUE")
cur.execute("ALTER TABLE erp.suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE")
cur.execute("ALTER TABLE erp.suppliers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()")
print("suppliers  ✓")

# ── erp.products ──────────────────────────────────────────────────────────────
cur.execute("ALTER TABLE erp.products ADD COLUMN IF NOT EXISTS category VARCHAR(50)")
cur.execute("ALTER TABLE erp.products ADD COLUMN IF NOT EXISTS unit VARCHAR(20) NOT NULL DEFAULT 'kg'")
cur.execute("ALTER TABLE erp.products ADD COLUMN IF NOT EXISTS min_threshold NUMERIC(10,2) NOT NULL DEFAULT 10")
cur.execute("ALTER TABLE erp.products ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES erp.suppliers(id) ON DELETE SET NULL")
cur.execute("ALTER TABLE erp.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE")
cur.execute("ALTER TABLE erp.products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()")
print("products   ✓")

# ── erp.orders ────────────────────────────────────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS erp.orders (
    id              SERIAL PRIMARY KEY,
    order_number    VARCHAR(20) UNIQUE NOT NULL,
    customer_name   VARCHAR(200) NOT NULL,
    customer_phone  VARCHAR(50),
    customer_address TEXT,
    status          VARCHAR(30) NOT NULL DEFAULT 'pending',
    total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
)
""")
print("orders     ✓")

# ── erp.order_items ───────────────────────────────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS erp.order_items (
    id           SERIAL PRIMARY KEY,
    order_id     INTEGER NOT NULL REFERENCES erp.orders(id) ON DELETE CASCADE,
    product_id   INTEGER,
    product_name VARCHAR(200) NOT NULL,
    quantity     NUMERIC(10,2) NOT NULL,
    unit_price   NUMERIC(12,2) NOT NULL,
    total_price  NUMERIC(12,2) NOT NULL
)
""")
print("order_items ✓")

# ── erp.deliveries ────────────────────────────────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS erp.deliveries (
    id               SERIAL PRIMARY KEY,
    order_id         INTEGER REFERENCES erp.orders(id) ON DELETE SET NULL,
    driver_name      VARCHAR(100),
    vehicle          VARCHAR(100),
    scheduled_time   TIMESTAMPTZ,
    delivery_address TEXT,
    status           VARCHAR(30) NOT NULL DEFAULT 'pending',
    notes            TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW()
)
""")
print("deliveries ✓")

# ── erp.trucks ────────────────────────────────────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS erp.trucks (
    id            SERIAL PRIMARY KEY,
    plate_number  VARCHAR(20) UNIQUE NOT NULL,
    driver_name   VARCHAR(100),
    driver_phone  VARCHAR(20),
    portal_pin    VARCHAR(6),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
)
""")
print("trucks     ✓")

# ── erp.truck_trips ───────────────────────────────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS erp.truck_trips (
    id          SERIAL PRIMARY KEY,
    truck_id    INTEGER NOT NULL REFERENCES erp.trucks(id) ON DELETE CASCADE,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at    TIMESTAMPTZ,
    distance_km NUMERIC(10,3) NOT NULL DEFAULT 0,
    status      VARCHAR(20) NOT NULL DEFAULT 'active'
)
""")
print("truck_trips ✓")

# ── erp.truck_pings ───────────────────────────────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS erp.truck_pings (
    id          SERIAL PRIMARY KEY,
    truck_id    INTEGER NOT NULL,
    trip_id     INTEGER REFERENCES erp.truck_trips(id) ON DELETE CASCADE,
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    speed_kmh   NUMERIC(6,2) DEFAULT 0,
    accuracy_m  NUMERIC(8,2),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
""")
cur.execute("CREATE INDEX IF NOT EXISTS idx_truck_pings_trip ON erp.truck_pings(trip_id, recorded_at DESC)")
cur.execute("CREATE INDEX IF NOT EXISTS idx_truck_pings_truck ON erp.truck_pings(truck_id, recorded_at DESC)")
print("truck_pings ✓")

# ── erp.truck_stops ───────────────────────────────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS erp.truck_stops (
    id               SERIAL PRIMARY KEY,
    truck_id         INTEGER NOT NULL,
    trip_id          INTEGER REFERENCES erp.truck_trips(id) ON DELETE CASCADE,
    lat              DOUBLE PRECISION NOT NULL,
    lng              DOUBLE PRECISION NOT NULL,
    arrived_at       TIMESTAMPTZ NOT NULL,
    departed_at      TIMESTAMPTZ,
    duration_minutes INTEGER,
    note             TEXT
)
""")
print("truck_stops ✓")

conn.commit()
conn.close()
print("\nMigration complete.")
