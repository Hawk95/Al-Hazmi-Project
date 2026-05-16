import psycopg

conn = psycopg.connect("host=localhost dbname=meat_erp user=erp_user password=ErpUser@123", autocommit=True)
cur = conn.cursor()
try:
    cur.execute("""
    CREATE TABLE IF NOT EXISTS erp.employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        department VARCHAR(50),
        position VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )
    """)
    print("employees table: OK")

    cur.execute("""
    CREATE TABLE IF NOT EXISTS erp.attendance (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES erp.employees(id) ON DELETE CASCADE,
        employee_name VARCHAR(100),
        attendance_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'present',
        check_in TIME,
        check_out TIME,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(employee_id, attendance_date)
    )
    """)
    print("attendance table: OK")
    print("Migration complete!")
except Exception as e:
    print("Error:", e)
conn.close()
