import psycopg

conn = psycopg.connect("host=localhost dbname=meat_erp user=erp_user password=ErpUser@123", autocommit=True)
cur = conn.cursor()
try:
    cur.execute("ALTER TABLE erp.employees ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(8,2) DEFAULT 0")
    print("hourly_rate column added OK")
except Exception as e:
    print("Error:", e)
conn.close()
