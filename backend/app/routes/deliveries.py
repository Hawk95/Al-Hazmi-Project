from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.auth import get_current_user
from app.db import get_db
from app.schemas import DeliveryView, CreateDeliveryRequest, UpdateDeliveryRequest

router = APIRouter()

# Actual DB columns: id, order_id, driver_name, vehicle_number, status, scheduled_at, delivered_at, created_at
_SELECT = (
    'SELECT d.id, d.order_id, o.order_number, d.driver_name, d.vehicle_number, '
    'd.scheduled_at, d.status, d.created_at '
    'FROM erp.deliveries d LEFT JOIN erp.orders o ON d.order_id = o.id'
)


def _row(row) -> DeliveryView:
    return DeliveryView(
        id=row[0], order_id=row[1], order_number=row[2],
        driver_name=row[3], vehicle=row[4],
        scheduled_time=str(row[5])[:16] if row[5] else None,
        delivery_address=None,
        status=row[6], notes=None,
        created_at=str(row[7])[:19] if row[7] else None,
    )


@router.get('', response_model=List[DeliveryView])
def list_deliveries(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(_SELECT + ' ORDER BY d.created_at DESC')
    return [_row(r) for r in cur.fetchall()]


@router.post('', response_model=DeliveryView, status_code=201)
def create_delivery(payload: CreateDeliveryRequest, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        'INSERT INTO erp.deliveries (order_id, driver_name, vehicle_number, scheduled_at) '
        'VALUES (%s,%s,%s,%s) RETURNING id',
        (payload.order_id, payload.driver_name, payload.vehicle, payload.scheduled_time),
    )
    new_id = cur.fetchone()[0]
    cur.execute(_SELECT + ' WHERE d.id = %s', (new_id,))
    return _row(cur.fetchone())


@router.put('/{delivery_id}', response_model=DeliveryView)
def update_delivery(delivery_id: int, payload: UpdateDeliveryRequest, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id FROM erp.deliveries WHERE id = %s', (delivery_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='Delivery not found')

    field_map = {
        'driver_name': 'driver_name',
        'vehicle': 'vehicle_number',
        'scheduled_time': 'scheduled_at',
        'status': 'status',
    }
    fields, values = [], []
    for attr, col in field_map.items():
        v = getattr(payload, attr)
        if v is not None:
            fields.append(f'{col} = %s')
            values.append(v)
    if not fields:
        cur.execute(_SELECT + ' WHERE d.id = %s', (delivery_id,))
        return _row(cur.fetchone())
    values.append(delivery_id)
    cur.execute(f'UPDATE erp.deliveries SET {", ".join(fields)} WHERE id = %s', values)
    cur.execute(_SELECT + ' WHERE d.id = %s', (delivery_id,))
    return _row(cur.fetchone())


@router.delete('/{delivery_id}', status_code=204)
def delete_delivery(delivery_id: int, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('DELETE FROM erp.deliveries WHERE id = %s RETURNING id', (delivery_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='Delivery not found')
