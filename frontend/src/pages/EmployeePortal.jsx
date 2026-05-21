import { useState, useEffect, useRef, useCallback } from 'react';
import { portalLogin, portalGetStatus, portalCheckIn, portalCheckOut } from '../api/erp';

const OFFICE_LAT  = 25.269916;
const OFFICE_LNG  = 55.333817;
const GEOFENCE_M  = 50;

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const p1 = (lat1 * Math.PI) / 180, p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DEPT_COLOR = {
  Management: '#a78bfa', Drivers: '#60a5fa', Warehouse: '#fb923c',
  Sales: '#34d399', Office: '#e879f9', Other: '#9ca3af',
};

const STATUS_CFG = {
  not_marked: { label: 'Not Marked', color: '#6b7280', bg: 'rgba(107,114,128,0.18)' },
  present:    { label: 'Present',    color: '#10b981', bg: 'rgba(16,185,129,0.18)'  },
  late:       { label: 'Late',       color: '#f59e0b', bg: 'rgba(245,158,11,0.18)'  },
  absent:     { label: 'Absent',     color: '#ef4444', bg: 'rgba(239,68,68,0.18)'   },
  half_day:   { label: 'Half Day',   color: '#3b82f6', bg: 'rgba(59,130,246,0.18)'  },
  leave:      { label: 'On Leave',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.18)'  },
};

export default function EmployeePortal() {
  const [phase, setPhase]               = useState('login');
  const [identifier, setIdentifier]     = useState('');
  const [pin, setPin]                   = useState('');
  const [loginErr, setLoginErr]         = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [empInfo, setEmpInfo]           = useState(null);
  const [attStatus, setAttStatus]       = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [gps, setGps]                   = useState(null);
  const [gpsLoading, setGpsLoading]     = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg]       = useState('');
  const [actionErr, setActionErr]       = useState('');
  const [confirmOutside, setConfirmOutside] = useState(false);

  const gpsWatchRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('emp_token');
    if (saved) resumeSession();
  }, []);

  const resumeSession = () => {
    setStatusLoading(true);
    portalGetStatus()
      .then(data => { setEmpInfo(data.employee); setAttStatus(data); setPhase('portal'); })
      .catch(() => localStorage.removeItem('emp_token'))
      .finally(() => setStatusLoading(false));
  };

  const startGpsWatch = useCallback(() => {
    if (!navigator.geolocation) { setGps({ error: 'GPS not available on this device.' }); return; }
    setGpsLoading(true);
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const dist = haversine(pos.coords.latitude, pos.coords.longitude, OFFICE_LAT, OFFICE_LNG);
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, dist: Math.round(dist), accuracy: Math.round(pos.coords.accuracy) });
        setGpsLoading(false);
      },
      err => {
        const msgs = {
          1: 'Location permission denied. Tap the 🔒 icon in your browser address bar → Site settings → Location → Allow, then refresh.',
          2: 'Location signal unavailable. Make sure device location/GPS is turned on.',
          3: 'Location timed out. Move closer to a window and try again.',
        };
        setGps({ error: msgs[err.code] || 'GPS error.' });
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
  }, []);

  const stopGpsWatch = useCallback(() => {
    if (gpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (phase === 'portal') startGpsWatch();
    return () => stopGpsWatch();
  }, [phase]);

  const handlePinKey = key => {
    if (key === 'del') { setPin(p => p.slice(0, -1)); return; }
    if (pin.length < 4) setPin(p => p + key);
  };

  const handleLogin = async () => {
    if (!identifier.trim()) { setLoginErr('Enter your name or Gmail address.'); return; }
    if (pin.length !== 4) { setLoginErr('Enter your 4-digit PIN.'); return; }
    setLoginLoading(true); setLoginErr('');
    try {
      const data = await portalLogin({ identifier: identifier.trim(), pin });
      localStorage.setItem('emp_token', data.token);
      setEmpInfo(data.employee);
      const status = await portalGetStatus();
      setAttStatus(status);
      setPhase('portal');
    } catch (err) {
      setLoginErr(err.response?.data?.detail || 'Login failed. Check your name/email and PIN.');
      setPin('');
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('emp_token');
    stopGpsWatch();
    setPhase('login'); setIdentifier(''); setPin(''); setGps(null);
    setEmpInfo(null); setAttStatus(null);
    setActionMsg(''); setActionErr(''); setConfirmOutside(false);
  };

  const handleAction = async (force = false) => {
    const noGps = !gps || !!gps.error;

    // If outside geofence and not forced, show confirmation instead
    if (!noGps && gps.dist > GEOFENCE_M && !force) {
      setConfirmOutside(true);
      return;
    }

    setConfirmOutside(false);
    setActionLoading(true); setActionErr(''); setActionMsg('');
    try {
      // Send null coords when GPS is unavailable — backend marks as 'manual'
      const body = noGps
        ? { lat: null, lng: null, force: true }
        : { lat: gps.lat, lng: gps.lng, force };

      if (!attStatus?.check_in) {
        const res = await portalCheckIn(body);
        const tag = noGps ? ' (no GPS)' : force ? ' (remote)' : '';
        setActionMsg(`Checked in at ${res.check_in} — ${res.status === 'late' ? 'Late' : 'On time'}${tag}`);
      } else if (!attStatus?.check_out) {
        const res = await portalCheckOut(body);
        const tag = noGps ? ' (no GPS)' : force ? ' (remote)' : '';
        setActionMsg(`Checked out at ${res.check_out}${tag}`);
      }
      const updated = await portalGetStatus();
      setAttStatus(updated);
    } catch (err) {
      const detail = err.response?.data?.detail || '';
      if (detail.startsWith('outside_geofence:')) {
        const dist = detail.split(':')[1];
        setConfirmOutside(true);
        setGps(prev => prev ? { ...prev, dist: parseInt(dist) } : prev);
      } else {
        setActionErr(detail || 'Action failed. Try again.');
      }
    }
    setActionLoading(false);
  };

  const inRange    = gps && !gps.error && gps.dist <= GEOFENCE_M;
  const noGps      = !gps || !!gps.error;
  const checkedIn  = !!attStatus?.check_in;
  const checkedOut = !!attStatus?.check_out;
  const actionDone = checkedIn && checkedOut;

  const sc = STATUS_CFG[attStatus?.status] || STATUS_CFG.not_marked;
  const dayLabel = attStatus?.today
    ? new Date(attStatus.today + 'T00:00:00').toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const deptColor = DEPT_COLOR[empInfo?.department] || '#9ca3af';

  // ── GPS indicator config
  const gpsState = gps?.error ? 'error' : gpsLoading ? 'loading' : !gps ? 'waiting' : inRange ? 'in' : 'out';
  const gpsCfg = {
    error:   { icon: '📵', color: '#f59e0b', border: 'rgba(245,158,11,0.3)',  bg: 'rgba(245,158,11,0.07)',  note: 'GPS unavailable — attendance will be marked manually' },
    loading: { icon: '⏳', color: '#9ca3af', border: 'rgba(255,255,255,0.1)', bg: 'rgba(255,255,255,0.03)', note: null },
    waiting: { icon: '📍', color: '#6b7280', border: 'rgba(255,255,255,0.08)', bg: 'rgba(255,255,255,0.02)', note: null },
    in:      { icon: '✅', color: '#10b981', border: 'rgba(16,185,129,0.35)',  bg: 'rgba(16,185,129,0.07)',  note: null },
    out:     { icon: '⚠️', color: '#f59e0b', border: 'rgba(245,158,11,0.35)', bg: 'rgba(245,158,11,0.07)',  note: null },
  }[gpsState];

  // ── Action button config — never disabled just because GPS is missing
  const btnDisabled = actionLoading;
  const baseLabel   = checkedIn ? 'CHECK OUT' : 'CHECK IN';
  const btnLabel    = actionLoading ? 'Processing…' : noGps ? `${baseLabel} (NO GPS)` : baseLabel;
  const btnColor    = checkedIn
    ? (inRange || noGps ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#f97316,#ea580c)')
    : (inRange || noGps ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'linear-gradient(135deg,#6366f1,#4f46e5)');
  const btnShadow = checkedIn ? '0 6px 24px rgba(245,158,11,0.4)' : '0 6px 24px rgba(59,130,246,0.4)';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#0b0b14 0%,#11111c 60%,#141420 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── LOGIN PHASE ── */}
      {phase === 'login' && (
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 66, height: 66, borderRadius: 20, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 22, fontWeight: 800, color: '#fff', boxShadow: '0 10px 30px rgba(59,130,246,0.4)' }}>AH</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: '#f2f2f7', letterSpacing: -0.3 }}>Employee Portal</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 5 }}>Al Hazmi Meat Distribution</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 22, padding: '28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>

            {/* Identifier input */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Name or Gmail</label>
              <input
                type="text"
                value={identifier}
                onChange={e => { setIdentifier(e.target.value); setLoginErr(''); }}
                onKeyDown={e => e.key === 'Enter' && pin.length === 4 && handleLogin()}
                placeholder="e.g. john.doe or john@gmail.com"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: `1.5px solid ${identifier ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.11)'}`, borderRadius: 12, padding: '12px 14px', fontSize: 15, color: '#f2f2f7', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s', caretColor: '#3b82f6' }}
              />
            </div>

            {/* PIN label */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>4-Digit PIN</label>

            {/* PIN dots */}
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', padding: '12px 0 18px' }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: i < pin.length ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                  border: `2px solid ${i < pin.length ? '#3b82f6' : 'rgba(255,255,255,0.18)'}`,
                  transition: 'all 0.12s',
                  transform: i < pin.length ? 'scale(1.25)' : 'scale(1)',
                  boxShadow: i < pin.length ? '0 0 10px rgba(59,130,246,0.6)' : 'none',
                }} />
              ))}
            </div>

            {/* PIN pad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              {['1','2','3','4','5','6','7','8','9','del','0','ok'].map(k => {
                const isDel = k === 'del', isOk = k === 'ok';
                const okReady = isOk && pin.length === 4 && identifier.trim();
                return (
                  <button key={k} type="button"
                    onClick={() => isOk ? handleLogin() : handlePinKey(isDel ? 'del' : k)}
                    disabled={loginLoading}
                    style={{
                      padding: '16px 0', borderRadius: 13, fontSize: isOk ? 13 : 21, fontWeight: isOk ? 700 : 500,
                      cursor: loginLoading ? 'not-allowed' : 'pointer',
                      background: okReady
                        ? 'linear-gradient(135deg,#3b82f6,#2563eb)'
                        : isDel ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.07)',
                      border: okReady ? 'none' : '1px solid rgba(255,255,255,0.09)',
                      color: okReady ? '#fff' : isOk ? '#374151' : '#f2f2f7',
                      boxShadow: okReady ? '0 4px 18px rgba(59,130,246,0.4)' : 'none',
                      transition: 'all 0.12s',
                      WebkitTapHighlightColor: 'transparent',
                    }}>
                    {isDel ? '⌫' : isOk ? (loginLoading ? '…' : 'LOG IN') : k}
                  </button>
                );
              })}
            </div>

            {loginErr && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '11px 14px', color: '#f87171', fontSize: 13, textAlign: 'center' }}>
                {loginErr}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#2d2d3a' }}>
            📍 Attendance locked to office location ({GEOFENCE_M}m radius)
          </div>
        </div>
      )}

      {/* ── PORTAL PHASE ── */}
      {phase === 'portal' && empInfo && attStatus && (
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Header: avatar + name + logout */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 50, height: 50, borderRadius: 15, background: `${deptColor}1e`, border: `2px solid ${deptColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: deptColor }}>
                {empInfo.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#f2f2f7', fontSize: 16 }}>{empInfo.name}</div>
                <div style={{ fontSize: 12, color: deptColor, marginTop: 2 }}>{empInfo.department}{empInfo.position ? ` · ${empInfo.position}` : ''}</div>
              </div>
            </div>
            <button type="button" onClick={handleLogout}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 16px', color: '#6b7280', fontSize: 12, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
              Logout
            </button>
          </div>

          {/* Date */}
          <div style={{ fontSize: 12, color: '#4b5563', textAlign: 'center', marginBottom: 18, fontWeight: 500 }}>{dayLabel}</div>

          {/* Status card */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '18px 20px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Today's Attendance</span>
              <span style={{ padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: sc.bg, color: sc.color, letterSpacing: 0.2 }}>{sc.label}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Check In',  time: attStatus.check_in,  color: '#10b981', method: attStatus.check_in_method,  done: checkedIn  },
                { label: 'Check Out', time: attStatus.check_out, color: '#f59e0b', method: attStatus.check_out_method, done: checkedOut },
              ].map(col => (
                <div key={col.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '12px 14px', border: `1px solid ${col.done ? col.color + '28' : 'rgba(255,255,255,0.04)'}` }}>
                  <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 6, fontWeight: 600 }}>{col.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: col.done ? col.color : '#2a2a3a', letterSpacing: -0.5 }}>{col.time || '—'}</div>
                  {col.method === 'gps' && <div style={{ fontSize: 10, color: '#4b5563', marginTop: 4 }}>📍 GPS verified</div>}
                  {col.method === 'manual' && <div style={{ fontSize: 10, color: '#4b5563', marginTop: 4 }}>✏️ Manual</div>}
                </div>
              ))}
            </div>
          </div>

          {/* GPS status bar */}
          <div style={{ background: gpsCfg.bg, border: `1px solid ${gpsCfg.border}`, borderRadius: 14, padding: '13px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{gpsCfg.icon}</div>
            <div style={{ flex: 1 }}>
              {gpsLoading && <div style={{ fontSize: 13, color: '#9ca3af' }}>Getting your location…</div>}
              {gps?.error && (
                <>
                  <div style={{ fontSize: 13, color: '#fbbf24', fontWeight: 700 }}>Location not available</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3, lineHeight: 1.5 }}>{gps.error}</div>
                </>
              )}
              {gps && !gps.error && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: gpsCfg.color }}>
                    {inRange ? '✓ You are at the office' : `${gps.dist}m from office`}
                  </div>
                  <div style={{ fontSize: 11, color: '#4b5563', marginTop: 3 }}>
                    {inRange ? `Within ${GEOFENCE_M}m — attendance allowed` : `Outside ${GEOFENCE_M}m — confirmation required`}
                    {gps.accuracy ? ` · ±${gps.accuracy}m accuracy` : ''}
                  </div>
                </>
              )}
              {!gps && !gpsLoading && <div style={{ fontSize: 13, color: '#4b5563' }}>Waiting for GPS signal…</div>}
            </div>
          </div>

          {/* Retry location button */}
          {gps?.error && (
            <button type="button" onClick={() => { setGps(null); stopGpsWatch(); setTimeout(startGpsWatch, 100); }}
              style={{ width: '100%', padding: '12px 0', borderRadius: 12, marginBottom: 14, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', fontSize: 13, fontWeight: 700, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
              🔄 Retry Location
            </button>
          )}

          {/* Outside-geofence confirmation card */}
          {confirmOutside && gps && !gps.error && (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.35)', borderRadius: 16, padding: '18px 20px', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24', marginBottom: 6 }}>
                ⚠️ You are {gps.dist}m from office
              </div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16, lineHeight: 1.5 }}>
                You are outside the {GEOFENCE_M}m geofence. Your location will be recorded. Do you still want to mark attendance?
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button type="button" onClick={() => setConfirmOutside(false)}
                  style={{ padding: '12px 0', borderRadius: 11, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#9ca3af', fontSize: 14, fontWeight: 600, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                  Cancel
                </button>
                <button type="button" onClick={() => handleAction(true)}
                  style={{ padding: '12px 0', borderRadius: 11, background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(245,158,11,0.35)', WebkitTapHighlightColor: 'transparent' }}>
                  Mark Anyway
                </button>
              </div>
            </div>
          )}

          {/* Success / error messages */}
          {actionMsg && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 11, padding: '12px 16px', color: '#10b981', fontSize: 13, fontWeight: 600, textAlign: 'center', marginBottom: 14 }}>
              ✓ {actionMsg}
            </div>
          )}
          {actionErr && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 11, padding: '12px 16px', color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 14 }}>
              {actionErr}
            </div>
          )}

          {/* Main punch button */}
          {actionDone ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#10b981', fontSize: 16, fontWeight: 800 }}>
              ✓ Attendance complete for today
            </div>
          ) : !confirmOutside && (
            <button type="button" onClick={() => handleAction(false)}
              disabled={btnDisabled}
              style={{
                width: '100%', padding: '20px 0', borderRadius: 18, border: 'none',
                fontSize: 17, fontWeight: 900, letterSpacing: 1.5,
                cursor: btnDisabled ? 'not-allowed' : 'pointer',
                background: btnColor, color: '#fff', boxShadow: btnShadow,
                transition: 'all 0.15s', WebkitTapHighlightColor: 'transparent',
                opacity: btnDisabled ? 0.5 : 1,
              }}>
              {btnLabel}
              {!actionLoading && !inRange && !noGps && (
                <div style={{ fontSize: 11, fontWeight: 500, marginTop: 4, opacity: 0.8, letterSpacing: 0.3 }}>
                  {gps?.dist}m away — tap to confirm
                </div>
              )}
              {!actionLoading && noGps && (
                <div style={{ fontSize: 11, fontWeight: 500, marginTop: 4, opacity: 0.8, letterSpacing: 0.3 }}>
                  Manual — admin will verify
                </div>
              )}
            </button>
          )}

          {/* Shift info */}
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: '#2d2d3a' }}>
            Shift: {attStatus.employee?.shift_start || '09:00'} — {attStatus.employee?.shift_end || '18:00'}
          </div>
        </div>
      )}

      {/* Loading resume state */}
      {statusLoading && (
        <div style={{ color: '#4b5563', fontSize: 14 }}>Loading…</div>
      )}
    </div>
  );
}
