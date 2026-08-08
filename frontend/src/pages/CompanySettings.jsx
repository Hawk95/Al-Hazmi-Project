import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, updateSettings } from '../api/erp';
import { getCurrentUser } from '../api/auth';

const FIELD_GROUPS = [
  {
    title: 'Company Identity',
    icon: '🏢',
    fields: [
      { key: 'company_name',     label: 'Company Name',  placeholder: 'e.g. Al Hazmi Meat Distribution', type: 'text' },
      { key: 'company_phone',    label: 'Phone Number',  placeholder: '+971 4 123 4567',                 type: 'text' },
      { key: 'company_email',    label: 'Email Address', placeholder: 'info@company.com',                type: 'email' },
      { key: 'company_address',  label: 'Address',       placeholder: 'Dubai, UAE',                     type: 'text' },
      { key: 'company_logo_url', label: 'Logo URL',      placeholder: 'https://... (leave blank for default icon)', type: 'url' },
    ],
  },
  {
    title: 'GPS & Attendance Geofence',
    icon: '📍',
    fields: [
      { key: 'office_lat', label: 'Office Latitude',       placeholder: '25.269916', type: 'text' },
      { key: 'office_lng', label: 'Office Longitude',      placeholder: '55.333817', type: 'text' },
      { key: 'geofence_m', label: 'Geofence Radius (m)',   placeholder: '50',        type: 'number' },
    ],
  },
];

export default function CompanySettings() {
  const navigate  = useNavigate();
  const user      = getCurrentUser();
  const [values, setValues]   = useState({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [err,     setErr]     = useState('');

  useEffect(() => {
    getSettings()
      .then(data => { setValues(data); setLoading(false); })
      .catch(() => { setErr('Failed to load settings.'); setLoading(false); });
  }, []);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setErr('');
    try {
      await updateSettings(values);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setErr(e.response?.data?.detail || 'Failed to save settings.');
    }
    setSaving(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', fontFamily: 'Inter,system-ui,sans-serif', display: 'flex' }}>

      {/* Sidebar */}
      <div style={{ width: 220, background: '#14151f', borderRight: '1px solid rgba(255,255,255,0.07)', padding: '20px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 8 }}>
          <button onClick={() => navigate('/dashboard')}
            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 7, padding: '5px 12px', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
            ← Dashboard
          </button>
        </div>
        <div style={{ padding: '8px 16px', fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Settings</div>
        {[
          ['Company', '🏢'],
          ['GPS Geofence', '📍'],
        ].map(([label, icon]) => (
          <div key={label} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#818cf8', fontSize: 13, background: 'rgba(99,102,241,0.1)', borderRadius: 7, margin: '1px 8px', cursor: 'default' }}>
            <span>{icon}</span> {label}
          </div>
        ))}
        <div style={{ marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 12, color: '#374151' }}>
          {user?.sub}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        <div style={{ maxWidth: 680 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f2f2f7', margin: 0 }}>Company Settings</h1>
              <p style={{ fontSize: 13, color: '#4b5563', marginTop: 4 }}>Applies to all users in this system</p>
            </div>
            <button onClick={handleSave} disabled={saving || loading}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: saved ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.2s', minWidth: 110 }}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
            </button>
          </div>

          {err && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', color: '#fca5a5', fontSize: 13, marginBottom: 24 }}>
              ⚠ {err}
            </div>
          )}

          {loading ? (
            <div style={{ color: '#4b5563', fontSize: 14, textAlign: 'center', paddingTop: 60 }}>Loading…</div>
          ) : (
            FIELD_GROUPS.map(group => (
              <div key={group.title} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 28px', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <span style={{ fontSize: 20 }}>{group.icon}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>{group.title}</span>
                </div>

                {group.fields.map(f => (
                  <div key={f.key} style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      {f.label}
                    </label>
                    <input
                      type={f.type}
                      value={values[f.key] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#f2f2f7', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                      onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                      onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                    {f.key === 'company_logo_url' && values[f.key] && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src={values[f.key]} alt="Logo preview" style={{ height: 36, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }} onError={e => e.target.style.display = 'none'} />
                        <span style={{ fontSize: 11, color: '#4b5563' }}>Preview</span>
                      </div>
                    )}
                    {f.key === 'geofence_m' && (
                      <div style={{ fontSize: 11, color: '#374151', marginTop: 5 }}>
                        Employees must be within this distance from the office to clock in/out via GPS.
                      </div>
                    )}
                    {(f.key === 'office_lat' || f.key === 'office_lng') && (
                      <div style={{ fontSize: 11, color: '#374151', marginTop: 5 }}>
                        Find your coordinates at <span style={{ color: '#818cf8' }}>maps.google.com</span> → right-click on the office location.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
