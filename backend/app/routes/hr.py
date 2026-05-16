from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import jwt
import math
from app.auth import get_current_user
from app.core.config import settings
from app.db import get_db

router = APIRouter()

DEPARTMENTS = ['Management', 'Drivers', 'Warehouse', 'Sales', 'Office', 'Other']

OFFICE_LAT  = 25.269916
OFFICE_LNG  = 55.333817
GEOFENCE_M  = 50           # metres
UAE_OFFSET  = timedelta(hours=4)

def _uae_now():
    return datetime.utcnow() + UAE_OFFSET

def _haversine(lat1, lng1, lat2, lng2) -> float:
    R = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

_emp_bearer = HTTPBearer(auto_error=False)

def create_employee_token(employee_id: int) -> str:
    exp = datetime.utcnow() + timedelta(hours=14)
    return jwt.encode(
        {'sub': str(employee_id), 'type': 'employee', 'exp': exp},
        settings.secret_key, algorithm=settings.algorithm,
    )

def require_employee_token(
    credentials: HTTPAuthorizationCredentials = Depends(_emp_bearer),
) -> int:
    if not credentials:
        raise HTTPException(status_code=401, detail='Missing employee token')
    try:
        payload = jwt.decode(
            credentials.credentials, settings.secret_key,
            algorithms=[settings.algorithm],
        )
        if payload.get('type') != 'employee':
            raise HTTPException(status_code=401, detail='Not an employee token')
        return int(payload['sub'])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid token')


def require_hr(email: str = Depends(get_current_user), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id, is_admin FROM erp.users WHERE email=%s', (email,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User not found')
    user_id, is_admin = row
    if is_admin:
        return email
    cur.execute("SELECT 1 FROM erp.user_permissions WHERE user_id=%s AND permission='hr'", (user_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='HR access required')
    return email


# ── Schemas ───────────────────────────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    name: str
    department: Optional[str] = None
    position: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True
    shift_start: Optional[str] = '09:00'
    shift_end: Optional[str] = '18:00'
    monthly_salary: Optional[float] = 0.0
    hourly_rate: Optional[float] = 0.0
    portal_pin: Optional[str] = None

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
    shift_start: Optional[str] = None
    shift_end: Optional[str] = None
    monthly_salary: Optional[float] = None
    hourly_rate: Optional[float] = None
    portal_pin: Optional[str] = None

class EmployeeView(BaseModel):
    id: int
    name: str
    department: Optional[str]
    position: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    is_active: bool
    shift_start: Optional[str]
    shift_end: Optional[str]
    monthly_salary: float
    hourly_rate: float
    portal_pin: Optional[str] = None
    created_at: Optional[str]

class PortalLoginRequest(BaseModel):
    identifier: str   # full email, gmail username, or employee name
    pin: str

class PortalCheckRequest(BaseModel):
    lat: float
    lng: float
    force: bool = False

class AttendanceRecord(BaseModel):
    employee_id: int
    employee_name: str
    attendance_date: str
    status: str = 'present'
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    notes: Optional[str] = None

class AttendanceBulk(BaseModel):
    records: List[AttendanceRecord]


# ── Helpers ───────────────────────────────────────────────────────────────────

_EMP_COLS = 'id, name, department, position, phone, email, is_active, shift_start, shift_end, monthly_salary, hourly_rate, portal_pin, created_at'

def _row_emp(r) -> EmployeeView:
    return EmployeeView(
        id=r[0], name=r[1], department=r[2], position=r[3],
        phone=r[4], email=r[5], is_active=r[6],
        shift_start=str(r[7])[:5] if r[7] else '09:00',
        shift_end=str(r[8])[:5] if r[8] else '18:00',
        monthly_salary=float(r[9] or 0),
        hourly_rate=float(r[10] or 0),
        portal_pin=r[11],
        created_at=str(r[12])[:19] if r[12] else None,
    )


# ── Employees ─────────────────────────────────────────────────────────────────

@router.get('/employees', response_model=List[EmployeeView])
def list_employees(_=Depends(require_hr), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(f'SELECT {_EMP_COLS} FROM erp.employees ORDER BY name')
    return [_row_emp(r) for r in cur.fetchall()]

@router.post('/employees', response_model=EmployeeView, status_code=201)
def create_employee(payload: EmployeeCreate, _=Depends(require_hr), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute(
        'INSERT INTO erp.employees (name, department, position, phone, email, is_active, shift_start, shift_end, monthly_salary, hourly_rate, portal_pin) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id',
        (payload.name, payload.department, payload.position, payload.phone, payload.email,
         payload.is_active, payload.shift_start or '09:00', payload.shift_end or '18:00',
         payload.monthly_salary or 0, payload.hourly_rate or 0,
         payload.portal_pin or None),
    )
    new_id = cur.fetchone()[0]
    cur.execute(f'SELECT {_EMP_COLS} FROM erp.employees WHERE id=%s', (new_id,))
    return _row_emp(cur.fetchone())

@router.put('/employees/{eid}', response_model=EmployeeView)
def update_employee(eid: int, payload: EmployeeUpdate, _=Depends(require_hr), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id FROM erp.employees WHERE id=%s', (eid,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='Employee not found')
    fields, values = [], []
    for f in ['name', 'department', 'position', 'phone', 'email', 'is_active', 'shift_start', 'shift_end', 'monthly_salary', 'hourly_rate', 'portal_pin']:
        v = getattr(payload, f)
        if v is not None:
            fields.append(f'{f} = %s'); values.append(v)
    if fields:
        values.append(eid)
        cur.execute(f'UPDATE erp.employees SET {", ".join(fields)} WHERE id=%s', values)
    cur.execute(f'SELECT {_EMP_COLS} FROM erp.employees WHERE id=%s', (eid,))
    return _row_emp(cur.fetchone())

@router.delete('/employees/{eid}', status_code=204)
def delete_employee(eid: int, _=Depends(require_hr), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('DELETE FROM erp.employees WHERE id=%s RETURNING id', (eid,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail='Employee not found')


# ── Attendance ────────────────────────────────────────────────────────────────

@router.get('/attendance')
def get_attendance(date: str, _=Depends(require_hr), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('''
        SELECT e.id, e.name, e.department, e.position,
               a.id, a.status,
               a.check_in, a.check_out, a.notes,
               e.shift_start, e.shift_end,
               a.check_in_method, a.check_out_method
        FROM erp.employees e
        LEFT JOIN erp.attendance a ON e.id = a.employee_id AND a.attendance_date = %s
        WHERE e.is_active = TRUE
        ORDER BY e.name
    ''', (date,))
    return [
        {
            'employee_id':      r[0],
            'employee_name':    r[1],
            'department':       r[2],
            'position':         r[3],
            'attendance_id':    r[4],
            'status':           (
                'not_marked'
                if not r[5] or (r[5] == 'present' and not r[6] and not r[7] and (not r[8] or r[8].strip() == ''))
                else r[5]
            ),
            'check_in':         str(r[6])[:5] if r[6] else '',
            'check_out':        str(r[7])[:5] if r[7] else '',
            'notes':            r[8] or '',
            'shift_start':      str(r[9])[:5]  if r[9]  else '09:00',
            'shift_end':        str(r[10])[:5] if r[10] else '18:00',
            'check_in_method':  r[11] or 'manual',
            'check_out_method': r[12] or 'manual',
        }
        for r in cur.fetchall()
    ]

@router.post('/attendance/bulk')
def save_attendance_bulk(payload: AttendanceBulk, _=Depends(require_hr), db=Depends(get_db)):
    cur = db.cursor()
    for rec in payload.records:
        ci = rec.check_in if rec.check_in else None
        co = rec.check_out if rec.check_out else None
        cur.execute('''
            INSERT INTO erp.attendance
                (employee_id, employee_name, attendance_date, status, check_in, check_out, notes)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
                status        = EXCLUDED.status,
                check_in      = EXCLUDED.check_in,
                check_out     = EXCLUDED.check_out,
                notes         = EXCLUDED.notes,
                employee_name = EXCLUDED.employee_name
        ''', (rec.employee_id, rec.employee_name, rec.attendance_date,
              rec.status, ci, co, rec.notes or None))
    return {'saved': len(payload.records)}


# ── Payroll ───────────────────────────────────────────────────────────────────

@router.get('/payroll')
def payroll_summary(month: str, _=Depends(require_hr), db=Depends(get_db)):
    # month = 'YYYY-MM'
    cur = db.cursor()
    cur.execute('''
        SELECT
            e.id, e.name, e.department, e.position, e.monthly_salary, e.hourly_rate,
            e.shift_start,
            COUNT(a.id) FILTER (WHERE a.status IN ('present','late'))  AS present_days,
            COUNT(a.id) FILTER (WHERE a.status = 'late')               AS late_days,
            COUNT(a.id) FILTER (WHERE a.status = 'absent')             AS absent_days,
            COUNT(a.id) FILTER (WHERE a.status = 'half_day')           AS half_days,
            COUNT(a.id) FILTER (WHERE a.status = 'leave')              AS leave_days,
            COALESCE(SUM(
                CASE WHEN a.status IN ('present','late') AND a.check_in IS NOT NULL
                     AND a.check_in > e.shift_start
                THEN EXTRACT(EPOCH FROM (a.check_in - e.shift_start)) / 60.0
                ELSE 0 END
            ), 0) AS total_late_minutes,
            COALESCE(SUM(
                CASE WHEN a.status IN ('present','late') AND a.check_out IS NOT NULL
                     AND a.check_out < e.shift_end
                THEN EXTRACT(EPOCH FROM (e.shift_end - a.check_out)) / 60.0
                ELSE 0 END
            ), 0) AS total_early_minutes
        FROM erp.employees e
        LEFT JOIN erp.attendance a
            ON e.id = a.employee_id
            AND TO_CHAR(a.attendance_date, 'YYYY-MM') = %s
        WHERE e.is_active = TRUE
        GROUP BY e.id, e.name, e.department, e.position, e.monthly_salary, e.hourly_rate, e.shift_start
        ORDER BY e.name
    ''', (month,))

    result = []
    for r in cur.fetchall():
        emp_id, name, dept, pos, salary, hr_set, shift_start, present, late, absent, half, leave, late_mins, early_mins = r
        salary     = float(salary or 0)
        late_mins  = float(late_mins or 0)
        early_mins = float(early_mins or 0)

        # Use explicit hourly_rate if set; otherwise derive from monthly salary (26 days × 8 hrs)
        if float(hr_set or 0) > 0:
            hourly_rate = float(hr_set)
            daily_rate  = hourly_rate * 8
        elif salary > 0:
            daily_rate  = salary / 26
            hourly_rate = daily_rate / 8
        else:
            hourly_rate = 0
            daily_rate  = 0

        late_deduction   = round((late_mins  / 60.0) * hourly_rate, 2)
        early_deduction  = round((early_mins / 60.0) * hourly_rate, 2)
        absent_deduction = round(absent * daily_rate, 2)
        half_deduction   = round(half * (daily_rate / 2), 2)
        total_deduction  = round(late_deduction + early_deduction + absent_deduction + half_deduction, 2)
        net_pay          = round(salary - total_deduction, 2)

        result.append({
            'employee_id':        emp_id,
            'employee_name':      name,
            'department':         dept,
            'position':           pos,
            'monthly_salary':     salary,
            'hourly_rate':        round(hourly_rate, 2),
            'daily_rate':         round(daily_rate, 2),
            'present_days':       int(present or 0),
            'late_days':          int(late or 0),
            'absent_days':        int(absent or 0),
            'half_days':          int(half or 0),
            'leave_days':         int(leave or 0),
            'total_late_minutes':  round(late_mins, 1),
            'total_early_minutes': round(early_mins, 1),
            'late_deduction':      late_deduction,
            'early_deduction':     early_deduction,
            'absent_deduction':    absent_deduction,
            'half_deduction':      half_deduction,
            'total_deduction':     total_deduction,
            'net_pay':             net_pay,
        })
    return result


# ── Employee Self-Service Portal ──────────────────────────────────────────────

@router.get('/portal/employees')
def portal_employees(db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT id, name, department FROM erp.employees WHERE is_active=TRUE ORDER BY name')
    return [{'id': r[0], 'name': r[1], 'department': r[2]} for r in cur.fetchall()]

@router.post('/portal/login')
def portal_login(payload: PortalLoginRequest, db=Depends(get_db)):
    ident = payload.identifier.strip().lower()
    cur = db.cursor()
    # Match by full email, by email username part, or by employee name (case-insensitive, trimmed)
    cur.execute(
        '''SELECT id, name, department, position, portal_pin FROM erp.employees
           WHERE is_active=TRUE AND (
               (email <> '' AND LOWER(TRIM(email)) = %s)
               OR (email <> '' AND LOWER(SPLIT_PART(TRIM(email), '@', 1)) = %s)
               OR LOWER(TRIM(name)) = %s
           )
           LIMIT 1''',
        (ident, ident, ident),
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='No employee found with that name or email.')
    emp_id, name, dept, pos, pin = row
    if not pin:
        raise HTTPException(status_code=400, detail='No PIN set. Ask your admin to set a portal PIN.')
    if payload.pin != pin:
        raise HTTPException(status_code=400, detail='Incorrect PIN. Try again.')
    return {
        'token': create_employee_token(emp_id),
        'employee': {'id': emp_id, 'name': name, 'department': dept, 'position': pos},
    }

@router.get('/portal/status')
def portal_status(emp_id: int = Depends(require_employee_token), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute('SELECT name, department, position, shift_start, shift_end FROM erp.employees WHERE id=%s', (emp_id,))
    emp = cur.fetchone()
    if not emp:
        raise HTTPException(status_code=404, detail='Employee not found')
    name, dept, pos, sh_s, sh_e = emp
    today_str = _uae_now().strftime('%Y-%m-%d')
    cur.execute(
        'SELECT status, check_in, check_out, check_in_method, check_out_method FROM erp.attendance WHERE employee_id=%s AND attendance_date=%s',
        (emp_id, today_str),
    )
    att = cur.fetchone()
    return {
        'employee':         {'id': emp_id, 'name': name, 'department': dept, 'position': pos,
                              'shift_start': str(sh_s)[:5] if sh_s else '09:00',
                              'shift_end':   str(sh_e)[:5] if sh_e else '18:00'},
        'today':            today_str,
        'status':           att[0] if att else 'not_marked',
        'check_in':         str(att[1])[:5] if att and att[1] else None,
        'check_out':        str(att[2])[:5] if att and att[2] else None,
        'check_in_method':  att[3] if att else None,
        'check_out_method': att[4] if att else None,
        'office_lat':       OFFICE_LAT,
        'office_lng':       OFFICE_LNG,
        'geofence_m':       GEOFENCE_M,
    }

@router.post('/portal/checkin')
def portal_checkin(payload: PortalCheckRequest, emp_id: int = Depends(require_employee_token), db=Depends(get_db)):
    dist = _haversine(payload.lat, payload.lng, OFFICE_LAT, OFFICE_LNG)
    if dist > GEOFENCE_M and not payload.force:
        raise HTTPException(
            status_code=400,
            detail=f'outside_geofence:{dist:.0f}',
        )
    now     = _uae_now()
    today   = now.strftime('%Y-%m-%d')
    now_t   = now.strftime('%H:%M')
    cur = db.cursor()
    cur.execute('SELECT name, shift_start FROM erp.employees WHERE id=%s', (emp_id,))
    emp = cur.fetchone()
    if not emp:
        raise HTTPException(status_code=404, detail='Employee not found')
    name, shift_start = emp
    shift_str = str(shift_start)[:5] if shift_start else '09:00'
    att_status = 'late' if now_t > shift_str else 'present'
    cur.execute('''
        INSERT INTO erp.attendance
            (employee_id, employee_name, attendance_date, status, check_in,
             check_in_method, check_in_lat, check_in_lng)
        VALUES (%s,%s,%s,%s,%s,'gps',%s,%s)
        ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
            status          = EXCLUDED.status,
            check_in        = EXCLUDED.check_in,
            check_in_method = EXCLUDED.check_in_method,
            check_in_lat    = EXCLUDED.check_in_lat,
            check_in_lng    = EXCLUDED.check_in_lng,
            employee_name   = EXCLUDED.employee_name
        WHERE erp.attendance.check_in IS NULL
    ''', (emp_id, name, today, att_status, now_t, payload.lat, payload.lng))
    return {'status': att_status, 'check_in': now_t, 'distance_m': round(dist, 1)}

@router.post('/portal/checkout')
def portal_checkout(payload: PortalCheckRequest, emp_id: int = Depends(require_employee_token), db=Depends(get_db)):
    dist = _haversine(payload.lat, payload.lng, OFFICE_LAT, OFFICE_LNG)
    if dist > GEOFENCE_M and not payload.force:
        raise HTTPException(
            status_code=400,
            detail=f'outside_geofence:{dist:.0f}',
        )
    now   = _uae_now()
    today = now.strftime('%Y-%m-%d')
    now_t = now.strftime('%H:%M')
    cur = db.cursor()
    cur.execute(
        'SELECT id FROM erp.attendance WHERE employee_id=%s AND attendance_date=%s AND check_in IS NOT NULL',
        (emp_id, today),
    )
    if not cur.fetchone():
        raise HTTPException(status_code=400, detail='You must check in before checking out.')
    cur.execute('''
        UPDATE erp.attendance
        SET check_out=%s, check_out_method='gps', check_out_lat=%s, check_out_lng=%s
        WHERE employee_id=%s AND attendance_date=%s AND check_out IS NULL
    ''', (now_t, payload.lat, payload.lng, emp_id, today))
    return {'check_out': now_t, 'distance_m': round(dist, 1)}


@router.get('/summary')
def hr_summary(_=Depends(require_hr), db=Depends(get_db)):
    cur = db.cursor()
    cur.execute("SELECT COUNT(*) FROM erp.employees WHERE is_active=TRUE")
    total = cur.fetchone()[0]
    cur.execute("SELECT status, COUNT(*) FROM erp.attendance WHERE attendance_date=CURRENT_DATE GROUP BY status")
    counts = {r[0]: r[1] for r in cur.fetchall()}
    return {
        'total_employees': total,
        'present_today':   counts.get('present', 0),
        'absent_today':    counts.get('absent', 0),
        'late_today':      counts.get('late', 0),
        'half_day_today':  counts.get('half_day', 0),
        'leave_today':     counts.get('leave', 0),
    }
