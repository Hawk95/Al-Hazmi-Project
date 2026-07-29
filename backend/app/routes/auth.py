from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import create_access_token, hash_password, verify_password, get_current_user
from app.db import get_db
from app.schemas import Token, UserCreate

router = APIRouter()


@router.post('/register', response_model=Token)
def register(user_create: UserCreate, db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id FROM erp.users WHERE email = %s', (user_create.email,))
    if cur.fetchone():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Email already registered')
    hashed = hash_password(user_create.password)
    cur.execute(
        'INSERT INTO erp.users (email, hashed_password, is_active) VALUES (%s, %s, TRUE)',
        (user_create.email, hashed),
    )
    token = create_access_token(subject=user_create.email)
    return {'access_token': token, 'token_type': 'bearer'}


@router.post('/login', response_model=Token)
def login(payload: UserCreate, db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        'SELECT hashed_password FROM erp.users WHERE email = %s AND is_active = TRUE',
        (payload.email,),
    )
    row = cur.fetchone()
    if not row or not verify_password(payload.password, row[0]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')
    token = create_access_token(subject=payload.email)
    return {'access_token': token, 'token_type': 'bearer'}


@router.get('/me')
def me(email: str = Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        '''SELECT u.is_admin,
                  EXISTS(SELECT 1 FROM erp.user_permissions p
                         WHERE p.user_id = u.id AND p.permission = %s) AS hr_access
           FROM erp.users u WHERE u.email = %s''',
        ('hr', email),
    )
    row = cur.fetchone()
    is_admin = bool(row[0]) if row else False
    hr_access = bool(row[1]) if row else False
    return {'email': email, 'is_admin': is_admin, 'hr_access': hr_access}
