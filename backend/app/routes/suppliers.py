from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.auth import get_current_user
from app.db import get_db
from app.schemas import SupplierView, CreateSupplierRequest, UpdateSupplierRequest

router = APIRouter()

# Actual DB columns: id, name, contact_name, email, phone, address, is_active, created_at
_SELECT = 'SELECT id, name, contact_name, email, phone, address, is_active, created_at FROM erp.suppliers'


def _row(row) -> SupplierView:
    return SupplierView(
        id=row[0], name=row[1], contact_person=row[2],
        email=row[3], phone=row[4], address=row[5],
        halal_certified=True,
        is_active=row[6],
        created_at=str(row[7])[:19] if row[7] else None,
    )


@router.get('', response_model=List[SupplierView])
def list_suppliers(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(_SELECT + ' ORDER BY name')
    return [_row(r) for r in cur.fetchall()]


@router.post('', response_model=SupplierView, status_code=201)
def create_supplier(payload: CreateSupplierRequest, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        'INSERT INTO erp.suppliers (name, contact_name, email, phone, address, is_active) '
        'VALUES (%s,%s,%s,%s,%s,%s) RETURNING id',
        (payload.name, payload.contact_person, payload.email,
         payload.phone, payload.address, payload.is_active),
    )
    new_id = cur.fetchone()[0]
    cur.execute(_SELECT + ' WHERE id = %s', (new_id,))
    return _row(cur.fetchone())


@router.put('/{supplier_id}', response_model=SupplierView)
def update_supplier(supplier_id: int, payload: UpdateSupplierRequest, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id FROM erp.suppliers WHERE id = %s', (supplier_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='Supplier not found')

    field_map = {
        'name': 'name',
        'contact_person': 'contact_name',
        'email': 'email',
        'phone': 'phone',
        'address': 'address',
        'is_active': 'is_active',
    }
    fields, values = [], []
    for attr, col in field_map.items():
        v = getattr(payload, attr)
        if v is not None:
            fields.append(f'{col} = %s')
            values.append(v)
    if not fields:
        cur.execute(_SELECT + ' WHERE id = %s', (supplier_id,))
        return _row(cur.fetchone())
    values.append(supplier_id)
    cur.execute(f'UPDATE erp.suppliers SET {", ".join(fields)} WHERE id = %s', values)
    cur.execute(_SELECT + ' WHERE id = %s', (supplier_id,))
    return _row(cur.fetchone())


@router.delete('/{supplier_id}', status_code=204)
def delete_supplier(supplier_id: int, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('DELETE FROM erp.suppliers WHERE id = %s RETURNING id', (supplier_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='Supplier not found')
