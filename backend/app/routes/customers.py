from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from app.auth import get_current_user
from app.db import get_db

router = APIRouter()


class CreateCustomerRequest(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class UpdateCustomerRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


def _customer_stats(cur, customer_id: int) -> dict:
    cur.execute('''
        SELECT
            COUNT(so.id)                         AS total_orders,
            COALESCE(SUM(so.total_amount), 0)    AS total_spent,
            COALESCE(SUM(inv.total_amount), 0)   AS total_invoiced,
            COALESCE(SUM(inv.paid_amount), 0)    AS total_paid,
            MAX(so.created_at)                   AS last_order_at
        FROM erp.sale_orders so
        LEFT JOIN erp.invoices inv ON inv.so_id = so.id AND inv.status != 'voided'
        WHERE so.customer_id = %s
    ''', (customer_id,))
    r = cur.fetchone()
    total_invoiced = float(r[2] or 0)
    total_paid     = float(r[3] or 0)
    return {
        'total_orders':    int(r[0] or 0),
        'total_spent':     float(r[1] or 0),
        'total_invoiced':  total_invoiced,
        'total_paid':      total_paid,
        'outstanding':     round(total_invoiced - total_paid, 2),
        'last_order_at':   str(r[4])[:19] if r[4] else None,
    }


@router.get('/customers')
def list_customers(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('''
        SELECT id, name, phone, email, address, notes, is_active, created_at
        FROM erp.customers
        WHERE is_active = TRUE
        ORDER BY name
    ''')
    rows = cur.fetchall()
    result = []
    for r in rows:
        cid = r[0]
        stats = _customer_stats(cur, cid)
        result.append({
            'id': cid, 'name': r[1], 'phone': r[2], 'email': r[3],
            'address': r[4], 'notes': r[5], 'is_active': r[6],
            'created_at': str(r[7])[:19] if r[7] else None,
            **stats,
        })
    return result


@router.get('/customers/summary')
def customer_summary(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute("SELECT COUNT(*) FROM erp.customers WHERE is_active=TRUE")
    total_customers = cur.fetchone()[0]

    from datetime import date, timedelta
    first_of_month = date.today().replace(day=1)
    cur.execute("SELECT COUNT(*) FROM erp.customers WHERE created_at >= %s", (first_of_month,))
    new_this_month = cur.fetchone()[0]

    cur.execute('''
        SELECT
            COALESCE(SUM(inv.total_amount), 0),
            COALESCE(SUM(inv.paid_amount), 0)
        FROM erp.invoices inv
        WHERE inv.status != 'voided'
    ''')
    r = cur.fetchone()
    total_invoiced = float(r[0] or 0)
    total_paid     = float(r[1] or 0)

    return {
        'total_customers': total_customers,
        'new_this_month':  new_this_month,
        'total_revenue':   round(total_invoiced, 2),
        'total_paid':      round(total_paid, 2),
        'outstanding':     round(total_invoiced - total_paid, 2),
    }


@router.get('/customers/{customer_id}')
def get_customer(customer_id: int, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('''
        SELECT id, name, phone, email, address, notes, is_active, created_at
        FROM erp.customers WHERE id = %s
    ''', (customer_id,))
    r = cur.fetchone()
    if not r:
        raise HTTPException(status_code=404, detail='Customer not found')

    stats = _customer_stats(cur, customer_id)

    # Fetch orders with invoice info
    cur.execute('''
        SELECT so.id, so.so_number, so.status, so.total_amount, so.created_at,
               inv.id, inv.invoice_number, inv.status, inv.total_amount, inv.paid_amount, inv.effective_status
        FROM erp.sale_orders so
        LEFT JOIN erp.invoices inv ON inv.so_id = so.id AND inv.status != 'voided'
        WHERE so.customer_id = %s
        ORDER BY so.created_at DESC
    ''', (customer_id,))

    # effective_status not a real column — compute it here
    cur2 = db.cursor()
    orders = []
    for row in cur.fetchall():
        inv_eff = None
        if row[5]:
            cur2.execute(
                'SELECT status, due_date, paid_amount, total_amount FROM erp.invoices WHERE id=%s', (row[5],)
            )
            inv_row = cur2.fetchone()
            if inv_row:
                from datetime import date
                s, due, paid, tot = inv_row
                paid_f = float(paid or 0)
                tot_f  = float(tot or 0)
                if s == 'paid':    inv_eff = 'paid'
                elif s == 'voided': inv_eff = 'voided'
                elif s == 'draft':  inv_eff = 'draft'
                elif due and due < date.today(): inv_eff = 'overdue'
                else: inv_eff = 'issued'
        orders.append({
            'so_id':          row[0],
            'so_number':      row[1],
            'so_status':      row[2],
            'so_amount':      float(row[3] or 0),
            'so_date':        str(row[4])[:19] if row[4] else None,
            'inv_id':         row[5],
            'inv_number':     row[6],
            'inv_status':     row[7],
            'inv_amount':     float(row[8] or 0) if row[8] else 0,
            'inv_paid':       float(row[9] or 0) if row[9] else 0,
            'inv_eff_status': inv_eff,
        })

    return {
        'id': r[0], 'name': r[1], 'phone': r[2], 'email': r[3],
        'address': r[4], 'notes': r[5], 'is_active': r[6],
        'created_at': str(r[7])[:19] if r[7] else None,
        **stats,
        'orders': orders,
    }


@router.post('/customers', status_code=201)
def create_customer(payload: CreateCustomerRequest, _=Depends(get_current_user), db=Depends(get_db)):
    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=400, detail='Name is required')
    cur = db.cursor()
    cur.execute('''
        INSERT INTO erp.customers (name, phone, email, address, notes)
        VALUES (%s, %s, %s, %s, %s) RETURNING id
    ''', (payload.name.strip(), payload.phone, payload.email, payload.address, payload.notes))
    cid = cur.fetchone()[0]
    db.commit()
    return get_customer(cid, _, db)


@router.put('/customers/{customer_id}')
def update_customer(customer_id: int, payload: UpdateCustomerRequest, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id FROM erp.customers WHERE id=%s', (customer_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='Customer not found')
    updates = {}
    if payload.name is not None:
        if not payload.name.strip():
            raise HTTPException(status_code=400, detail='Name cannot be empty')
        updates['name'] = payload.name.strip()
    if payload.phone   is not None: updates['phone']   = payload.phone
    if payload.email   is not None: updates['email']   = payload.email
    if payload.address is not None: updates['address'] = payload.address
    if payload.notes   is not None: updates['notes']   = payload.notes
    if updates:
        set_clause = ', '.join(f'{k}=%s' for k in updates)
        cur.execute(f'UPDATE erp.customers SET {set_clause}, updated_at=NOW() WHERE id=%s',
                    list(updates.values()) + [customer_id])
        db.commit()
    return get_customer(customer_id, _, db)


@router.delete('/customers/{customer_id}')
def delete_customer(customer_id: int, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id FROM erp.customers WHERE id=%s', (customer_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='Customer not found')
    cur.execute('UPDATE erp.customers SET is_active=FALSE, updated_at=NOW() WHERE id=%s', (customer_id,))
    db.commit()
    return {'status': 'deleted', 'id': customer_id}
