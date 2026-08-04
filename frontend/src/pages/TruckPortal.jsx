import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8003/api`;
const api  = axios.create({ baseURL: BASE, timeout: 10000 });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('truck_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// Silent background GPS — never shown to driver
function useSilentGps(active) {
  const posRef   = useRef(null);
  const watchRef = useRef(null);

  useEffect(() => {
    if (!active || !navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      pos => { posRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude, speed: (pos.coords.speed || 0) * 3.6 }; },
      () => {},
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 8000 }
    );
    return () => {
      if (watchRef.current !== null) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; }
    };
  }, [active]);

  return posRef;
}

function useClockTick() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);
  return now;
}

function formatDuration(startStr) {
  if (!startStr) return '';
  const diff = Date.now() - new Date(startStr.replace(' ', 'T') + 'Z').getTime() + 4 * 3600000;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function TruckPortal() {
  const [phase, setPhase]               = useState('login');
  const [plate, setPlate]               = useState('');
  const [pin, setPin]                   = useState('');
  const [loginErr, setLoginErr]         = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [truckInfo, setTruckInfo]       = useState(null);
  const [activeTrip, setActiveTrip]     = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg]       = useState('');

  const pingIntervalRef = useRef(null);
  const posRef          = useSilentGps(phase === 'portal');
  const now             = useClockTick();

  // Resume saved session
  useEffect(() => {
    if (localStorage.getItem('truck_token')) resumeSession();
  }, []);

  // Start pinging once on duty
  useEffect(() => {
    if (phase === 'portal' && activeTrip) {
      startPinging();
    }
    return () => stopPinging();
  }, [phase, activeTrip?.id]);

  const resumeSession = async () => {
    try {
      const { data } = await api.get('/trucks/portal/status');
      setTruckInfo(data.truck);
      setActiveTrip(data.active_trip);
      setPhase('portal');
    } catch {
      localStorage.removeItem('truck_token');
    }
  };

  const startPinging = () => {
    stopPinging();
    pingIntervalRef.current = setInterval(async () => {
      const pos = posRef.current;
      // Send ping with whatever coords we have; null if GPS unavailable
      try {
        await api.post('/trucks/portal/ping', {
          lat:       pos?.lat ?? null,
          lng:       pos?.lng ?? null,
          speed_kmh: pos?.speed ?? 0,
        });
      } catch {}
    }, 30000);
  };

  const stopPinging = () => {
    if (pingIntervalRef.current) { clearInterval(pingIntervalRef.current); pingIntervalRef.current = null; }
  };

  const handlePinKey = key => {
    if (key === 'del') { setPin(p => p.slice(0, -1)); return; }
    if (pin.length < 4) setPin(p => p + key);
  };

  const handleLogin = async () => {
    if (!plate.trim()) { setLoginErr('Enter your truck number.'); return; }
    if (pin.length !== 4) { setLoginErr('Enter 4-digit PIN.'); return; }
    setLoginLoading(true); setLoginErr('');
    try {
      const { data } = await api.post('/trucks/portal/login', { plate_number: plate.trim(), pin });
      localStorage.setItem('truck_token', data.token);
      setTruckInfo(data.truck);
      const status = await api.get('/trucks/portal/status');
      setActiveTrip(status.data.active_trip);
      setPhase('portal');
    } catch (e) {
      setLoginErr(e.response?.data?.detail || 'Login failed. Check truck number and PIN.');
      setPin('');
    }
    setLoginLoading(false);
  };

  const handleStartDuty = async () => {
    setActionLoading(true); setActionMsg('');
    try {
      const { data } = await api.post('/trucks/portal/start-trip');
      // Send first ping immediately
      const pos = posRef.current;
      await api.post('/trucks/portal/ping', { lat: pos?.lat ?? null, lng: pos?.lng ?? null, speed_kmh: 0 }).catch(() => {});
      setActiveTrip({ id: data.trip_id, started_at: data.started_at, distance_km: 0, is_stopped: false });
      setActionMsg('Duty started. Have a safe trip!');
    } catch (e) {
      setActionMsg(e.response?.data?.detail || 'Could not start duty. Try again.');
    }
    setActionLoading(false);
  };

  const handleEndDuty = async () => {
    setActionLoading(true); setActionMsg('');
    try {
      await api.post('/trucks/portal/end-trip');
      stopPinging();
      setActionMsg('Duty ended. Good work today!');
      setActiveTrip(null);
    } catch (e) {
      setActionMsg(e.response?.data?.detail || 'Could not end duty. Try again.');
    }
    setActionLoading(false);
  };

  const handleLogout = () => {
    stopPinging();
    localStorage.removeItem('truck_token');
    setPhase('login'); setPlate(''); setPin('');
    setTruckInfo(null); setActiveTrip(null); setActionMsg('');
  };

  const timeStr = now.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long' });
  const isOnDuty = !!activeTrip;

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#060a12', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: 'Inter,system-ui,sans-serif', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes orb1{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,-20px)}}
        @keyframes orb2{0%,100%{transform:translate(0,0)}50%{transform:translate(-20px,30px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(37,99,235,0.4)}50%{box-shadow:0 0 0 12px rgba(37,99,235,0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .pin-btn:active{transform:scale(0.93)!important}
        .plate-inp::placeholder{color:rgba(100,120,160,0.5)}
      `}</style>

      {/* Animated orbs */}
      <div style={{ position:'absolute', top:'-15%', left:'-10%', width:350, height:350, borderRadius:'50%', background:'radial-gradient(circle,rgba(37,99,235,0.2) 0%,transparent 70%)', animation:'orb1 9s ease-in-out infinite', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-15%', right:'-10%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.15) 0%,transparent 70%)', animation:'orb2 11s ease-in-out infinite', pointerEvents:'none' }} />

      {/* ── LOGIN ── */}
      {phase === 'login' && (
        <div style={{ width: '100%', maxWidth: 360, animation:'fadeUp 0.5s ease both' }}>

          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(135deg,#1d4ed8,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 12px 40px rgba(29,78,216,0.5)', animation:'pulse 2.5s ease-in-out infinite' }}>
              <span style={{ fontSize: 32 }}>🚛</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#f0f4ff', letterSpacing: -0.5 }}>Driver Portal</div>
            <div style={{ fontSize: 13, color: 'rgba(100,120,160,0.8)', marginTop: 5 }}>Al Hazmi Meat Distribution</div>
          </div>

          {/* Card */}
          <div style={{ background: 'rgba(13,20,34,0.9)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 24, padding: '28px 24px', backdropFilter: 'blur(20px)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>

            {/* Truck number */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(100,120,160,0.8)', marginBottom: 8, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Truck Number</label>
            <input
              className="plate-inp"
              type="text" value={plate}
              onChange={e => { setPlate(e.target.value.toUpperCase()); setLoginErr(''); }}
              onKeyDown={e => e.key === 'Enter' && pin.length === 4 && handleLogin()}
              placeholder="e.g. DXB A71865"
              autoCorrect="off" autoCapitalize="characters" spellCheck={false}
              style={{ width: '100%', background: plate ? 'rgba(29,78,216,0.1)' : 'rgba(255,255,255,0.04)', border: `1.5px solid ${plate ? 'rgba(37,99,235,0.6)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 13, padding: '13px 16px', fontSize: 16, color: '#e8f0ff', outline: 'none', boxSizing: 'border-box', caretColor: '#3b82f6', letterSpacing: 2, marginBottom: 24, transition: 'all 0.2s', fontWeight: 600 }}
            />

            {/* PIN label */}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(100,120,160,0.8)', marginBottom: 14, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>Enter PIN</label>

            {/* PIN dots */}
            <div style={{ display: 'flex', gap: 18, justifyContent: 'center', padding: '4px 0 22px' }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: i < pin.length ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'transparent',
                  border: `2px solid ${i < pin.length ? '#3b82f6' : 'rgba(255,255,255,0.15)'}`,
                  transition: 'all 0.15s cubic-bezier(0.34,1.56,0.64,1)',
                  transform: i < pin.length ? 'scale(1.4)' : 'scale(1)',
                  boxShadow: i < pin.length ? '0 0 14px rgba(59,130,246,0.7)' : 'none',
                }} />
              ))}
            </div>

            {/* PIN pad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
              {['1','2','3','4','5','6','7','8','9','del','0','ok'].map(k => {
                const isDel = k === 'del', isOk = k === 'ok';
                const ready = isOk && pin.length === 4 && plate.trim();
                return (
                  <button key={k} type="button" className="pin-btn"
                    onClick={() => isOk ? handleLogin() : handlePinKey(isDel ? 'del' : k)}
                    disabled={loginLoading}
                    style={{
                      padding: '18px 0', borderRadius: 14,
                      fontSize: isOk ? 13 : 24, fontWeight: isOk ? 800 : 300,
                      cursor: loginLoading ? 'not-allowed' : 'pointer',
                      background: ready ? 'linear-gradient(135deg,#2563eb,#4f46e5)' : isDel ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${ready ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.07)'}`,
                      color: ready ? '#fff' : isOk ? 'rgba(255,255,255,0.2)' : '#c7d7f0',
                      boxShadow: ready ? '0 6px 24px rgba(37,99,235,0.5)' : 'none',
                      transition: 'all 0.12s ease',
                      letterSpacing: isOk ? 1 : 0,
                    }}>
                    {isDel ? '⌫' : isOk ? (loginLoading ? '…' : 'LOGIN') : k}
                  </button>
                );
              })}
            </div>

            {loginErr && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '11px 14px', color: '#fca5a5', fontSize: 13, textAlign: 'center', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                <span>⚠</span> {loginErr}
              </div>
            )}
          </div>

          <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:'rgba(255,255,255,0.1)' }}>Al Hazmi Meat Distribution</div>
        </div>
      )}

      {/* ── DUTY PORTAL ── */}
      {phase === 'portal' && truckInfo && (
        <div style={{ width: '100%', maxWidth: 360 }}>

          {/* Clock */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: '#e8f0ff', letterSpacing: -2, lineHeight: 1 }}>{timeStr}</div>
            <div style={{ fontSize: 14, color: '#3f4d6b', marginTop: 6, fontWeight: 500 }}>{dateStr}</div>
          </div>

          {/* Driver card */}
          <div style={{ background: '#0d1422', border: '1px solid #1a2440', borderRadius: 18, padding: '20px 22px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: '#111a2e', border: '1.5px solid #1a2440', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚛</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#e8f0ff', fontSize: 15 }}>{truckInfo.driver_name || 'Driver'}</div>
                  <div style={{ fontSize: 12, color: '#3f4d6b', marginTop: 1, letterSpacing: 0.5 }}>{truckInfo.plate_number}</div>
                </div>
              </div>
              <button onClick={handleLogout}
                style={{ background: 'transparent', border: '1px solid #1a2440', borderRadius: 8, padding: '6px 12px', color: '#3f4d6b', fontSize: 12, cursor: 'pointer' }}>
                Logout
              </button>
            </div>

            {/* Status row */}
            <div style={{ background: '#080c14', borderRadius: 11, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, color: '#3f4d6b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Status</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: isOnDuty ? '#10b981' : '#3f4d6b' }}>
                  {isOnDuty ? '● On Duty' : '○ Off Duty'}
                </div>
              </div>
              {isOnDuty && activeTrip?.started_at && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#3f4d6b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Duration</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#8ea8d8' }}>{formatDuration(activeTrip.started_at)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Message */}
          {actionMsg && (
            <div style={{ background: '#0d1422', border: '1px solid #1a2440', borderRadius: 11, padding: '12px 16px', color: '#8ea8d8', fontSize: 13, textAlign: 'center', marginBottom: 14 }}>
              {actionMsg}
            </div>
          )}

          {/* Main button */}
          {!isOnDuty ? (
            <button onClick={handleStartDuty} disabled={actionLoading}
              style={{ width: '100%', padding: '20px 0', borderRadius: 16, border: 'none', background: actionLoading ? '#111a2e' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', fontSize: 17, fontWeight: 800, letterSpacing: 1.5, cursor: actionLoading ? 'not-allowed' : 'pointer', boxShadow: actionLoading ? 'none' : '0 8px 28px rgba(37,99,235,0.45)', transition: 'all 0.15s' }}>
              {actionLoading ? 'Please wait…' : 'START DUTY'}
            </button>
          ) : (
            <button onClick={handleEndDuty} disabled={actionLoading}
              style={{ width: '100%', padding: '20px 0', borderRadius: 16, border: '1px solid #1a2440', background: '#0d1422', color: '#ef4444', fontSize: 17, fontWeight: 800, letterSpacing: 1.5, cursor: actionLoading ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
              {actionLoading ? 'Please wait…' : 'END DUTY'}
            </button>
          )}

          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: '#1a2440' }}>
            Al Hazmi Meat Distribution
          </div>
        </div>
      )}
    </div>
  );
}
