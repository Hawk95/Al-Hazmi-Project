"""Add note and customer_ref columns to truck_trips for Fleet Data Log module."""
import psycopg, os, sys
from dotenv import load_dotenv
load_dotenv()

db_url = os.getenv('DB_URL') or os.getenv('DATABASE_URL')
if not db_url:
    print("Set DB_URL environment variable.")
    sys.exit(1)

conn = psycopg.connect(db_url.replace('postgresql+psycopg://', 'postgresql://'))
cur  = conn.cursor()

cur.execute("ALTER TABLE erp.truck_trips ADD COLUMN IF NOT EXISTS note TEXT")
cur.execute("ALTER TABLE erp.truck_trips ADD COLUMN IF NOT EXISTS customer_ref VARCHAR(200)")

conn.commit()
cur.close()
conn.close()
print("Fleet log migration complete — note + customer_ref added to truck_trips.")
