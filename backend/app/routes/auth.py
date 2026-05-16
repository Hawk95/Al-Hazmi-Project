from fastapi import APIRouter, Depends, HTTPException, status
from app.auth import verify_password, hash_password, create_access_token, get_current_user
from app.db import get_db
from app.schemas import Token, UserCreate

router = APIRouter()


@router.post('/register', response_model=Token)
def register(user_create: UserCreate, db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id FROM erp.users WHERE email = %s', (user_create.email,))
    if cur.fetchone():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Email already registered')

    cur.execute(
        'INSERT INTO erp.users (email, hashed_password, is_active) VALUES (%s, %s, TRUE)',
        (user_create.email, hash_password(user_create.password))
    )
    return {'access_token': create_access_token(user_create.email), 'token_type': 'bearer'}


@router.post('/login', response_model=Token)
def login(payload: UserCreate, db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT hashed_password, is_active FROM erp.users WHERE email = %s', (payload.email,))
    row = cur.fetchone()
    if not row or not verify_password(payload.password, row[0]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')
    if not row[1]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Account is inactive')
    cur.execute('UPDATE erp.users SET last_login = NOW() WHERE email = %s', (payload.email,))
    return {'access_token': create_access_token(payload.email), 'token_type': 'bearer'}


@router.get('/me')
def get_me(email: str = Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id, is_admin FROM erp.users WHERE email=%s', (email,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='User not found')
    user_id, is_admin = row
    cur.execute("SELECT 1 FROM erp.user_permissions WHERE user_id=%s AND permission='hr'", (user_id,))
    hr_access = bool(cur.fetchone())
    return {'email': email, 'is_admin': is_admin, 'hr_access': hr_access or is_admin}
