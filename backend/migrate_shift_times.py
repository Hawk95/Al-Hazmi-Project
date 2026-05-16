import psycopg

conn = psycopg.connect("host=localhost dbname=meat_erp user=erp_user password=ErpUser@123", autocommit=True)
cur = conn.cursor()
try:
    cur.execute("ALTER TABLE erp.employees ADD COLUMN IF NOT EXISTS shift_start TIME DEFAULT '09:00'")
    cur.execute("ALTER TABLE erp.employees ADD COLUMN IF NOT EXISTS shift_end   TIME DEFAULT '18:00'")
    print("shift_start and shift_end columns added OK")
except Exception as e:
    print("Error:", e)
conn.close()
