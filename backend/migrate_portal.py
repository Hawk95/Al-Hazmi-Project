import psycopg

conn = psycopg.connect("host=127.0.0.1 dbname=meat_erp user=erp_user password=ErpUser@123")
cur = conn.cursor()

steps = [
    # employees — 4-digit portal PIN
    ("ADD portal_pin to employees",
     "ALTER TABLE erp.employees ADD COLUMN portal_pin VARCHAR(4)"),

    # attendance — method + GPS columns
    ("ADD check_in_method to attendance",
     "ALTER TABLE erp.attendance ADD COLUMN check_in_method VARCHAR(10) DEFAULT 'manual'"),
    ("ADD check_in_lat to attendance",
     "ALTER TABLE erp.attendance ADD COLUMN check_in_lat NUMERIC(10,6)"),
    ("ADD check_in_lng to attendance",
     "ALTER TABLE erp.attendance ADD COLUMN check_in_lng NUMERIC(10,6)"),
    ("ADD check_out_method to attendance",
     "ALTER TABLE erp.attendance ADD COLUMN check_out_method VARCHAR(10) DEFAULT 'manual'"),
    ("ADD check_out_lat to attendance",
     "ALTER TABLE erp.attendance ADD COLUMN check_out_lat NUMERIC(10,6)"),
    ("ADD check_out_lng to attendance",
     "ALTER TABLE erp.attendance ADD COLUMN check_out_lng NUMERIC(10,6)"),
]

for label, sql in steps:
    try:
        cur.execute(sql)
        conn.commit()
        print(f"OK   {label}")
    except Exception as e:
        conn.rollback()
        print(f"SKIP {label}: {e}")

conn.close()
print("\nMigration complete.")
