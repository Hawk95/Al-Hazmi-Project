from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from app.auth import get_current_user
from app.db import get_db

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class POItemIn(BaseModel):
    product_id: int
    product_name: str
    quantity: float
    unit_price: float = 0

class CreatePORequest(BaseModel):
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    notes: Optional[str] = None
    expected_date: Optional[str] = None
    items: List[POItemIn]

class SOItemIn(BaseModel):
    product_id: int
    product_name: str
    quantity: float
    unit_price: float = 0

class CreateSORequest(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = None
    notes: Optional[str] = None
    items: List[SOItemIn]

class GRNItemIn(BaseModel):
    product_id: int
    product_name: str
    expected_qty: float
    received_qty: float

class ConfirmGRNRequest(BaseModel):
    items: List[GRNItemIn]

class RejectDeliveryRequest(BaseModel):
    reason: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _next_num(cur, table: str, prefix: str, col: str = 'id') -> str:
    cur.execute(f'SELECT COUNT(*) FROM erp.{table}')
    n = cur.fetchone()[0] + 1
    return f'{prefix}-{str(n).zfill(5)}'

def _po_full(cur, po_id: int) -> dict:
    cur.execute(
        'SELECT id,po_number,supplier_id,supplier_name,status,notes,expected_date,created_at,updated_at '
        'FROM erp.purchase_orders WHERE id=%s', (po_id,)
    )
    r = cur.fetchone()
    if not r:
        return None
    cur.execute(
        'SELECT id,product_id,product_name,quantity,unit_price FROM erp.purchase_order_items WHERE po_id=%s ORDER BY id',
        (po_id,)
    )
    items = [{'id': i[0], 'product_id': i[1], 'product_name': i[2], 'quantity': float(i[3]), 'unit_price': float(i[4])} for i in cur.fetchall()]
    return {
        'id': r[0], 'po_number': r[1], 'supplier_id': r[2], 'supplier_name': r[3],
        'status': r[4], 'notes': r[5],
        'expected_date': str(r[6]) if r[6] else None,
        'created_at': str(r[7])[:19] if r[7] else None,
        'updated_at': str(r[8])[:19] if r[8] else None,
        'items': items,
    }

def _so_full(cur, so_id: int) -> dict:
    cur.execute(
        'SELECT id,so_number,customer_name,customer_phone,status,total_amount,notes,created_at,updated_at '
        'FROM erp.sale_orders WHERE id=%s', (so_id,)
    )
    r = cur.fetchone()
    if not r:
        return None
    cur.execute(
        'SELECT id,product_id,product_name,quantity,unit_price,total_price FROM erp.sale_order_items WHERE so_id=%s ORDER BY id',
        (so_id,)
    )
    items = [{'id': i[0], 'product_id': i[1], 'product_name': i[2], 'quantity': float(i[3]), 'unit_price': float(i[4]), 'total_price': float(i[5])} for i in cur.fetchall()]
    # Attach invoice if any
    cur.execute('SELECT id,invoice_number,status,total_amount FROM erp.invoices WHERE so_id=%s LIMIT 1', (so_id,))
    inv = cur.fetchone()
    invoice = {'id': inv[0], 'invoice_number': inv[1], 'status': inv[2], 'total_amount': float(inv[3])} if inv else None
    # Attach return entry if any
    cur.execute('SELECT id,re_number,status,rejection_reason FROM erp.return_entries WHERE so_id=%s LIMIT 1', (so_id,))
    ret = cur.fetchone()
    ret_entry = {'id': ret[0], 're_number': ret[1], 'status': ret[2], 'rejection_reason': ret[3]} if ret else None
    return {
        'id': r[0], 'so_number': r[1], 'customer_name': r[2], 'customer_phone': r[3],
        'status': r[4], 'total_amount': float(r[5] or 0), 'notes': r[6],
        'created_at': str(r[7])[:19] if r[7] else None,
        'updated_at': str(r[8])[:19] if r[8] else None,
        'items': items, 'invoice': invoice, 'return_entry': ret_entry,
    }


# ── Purchase Orders ───────────────────────────────────────────────────────────

@router.get('/purchase-orders')
def list_pos(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id FROM erp.purchase_orders ORDER BY created_at DESC')
    return [_po_full(cur, r[0]) for r in cur.fetchall()]


@router.post('/purchase-orders', status_code=201)
def create_po(payload: CreatePORequest, _=Depends(get_current_user), db=Depends(get_db)):
    if not payload.items:
        raise HTTPException(status_code=400, detail='At least one item required')
    cur = db.cursor()
    po_num = _next_num(cur, 'purchase_orders', 'PO')
    cur.execute(
        'INSERT INTO erp.purchase_orders (po_number,supplier_id,supplier_name,notes,expected_date) VALUES (%s,%s,%s,%s,%s) RETURNING id',
        (po_num, payload.supplier_id, payload.supplier_name, payload.notes, payload.expected_date)
    )
    po_id = cur.fetchone()[0]
    for it in payload.items:
        cur.execute(
            'INSERT INTO erp.purchase_order_items (po_id,product_id,product_name,quantity,unit_price) VALUES (%s,%s,%s,%s,%s)',
            (po_id, it.product_id, it.product_name, it.quantity, it.unit_price)
        )
    return _po_full(cur, po_id)


@router.put('/purchase-orders/{po_id}/approve')
def approve_po(po_id: int, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT status FROM erp.purchase_orders WHERE id=%s', (po_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='PO not found')
    if row[0] != 'draft':
        raise HTTPException(status_code=400, detail=f'PO is already {row[0]}')
    cur.execute('UPDATE erp.purchase_orders SET status=%s, updated_at=NOW() WHERE id=%s', ('approved', po_id))
    cur.execute('SELECT product_id, quantity FROM erp.purchase_order_items WHERE po_id=%s', (po_id,))
    for pid, qty in cur.fetchall():
        cur.execute('UPDATE erp.products SET stock_expected = stock_expected + %s WHERE id=%s', (qty, pid))
    return _po_full(cur, po_id)


@router.put('/purchase-orders/{po_id}/transit')
def transit_po(po_id: int, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT status FROM erp.purchase_orders WHERE id=%s', (po_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='PO not found')
    if row[0] != 'approved':
        raise HTTPException(status_code=400, detail='PO must be approved first')
    cur.execute('UPDATE erp.purchase_orders SET status=%s, updated_at=NOW() WHERE id=%s', ('in_transit', po_id))
    return _po_full(cur, po_id)


@router.post('/purchase-orders/{po_id}/receive')
def receive_po(po_id: int, payload: ConfirmGRNRequest, _=Depends(get_current_user), db=Depends(get_db)):
    """Confirm GRN: add received qty to Available, remove from Expected, mark PO Received."""
    cur = db.cursor()
    cur.execute('SELECT status FROM erp.purchase_orders WHERE id=%s', (po_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='PO not found')
    if row[0] not in ('approved', 'in_transit'):
        raise HTTPException(status_code=400, detail='PO must be approved or in transit to receive')
    for it in payload.items:
        cur.execute(
            'UPDATE erp.products SET quantity_kg = quantity_kg + %s, stock_expected = GREATEST(0, stock_expected - %s) WHERE id=%s',
            (it.received_qty, it.expected_qty, it.product_id)
        )
    cur.execute('UPDATE erp.purchase_orders SET status=%s, updated_at=NOW() WHERE id=%s', ('received', po_id))
    return _po_full(cur, po_id)


# ── Sale Orders ───────────────────────────────────────────────────────────────

@router.get('/sale-orders')
def list_sos(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id FROM erp.sale_orders ORDER BY created_at DESC')
    return [_so_full(cur, r[0]) for r in cur.fetchall()]


@router.post('/sale-orders', status_code=201)
def create_so(payload: CreateSORequest, _=Depends(get_current_user), db=Depends(get_db)):
    if not payload.items:
        raise HTTPException(status_code=400, detail='At least one item required')
    cur = db.cursor()
    so_num = _next_num(cur, 'sale_orders', 'SO')
    total = sum(it.quantity * it.unit_price for it in payload.items)
    cur.execute(
        'INSERT INTO erp.sale_orders (so_number,customer_name,customer_phone,total_amount,notes) VALUES (%s,%s,%s,%s,%s) RETURNING id',
        (so_num, payload.customer_name, payload.customer_phone, total, payload.notes)
    )
    so_id = cur.fetchone()[0]
    for it in payload.items:
        cur.execute(
            'INSERT INTO erp.sale_order_items (so_id,product_id,product_name,quantity,unit_price,total_price) VALUES (%s,%s,%s,%s,%s,%s)',
            (so_id, it.product_id, it.product_name, it.quantity, it.unit_price, round(it.quantity * it.unit_price, 2))
        )
    return _so_full(cur, so_id)


@router.put('/sale-orders/{so_id}/approve')
def approve_so(so_id: int, _=Depends(get_current_user), db=Depends(get_db)):
    """Approve SO: reserve stock + generate draft invoice."""
    cur = db.cursor()
    cur.execute('SELECT status, total_amount FROM erp.sale_orders WHERE id=%s', (so_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='SO not found')
    if row[0] != 'draft':
        raise HTTPException(status_code=400, detail=f'SO is already {row[0]}')
    total = float(row[1] or 0)
    cur.execute('SELECT product_id, product_name, quantity FROM erp.sale_order_items WHERE so_id=%s', (so_id,))
    items = cur.fetchall()
    # Check available stock for each item
    for pid, pname, qty in items:
        cur.execute('SELECT quantity_kg FROM erp.products WHERE id=%s', (pid,))
        stock = cur.fetchone()
        if not stock or float(stock[0]) < float(qty):
            avail = float(stock[0]) if stock else 0
            raise HTTPException(status_code=400, detail=f'Insufficient stock for {pname}: need {qty} kg, available {avail:.2f} kg')
    # Reserve stock
    for pid, _, qty in items:
        cur.execute(
            'UPDATE erp.products SET quantity_kg = quantity_kg - %s, stock_reserved = stock_reserved + %s WHERE id=%s',
            (qty, qty, pid)
        )
    cur.execute('UPDATE erp.sale_orders SET status=%s, updated_at=NOW() WHERE id=%s', ('approved', so_id))
    # Generate draft invoice
    inv_num = _next_num(cur, 'invoices', 'INV')
    cur.execute(
        'INSERT INTO erp.invoices (invoice_number, so_id, status, total_amount) VALUES (%s,%s,%s,%s)',
        (inv_num, so_id, 'draft', total)
    )
    return _so_full(cur, so_id)


@router.put('/sale-orders/{so_id}/dispatch')
def dispatch_so(so_id: int, _=Depends(get_current_user), db=Depends(get_db)):
    """Mark Out for Delivery: reserved → dispatched."""
    cur = db.cursor()
    cur.execute('SELECT status FROM erp.sale_orders WHERE id=%s', (so_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='SO not found')
    if row[0] != 'approved':
        raise HTTPException(status_code=400, detail='SO must be approved to dispatch')
    cur.execute('SELECT product_id, quantity FROM erp.sale_order_items WHERE so_id=%s', (so_id,))
    for pid, qty in cur.fetchall():
        cur.execute(
            'UPDATE erp.products SET stock_reserved = GREATEST(0, stock_reserved - %s), stock_dispatched = stock_dispatched + %s WHERE id=%s',
            (qty, qty, pid)
        )
    cur.execute('UPDATE erp.sale_orders SET status=%s, updated_at=NOW() WHERE id=%s', ('out_for_delivery', so_id))
    return _so_full(cur, so_id)


@router.put('/sale-orders/{so_id}/deliver')
def deliver_so(so_id: int, _=Depends(get_current_user), db=Depends(get_db)):
    """Mark Delivered: clear dispatched stock, issue invoice."""
    cur = db.cursor()
    cur.execute('SELECT status FROM erp.sale_orders WHERE id=%s', (so_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='SO not found')
    if row[0] != 'out_for_delivery':
        raise HTTPException(status_code=400, detail='SO must be out for delivery to mark delivered')
    cur.execute('SELECT product_id, quantity FROM erp.sale_order_items WHERE so_id=%s', (so_id,))
    for pid, qty in cur.fetchall():
        cur.execute('UPDATE erp.products SET stock_dispatched = GREATEST(0, stock_dispatched - %s) WHERE id=%s', (qty, pid))
    cur.execute('UPDATE erp.sale_orders SET status=%s, updated_at=NOW() WHERE id=%s', ('delivered', so_id))
    cur.execute("UPDATE erp.invoices SET status='issued' WHERE so_id=%s", (so_id,))
    return _so_full(cur, so_id)


@router.put('/sale-orders/{so_id}/reject')
def reject_so(so_id: int, payload: RejectDeliveryRequest, _=Depends(get_current_user), db=Depends(get_db)):
    """Driver rejected: return entry + credit note + SO → returned."""
    cur = db.cursor()
    cur.execute('SELECT status, total_amount FROM erp.sale_orders WHERE id=%s', (so_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='SO not found')
    if row[0] != 'out_for_delivery':
        raise HTTPException(status_code=400, detail='SO must be out for delivery to reject')
    total = float(row[1] or 0)
    cur.execute('SELECT product_id, quantity FROM erp.sale_order_items WHERE so_id=%s', (so_id,))
    items = cur.fetchall()
    # Clear dispatched
    for pid, qty in items:
        cur.execute('UPDATE erp.products SET stock_dispatched = GREATEST(0, stock_dispatched - %s) WHERE id=%s', (qty, pid))
    cur.execute('UPDATE erp.sale_orders SET status=%s, updated_at=NOW() WHERE id=%s', ('returned', so_id))
    # Credit note
    cur.execute('SELECT id FROM erp.invoices WHERE so_id=%s LIMIT 1', (so_id,))
    inv = cur.fetchone()
    inv_id = inv[0] if inv else None
    cn_num = _next_num(cur, 'credit_notes', 'CN')
    cur.execute(
        'INSERT INTO erp.credit_notes (cn_number, invoice_id, so_id, reason, total_amount) VALUES (%s,%s,%s,%s,%s) RETURNING id',
        (cn_num, inv_id, so_id, payload.reason, total)
    )
    cn_id = cur.fetchone()[0]
    if inv_id:
        cur.execute("UPDATE erp.invoices SET status='voided' WHERE id=%s", (inv_id,))
    # Return entry
    re_num = _next_num(cur, 'return_entries', 'RE')
    cur.execute(
        'INSERT INTO erp.return_entries (re_number, so_id, credit_note_id, rejection_reason, status) VALUES (%s,%s,%s,%s,%s) RETURNING id',
        (re_num, so_id, cn_id, payload.reason, 'pending')
    )
    re_id = cur.fetchone()[0]
    cur.execute('SELECT product_id, product_name, quantity FROM erp.sale_order_items WHERE so_id=%s', (so_id,))
    for pid, pname, qty in cur.fetchall():
        cur.execute(
            'INSERT INTO erp.return_entry_items (re_id, product_id, product_name, quantity) VALUES (%s,%s,%s,%s)',
            (re_id, pid, pname, qty)
        )
    return _so_full(cur, so_id)


# ── Return Entries ────────────────────────────────────────────────────────────

@router.get('/returns')
def list_returns(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('''
        SELECT re.id, re.re_number, re.so_id, so.so_number, so.customer_name,
               re.rejection_reason, re.status, re.created_at, re.confirmed_at
        FROM erp.return_entries re
        JOIN erp.sale_orders so ON so.id = re.so_id
        ORDER BY re.created_at DESC
    ''')
    rows = cur.fetchall()
    result = []
    for r in rows:
        cur.execute('SELECT product_id, product_name, quantity FROM erp.return_entry_items WHERE re_id=%s', (r[0],))
        items = [{'product_id': i[0], 'product_name': i[1], 'quantity': float(i[2])} for i in cur.fetchall()]
        result.append({
            'id': r[0], 're_number': r[1], 'so_id': r[2], 'so_number': r[3],
            'customer_name': r[4], 'rejection_reason': r[5], 'status': r[6],
            'created_at': str(r[7])[:19] if r[7] else None,
            'confirmed_at': str(r[8])[:19] if r[8] else None,
            'items': items,
        })
    return result


@router.put('/returns/{re_id}/confirm')
def confirm_return(re_id: int, _=Depends(get_current_user), db=Depends(get_db)):
    """Physical stock received back — move to Available."""
    cur = db.cursor()
    cur.execute('SELECT status FROM erp.return_entries WHERE id=%s', (re_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='Return entry not found')
    if row[0] != 'pending':
        raise HTTPException(status_code=400, detail='Return already confirmed')
    cur.execute('SELECT product_id, quantity FROM erp.return_entry_items WHERE re_id=%s', (re_id,))
    for pid, qty in cur.fetchall():
        cur.execute('UPDATE erp.products SET quantity_kg = quantity_kg + %s WHERE id=%s', (qty, pid))
    cur.execute("UPDATE erp.return_entries SET status='received', confirmed_at=NOW() WHERE id=%s", (re_id,))
    return {'status': 'received', 'id': re_id}


# ── Invoices ──────────────────────────────────────────────────────────────────

@router.get('/invoices')
def list_invoices(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('''
        SELECT inv.id, inv.invoice_number, inv.so_id, so.so_number, so.customer_name,
               inv.status, inv.total_amount, inv.created_at
        FROM erp.invoices inv
        JOIN erp.sale_orders so ON so.id = inv.so_id
        ORDER BY inv.created_at DESC
    ''')
    return [
        {'id': r[0], 'invoice_number': r[1], 'so_id': r[2], 'so_number': r[3],
         'customer_name': r[4], 'status': r[5], 'total_amount': float(r[6] or 0),
         'created_at': str(r[7])[:19] if r[7] else None}
        for r in cur.fetchall()
    ]


# ── Stock Summary ─────────────────────────────────────────────────────────────

@router.get('/summary')
def stock_summary(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('''
        SELECT id, name, category, quantity_kg, stock_expected, stock_reserved, stock_dispatched,
               min_stock_kg, price_per_kg
        FROM erp.products WHERE is_active=TRUE ORDER BY name
    ''')
    return [
        {
            'id': r[0], 'name': r[1], 'category': r[2],
            'available': float(r[3] or 0),
            'expected': float(r[4] or 0),
            'reserved': float(r[5] or 0),
            'dispatched': float(r[6] or 0),
            'min_stock': float(r[7] or 0),
            'price_per_kg': float(r[8] or 0),
        }
        for r in cur.fetchall()
    ]
