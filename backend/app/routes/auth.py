from fastapi import APIRouter, Depends, HTTPException, status
from app.auth import verify_password, hash_password, create_access_token
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
    cur.execute('SELECT hashed_password FROM erp.users WHERE email = %s', (payload.email,))
    row = cur.fetchone()
    if not row or not verify_password(payload.password, row[0]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

    return {'access_token': create_access_token(payload.email), 'token_type': 'bearer'}
