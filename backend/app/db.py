import psycopg
from fastapi import HTTPException
from app.core.config import settings


def get_db():
    try:
        conn = psycopg.connect(settings.db_conninfo, connect_timeout=10, autocommit=True)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f'Database unavailable: {e}')
    try:
        yield conn
    finally:
        conn.close()
