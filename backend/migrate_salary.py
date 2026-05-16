import psycopg

conn = psycopg.connect("host=localhost dbname=meat_erp user=erp_user password=ErpUser@123", autocommit=True)
cur = conn.cursor()
try:
    cur.execute("ALTER TABLE erp.employees ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(10,2) DEFAULT 0")
    print("monthly_salary column added OK")
except Exception as e:
    print("Error:", e)
conn.close()
