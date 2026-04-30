import psycopg
from app.core.config import settings


def get_db():
    conn = psycopg.connect(settings.db_conninfo, connect_timeout=5)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
