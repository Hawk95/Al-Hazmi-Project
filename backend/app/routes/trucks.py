from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import jwt, math
from app.auth import get_current_user
from app.core.config import settings
from app.db import get_db

router = APIRouter()

UAE_OFFSET = timedelta(hours=4)
def _uae_now(): return datetime.utcnow() + UAE_OFFSET

def _haversine(lat1, lng1, lat2, lng2) -> float:
    R = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

_truck_bearer = HTTPBearer(auto_error=False)

def _create_truck_token(truck_id: int) -> str:
    exp = datetime.utcnow() + timedelta(hours=14)
    return jwt.encode({'sub': str(truck_id), 'type': 'truck', 'exp': exp},
                      settings.secret_key, algorithm=settings.algorithm)

def require_truck_token(creds: HTTPAuthorizationCredentials = Depends(_truck_bearer)) -> int:
    if not creds:
        raise HTTPException(401, 'Missing truck token')
    try:
        payload = jwt.decode(creds.credentials, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get('type') != 'truck':
            raise HTTPException(401, 'Not a truck token')
        return int(payload['sub'])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, 'Token expired')
    except jwt.InvalidTokenError:
        raise HTTPException(401, 'Invalid token')


# ── Schemas ───────────────────────────────────────────────────────────────────

class TruckCreate(BaseModel):
    plate_number: str
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    portal_pin: Optional[str] = None
    is_active: bool = True

class TruckUpdate(BaseModel):
    plate_number: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    portal_pin: Optional[str] = None
    is_active: Optional[bool] = None

class PortalLoginReq(BaseModel):
    plate_number: str
    pin: str

class PingReq(BaseModel):
    lat: float
    lng: float
    speed_kmh: Optional[float] = 0
    accuracy_m: Optional[float] = None

class StopReq(BaseModel):
    lat: float
    lng: float
    note: Optional[str] = None


# ── Admin: Truck CRUD ─────────────────────────────────────────────────────────

@router.get('')
def list_trucks(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('''SELECT id, plate_number, driver_name, driver_phone, portal_pin, is_active, created_at
                   FROM erp.trucks ORDER BY plate_number''')
    return [{'id': r[0], 'plate_number': r[1], 'driver_name': r[2], 'driver_phone': r[3],
             'portal_pin': r[4], 'is_active': r[5], 'created_at': str(r[6])[:19] if r[6] else None}
            for r in cur.fetchall()]

@router.post('', status_code=201)
def create_truck(p: TruckCreate, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        'INSERT INTO erp.trucks (plate_number,driver_name,driver_phone,portal_pin,is_active) VALUES (%s,%s,%s,%s,%s) RETURNING id',
        (p.plate_number.upper(), p.driver_name, p.driver_phone, p.portal_pin, p.is_active))
    nid = cur.fetchone()[0]
    cur.execute('SELECT id,plate_number,driver_name,driver_phone,portal_pin,is_active FROM erp.trucks WHERE id=%s', (nid,))
    r = cur.fetchone()
    return {'id': r[0], 'plate_number': r[1], 'driver_name': r[2], 'driver_phone': r[3], 'portal_pin': r[4], 'is_active': r[5]}

@router.put('/{tid}')
def update_truck(tid: int, p: TruckUpdate, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    fields, vals = [], []
    for f in ['plate_number','driver_name','driver_phone','portal_pin','is_active']:
        v = getattr(p, f)
        if v is not None:
            fields.append(f'{f}=%s')
            vals.append(v.upper() if f == 'plate_number' else v)
    if fields:
        vals.append(tid)
        cur.execute(f'UPDATE erp.trucks SET {",".join(fields)} WHERE id=%s', vals)
    cur.execute('SELECT id,plate_number,driver_name,driver_phone,portal_pin,is_active FROM erp.trucks WHERE id=%s', (tid,))
    r = cur.fetchone()
    if not r: raise HTTPException(404, 'Truck not found')
    return {'id': r[0], 'plate_number': r[1], 'driver_name': r[2], 'driver_phone': r[3], 'portal_pin': r[4], 'is_active': r[5]}

@router.delete('/{tid}', status_code=204)
def delete_truck(tid: int, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('DELETE FROM erp.trucks WHERE id=%s RETURNING id', (tid,))
    if not cur.fetchone(): raise HTTPException(404, 'Truck not found')


# ── Admin: Live map & history ─────────────────────────────────────────────────

@router.get('/live')
def live_positions(_=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('''
        SELECT t.id, t.plate_number, t.driver_name, t.driver_phone,
               p.lat, p.lng, p.speed_kmh, p.recorded_at,
               tr.id, tr.status, tr.started_at, tr.distance_km
        FROM erp.trucks t
        LEFT JOIN LATERAL (
            SELECT lat, lng, speed_kmh, recorded_at, trip_id
            FROM erp.truck_pings WHERE truck_id=t.id
            ORDER BY recorded_at DESC LIMIT 1
        ) p ON TRUE
        LEFT JOIN erp.truck_trips tr ON tr.id=p.trip_id
        WHERE t.is_active=TRUE
        ORDER BY t.plate_number
    ''')
    return [{'id': r[0], 'plate_number': r[1], 'driver_name': r[2], 'driver_phone': r[3],
             'lat': r[4], 'lng': r[5], 'speed_kmh': float(r[6] or 0),
             'last_seen': str(r[7])[:19] if r[7] else None,
             'trip_id': r[8], 'trip_status': r[9],
             'trip_started': str(r[10])[:19] if r[10] else None,
             'distance_km': round(float(r[11] or 0), 2)} for r in cur.fetchall()]

@router.get('/{tid}/trips')
def truck_trips(tid: int, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('''SELECT id, started_at, ended_at, distance_km, status,
                          (SELECT COUNT(*) FROM erp.truck_stops WHERE trip_id=erp.truck_trips.id)
                   FROM erp.truck_trips WHERE truck_id=%s ORDER BY started_at DESC LIMIT 30''', (tid,))
    return [{'id': r[0], 'started_at': str(r[1])[:19],
             'ended_at': str(r[2])[:19] if r[2] else None,
             'distance_km': round(float(r[3] or 0), 2), 'status': r[4], 'stop_count': int(r[5])}
            for r in cur.fetchall()]

@router.get('/trips/{trip_id}/route')
def trip_route(trip_id: int, _=Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT lat,lng,speed_kmh,recorded_at FROM erp.truck_pings WHERE trip_id=%s ORDER BY recorded_at', (trip_id,))
    pings = [{'lat': r[0], 'lng': r[1], 'speed': round(float(r[2] or 0), 1), 'time': str(r[3])[:19]} for r in cur.fetchall()]
    cur.execute('SELECT lat,lng,arrived_at,departed_at,duration_minutes,note FROM erp.truck_stops WHERE trip_id=%s ORDER BY arrived_at', (trip_id,))
    stops = [{'lat': r[0], 'lng': r[1], 'arrived': str(r[2])[:19],
              'departed': str(r[3])[:19] if r[3] else None, 'duration_min': r[4], 'note': r[5]}
             for r in cur.fetchall()]
    return {'pings': pings, 'stops': stops}


# ── Driver Portal ─────────────────────────────────────────────────────────────

@router.post('/portal/login')
def portal_login(p: PortalLoginReq, db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id,plate_number,driver_name,portal_pin FROM erp.trucks WHERE UPPER(plate_number)=%s AND is_active=TRUE',
                (p.plate_number.upper(),))
    row = cur.fetchone()
    if not row: raise HTTPException(404, 'Truck not found or inactive.')
    tid, plate, driver, pin = row
    if not pin: raise HTTPException(400, 'No PIN set for this truck. Ask your admin.')
    if p.pin != pin: raise HTTPException(400, 'Wrong PIN. Try again.')
    return {'token': _create_truck_token(tid), 'truck': {'id': tid, 'plate_number': plate, 'driver_name': driver}}

@router.post('/portal/start-trip')
def start_trip(truck_id: int = Depends(require_truck_token), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute("SELECT id FROM erp.truck_trips WHERE truck_id=%s AND status='active'", (truck_id,))
    if cur.fetchone(): raise HTTPException(400, 'Already have an active trip. End it first.')
    now = _uae_now()
    cur.execute('INSERT INTO erp.truck_trips (truck_id,started_at,status) VALUES (%s,%s,%s) RETURNING id', (truck_id, now, 'active'))
    return {'trip_id': cur.fetchone()[0], 'started_at': str(now)[:19]}

@router.post('/portal/ping')
def send_ping(p: PingReq, truck_id: int = Depends(require_truck_token), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute("SELECT id FROM erp.truck_trips WHERE truck_id=%s AND status='active' ORDER BY started_at DESC LIMIT 1", (truck_id,))
    row = cur.fetchone()
    trip_id = row[0] if row else None
    now = _uae_now()
    cur.execute('INSERT INTO erp.truck_pings (truck_id,trip_id,lat,lng,speed_kmh,accuracy_m,recorded_at) VALUES (%s,%s,%s,%s,%s,%s,%s)',
                (truck_id, trip_id, p.lat, p.lng, p.speed_kmh or 0, p.accuracy_m, now))

    if trip_id:
        # Update distance
        cur.execute('SELECT lat,lng FROM erp.truck_pings WHERE trip_id=%s ORDER BY recorded_at DESC LIMIT 2', (trip_id,))
        pts = cur.fetchall()
        if len(pts) == 2:
            d = _haversine(pts[1][0], pts[1][1], pts[0][0], pts[0][1])
            cur.execute('UPDATE erp.truck_trips SET distance_km=distance_km+%s WHERE id=%s', (d/1000, trip_id))

        # Auto stop detection: last 4 pings within 3 min, max spread < 100m
        cur.execute('SELECT lat,lng,recorded_at FROM erp.truck_pings WHERE trip_id=%s ORDER BY recorded_at DESC LIMIT 4', (trip_id,))
        recent = cur.fetchall()
        if len(recent) >= 3:
            span = (recent[0][2] - recent[-1][2]).total_seconds()
            spread = max(_haversine(recent[0][0], recent[0][1], q[0], q[1]) for q in recent[1:])
            is_idle = span > 180 and spread < 100

            cur.execute("SELECT id FROM erp.truck_stops WHERE trip_id=%s AND departed_at IS NULL", (trip_id,))
            open_stop = cur.fetchone()

            if is_idle and not open_stop:
                cur.execute('INSERT INTO erp.truck_stops (truck_id,trip_id,lat,lng,arrived_at) VALUES (%s,%s,%s,%s,%s)',
                            (truck_id, trip_id, p.lat, p.lng, recent[-1][2]))
            elif not is_idle and open_stop:
                cur.execute('SELECT arrived_at FROM erp.truck_stops WHERE id=%s', (open_stop[0],))
                arrived = cur.fetchone()[0]
                duration = int((now - arrived).total_seconds() / 60)
                cur.execute('UPDATE erp.truck_stops SET departed_at=%s,duration_minutes=%s WHERE id=%s', (now, duration, open_stop[0]))

    return {'ok': True}

@router.get('/portal/status')
def portal_status(truck_id: int = Depends(require_truck_token), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT plate_number,driver_name FROM erp.trucks WHERE id=%s', (truck_id,))
    t = cur.fetchone()
    cur.execute("SELECT id,started_at,distance_km FROM erp.truck_trips WHERE truck_id=%s AND status='active'", (truck_id,))
    trip = cur.fetchone()
    active = None
    if trip:
        cur.execute("SELECT id FROM erp.truck_stops WHERE trip_id=%s AND departed_at IS NULL", (trip[0],))
        active = {'id': trip[0], 'started_at': str(trip[1])[:19],
                  'distance_km': round(float(trip[2] or 0), 2), 'is_stopped': bool(cur.fetchone())}
    return {'truck': {'id': truck_id, 'plate_number': t[0], 'driver_name': t[1]}, 'active_trip': active}

@router.post('/portal/mark-stop')
def mark_stop(p: StopReq, truck_id: int = Depends(require_truck_token), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute("SELECT id FROM erp.truck_trips WHERE truck_id=%s AND status='active'", (truck_id,))
    row = cur.fetchone()
    if not row: raise HTTPException(400, 'No active trip.')
    trip_id = row[0]
    now = _uae_now()
    cur.execute("SELECT id,arrived_at FROM erp.truck_stops WHERE trip_id=%s AND departed_at IS NULL", (trip_id,))
    existing = cur.fetchone()
    if existing:
        duration = int((now - existing[1]).total_seconds() / 60)
        cur.execute('UPDATE erp.truck_stops SET departed_at=%s,duration_minutes=%s WHERE id=%s', (now, duration, existing[0]))
        return {'action': 'departed', 'duration_minutes': duration}
    else:
        cur.execute('INSERT INTO erp.truck_stops (truck_id,trip_id,lat,lng,arrived_at,note) VALUES (%s,%s,%s,%s,%s,%s)',
                    (truck_id, trip_id, p.lat, p.lng, now, p.note))
        return {'action': 'stopped', 'arrived_at': str(now)[:19]}

@router.post('/portal/end-trip')
def end_trip(truck_id: int = Depends(require_truck_token), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute("SELECT id FROM erp.truck_trips WHERE truck_id=%s AND status='active'", (truck_id,))
    row = cur.fetchone()
    if not row: raise HTTPException(400, 'No active trip.')
    trip_id, now = row[0], _uae_now()
    cur.execute("UPDATE erp.truck_trips SET status='completed',ended_at=%s WHERE id=%s", (now, trip_id))
    cur.execute("SELECT id,arrived_at FROM erp.truck_stops WHERE trip_id=%s AND departed_at IS NULL", (trip_id,))
    s = cur.fetchone()
    if s:
        duration = int((now - s[1]).total_seconds() / 60)
        cur.execute('UPDATE erp.truck_stops SET departed_at=%s,duration_minutes=%s WHERE id=%s', (now, duration, s[0]))
    return {'ok': True, 'ended_at': str(now)[:19]}
