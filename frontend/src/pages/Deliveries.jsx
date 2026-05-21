import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2, Users,
  Search, Plus, X, Pencil, Trash2, RefreshCw, Clock, CheckCircle2,
  XCircle, Navigation, Car, CalendarClock, ChevronDown, ChevronUp, ArrowRight, TrendingUp, Zap, UserCheck,
  ClipboardList, FileCheck, FileText, Receipt
} from 'lucide-react';
import { getCurrentUser, hasHRAccess } from '../api/auth';
import { getDeliveries, createDelivery, updateDelivery, deleteDelivery, getOrders } from '../api/erp';

const STATUSES = ['scheduled', 'in_transit', 'delivered', 'failed'];
const STATUS_META = {
  scheduled:  { label: 'Scheduled',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: <Clock size={13} /> },
  in_transit: { label: 'In Transit', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: <Navigation size={13} /> },
  delivered:  { label: 'Delivered',  color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: <CheckCircle2 size={13} /> },
  failed:     { label: 'Failed',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: <XCircle size={13} /> },
};

const EMPTY_FORM = { order_id: '', driver_name: '', vehicle: '', scheduled_time: '' };

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

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, color: '#6b7280', bg: 'rgba(107,114,128,0.12)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: m.bg, color: m.color, fontSize: 11, fontWeight: 600 }}>
      {m.icon}{m.label}
    </span>
  );
}

function DeliveryTimeline({ status }) {
  const steps = ['scheduled', 'in_transit', 'delivered'];
  const activeIdx = steps.indexOf(status);
  const isFailed = status === 'failed';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((s, i) => {
        const done = !isFailed && activeIdx >= i;
        const active = !isFailed && activeIdx === i;
        const m = STATUS_META[s];
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: done ? m.color : 'rgba(255,255,255,0.08)', border: `2px solid ${done ? m.color : 'rgba(255,255,255,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                {done && <CheckCircle2 size={11} color="#fff" />}
              </div>
              <span style={{ fontSize: 9, color: done ? m.color : '#4b5563', fontWeight: active ? 700 : 500, whiteSpace: 'nowrap' }}>{m.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 32, height: 2, background: done && activeIdx > i ? STATUS_META[steps[i + 1]].color : 'rgba(255,255,255,0.08)', marginBottom: 14, transition: 'background 0.3s' }} />
            )}
          </div>
        );
      })}
      {isFailed && (
        <div style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 5, color: '#ef4444', fontSize: 11, fontWeight: 600 }}>
          <XCircle size={13} /> Failed
        </div>
      )}
    </div>
  );
}

export default function Deliveries() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formStatus, setFormStatus] = useState('scheduled');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState('');
  const [expanded, setExpanded] = useState(null);

  const currentUser = getCurrentUser();
  const userEmail = currentUser?.sub || '';
  const displayName = userEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const initials = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(''), 2500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [d, o] = await Promise.all([getDeliveries(), getOrders()]);
      setDeliveries(d);
      setOrders(o);
    } catch { showToast('Failed to load deliveries', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormStatus('scheduled');
    setError('');
    setEditing(null);
    setModal('form');
  };
  const openEdit = d => {
    setForm({
      order_id: String(d.order_id || ''),
      driver_name: d.driver_name || '',
      vehicle: d.vehicle || '',
      scheduled_time: d.scheduled_time ? d.scheduled_time.slice(0, 16) : '',
    });
    setFormStatus(d.status || 'scheduled');
    setEditing(d);
    setError('');
    setModal('form');
  };
  const closeModal = () => { setModal(null); setEditing(null); setError(''); };

  const handleSave = async () => {
    if (!form.driver_name.trim()) { setError('Driver name is required'); return; }
    setSaving(true); setError('');
    const payload = {
      order_id: form.order_id ? parseInt(form.order_id) : null,
      driver_name: form.driver_name.trim(),
      vehicle: form.vehicle.trim(),
      scheduled_time: form.scheduled_time || null,
      ...(editing ? { status: formStatus } : {}),
    };
    try {
      if (!editing) {
        const created = await createDelivery(payload);
        setDeliveries(prev => [created, ...prev]);
        showToast('Delivery scheduled successfully');
      } else {
        const updated = await updateDelivery(editing.id, payload);
        setDeliveries(prev => prev.map(d => d.id === editing.id ? updated : d));
        showToast('Delivery updated');
      }
      closeModal();
    } catch (e) { setError(e.response?.data?.detail || 'Failed to save delivery'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await deleteDelivery(deleteTarget.id);
      setDeliveries(prev => prev.filter(d => d.id !== deleteTarget.id));
      showToast('Delivery deleted');
    } catch { showToast('Failed to delete delivery', 'error'); }
    setDeleteTarget(null);
  };

  const nextStatus = s => {
    const order = ['scheduled', 'in_transit', 'delivered'];
    const i = order.indexOf(s);
    return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
  };

  const advanceStatus = async (d) => {
    const next = nextStatus(d.status);
    if (!next) return;
    try {
      const updated = await updateDelivery(d.id, { status: next });
      setDeliveries(prev => prev.map(x => x.id === d.id ? updated : x));
      showToast(`Delivery marked as ${STATUS_META[next].label}`);
    } catch { showToast('Failed to update status', 'error'); }
  };

  const filtered = deliveries.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = (d.driver_name || '').toLowerCase().includes(q)
      || (d.order_number || '').toLowerCase().includes(q)
      || (d.vehicle || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: deliveries.length,
    scheduled: deliveries.filter(d => d.status === 'scheduled').length,
    in_transit: deliveries.filter(d => d.status === 'in_transit').length,
    delivered: deliveries.filter(d => d.status === 'delivered').length,
    failed: deliveries.filter(d => d.status === 'failed').length,
  };

  const sidebarBtn = (path, icon, label, active = false) => (
    <button type="button" onClick={() => navigate(path)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderRadius: 8, background: active ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: active ? '#f2f2f7' : '#6b7280', fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'all 0.15s' }}
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
          {sidebarBtn('/purchase-orders', <ClipboardList size={15} strokeWidth={1.5} />, 'Purchase Orders')}
          {sidebarBtn('/sale-orders', <FileCheck size={15} strokeWidth={1.5} />, 'Sale Orders')}
          {sidebarBtn('/invoices', <FileText size={15} strokeWidth={1.5} />, 'Invoices (AR)')}
          {sidebarBtn('/accounts-payable', <Receipt size={15} strokeWidth={1.5} />, 'Accounts Payable')}
          {sidebarBtn('/orders', <ShoppingCart size={15} strokeWidth={1.5} />, 'Orders')}
          {sidebarBtn('/suppliers', <Truck size={15} strokeWidth={1.5} />, 'Suppliers')}
          {sidebarBtn('/deliveries', <MapPin size={15} strokeWidth={1.5} />, 'Deliveries', true)}
          {sidebarBtn('/sales', <TrendingUp size={15} strokeWidth={1.5} />, 'Sales Distribution')}
          <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 8px', marginTop: 8 }}>Analytics</div>
          {sidebarBtn('/reports', <BarChart2 size={15} strokeWidth={1.5} />, 'Reports')}
          {sidebarBtn('/forecast', <Zap size={15} strokeWidth={1.5} />, 'AI Forecast')}
          {hasHRAccess() && <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 8px', marginTop: 8 }}>People</div>}
          {hasHRAccess() && sidebarBtn('/hr', <UserCheck size={15} strokeWidth={1.5} />, 'HR Attendance')}
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

      {/* Main Content */}
      <main style={{ flex: 1, padding: '28px 32px', overflow: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f2f2f7', margin: 0 }}>Deliveries</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Schedule and track all outbound deliveries</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={load}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button type="button" onClick={openCreate}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={14} strokeWidth={2} /> Schedule Delivery
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <StatCard label="Total Deliveries" value={counts.all} color="#6366f1" icon={<Truck size={18} />} />
          <StatCard label="Scheduled" value={counts.scheduled} color="#3b82f6" icon={<Clock size={18} />} sub={counts.scheduled > 0 ? 'Pending dispatch' : ''} />
          <StatCard label="In Transit" value={counts.in_transit} color="#f59e0b" icon={<Navigation size={18} />} sub={counts.in_transit > 0 ? 'On the road' : ''} />
          <StatCard label="Delivered" value={counts.delivered} color="#10b981" icon={<CheckCircle2 size={18} />} sub={counts.all > 0 ? `${Math.round(counts.delivered / counts.all * 100)}% success rate` : ''} />
        </div>

        {/* Status Pipeline Strip */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[{ key: 'all', label: 'All', count: counts.all, color: '#6b7280' },
            ...STATUSES.map(s => ({ key: s, label: STATUS_META[s].label, count: counts[s], color: STATUS_META[s].color }))
          ].map(t => (
            <button key={t.key} type="button" onClick={() => setStatusFilter(t.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 20, border: `1px solid ${statusFilter === t.key ? t.color : 'rgba(255,255,255,0.08)'}`, background: statusFilter === t.key ? `${t.color}18` : 'rgba(255,255,255,0.03)', color: statusFilter === t.key ? t.color : '#6b7280', fontSize: 12, fontWeight: statusFilter === t.key ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
              {t.label}
              <span style={{ background: statusFilter === t.key ? `${t.color}30` : 'rgba(255,255,255,0.06)', color: statusFilter === t.key ? t.color : '#4b5563', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
            <input placeholder="Search driver, order, or vehicle…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...S.input, paddingLeft: 32 }} />
          </div>
          <span style={{ fontSize: 12, color: '#4b5563' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div style={{ background: '#1e1e2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 36 }} />
                <th style={S.th}>Order</th>
                <th style={S.th}>Driver</th>
                <th style={S.th}>Vehicle</th>
                <th style={S.th}>Scheduled</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Advance</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px 0', color: '#4b5563', fontSize: 13 }}>Loading deliveries…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px 0', color: '#4b5563', fontSize: 13 }}>
                  {search || statusFilter !== 'all' ? 'No deliveries match your filter' : 'No deliveries yet — schedule your first one'}
                </td></tr>
              ) : filtered.map(d => {
                const isExpanded = expanded === d.id;
                const next = nextStatus(d.status);
                return (
                  <Fragment key={d.id}>
                    <tr
                      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ ...S.td, textAlign: 'center', paddingLeft: 14 }}>
                        <button type="button" onClick={() => setExpanded(isExpanded ? null : d.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', display: 'flex', alignItems: 'center' }}>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                      <td style={S.td}>
                        <div style={{ fontWeight: 600, color: '#f2f2f7', fontSize: 13 }}>{d.order_number || '—'}</div>
                        <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>ID #{d.id}</div>
                      </td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {(d.driver_name || '?')[0].toUpperCase()}
                          </div>
                          <span style={{ color: '#e5e7eb', fontSize: 13 }}>{d.driver_name || '—'}</span>
                        </div>
                      </td>
                      <td style={S.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#9ca3af', fontSize: 12 }}>
                          <Car size={12} />
                          {d.vehicle || <span style={{ color: '#374151' }}>—</span>}
                        </div>
                      </td>
                      <td style={S.td}>
                        {d.scheduled_time
                          ? <div>
                              <div style={{ fontSize: 12, color: '#e5e7eb' }}>{d.scheduled_time.slice(0, 10)}</div>
                              <div style={{ fontSize: 11, color: '#6b7280' }}>{d.scheduled_time.slice(11, 16)}</div>
                            </div>
                          : <span style={{ color: '#374151' }}>—</span>}
                      </td>
                      <td style={S.td}><StatusBadge status={d.status} /></td>
                      <td style={S.td}>
                        {next && d.status !== 'failed' ? (
                          <button type="button" onClick={() => advanceStatus(d)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: `${STATUS_META[next].color}15`, border: `1px solid ${STATUS_META[next].color}40`, color: STATUS_META[next].color, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <ArrowRight size={11} /> {STATUS_META[next].label}
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: '#374151' }}>{d.status === 'delivered' ? 'Complete' : d.status === 'failed' ? 'Failed' : '—'}</span>
                        )}
                      </td>
                      <td style={{ ...S.td, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button type="button" title="Edit" onClick={() => openEdit(d)}
                            style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                            <Pencil size={12} />
                          </button>
                          <button type="button" title="Delete" onClick={() => setDeleteTarget(d)}
                            style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} style={{ padding: '0 16px 20px 52px', background: 'rgba(99,102,241,0.03)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Delivery Progress</div>
                            <DeliveryTimeline status={d.status} />
                            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 4 }}>
                              <div><div style={{ fontSize: 10, color: '#4b5563', marginBottom: 3 }}>CREATED</div><div style={{ fontSize: 12, color: '#9ca3af' }}>{d.created_at ? d.created_at.slice(0, 10) : '—'}</div></div>
                              {d.scheduled_time && <div><div style={{ fontSize: 10, color: '#4b5563', marginBottom: 3 }}>SCHEDULED FOR</div><div style={{ fontSize: 12, color: '#9ca3af' }}>{d.scheduled_time.replace('T', ' ')}</div></div>}
                              <div><div style={{ fontSize: 10, color: '#4b5563', marginBottom: 3 }}>LINKED ORDER</div><div style={{ fontSize: 12, color: '#9ca3af' }}>{d.order_number || 'None'}</div></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* Create / Edit Modal */}
      {modal === 'form' && (
        <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 520, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#f2f2f7' }}>{editing ? 'Edit Delivery' : 'Schedule Delivery'}</h2>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280' }}>{editing ? 'Update delivery details' : 'Assign driver and schedule for dispatch'}</p>
              </div>
              <button type="button" onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#f87171', marginBottom: 16 }}>{error}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label style={{ ...S.label, gridColumn: '1/-1' }}>
                  Linked Order
                  <select value={form.order_id} onChange={e => setForm(p => ({ ...p, order_id: e.target.value }))} style={{ ...S.input }}>
                    <option value="">— No order linked —</option>
                    {orders.map(o => <option key={o.id} value={o.id}>{o.order_number} — {o.customer_name}</option>)}
                  </select>
                </label>
                <label style={S.label}>
                  Driver Name *
                  <input value={form.driver_name} onChange={e => setForm(p => ({ ...p, driver_name: e.target.value }))} placeholder="e.g. Ahmed Al Rashid" style={S.input} />
                </label>
                <label style={S.label}>
                  Vehicle
                  <input value={form.vehicle} onChange={e => setForm(p => ({ ...p, vehicle: e.target.value }))} placeholder="e.g. Van – AUH 1234" style={S.input} />
                </label>
                <label style={{ ...S.label, gridColumn: editing ? '1/2' : '1/-1' }}>
                  Scheduled Date & Time
                  <input type="datetime-local" value={form.scheduled_time} onChange={e => setForm(p => ({ ...p, scheduled_time: e.target.value }))} style={S.input} />
                </label>
                {editing && (
                  <label style={S.label}>
                    Status
                    <select value={formStatus} onChange={e => setFormStatus(e.target.value)} style={{ ...S.input }}>
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                    </select>
                  </label>
                )}
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={closeModal} style={{ padding: '9px 18px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving}
                style={{ padding: '9px 20px', borderRadius: 8, background: saving ? '#374151' : 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div onClick={() => setDeleteTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 400, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#f2f2f7' }}>Delete Delivery</h2>
              <button type="button" onClick={() => setDeleteTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ padding: '16px 24px' }}>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0, lineHeight: 1.6 }}>
                Delete delivery <strong style={{ color: '#f2f2f7' }}>#{deleteTarget.id}</strong> assigned to <strong style={{ color: '#f2f2f7' }}>{deleteTarget.driver_name}</strong>? This cannot be undone.
              </p>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setDeleteTarget(null)} style={{ padding: '9px 18px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={handleDelete} style={{ padding: '9px 18px', borderRadius: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
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
