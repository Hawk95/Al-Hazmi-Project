import psycopg

conn_str = "host=localhost dbname=meat_erp user=erp_user password=ErpUser@123"

with psycopg.connect(conn_str) as conn:
    with conn.cursor() as cur:
        cur.execute("""
            ALTER TABLE erp.invoices
            ADD COLUMN IF NOT EXISTS due_date        DATE,
            ADD COLUMN IF NOT EXISTS paid_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS paid_at         TIMESTAMP,
            ADD COLUMN IF NOT EXISTS payment_method  VARCHAR(50),
            ADD COLUMN IF NOT EXISTS payment_notes   TEXT,
            ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMP DEFAULT NOW()
        """)
        # Back-fill due_date = 30 days from creation for existing invoices
        cur.execute("""
            UPDATE erp.invoices
            SET due_date = (created_at::date + INTERVAL '30 days')::date
            WHERE due_date IS NULL
        """)
        print("Migration complete — payment columns added to erp.invoices")
