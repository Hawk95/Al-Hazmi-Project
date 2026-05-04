import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2, Users,
  Search, Plus, X, Pencil, Trash2, RefreshCw, TrendingUp, CheckCircle2,
  XCircle, User, Phone, Mail, Calendar, ChevronDown, ChevronUp,
} from 'lucide-react';
import { getCurrentUser } from '../api/auth';
import {
  getSalesSummary, getSalesmen, createSalesman, updateSalesman, deleteSalesman,
  getDistributions, createDistribution, updateDistribution, deleteDistribution,
} from '../api/erp';

const EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'];
const MEAT_TYPES = ['Lamb', 'Beef', 'Chicken', 'Goat', 'Camel'];

const EMIRATE_COLOR = {
  'Dubai':          '#2563eb',
  'Abu Dhabi':      '#059669',
  'Sharjah':        '#7c3aed',
  'Ajman':          '#d97706',
  'Umm Al Quwain':  '#0891b2',
  'Ras Al Khaimah': '#be185d',
  'Fujairah':       '#dc2626',
};

const today = () => new Date().toISOString().slice(0, 10);

const S = {
  input: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#f2f2f7', outline: 'none', boxSizing: 'border-box' },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 500, color: '#9ca3af' },
  th: { padding: '11px 14px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', whiteSpace: 'nowrap' },
  td: { padding: '13px 14px', fontSize: 13, color: '#e5e7eb', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' },
};

function StatCard({ label, value, color, icon, sub }) {
  return (
    <div style={{ background: '#1e1e2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#f2f2f7', lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function SalesDistribution() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('log');
  const [summary, setSummary] = useState(null);
  const [salesmen, setSalesmen] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState(today());
  const [emirateFilter, setEmirateFilter] = useState('');
  const [salesmanFilter, setSalesmanFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [distModal, setDistModal] = useState(null);
  const [smModal, setSmModal] = useState(null);
  const [editingDist, setEditingDist] = useState(null);
  const [editingSm, setEditingSm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSmTarget, setDeleteSmTarget] = useState(null);

  const EMPTY_DIST = { salesman_id: '', distribution_date: today(), emirate: 'Dubai', meat_type: 'Lamb', quantity_kg: '', notes: '' };
  const EMPTY_SM = { name: '', phone: '', email: '', is_active: true };
  const [distForm, setDistForm] = useState(EMPTY_DIST);
  const [smForm, setSmForm] = useState(EMPTY_SM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const currentUser = getCurrentUser();
  const userEmail = currentUser?.sub || '';
  const displayName = userEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const initials = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(''), 2800); };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sum, sm, dist] = await Promise.all([
        getSalesSummary(),
        getSalesmen(),
        getDistributions(),
      ]);
      setSummary(sum);
      setSalesmen(sm);
      setDistributions(dist);
    } catch { showToast('Failed to load data', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  // ── Distribution modal ────────────────────────────────────────────────────
  const openCreateDist = () => { setDistForm(EMPTY_DIST); setEditingDist(null); setError(''); setDistModal(true); };
  const openEditDist = d => {
    setDistForm({
      salesman_id: String(d.salesman_id || ''),
      distribution_date: d.distribution_date || today(),
      emirate: d.emirate,
      meat_type: d.meat_type,
      quantity_kg: String(d.quantity_kg),
      notes: d.notes || '',
    });
    setEditingDist(d); setError(''); setDistModal(true);
  };

  const saveDist = async () => {
    if (!distForm.quantity_kg || isNaN(Number(distForm.quantity_kg))) { setError('Enter a valid quantity'); return; }
    if (!distForm.emirate) { setError('Select an emirate'); return; }
    setSaving(true); setError('');
    const payload = {
      salesman_id: distForm.salesman_id ? parseInt(distForm.salesman_id) : null,
      distribution_date: distForm.distribution_date,
      emirate: distForm.emirate,
      meat_type: distForm.meat_type,
      quantity_kg: parseFloat(distForm.quantity_kg),
      notes: distForm.notes || null,
    };
    try {
      if (!editingDist) {
        const created = await createDistribution(payload);
        setDistributions(prev => [created, ...prev]);
        showToast('Distribution recorded');
      } else {
        const updated = await updateDistribution(editingDist.id, payload);
        setDistributions(prev => prev.map(d => d.id === editingDist.id ? updated : d));
        showToast('Distribution updated');
      }
      setDistModal(null);
      getSalesSummary().then(setSummary).catch(() => {});
    } catch (e) { setError(e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const deleteDist = async () => {
    try {
      await deleteDistribution(deleteTarget.id);
      setDistributions(prev => prev.filter(d => d.id !== deleteTarget.id));
      showToast('Record deleted');
      getSalesSummary().then(setSummary).catch(() => {});
    } catch { showToast('Failed to delete', 'error'); }
    setDeleteTarget(null);
  };

  // ── Salesman modal ────────────────────────────────────────────────────────
  const openCreateSm = () => { setSmForm(EMPTY_SM); setEditingSm(null); setError(''); setSmModal(true); };
  const openEditSm = s => { setSmForm({ name: s.name, phone: s.phone || '', email: s.email || '', is_active: s.is_active }); setEditingSm(s); setError(''); setSmModal(true); };

  const saveSm = async () => {
    if (!smForm.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      if (!editingSm) {
        const created = await createSalesman(smForm);
        setSalesmen(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        showToast('Salesman added');
      } else {
        const updated = await updateSalesman(editingSm.id, smForm);
        setSalesmen(prev => prev.map(s => s.id === editingSm.id ? updated : s));
        showToast('Salesman updated');
      }
      setSmModal(null);
      getSalesSummary().then(setSummary).catch(() => {});
    } catch (e) { setError(e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const deleteSm = async () => {
    try {
      await deleteSalesman(deleteSmTarget.id);
      setSalesmen(prev => prev.filter(s => s.id !== deleteSmTarget.id));
      showToast('Salesman removed');
    } catch { showToast('Failed to delete', 'error'); }
    setDeleteSmTarget(null);
  };

  // ── Filtered distributions ────────────────────────────────────────────────
  const filtered = distributions.filter(d => {
    const q = search.toLowerCase();
    if (dateFilter && d.distribution_date !== dateFilter) return false;
    if (emirateFilter && d.emirate !== emirateFilter) return false;
    if (salesmanFilter && String(d.salesman_id) !== salesmanFilter) return false;
    if (q && !(d.salesman_name || '').toLowerCase().includes(q) && !d.emirate.toLowerCase().includes(q) && !d.meat_type.toLowerCase().includes(q)) return false;
    return true;
  });

  const todayTotal = filtered.reduce((s, d) => s + d.quantity_kg, 0);

  const sidebarBtn = (path, icon, label, active = false) => (
    <button type="button" onClick={() => navigate(path)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderRadius: 8, background: active ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: active ? '#f2f2f7' : '#6b7280', fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer', width: '100%', textAlign: 'left' }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#d1d5db'; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; } }}>
      {icon}{label}
    </button>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#13131a', color: '#f2f2f7', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Sidebar */}
      <aside style={{ width: 220, background: '#0f0f18', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>AH</div>
          <div><div style={{ fontSize: 13, fontWeight: 700, color: '#f2f2f7' }}>Al Hazmi</div><div style={{ fontSize: 10, color: '#4b5563' }}>Meat ERP</div></div>
        </div>
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 8px' }}>Main</div>
          {sidebarBtn('/dashboard', <LayoutDashboard size={15} strokeWidth={1.5} />, 'Overview')}
          {sidebarBtn('/inventory', <Package size={15} strokeWidth={1.5} />, 'Inventory')}
          {sidebarBtn('/orders', <ShoppingCart size={15} strokeWidth={1.5} />, 'Orders')}
          {sidebarBtn('/suppliers', <Truck size={15} strokeWidth={1.5} />, 'Suppliers')}
          {sidebarBtn('/deliveries', <MapPin size={15} strokeWidth={1.5} />, 'Deliveries')}
          {sidebarBtn('/sales', <TrendingUp size={15} strokeWidth={1.5} />, 'Sales Distribution', true)}
          <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 8px', marginTop: 8 }}>Analytics</div>
          {sidebarBtn('/reports', <BarChart2 size={15} strokeWidth={1.5} />, 'Reports')}
          <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 8px', marginTop: 8 }}>Admin</div>
          {sidebarBtn('/admin/users', <Users size={15} strokeWidth={1.5} />, 'User Management')}
        </nav>
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#d1d5db', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
            <div style={{ fontSize: 10, color: '#4b5563' }}>Al Hazmi ERP</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: '28px 32px', overflow: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f2f2f7', margin: 0 }}>Sales Distribution</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Track daily meat distribution across all 7 UAE emirates</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={loadAll} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button type="button" onClick={openCreateDist} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={14} strokeWidth={2} /> Record Distribution
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          <StatCard label="Active Salesmen" value={loading ? '—' : (summary?.active_salesmen ?? 0)} color="#6366f1" icon={<Users size={18} />} />
          <StatCard label="Distributed Today" value={loading ? '—' : `${(summary?.today_kg ?? 0).toFixed(1)} kg`} color="#10b981" icon={<TrendingUp size={18} />} sub={summary?.today_kg > 0 ? 'across all emirates' : ''} />
          <StatCard label="This Month" value={loading ? '—' : `${(summary?.month_kg ?? 0).toFixed(0)} kg`} color="#3b82f6" icon={<Calendar size={18} />} />
          <StatCard label="Top Emirate Today" value={loading ? '—' : (summary?.top_emirate_today || 'None')} color={EMIRATE_COLOR[summary?.top_emirate_today] || '#6b7280'} icon={<MapPin size={18} />} sub={summary?.per_emirate_today?.[summary.top_emirate_today] ? `${summary.per_emirate_today[summary.top_emirate_today].toFixed(1)} kg` : ''} />
        </div>

        {/* Emirates Breakdown */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Today's Distribution by Emirate</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 10 }}>
            {EMIRATES.map(em => {
              const kg = summary?.per_emirate_today?.[em] || 0;
              const color = EMIRATE_COLOR[em];
              return (
                <div key={em} style={{ background: '#1e1e2a', border: `1px solid ${kg > 0 ? color + '40' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: '14px 12px', textAlign: 'center', transition: 'border-color 0.2s' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', color }}><MapPin size={14} /></div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: kg > 0 ? '#f2f2f7' : '#4b5563', marginBottom: 4, lineHeight: 1.3 }}>{em}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: kg > 0 ? color : '#374151' }}>{kg > 0 ? `${kg.toFixed(1)}` : '—'}</div>
                  {kg > 0 && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>kg</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Salesman Performance Today */}
        {summary?.per_salesman_today?.length > 0 && (
          <div style={{ background: '#1e1e2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Salesman Performance — Today</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {summary.per_salesman_today.map((s, i) => {
                const maxKg = summary.per_salesman_today[0]?.kg || 1;
                const pct = maxKg > 0 ? (s.kg / maxKg) * 100 : 0;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{s.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#e5e7eb', fontWeight: 500 }}>{s.name}</span>
                        <span style={{ fontSize: 12, color: s.kg > 0 ? '#10b981' : '#4b5563', fontWeight: 600 }}>{s.kg > 0 ? `${s.kg.toFixed(1)} kg` : '—'}</span>
                      </div>
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: s.kg > 0 ? 'linear-gradient(90deg,#6366f1,#3b82f6)' : 'transparent', borderRadius: 4, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 0 }}>
          {[['log','Daily Log'], ['salesmen','Salesmen']].map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: tab === key ? '2px solid #6366f1' : '2px solid transparent', color: tab === key ? '#f2f2f7' : '#6b7280', fontSize: 13, fontWeight: tab === key ? 600 : 400, cursor: 'pointer', marginBottom: -1 }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Daily Log Tab ── */}
        {tab === 'log' && (
          <>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ ...S.input, width: 150 }} />
              <select value={emirateFilter} onChange={e => setEmirateFilter(e.target.value)} style={{ ...S.input, width: 160 }}>
                <option value="">All Emirates</option>
                {EMIRATES.map(em => <option key={em} value={em}>{em}</option>)}
              </select>
              <select value={salesmanFilter} onChange={e => setSalesmanFilter(e.target.value)} style={{ ...S.input, width: 170 }}>
                <option value="">All Salesmen</option>
                {salesmen.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
                <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...S.input, paddingLeft: 30 }} />
              </div>
              <button type="button" onClick={() => { setDateFilter(today()); setEmirateFilter(''); setSalesmanFilter(''); setSearch(''); }} style={{ padding: '9px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280', fontSize: 12, cursor: 'pointer' }}>Reset</button>
              <span style={{ fontSize: 12, color: '#4b5563', marginLeft: 4 }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''} · {todayTotal.toFixed(1)} kg total</span>
            </div>

            {/* Table */}
            <div style={{ background: '#1e1e2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>Salesman</th>
                    <th style={S.th}>Emirate</th>
                    <th style={S.th}>Meat Type</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Qty (kg)</th>
                    <th style={S.th}>Notes</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: '#4b5563', fontSize: 13 }}>Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: '#4b5563', fontSize: 13 }}>No records found — record your first distribution</td></tr>
                  ) : filtered.map(d => {
                    const eColor = EMIRATE_COLOR[d.emirate] || '#6b7280';
                    return (
                      <tr key={d.id} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={S.td}>
                          <div style={{ fontSize: 13, color: '#e5e7eb' }}>{d.distribution_date}</div>
                        </td>
                        <td style={S.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                              {(d.salesman_name || '?')[0].toUpperCase()}
                            </div>
                            <span style={{ color: '#e5e7eb', fontSize: 13 }}>{d.salesman_name || <span style={{ color: '#4b5563' }}>—</span>}</span>
                          </div>
                        </td>
                        <td style={S.td}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: `${eColor}15`, color: eColor, fontSize: 11, fontWeight: 600 }}>
                            <MapPin size={10} />{d.emirate}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: '#9ca3af', fontSize: 11, fontWeight: 500 }}>
                            {d.meat_type}
                          </span>
                        </td>
                        <td style={{ ...S.td, textAlign: 'right' }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>{d.quantity_kg.toFixed(1)}</span>
                          <span style={{ fontSize: 11, color: '#4b5563', marginLeft: 3 }}>kg</span>
                        </td>
                        <td style={S.td}>
                          <span style={{ fontSize: 12, color: '#6b7280', maxWidth: 180, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.notes || '—'}</span>
                        </td>
                        <td style={{ ...S.td, textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button type="button" title="Edit" onClick={() => openEditDist(d)} style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}><Pencil size={12} /></button>
                            <button type="button" title="Delete" onClick={() => setDeleteTarget(d)} style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={4} style={{ padding: '12px 14px', fontSize: 12, color: '#6b7280', borderTop: '1px solid rgba(255,255,255,0.07)' }}>Total for filtered view</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#10b981' }}>{todayTotal.toFixed(1)}</span>
                        <span style={{ fontSize: 11, color: '#4b5563', marginLeft: 3 }}>kg</span>
                      </td>
                      <td colSpan={2} style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}

        {/* ── Salesmen Tab ── */}
        {tab === 'salesmen' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button type="button" onClick={openCreateSm} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, background: 'linear-gradient(135deg,#059669,#10b981)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Plus size={14} strokeWidth={2} /> Add Salesman
              </button>
            </div>
            <div style={{ background: '#1e1e2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={S.th}>Salesman</th>
                    <th style={S.th}>Phone</th>
                    <th style={S.th}>Email</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Joined</th>
                    <th style={{ ...S.th, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salesmen.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: '#4b5563', fontSize: 13 }}>No salesmen yet — add your team</td></tr>
                  ) : salesmen.map(s => (
                    <tr key={s.id} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={S.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{s.name[0].toUpperCase()}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#f2f2f7' }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: '#4b5563' }}>ID #{s.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#9ca3af' }}><Phone size={11} />{s.phone || '—'}</div>
                      </td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#9ca3af' }}><Mail size={11} />{s.email || '—'}</div>
                      </td>
                      <td style={S.td}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: s.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.12)', color: s.is_active ? '#10b981' : '#6b7280', fontSize: 11, fontWeight: 600 }}>
                          {s.is_active ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={S.td}><span style={{ fontSize: 12, color: '#6b7280' }}>{s.created_at ? s.created_at.slice(0, 10) : '—'}</span></td>
                      <td style={{ ...S.td, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button type="button" title="Edit" onClick={() => openEditSm(s)} style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}><Pencil size={12} /></button>
                          <button type="button" title="Delete" onClick={() => setDeleteSmTarget(s)} style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* ── Distribution Modal ── */}
      {distModal && (
        <div onClick={() => setDistModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 520, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#f2f2f7' }}>{editingDist ? 'Edit Distribution' : 'Record Distribution'}</h2>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280' }}>Log meat dispatched by a salesman to an emirate</p>
              </div>
              <button type="button" onClick={() => setDistModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#f87171', marginBottom: 16 }}>{error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label style={{ ...S.label, gridColumn: '1/-1' }}>
                  Salesman
                  <select value={distForm.salesman_id} onChange={e => setDistForm(p => ({ ...p, salesman_id: e.target.value }))} style={S.input}>
                    <option value="">— Select salesman —</option>
                    {salesmen.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                <label style={S.label}>
                  Date
                  <input type="date" value={distForm.distribution_date} onChange={e => setDistForm(p => ({ ...p, distribution_date: e.target.value }))} style={S.input} />
                </label>
                <label style={S.label}>
                  Emirate *
                  <select value={distForm.emirate} onChange={e => setDistForm(p => ({ ...p, emirate: e.target.value }))} style={S.input}>
                    {EMIRATES.map(em => <option key={em} value={em}>{em}</option>)}
                  </select>
                </label>
                <label style={S.label}>
                  Meat Type
                  <select value={distForm.meat_type} onChange={e => setDistForm(p => ({ ...p, meat_type: e.target.value }))} style={S.input}>
                    {MEAT_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
                <label style={S.label}>
                  Quantity (kg) *
                  <input type="number" step="0.1" min="0" value={distForm.quantity_kg} onChange={e => setDistForm(p => ({ ...p, quantity_kg: e.target.value }))} placeholder="e.g. 25.5" style={S.input} />
                </label>
                <label style={{ ...S.label, gridColumn: '1/-1' }}>
                  Notes
                  <input value={distForm.notes} onChange={e => setDistForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" style={S.input} />
                </label>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setDistModal(null)} style={{ padding: '9px 18px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={saveDist} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, background: saving ? '#374151' : 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>
                {saving ? 'Saving…' : editingDist ? 'Save Changes' : 'Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Salesman Modal ── */}
      {smModal && (
        <div onClick={() => setSmModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#f2f2f7' }}>{editingSm ? 'Edit Salesman' : 'Add Salesman'}</h2>
              <button type="button" onClick={() => setSmModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#f87171', marginBottom: 16 }}>{error}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label style={S.label}>Full Name *<input value={smForm.name} onChange={e => setSmForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Ahmed Al Rashid" style={S.input} /></label>
                <label style={S.label}>Phone<input value={smForm.phone} onChange={e => setSmForm(p => ({ ...p, phone: e.target.value }))} placeholder="+971 50 000 0000" style={S.input} /></label>
                <label style={S.label}>Email<input type="email" value={smForm.email} onChange={e => setSmForm(p => ({ ...p, email: e.target.value }))} placeholder="salesman@alhazmi.com" style={S.input} /></label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#9ca3af', cursor: 'pointer' }}>
                  <input type="checkbox" checked={smForm.is_active} onChange={e => setSmForm(p => ({ ...p, is_active: e.target.checked }))} style={{ width: 14, height: 14, cursor: 'pointer' }} />
                  Active
                </label>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setSmModal(null)} style={{ padding: '9px 18px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={saveSm} disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, background: saving ? '#374151' : 'linear-gradient(135deg,#059669,#10b981)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>
                {saving ? 'Saving…' : editingSm ? 'Save Changes' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Distribution ── */}
      {deleteTarget && (
        <div onClick={() => setDeleteTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: 400, padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <h2 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: '#f2f2f7' }}>Delete Record</h2>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 20px', lineHeight: 1.6 }}>
              Delete <strong style={{ color: '#f2f2f7' }}>{deleteTarget.quantity_kg} kg {deleteTarget.meat_type}</strong> to <strong style={{ color: EMIRATE_COLOR[deleteTarget.emirate] || '#f2f2f7' }}>{deleteTarget.emirate}</strong> on {deleteTarget.distribution_date}?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setDeleteTarget(null)} style={{ padding: '9px 18px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={deleteDist} style={{ padding: '9px 18px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Salesman ── */}
      {deleteSmTarget && (
        <div onClick={() => setDeleteSmTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: 400, padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <h2 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: '#f2f2f7' }}>Remove Salesman</h2>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 20px', lineHeight: 1.6 }}>Remove <strong style={{ color: '#f2f2f7' }}>{deleteSmTarget.name}</strong> from the team? Their distribution records will be kept but unlinked.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setDeleteSmTarget(null)} style={{ padding: '9px 18px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={deleteSm} style={{ padding: '9px 18px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: toast.type === 'error' ? '#1f1215' : '#0f1f16', border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, borderRadius: 10, padding: '12px 18px', fontSize: 13, fontWeight: 500, color: toast.type === 'error' ? '#f87171' : '#34d399', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'error' ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
