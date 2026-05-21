"""Add VAT columns to invoices and apply 5% VAT to all existing records."""
import psycopg

conn = psycopg.connect("host=localhost dbname=meat_erp user=erp_user password=ErpUser@123")
cur = conn.cursor()

cur.execute('''
    ALTER TABLE erp.invoices
    ADD COLUMN IF NOT EXISTS subtotal    NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS vat_rate    NUMERIC(5,2)  NOT NULL DEFAULT 5.00,
    ADD COLUMN IF NOT EXISTS vat_amount  NUMERIC(14,2) NOT NULL DEFAULT 0
''')

# Backfill: existing total_amount was pre-VAT, add 5% on top
cur.execute('''
    UPDATE erp.invoices
    SET subtotal     = total_amount,
        vat_rate     = 5.00,
        vat_amount   = ROUND(total_amount * 0.05, 2),
        total_amount = total_amount + ROUND(total_amount * 0.05, 2)
    WHERE subtotal = 0
''')

conn.commit()
cur.close()
conn.close()
print("VAT migration complete.")
