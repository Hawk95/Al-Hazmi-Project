from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from app.auth import get_current_user
from app.db import get_db

router = APIRouter()

EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah']


# ── Schemas ───────────────────────────────────────────────────────────────────

class SalesmanCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True

class SalesmanUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None

class SalesmanView(BaseModel):
    id: int
    name: str
    phone: Optional[str]
    email: Optional[str]
    is_active: bool
    created_at: Optional[str]

class DistributionCreate(BaseModel):
    salesman_id: Optional[int] = None
    distribution_date: str
    emirate: str
    meat_type: str = 'Lamb'
    quantity_kg: float
    notes: Optional[str] = None

class DistributionUpdate(BaseModel):
    salesman_id: Optional[int] = None
    distribution_date: Optional[str] = None
    emirate: Optional[str] = None
    meat_type: Optional[str] = None
    quantity_kg: Optional[float] = None
    notes: Optional[str] = None

class DistributionView(BaseModel):
    id: int
    salesman_id: Optional[int]
    salesman_name: Optional[str]
    distribution_date: str
    emirate: str
    meat_type: str
    quantity_kg: float
    notes: Optional[str]
    created_at: Optional[str]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _row_sm(r) -> SalesmanView:
    return SalesmanView(id=r[0], name=r[1], phone=r[2], email=r[3],
                        is_active=r[4], created_at=str(r[5])[:19] if r[5] else None)

_DIST_SEL = '''
    SELECT d.id, d.salesman_id, COALESCE(s.name, d.salesman_name),
           d.distribution_date, d.emirate, d.meat_type, d.quantity_kg, d.notes, d.created_at
    FROM erp.daily_distributions d
    LEFT JOIN erp.salesmen s ON d.salesman_id = s.id
'''

def _row_dist(r) -> DistributionView:
    return DistributionView(
        id=r[0], salesman_id=r[1], salesman_name=r[2],
        distribution_date=str(r[3]), emirate=r[4],
        meat_type=r[5], quantity_kg=float(r[6]),
        notes=r[7], created_at=str(r[8])[:19] if r[8] else None,
    )


# ── Salesmen ──────────────────────────────────────────────────────────────────

@router.get('/salesmen', response_model=List[SalesmanView])
def list_salesmen(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id, name, phone, email, is_active, created_at FROM erp.salesmen ORDER BY name')
    return [_row_sm(r) for r in cur.fetchall()]

@router.post('/salesmen', response_model=SalesmanView, status_code=201)
def create_salesman(payload: SalesmanCreate, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        'INSERT INTO erp.salesmen (name, phone, email, is_active) VALUES (%s,%s,%s,%s) RETURNING id',
        (payload.name, payload.phone, payload.email, payload.is_active),
    )
    new_id = cur.fetchone()[0]
    cur.execute('SELECT id, name, phone, email, is_active, created_at FROM erp.salesmen WHERE id=%s', (new_id,))
    return _row_sm(cur.fetchone())

@router.put('/salesmen/{sid}', response_model=SalesmanView)
def update_salesman(sid: int, payload: SalesmanUpdate, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id FROM erp.salesmen WHERE id=%s', (sid,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='Salesman not found')
    fields, values = [], []
    for f in ['name', 'phone', 'email', 'is_active']:
        v = getattr(payload, f)
        if v is not None:
            fields.append(f'{f} = %s'); values.append(v)
    if fields:
        values.append(sid)
        cur.execute(f'UPDATE erp.salesmen SET {", ".join(fields)} WHERE id=%s', values)
    cur.execute('SELECT id, name, phone, email, is_active, created_at FROM erp.salesmen WHERE id=%s', (sid,))
    return _row_sm(cur.fetchone())

@router.delete('/salesmen/{sid}', status_code=204)
def delete_salesman(sid: int, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('UPDATE erp.daily_distributions SET salesman_id=NULL WHERE salesman_id=%s', (sid,))
    cur.execute('DELETE FROM erp.salesmen WHERE id=%s RETURNING id', (sid,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='Salesman not found')


# ── Distributions ─────────────────────────────────────────────────────────────

@router.get('/distributions', response_model=List[DistributionView])
def list_distributions(
    date_from: Optional[str] = None, date_to: Optional[str] = None,
    emirate: Optional[str] = None, salesman_id: Optional[int] = None,
    _=Depends(get_current_user), db=Depends(get_db),
):
    cur = db.cursor()
    q = _DIST_SEL + ' WHERE 1=1'
    params = []
    if date_from: q += ' AND d.distribution_date >= %s'; params.append(date_from)
    if date_to:   q += ' AND d.distribution_date <= %s'; params.append(date_to)
    if emirate:   q += ' AND d.emirate = %s'; params.append(emirate)
    if salesman_id: q += ' AND d.salesman_id = %s'; params.append(salesman_id)
    q += ' ORDER BY d.distribution_date DESC, d.id DESC'
    cur.execute(q, params)
    return [_row_dist(r) for r in cur.fetchall()]

@router.post('/distributions', response_model=DistributionView, status_code=201)
def create_distribution(payload: DistributionCreate, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    salesman_name = None
    if payload.salesman_id:
        cur.execute('SELECT name FROM erp.salesmen WHERE id=%s', (payload.salesman_id,))
        row = cur.fetchone()
        if row: salesman_name = row[0]
    cur.execute(
        'INSERT INTO erp.daily_distributions '
        '(salesman_id, salesman_name, distribution_date, emirate, meat_type, quantity_kg, notes) '
        'VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id',
        (payload.salesman_id, salesman_name, payload.distribution_date,
         payload.emirate, payload.meat_type, payload.quantity_kg, payload.notes),
    )
    new_id = cur.fetchone()[0]
    cur.execute(_DIST_SEL + ' WHERE d.id=%s', (new_id,))
    return _row_dist(cur.fetchone())

@router.put('/distributions/{did}', response_model=DistributionView)
def update_distribution(did: int, payload: DistributionUpdate, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id FROM erp.daily_distributions WHERE id=%s', (did,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='Distribution not found')
    fields, values = [], []
    if payload.salesman_id is not None:
        fields.append('salesman_id = %s'); values.append(payload.salesman_id)
        cur.execute('SELECT name FROM erp.salesmen WHERE id=%s', (payload.salesman_id,))
        row = cur.fetchone()
        if row: fields.append('salesman_name = %s'); values.append(row[0])
    for attr, col in [('distribution_date','distribution_date'),('emirate','emirate'),
                      ('meat_type','meat_type'),('quantity_kg','quantity_kg'),('notes','notes')]:
        v = getattr(payload, attr)
        if v is not None: fields.append(f'{col} = %s'); values.append(v)
    if fields:
        values.append(did)
        cur.execute(f'UPDATE erp.daily_distributions SET {", ".join(fields)} WHERE id=%s', values)
    cur.execute(_DIST_SEL + ' WHERE d.id=%s', (did,))
    return _row_dist(cur.fetchone())

@router.delete('/distributions/{did}', status_code=204)
def delete_distribution(did: int, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('DELETE FROM erp.daily_distributions WHERE id=%s RETURNING id', (did,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='Distribution not found')


# ── Summary ───────────────────────────────────────────────────────────────────

@router.get('/summary')
def sales_summary(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute("SELECT COUNT(*) FROM erp.salesmen WHERE is_active=TRUE")
    active_salesmen = cur.fetchone()[0]

    cur.execute("SELECT COALESCE(SUM(quantity_kg),0) FROM erp.daily_distributions WHERE distribution_date=CURRENT_DATE")
    today_kg = float(cur.fetchone()[0])

    cur.execute(
        "SELECT COALESCE(SUM(quantity_kg),0) FROM erp.daily_distributions "
        "WHERE EXTRACT(MONTH FROM distribution_date)=EXTRACT(MONTH FROM CURRENT_DATE) "
        "AND EXTRACT(YEAR FROM distribution_date)=EXTRACT(YEAR FROM CURRENT_DATE)"
    )
    month_kg = float(cur.fetchone()[0])

    cur.execute(
        "SELECT emirate, SUM(quantity_kg) FROM erp.daily_distributions "
        "WHERE distribution_date=CURRENT_DATE GROUP BY emirate ORDER BY emirate"
    )
    per_emirate = {r[0]: float(r[1]) for r in cur.fetchall()}

    cur.execute(
        "SELECT s.name, COALESCE(SUM(d.quantity_kg),0) "
        "FROM erp.salesmen s LEFT JOIN erp.daily_distributions d "
        "ON s.id=d.salesman_id AND d.distribution_date=CURRENT_DATE "
        "WHERE s.is_active=TRUE GROUP BY s.name ORDER BY SUM(d.quantity_kg) DESC NULLS LAST"
    )
    per_salesman_today = [{'name': r[0], 'kg': float(r[1])} for r in cur.fetchall()]

    top_emirate = max(per_emirate, key=per_emirate.get) if per_emirate else None

    return {
        'active_salesmen': active_salesmen,
        'today_kg': today_kg,
        'month_kg': month_kg,
        'top_emirate_today': top_emirate,
        'per_emirate_today': per_emirate,
        'per_salesman_today': per_salesman_today,
    }
