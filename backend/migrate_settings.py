"""Create erp.settings table for company-level configuration."""
import psycopg, os, sys
from dotenv import load_dotenv
load_dotenv()

db_url = os.getenv('DB_URL') or os.getenv('DATABASE_URL')
if not db_url:
    print("Set DB_URL environment variable.")
    sys.exit(1)

conn = psycopg.connect(db_url.replace('postgresql+psycopg://', 'postgresql://'))
cur  = conn.cursor()

cur.execute("""
CREATE TABLE IF NOT EXISTS erp.settings (
    key        VARCHAR(100) PRIMARY KEY,
    value      TEXT         NOT NULL DEFAULT '',
    updated_at TIMESTAMP    DEFAULT NOW()
)
""")

cur.execute("""
INSERT INTO erp.settings (key, value) VALUES
    ('company_name',     'Al Hazmi Meat Distribution'),
    ('company_logo_url', ''),
    ('company_phone',    ''),
    ('company_email',    ''),
    ('company_address',  ''),
    ('office_lat',       '25.269916'),
    ('office_lng',       '55.333817'),
    ('geofence_m',       '50')
ON CONFLICT (key) DO NOTHING
""")

conn.commit()
cur.close()
conn.close()
print("Settings migration complete.")
