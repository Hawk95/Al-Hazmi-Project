import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTrucks, getTruckLive, getTruckTrips, getTripRoute, createTruck, updateTruck, deleteTruck } from '../api/erp';

// Leaflet is loaded lazily inside useEffect — never at module scope
let L = null;
let TRUCK_ICON = null;
let STOP_ICON  = null;

async function ensureLeaflet() {
  if (L) return;
  const mod = await import('leaflet');
  await import('leaflet/dist/leaflet.css');
  L = mod.default ?? mod;
  // Fix default marker icon path resolution in Vite
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
  TRUCK_ICON = L.divIcon({
    html: '<div style="font-size:26px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">🚛</div>',
    iconSize: [32, 32], iconAnchor: [16, 16], className: '',
  });
  STOP_ICON = L.divIcon({
    html: '<div style="width:14px;height:14px;background:#f59e0b;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5)"></div>',
    iconSize: [14, 14], iconAnchor: [7, 7], className: '',
  });
}

function timeSince(dt) {
  if (!dt) return '—';
  const diff = Date.now() - new Date(dt.replace(' ', 'T') + 'Z').getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function TruckTracking() {
  const navigate = useNavigate();
  const mapRef     = useRef(null);
  const mapInst    = useRef(null);
  const markersRef = useRef({});
  const routeRef   = useRef(null);

  const [trucks, setTrucks]       = useState([]);
  const [live, setLive]           = useState([]);
  const [selected, setSelected]   = useState(null);
  const [trips, setTrips]         = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [route, setRoute]         = useState(null);
  const [tab, setTab]             = useState('live');   // live | trips | manage
  const [loading, setLoading]     = useState(false);

  // Manage modal
  const [modal, setModal]         = useState(null);   // null | 'add' | 'edit'
  const [form, setForm]           = useState({ plate_number: '', driver_name: '', driver_phone: '', portal_pin: '', is_active: true });
  const [editId, setEditId]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [saveErr, setSaveErr]     = useState('');

  // Init map — load Leaflet lazily so it never runs at module scope
  useEffect(() => {
    let cancelled = false;
    ensureLeaflet().then(() => {
      if (cancelled || mapInst.current || !mapRef.current) return;
      mapInst.current = L.map(mapRef.current, { center: [25.2697, 55.3337], zoom: 12, zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19,
      }).addTo(mapInst.current);
    });
    return () => {
      cancelled = true;
      mapInst.current?.remove();
      mapInst.current = null;
    };
  }, []);

  // Load trucks list and start live polling
  useEffect(() => {
    loadTrucks();
    loadLive();
    const interval = setInterval(loadLive, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadTrucks = async () => {
    try { const data = await getTrucks(); setTrucks(data); } catch {}
  };

  const loadLive = async () => {
    try {
      const data = await getTruckLive();
      setLive(data);
      updateMapMarkers(data);
    } catch {}
  };

  const updateMapMarkers = (liveData) => {
    if (!mapInst.current) return;
    const seen = new Set();
    liveData.forEach(t => {
      if (!t.lat || !t.lng) return;
      seen.add(t.id);
      if (markersRef.current[t.id]) {
        markersRef.current[t.id].setLatLng([t.lat, t.lng]);
        markersRef.current[t.id].getPopup()?.setContent(markerPopup(t));
      } else {
        const m = L.marker([t.lat, t.lng], { icon: TRUCK_ICON })
          .addTo(mapInst.current)
          .bindPopup(markerPopup(t))
          .on('click', () => selectTruck(t.id));
        markersRef.current[t.id] = m;
      }
    });
    // Remove stale markers
    Object.keys(markersRef.current).forEach(id => {
      if (!seen.has(Number(id))) { markersRef.current[id].remove(); delete markersRef.current[id]; }
    });
  };

  const markerPopup = t => `
    <div style="font-family:system-ui;padding:4px 2px;min-width:160px">
      <div style="font-weight:700;font-size:14px;margin-bottom:4px">🚛 ${t.plate_number}</div>
      <div style="font-size:12px;color:#555">${t.driver_name || 'No driver'}</div>
      <div style="font-size:11px;color:#888;margin-top:4px">
        ${t.trip_status === 'active' ? `▶ Moving · ${t.distance_km} km · ${t.speed_kmh} km/h` : 'No active trip'}
      </div>
      <div style="font-size:10px;color:#aaa;margin-top:3px">Last seen: ${timeSince(t.last_seen)}</div>
    </div>`;

  const selectTruck = async (truckId) => {
    setSelected(truckId);
    setTab('trips');
    setRoute(null);
    setActiveTrip(null);
    clearRoute();
    setLoading(true);
    try {
      const data = await getTruckTrips(truckId);
      setTrips(data);
      // Auto-load most recent active trip
      const active = data.find(t => t.status === 'active');
      if (active) loadRoute(active.id);
    } catch {}
    setLoading(false);
  };

  const loadRoute = async (tripId) => {
    setActiveTrip(tripId);
    clearRoute();
    try {
      const data = await getTripRoute(tripId);
      setRoute(data);
      drawRoute(data);
    } catch {}
  };

  const clearRoute = () => {
    if (routeRef.current) { routeRef.current.forEach(l => l.remove()); routeRef.current = null; }
  };

  const drawRoute = (data) => {
    if (!mapInst.current || !data.pings.length) return;
    const layers = [];
    const coords = data.pings.map(p => [p.lat, p.lng]);
    layers.push(L.polyline(coords, { color: '#6366f1', weight: 3, opacity: 0.8 }).addTo(mapInst.current));

    // Start marker
    const start = data.pings[0];
    layers.push(L.circleMarker([start.lat, start.lng], { radius: 8, fillColor: '#10b981', color: '#fff', weight: 2, fillOpacity: 1 })
      .bindPopup('Trip start').addTo(mapInst.current));

    // End marker
    const end = data.pings[data.pings.length - 1];
    layers.push(L.circleMarker([end.lat, end.lng], { radius: 8, fillColor: '#ef4444', color: '#fff', weight: 2, fillOpacity: 1 })
      .bindPopup('Last known position').addTo(mapInst.current));

    // Stops
    data.stops.forEach((s, i) => {
      const popup = `<div style="font-family:system-ui;padding:4px"><b>Stop ${i+1}</b><br>${s.arrived?.slice(11,16)} → ${s.departed?.slice(11,16) || 'still here'}<br>${s.duration_min ? `${s.duration_min} min` : 'ongoing'}${s.note ? `<br><i>${s.note}</i>` : ''}</div>`;
      layers.push(L.marker([s.lat, s.lng], { icon: STOP_ICON }).bindPopup(popup).addTo(mapInst.current));
    });

    routeRef.current = layers;
    if (coords.length > 1) mapInst.current.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });
    else mapInst.current.setView(coords[0], 15);
  };

  // Truck management
  const openAdd = () => {
    setForm({ plate_number: '', driver_name: '', driver_phone: '', portal_pin: '', is_active: true });
    setEditId(null); setSaveErr(''); setModal('add');
  };
  const openEdit = (t) => {
    setForm({ plate_number: t.plate_number, driver_name: t.driver_name || '', driver_phone: t.driver_phone || '', portal_pin: t.portal_pin || '', is_active: t.is_active });
    setEditId(t.id); setSaveErr(''); setModal('edit');
  };
  const handleSave = async () => {
    if (!form.plate_number.trim()) { setSaveErr('Plate number is required.'); return; }
    setSaving(true); setSaveErr('');
    try {
      if (editId) await updateTruck(editId, form);
      else await createTruck(form);
      await loadTrucks();
      setModal(null);
    } catch (e) {
      setSaveErr(e.response?.data?.detail || e.message || 'Failed to save. Check your connection.');
    }
    setSaving(false);
  };
  const handleDelete = async (id) => {
    if (!confirm('Delete this truck?')) return;
    try { await deleteTruck(id); await loadTrucks(); } catch {}
  };

  const selectedTruck = trucks.find(t => t.id === selected) || live.find(t => t.id === selected);
  const liveTruck = live.find(t => t.id === selected);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f1117', fontFamily: 'Inter,system-ui,sans-serif', overflow: 'hidden' }}>

      {/* ── LEFT PANEL ── */}
      <div style={{ width: 320, flexShrink: 0, background: '#14151f', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => navigate('/dashboard')} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 7, padding: '5px 10px', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>← Back</button>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#f2f2f7' }}>Fleet Tracking</span>
            </div>
            <button onClick={openAdd} style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: 7, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Truck</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {['live','trips','manage'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: tab === t ? 'rgba(99,102,241,0.2)' : 'transparent', color: tab === t ? '#818cf8' : '#4b5563', textTransform: 'capitalize' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── LIVE TAB ── */}
        {tab === 'live' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {live.length === 0 && (
              <div style={{ textAlign: 'center', color: '#374151', fontSize: 13, padding: '40px 20px' }}>No trucks with GPS data yet.<br/>Add trucks and share the driver portal link.</div>
            )}
            {live.map(t => (
              <div key={t.id} onClick={() => selectTruck(t.id)}
                style={{ padding: '12px 14px', borderRadius: 10, marginBottom: 4, cursor: 'pointer', background: selected === t.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selected === t.id ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)'}`, transition: 'all 0.12s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14, letterSpacing: 0.5 }}>🚛 {t.plate_number}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: t.trip_status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: t.trip_status === 'active' ? '#10b981' : '#6b7280' }}>
                    {t.trip_status === 'active' ? '▶ Active' : 'Offline'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{t.driver_name || 'No driver assigned'}</div>
                {t.trip_status === 'active' && (
                  <div style={{ fontSize: 11, color: '#4b5563', marginTop: 4 }}>{t.speed_kmh} km/h · {t.distance_km} km today</div>
                )}
                <div style={{ fontSize: 10, color: '#374151', marginTop: 2 }}>Last seen {timeSince(t.last_seen)}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── TRIPS TAB ── */}
        {tab === 'trips' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {!selected && <div style={{ textAlign: 'center', color: '#374151', fontSize: 13, padding: '40px 20px' }}>Select a truck from the Live tab to see trips.</div>}
            {selected && selectedTruck && (
              <div style={{ padding: '10px 14px', marginBottom: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }}>
                <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>🚛 {selectedTruck.plate_number}</div>
                <div style={{ fontSize: 12, color: '#818cf8', marginTop: 2 }}>{selectedTruck.driver_name || 'No driver'}</div>
              </div>
            )}
            {loading && <div style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', padding: 20 }}>Loading…</div>}
            {!loading && trips.map(t => (
              <div key={t.id} onClick={() => loadRoute(t.id)}
                style={{ padding: '11px 14px', borderRadius: 10, marginBottom: 4, cursor: 'pointer', background: activeTrip === t.id ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${activeTrip === t.id ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)'}`, transition: 'all 0.12s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{t.started_at?.slice(0, 10)}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: t.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.12)', color: t.status === 'active' ? '#10b981' : '#6b7280' }}>
                    {t.status === 'active' ? '▶ Live' : 'Done'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>
                  {t.started_at?.slice(11, 16)} → {t.ended_at?.slice(11, 16) || 'ongoing'}
                  &nbsp;·&nbsp;{t.distance_km} km&nbsp;·&nbsp;{t.stop_count} stops
                </div>
              </div>
            ))}
            {!loading && selected && trips.length === 0 && (
              <div style={{ textAlign: 'center', color: '#374151', fontSize: 13, padding: '30px 20px' }}>No trips recorded yet.</div>
            )}
          </div>
        )}

        {/* ── MANAGE TAB ── */}
        {tab === 'manage' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {trucks.map(t => (
              <div key={t.id} style={{ padding: '11px 14px', borderRadius: 10, marginBottom: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 13, letterSpacing: 0.5 }}>🚛 {t.plate_number}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{t.driver_name || 'No driver'} · PIN: {t.portal_pin || '—'}</div>
                    <div style={{ fontSize: 11, color: '#374151', marginTop: 1 }}>{t.driver_phone || ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openEdit(t)} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 6, padding: '5px 10px', color: '#9ca3af', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDelete(t.id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6, padding: '5px 10px', color: '#f87171', fontSize: 11, cursor: 'pointer' }}>Del</button>
                  </div>
                </div>
              </div>
            ))}
            {trucks.length === 0 && <div style={{ textAlign: 'center', color: '#374151', fontSize: 13, padding: '40px 20px' }}>No trucks yet. Click + Truck to add one.</div>}
          </div>
        )}

        {/* Driver portal link */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 10, color: '#374151', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Driver Portal Link</div>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 7, padding: '7px 10px', fontSize: 11, color: '#6b7280', wordBreak: 'break-all', cursor: 'pointer' }}
            onClick={() => { navigator.clipboard?.writeText(window.location.origin + '/truck-portal'); }}>
            {window.location.origin}/truck-portal
            <span style={{ color: '#374151', marginLeft: 6 }}>· tap to copy</span>
          </div>
        </div>
      </div>

      {/* ── MAP ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* Stop details overlay */}
        {route?.stops?.length > 0 && (
          <div style={{ position: 'absolute', bottom: 16, right: 16, background: 'rgba(15,17,23,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 16px', backdropFilter: 'blur(10px)', minWidth: 220, maxHeight: 220, overflowY: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Stops this trip</div>
            {route.stops.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', marginTop: 4, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 500 }}>Stop {i + 1} · {s.duration_min ? `${s.duration_min} min` : 'ongoing'}</div>
                  <div style={{ fontSize: 11, color: '#4b5563' }}>{s.arrived?.slice(11, 16)} → {s.departed?.slice(11, 16) || '—'}</div>
                  {s.note && <div style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>{s.note}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#1a1b26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '28px 26px', width: '100%', maxWidth: 420 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f2f2f7', marginBottom: 20 }}>{modal === 'add' ? 'Add New Truck' : 'Edit Truck'}</h3>
            {[
              { label: 'Plate Number', key: 'plate_number', placeholder: 'e.g. DXB-A-12345', upper: true },
              { label: 'Driver Name', key: 'driver_name', placeholder: 'e.g. Mohammed Ali' },
              { label: 'Driver Phone', key: 'driver_phone', placeholder: '+971 50 123 4567' },
              { label: 'Portal PIN (4 digits)', key: 'portal_pin', placeholder: 'e.g. 1234' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{f.label}</label>
                <input value={form[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: f.upper ? e.target.value.toUpperCase() : e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '10px 13px', fontSize: 14, color: '#f2f2f7', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            {saveErr && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 13px', color: '#fca5a5', fontSize: 13, marginTop: 12 }}>
                {saveErr}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '11px 0', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#6b7280', fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.plate_number.trim()}
                style={{ flex: 2, padding: '11px 0', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : modal === 'add' ? 'Add Truck' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
