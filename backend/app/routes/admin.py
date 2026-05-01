from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.auth import get_current_user, hash_password
from app.db import get_db
from app.schemas import UserAdminView, CreateUserRequest, ResetPasswordRequest

router = APIRouter()


def require_admin(email: str = Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT is_admin FROM erp.users WHERE email = %s', (email,))
    row = cur.fetchone()
    if not row or not row[0]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Admin access required')
    return email


def _row_to_user(row) -> UserAdminView:
    return UserAdminView(
        id=row[0],
        email=row[1],
        is_active=row[2],
        is_admin=row[3],
        created_at=str(row[4])[:19] if row[4] else None,
    )


@router.get('/users', response_model=List[UserAdminView])
def list_users(_=Depends(require_admin), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id, email, is_active, is_admin, created_at FROM erp.users ORDER BY id')
    return [_row_to_user(r) for r in cur.fetchall()]


@router.post('/users', response_model=UserAdminView, status_code=201)
def create_user(payload: CreateUserRequest, _=Depends(require_admin), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id FROM erp.users WHERE email = %s', (payload.email,))
    if cur.fetchone():
        raise HTTPException(status_code=400, detail='Email already registered')
    cur.execute(
        'INSERT INTO erp.users (email, hashed_password, is_active, is_admin) VALUES (%s, %s, TRUE, %s) RETURNING id, email, is_active, is_admin, created_at',
        (payload.email, hash_password(payload.password), payload.is_admin),
    )
    return _row_to_user(cur.fetchone())


@router.put('/users/{user_id}/password')
def reset_password(user_id: int, payload: ResetPasswordRequest, _=Depends(require_admin), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('UPDATE erp.users SET hashed_password = %s WHERE id = %s RETURNING id', (hash_password(payload.new_password), user_id))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='User not found')
    return {'message': 'Password updated'}


@router.put('/users/{user_id}/status', response_model=UserAdminView)
def toggle_status(user_id: int, _=Depends(require_admin), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        'UPDATE erp.users SET is_active = NOT is_active WHERE id = %s RETURNING id, email, is_active, is_admin, created_at',
        (user_id,),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='User not found')
    return _row_to_user(row)
