import psycopg

conn = psycopg.connect("host=localhost dbname=meat_erp user=erp_user password=ErpUser@123", autocommit=True)
cur = conn.cursor()
try:
    cur.execute("ALTER TABLE erp.daily_distributions ADD COLUMN IF NOT EXISTS unit VARCHAR(10) DEFAULT 'kg'")
    print("unit column: OK")
    cur.execute("ALTER TABLE erp.daily_distributions ADD COLUMN IF NOT EXISTS returned_qty DECIMAL(10,2) DEFAULT 0")
    print("returned_qty column: OK")
    print("Migration complete!")
except Exception as e:
    print("Error:", e)
conn.close()
