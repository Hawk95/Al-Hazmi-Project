import psycopg

conn = psycopg.connect("host=localhost dbname=meat_erp user=erp_user password=ErpUser@123", autocommit=True)
cur = conn.cursor()
try:
    cur.execute("""
        CREATE TABLE IF NOT EXISTS erp.salesmen (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            phone VARCHAR(50),
            email VARCHAR(200),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    print("salesmen table: OK")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS erp.daily_distributions (
            id SERIAL PRIMARY KEY,
            salesman_id INTEGER REFERENCES erp.salesmen(id) ON DELETE SET NULL,
            salesman_name VARCHAR(200),
            distribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
            emirate VARCHAR(100) NOT NULL,
            meat_type VARCHAR(100) NOT NULL DEFAULT 'Lamb',
            quantity_kg DECIMAL(10,2) NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """)
    print("daily_distributions table: OK")
    print("All tables created successfully!")
except Exception as e:
    print("Error:", e)
conn.close()
