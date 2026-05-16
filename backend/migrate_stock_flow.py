"""
Migrate: Purchase-to-Sale stock flow tables + product stock state columns.
Run once: python migrate_stock_flow.py
"""
import psycopg

conn = psycopg.connect('host=localhost dbname=meat_erp user=erp_user password=ErpUser@123')
cur = conn.cursor()

# ── 1. Add stock-state columns to products ────────────────────────────────────
cur.execute("ALTER TABLE erp.products ADD COLUMN IF NOT EXISTS stock_expected  NUMERIC(12,3) DEFAULT 0 NOT NULL")
cur.execute("ALTER TABLE erp.products ADD COLUMN IF NOT EXISTS stock_reserved  NUMERIC(12,3) DEFAULT 0 NOT NULL")
cur.execute("ALTER TABLE erp.products ADD COLUMN IF NOT EXISTS stock_dispatched NUMERIC(12,3) DEFAULT 0 NOT NULL")

# ── 2. Purchase Orders ────────────────────────────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS erp.purchase_orders (
    id           SERIAL PRIMARY KEY,
    po_number    VARCHAR(20) UNIQUE NOT NULL,
    supplier_id  INT REFERENCES erp.suppliers(id),
    supplier_name VARCHAR(200),
    status       VARCHAR(20) NOT NULL DEFAULT 'draft',
    notes        TEXT,
    expected_date DATE,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
)
""")

cur.execute("""
CREATE TABLE IF NOT EXISTS erp.purchase_order_items (
    id           SERIAL PRIMARY KEY,
    po_id        INT NOT NULL REFERENCES erp.purchase_orders(id) ON DELETE CASCADE,
    product_id   INT REFERENCES erp.products(id),
    product_name VARCHAR(200) NOT NULL,
    quantity     NUMERIC(12,3) NOT NULL,
    unit_price   NUMERIC(12,2) NOT NULL DEFAULT 0
)
""")

# ── 3. Sale Orders ────────────────────────────────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS erp.sale_orders (
    id             SERIAL PRIMARY KEY,
    so_number      VARCHAR(20) UNIQUE NOT NULL,
    customer_name  VARCHAR(200) NOT NULL,
    customer_phone VARCHAR(50),
    status         VARCHAR(20) NOT NULL DEFAULT 'draft',
    total_amount   NUMERIC(14,2) DEFAULT 0,
    notes          TEXT,
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW()
)
""")

cur.execute("""
CREATE TABLE IF NOT EXISTS erp.sale_order_items (
    id           SERIAL PRIMARY KEY,
    so_id        INT NOT NULL REFERENCES erp.sale_orders(id) ON DELETE CASCADE,
    product_id   INT REFERENCES erp.products(id),
    product_name VARCHAR(200) NOT NULL,
    quantity     NUMERIC(12,3) NOT NULL,
    unit_price   NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_price  NUMERIC(14,2) NOT NULL DEFAULT 0
)
""")

# ── 4. Invoices ───────────────────────────────────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS erp.invoices (
    id             SERIAL PRIMARY KEY,
    invoice_number VARCHAR(20) UNIQUE NOT NULL,
    so_id          INT NOT NULL REFERENCES erp.sale_orders(id),
    status         VARCHAR(20) DEFAULT 'draft',
    total_amount   NUMERIC(14,2) DEFAULT 0,
    created_at     TIMESTAMP DEFAULT NOW()
)
""")

# ── 5. Credit Notes ───────────────────────────────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS erp.credit_notes (
    id             SERIAL PRIMARY KEY,
    cn_number      VARCHAR(20) UNIQUE NOT NULL,
    invoice_id     INT NOT NULL REFERENCES erp.invoices(id),
    so_id          INT NOT NULL REFERENCES erp.sale_orders(id),
    reason         TEXT,
    total_amount   NUMERIC(14,2) DEFAULT 0,
    created_at     TIMESTAMP DEFAULT NOW()
)
""")

# ── 6. Return Entries ─────────────────────────────────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS erp.return_entries (
    id               SERIAL PRIMARY KEY,
    re_number        VARCHAR(20) UNIQUE NOT NULL,
    so_id            INT NOT NULL REFERENCES erp.sale_orders(id),
    credit_note_id   INT REFERENCES erp.credit_notes(id),
    rejection_reason TEXT,
    status           VARCHAR(20) DEFAULT 'pending',
    confirmed_at     TIMESTAMP,
    created_at       TIMESTAMP DEFAULT NOW()
)
""")

cur.execute("""
CREATE TABLE IF NOT EXISTS erp.return_entry_items (
    id           SERIAL PRIMARY KEY,
    re_id        INT NOT NULL REFERENCES erp.return_entries(id) ON DELETE CASCADE,
    product_id   INT REFERENCES erp.products(id),
    product_name VARCHAR(200) NOT NULL,
    quantity     NUMERIC(12,3) NOT NULL
)
""")

conn.commit()
conn.close()
print("Stock flow migration complete.")
