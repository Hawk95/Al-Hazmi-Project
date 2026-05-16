import psycopg

conn = psycopg.connect("host=localhost dbname=meat_erp user=erp_user password=ErpUser@123", autocommit=True)
cur = conn.cursor()
try:
    cur.execute("ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS hr_access BOOLEAN DEFAULT FALSE")
    print("hr_access column: OK")
    print("Migration complete!")
except Exception as e:
    print("Error:", e)
conn.close()
