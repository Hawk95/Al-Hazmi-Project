from fastapi import APIRouter, Depends, HTTPException
from typing import Dict
from pydantic import BaseModel
from app.auth import get_current_user
from app.db import get_db
from app.routes.admin import require_admin

router = APIRouter()

ALLOWED_KEYS = {
    'company_name', 'company_logo_url', 'company_phone',
    'company_email', 'company_address',
    'office_lat', 'office_lng', 'geofence_m',
}


@router.get('')
def get_settings(db=Depends(get_db)):
    """Public — returns all settings as a flat dict. Used by login page and sidebar."""
    cur = db.cursor()
    cur.execute('SELECT key, value FROM erp.settings ORDER BY key')
    return {row[0]: row[1] for row in cur.fetchall()}


@router.put('')
def update_settings(payload: Dict[str, str], _=Depends(require_admin), db=Depends(get_db)):
    """Admin only — upserts any allowed settings keys."""
    bad = set(payload) - ALLOWED_KEYS
    if bad:
        raise HTTPException(400, f"Unknown setting key(s): {', '.join(bad)}")
    cur = db.cursor()
    for key, value in payload.items():
        cur.execute(
            """INSERT INTO erp.settings (key, value, updated_at)
               VALUES (%s, %s, NOW())
               ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()""",
            (key, value)
        )
    return {'ok': True, 'updated': list(payload.keys())}
