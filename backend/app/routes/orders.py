from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.auth import get_current_user
from app.db import get_db
from app.schemas import OrderView, OrderItemView, CreateOrderRequest, UpdateOrderRequest

router = APIRouter()

# Actual DB columns: id, order_number, customer_name, status, total_amount, notes, created_at, updated_at
# customer_phone and customer_address do not exist in DB — stored in notes if provided


def _fetch_order(order_id: int, db) -> OrderView | None:
    cur = db.cursor()
    cur.execute(
        'SELECT id, order_number, customer_name, status, total_amount, notes, created_at, updated_at '
        'FROM erp.orders WHERE id = %s',
        (order_id,),
    )
    row = cur.fetchone()
    if not row:
        return None
    cur.execute(
        'SELECT id, product_id, product_name, quantity, unit_price, total_price '
        'FROM erp.order_items WHERE order_id = %s ORDER BY id',
        (order_id,),
    )
    items = [
        OrderItemView(
            id=r[0], product_id=r[1], product_name=r[2],
            quantity=float(r[3]), unit_price=float(r[4]), total_price=float(r[5]),
        )
        for r in cur.fetchall()
    ]
    return OrderView(
        id=row[0], order_number=row[1], customer_name=row[2],
        customer_phone=None, customer_address=None,
        status=row[3], total_amount=float(row[4] or 0),
        notes=row[5],
        created_at=str(row[6])[:19] if row[6] else None,
        updated_at=str(row[7])[:19] if row[7] else None,
        items=items,
    )


def _gen_order_number(db) -> str:
    cur = db.cursor()
    cur.execute('SELECT COUNT(*) FROM erp.orders')
    n = cur.fetchone()[0]
    return f'ORD-{str(n + 1).zfill(5)}'


@router.get('', response_model=List[OrderView])
def list_orders(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id FROM erp.orders ORDER BY created_at DESC')
    return [o for o in (_fetch_order(r[0], db) for r in cur.fetchall()) if o]


@router.post('', response_model=OrderView, status_code=201)
def create_order(payload: CreateOrderRequest, _=Depends(get_current_user), db=Depends(get_db)):
    order_number = _gen_order_number(db)
    total = sum(item.quantity * item.unit_price for item in payload.items)
    cur = db.cursor()
    cur.execute(
        'INSERT INTO erp.orders (order_number, customer_name, total_amount, notes) '
        'VALUES (%s,%s,%s,%s) RETURNING id',
        (order_number, payload.customer_name, total, payload.notes),
    )
    order_id = cur.fetchone()[0]
    for item in payload.items:
        cur.execute(
            'INSERT INTO erp.order_items (order_id, product_id, product_name, quantity, unit_price, total_price) '
            'VALUES (%s,%s,%s,%s,%s,%s)',
            (order_id, item.product_id, item.product_name,
             item.quantity, item.unit_price, round(item.quantity * item.unit_price, 2)),
        )
    return _fetch_order(order_id, db)


@router.get('/{order_id}', response_model=OrderView)
def get_order(order_id: int, _=Depends(get_current_user), db=Depends(get_db)):
    order = _fetch_order(order_id, db)
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    return order


@router.put('/{order_id}', response_model=OrderView)
def update_order(order_id: int, payload: UpdateOrderRequest, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id FROM erp.orders WHERE id = %s', (order_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='Order not found')
    fields, values = ['updated_at = NOW()'], []
    for f in ['customer_name', 'status', 'notes']:
        v = getattr(payload, f)
        if v is not None:
            fields.append(f'{f} = %s')
            values.append(v)
    values.append(order_id)
    cur.execute(f'UPDATE erp.orders SET {", ".join(fields)} WHERE id = %s', values)
    return _fetch_order(order_id, db)


@router.delete('/{order_id}', status_code=204)
def delete_order(order_id: int, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id FROM erp.orders WHERE id = %s', (order_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='Order not found')
    cur.execute('DELETE FROM erp.deliveries WHERE order_id = %s', (order_id,))
    cur.execute('DELETE FROM erp.order_items WHERE order_id = %s', (order_id,))
    cur.execute('DELETE FROM erp.orders WHERE id = %s', (order_id,))
