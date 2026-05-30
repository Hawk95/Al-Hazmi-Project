"""Create customers table and backfill from existing sale orders."""
import psycopg

conn = psycopg.connect("host=localhost dbname=meat_erp user=erp_user password=ErpUser@123")
cur  = conn.cursor()

cur.execute('''
    CREATE TABLE IF NOT EXISTS erp.customers (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(200) NOT NULL,
        phone       VARCHAR(50),
        email       VARCHAR(200),
        address     TEXT,
        notes       TEXT,
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
    )
''')

# Add customer_id FK to sale_orders (nullable — backwards compatible)
cur.execute('''
    ALTER TABLE erp.sale_orders
    ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES erp.customers(id)
''')

# Backfill: one customer row per unique name
cur.execute('''
    INSERT INTO erp.customers (name, phone, created_at)
    SELECT DISTINCT ON (TRIM(customer_name))
        TRIM(customer_name), TRIM(customer_phone), MIN(created_at)
    FROM erp.sale_orders
    WHERE customer_name IS NOT NULL AND TRIM(customer_name) != ''
    GROUP BY TRIM(customer_name), TRIM(customer_phone)
    ORDER BY TRIM(customer_name)
    ON CONFLICT DO NOTHING
''')

# Link existing sale orders to their new customer rows
cur.execute('''
    UPDATE erp.sale_orders so
    SET customer_id = c.id
    FROM erp.customers c
    WHERE TRIM(so.customer_name) = c.name
      AND so.customer_id IS NULL
''')

conn.commit()
cur.execute('SELECT COUNT(*) FROM erp.customers')
n = cur.fetchone()[0]
cur.close()
conn.close()
print(f"Customer migration complete. {n} customer(s) in table.")
