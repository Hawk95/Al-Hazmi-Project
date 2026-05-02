from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.auth import get_current_user
from app.db import get_db
from app.schemas import ProductView, CreateProductRequest, UpdateProductRequest, StockAdjustRequest

router = APIRouter()

# Actual DB columns: id, name, category, quantity_kg, min_stock_kg, price_per_kg, is_active, created_at
_SELECT = (
    'SELECT id, name, category, price_per_kg, quantity_kg, min_stock_kg, is_active, created_at '
    'FROM erp.products'
)


def _row(row) -> ProductView:
    return ProductView(
        id=row[0], name=row[1], category=row[2],
        unit='kg',
        price_per_unit=float(row[3]),
        stock_qty=float(row[4]),
        min_threshold=float(row[5]),
        supplier_id=None,
        supplier_name=None,
        is_active=row[6],
        created_at=str(row[7])[:19] if row[7] else None,
    )


@router.get('', response_model=List[ProductView])
def list_products(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(_SELECT + ' ORDER BY name')
    return [_row(r) for r in cur.fetchall()]


@router.post('', response_model=ProductView, status_code=201)
def create_product(payload: CreateProductRequest, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        'INSERT INTO erp.products (name, category, price_per_kg, quantity_kg, min_stock_kg, is_active) '
        'VALUES (%s,%s,%s,%s,%s,%s) RETURNING id',
        (payload.name, payload.category, payload.price_per_unit,
         payload.stock_qty, payload.min_threshold, payload.is_active),
    )
    new_id = cur.fetchone()[0]
    cur.execute(_SELECT + ' WHERE id = %s', (new_id,))
    return _row(cur.fetchone())


@router.put('/{product_id}', response_model=ProductView)
def update_product(product_id: int, payload: UpdateProductRequest, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id FROM erp.products WHERE id = %s', (product_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='Product not found')

    field_map = {
        'name': 'name',
        'category': 'category',
        'price_per_unit': 'price_per_kg',
        'stock_qty': 'quantity_kg',
        'min_threshold': 'min_stock_kg',
        'is_active': 'is_active',
    }
    fields, values = [], []
    for attr, col in field_map.items():
        v = getattr(payload, attr)
        if v is not None:
            fields.append(f'{col} = %s')
            values.append(v)
    if not fields:
        cur.execute(_SELECT + ' WHERE id = %s', (product_id,))
        return _row(cur.fetchone())
    values.append(product_id)
    cur.execute(f'UPDATE erp.products SET {", ".join(fields)} WHERE id = %s', values)
    cur.execute(_SELECT + ' WHERE id = %s', (product_id,))
    return _row(cur.fetchone())


@router.patch('/{product_id}/stock', response_model=ProductView)
def adjust_stock(product_id: int, payload: StockAdjustRequest, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        'UPDATE erp.products SET quantity_kg = GREATEST(0, quantity_kg + %s) WHERE id = %s RETURNING id',
        (payload.qty_change, product_id),
    )
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='Product not found')
    cur.execute(_SELECT + ' WHERE id = %s', (product_id,))
    return _row(cur.fetchone())


@router.delete('/{product_id}', status_code=204)
def delete_product(product_id: int, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('DELETE FROM erp.products WHERE id = %s RETURNING id', (product_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='Product not found')
