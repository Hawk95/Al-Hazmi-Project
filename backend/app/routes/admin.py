from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.auth import get_current_user, hash_password
from app.db import get_db
from app.schemas import UserAdminView, CreateUserRequest, UpdateUserRequest, ResetPasswordRequest

router = APIRouter()


def require_admin(email: str = Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id, is_admin FROM erp.users WHERE email = %s', (email,))
    row = cur.fetchone()
    if not row or not row[1]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Admin access required')
    return {'email': email, 'id': row[0]}


def _row_to_user(row) -> UserAdminView:
    return UserAdminView(
        id=row[0],
        email=row[1],
        full_name=row[2],
        phone=row[3],
        is_active=row[4],
        is_admin=row[5],
        created_at=str(row[6])[:19] if row[6] else None,
        last_login=str(row[7])[:19] if row[7] else None,
    )


_SELECT = 'SELECT id, email, full_name, phone, is_active, is_admin, created_at, last_login FROM erp.users'


@router.get('/users', response_model=List[UserAdminView])
def list_users(_=Depends(require_admin), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(_SELECT + ' ORDER BY id')
    return [_row_to_user(r) for r in cur.fetchall()]


@router.post('/users', response_model=UserAdminView, status_code=201)
def create_user(payload: CreateUserRequest, _=Depends(require_admin), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id FROM erp.users WHERE email = %s', (payload.email,))
    if cur.fetchone():
        raise HTTPException(status_code=400, detail='Email already registered')
    cur.execute(
        'INSERT INTO erp.users (email, hashed_password, full_name, phone, is_active, is_admin) '
        'VALUES (%s, %s, %s, %s, TRUE, %s) RETURNING id, email, full_name, phone, is_active, is_admin, created_at, last_login',
        (payload.email, hash_password(payload.password), payload.full_name, payload.phone, payload.is_admin),
    )
    return _row_to_user(cur.fetchone())


@router.put('/users/{user_id}', response_model=UserAdminView)
def update_user(user_id: int, payload: UpdateUserRequest, admin=Depends(require_admin), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id FROM erp.users WHERE id = %s', (user_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='User not found')

    fields, values = [], []
    if payload.full_name is not None:
        fields.append('full_name = %s'); values.append(payload.full_name)
    if payload.phone is not None:
        fields.append('phone = %s'); values.append(payload.phone)
    if payload.email is not None:
        cur.execute('SELECT id FROM erp.users WHERE email = %s AND id != %s', (payload.email, user_id))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail='Email already in use')
        fields.append('email = %s'); values.append(payload.email)
    if payload.is_admin is not None:
        if not payload.is_admin:
            cur.execute('SELECT COUNT(*) FROM erp.users WHERE is_admin = TRUE AND id != %s', (user_id,))
            if cur.fetchone()[0] == 0:
                raise HTTPException(status_code=400, detail='Cannot remove the last admin')
        fields.append('is_admin = %s'); values.append(payload.is_admin)

    if not fields:
        cur.execute(_SELECT + ' WHERE id = %s', (user_id,))
        return _row_to_user(cur.fetchone())

    values.append(user_id)
    cur.execute(
        f'UPDATE erp.users SET {", ".join(fields)} WHERE id = %s '
        'RETURNING id, email, full_name, phone, is_active, is_admin, created_at, last_login',
        values,
    )
    return _row_to_user(cur.fetchone())


@router.put('/users/{user_id}/password')
def reset_password(user_id: int, payload: ResetPasswordRequest, _=Depends(require_admin), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('UPDATE erp.users SET hashed_password = %s WHERE id = %s RETURNING id',
                (hash_password(payload.new_password), user_id))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='User not found')
    return {'message': 'Password updated'}


@router.put('/users/{user_id}/status', response_model=UserAdminView)
def toggle_status(user_id: int, _=Depends(require_admin), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT is_active FROM erp.users WHERE id = %s', (user_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='User not found')
    cur.execute(
        'UPDATE erp.users SET is_active = NOT is_active WHERE id = %s '
        'RETURNING id, email, full_name, phone, is_active, is_admin, created_at, last_login',
        (user_id,),
    )
    return _row_to_user(cur.fetchone())


@router.delete('/users/{user_id}', status_code=204)
def delete_user(user_id: int, admin=Depends(require_admin), db=Depends(get_db)):
    if user_id == admin['id']:
        raise HTTPException(status_code=400, detail='You cannot delete your own account')
    cur = db.cursor()
    cur.execute('SELECT is_admin FROM erp.users WHERE id = %s', (user_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='User not found')
    if row[0]:
        cur.execute('SELECT COUNT(*) FROM erp.users WHERE is_admin = TRUE')
        if cur.fetchone()[0] <= 1:
            raise HTTPException(status_code=400, detail='Cannot delete the last admin')
    cur.execute('DELETE FROM erp.users WHERE id = %s', (user_id,))
