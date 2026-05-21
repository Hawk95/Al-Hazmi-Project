"""Create bills table for Accounts Payable and backfill from received POs."""
import psycopg

conn = psycopg.connect("host=localhost dbname=meat_erp user=erp_user password=ErpUser@123")
cur  = conn.cursor()

cur.execute('''
    CREATE TABLE IF NOT EXISTS erp.bills (
        id              SERIAL PRIMARY KEY,
        bill_number     VARCHAR(20) UNIQUE NOT NULL,
        po_id           INTEGER REFERENCES erp.purchase_orders(id),
        supplier_id     INTEGER,
        supplier_name   VARCHAR(200),
        subtotal        NUMERIC(14,2) NOT NULL DEFAULT 0,
        vat_rate        NUMERIC(5,2)  NOT NULL DEFAULT 5.00,
        vat_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
        total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
        paid_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
        status          VARCHAR(20)   NOT NULL DEFAULT 'issued',
        due_date        DATE,
        paid_at         TIMESTAMP,
        payment_method  VARCHAR(50),
        payment_notes   TEXT,
        created_at      TIMESTAMP DEFAULT NOW(),
        updated_at      TIMESTAMP DEFAULT NOW()
    )
''')

# Backfill: generate a bill for every already-received PO that doesn't have one
cur.execute('''
    SELECT po.id, po.supplier_id, po.supplier_name, po.created_at,
           COALESCE(SUM(poi.quantity * poi.unit_price), 0) AS subtotal
    FROM erp.purchase_orders po
    LEFT JOIN erp.purchase_order_items poi ON poi.po_id = po.id
    WHERE po.status = 'received'
      AND NOT EXISTS (SELECT 1 FROM erp.bills b WHERE b.po_id = po.id)
    GROUP BY po.id, po.supplier_id, po.supplier_name, po.created_at
    ORDER BY po.id
''')
pos = cur.fetchall()

for i, (po_id, sup_id, sup_name, created_at, subtotal) in enumerate(pos):
    subtotal    = float(subtotal)
    vat_amount  = round(subtotal * 0.05, 2)
    total       = subtotal + vat_amount
    bill_num    = f'BILL-{str(i+1).zfill(5)}'
    due_date    = None
    cur.execute('''
        INSERT INTO erp.bills
            (bill_number, po_id, supplier_id, supplier_name,
             subtotal, vat_rate, vat_amount, total_amount, due_date)
        VALUES (%s,%s,%s,%s,%s,5.00,%s,%s,%s)
        ON CONFLICT (bill_number) DO NOTHING
    ''', (bill_num, po_id, sup_id, sup_name, subtotal, vat_amount, total, due_date))

conn.commit()
cur.close()
conn.close()
print(f"AP migration complete. Backfilled {len(pos)} bill(s).")
