import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2,
  TrendingUp, Zap, UserCheck, Users, X, RefreshCw, CheckCircle2,
  AlertCircle, ClipboardList, FileCheck, Search, Plus, Phone, Mail,
  MapPin as MapPinIcon, FileText, Receipt, Edit2, Trash2, User,
  DollarSign, Clock, ShoppingBag, Activity,
} from 'lucide-react';
import { getCurrentUser } from '../api/auth';
import {
  getCustomers, getCustomerSummary, getCustomerDetail,
  createCustomer, updateCustomer, deleteCustomer,
} from '../api/erp';

const SIDEBAR_W = 245;

const SO_STATUS_COLOR = {
  draft:            '#94a3b8',
  approved:         '#60a5fa',
  out_for_delivery: '#a78bfa',
  delivered:        '#34d399',
  returned:         '#f97316',
};

const INV_STATUS = {
  draft:   { label: 'Draft',   color: '#94a3b8' },
  issued:  { label: 'Pending', color: '#fbbf24' },
  overdue: { label: 'Overdue', color: '#f97316' },
  paid:    { label: 'Paid',    color: '#34d399' },
  voided:  { label: 'Voided',  color: '#6b7280' },
};

const S = {
  inp: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 13px', fontSize: 13, color: '#f1f5f9', outline: 'none', boxSizing: 'border-box', caretColor: '#60a5fa' },
  lbl: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 500, color: '#94a3b8' },
  th:  { padding: '12px 16px', fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap', background: 'linear-gradient(180deg,rgba(59,130,246,0.08),rgba(59,130,246,0.02))', borderBottom: '1px solid rgba(59,130,246,0.12)' },
  td:  { padding: '14px 16px', fontSize: 13, color: '#cbd5e1', borderBottom: '1px solid rgba(255,255,255,0.035)', verticalAlign: 'middle' },
};

const fmtAED  = n => n > 0 ? `AED ${Number(n).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const initials = name => (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

const AVATAR_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899'];
const avatarColor = name => AVATAR_COLORS[(name || '').charCodeAt(0) % AVATAR_COLORS.length];

function NavBtn({ path, icon, label, active, navigate }) {
  return (
    <button type="button" onClick={() => !active && navigate(path)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px', borderRadius: 9, fontSize: 13, fontWeight: active ? 600 : 400, border: 'none', width: '100%', textAlign: 'left', cursor: active ? 'default' : 'pointer', transition: 'all 0.15s', color: active ? '#f1f5f9' : '#4b5563', background: active ? 'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(96,165,250,0.08))' : 'transparent', boxShadow: active ? 'inset 0 0 0 1px rgba(59,130,246,0.25)' : 'none' }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
      <span style={{ color: active ? '#60a5fa' : '#374151', flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  );
}

const emptyForm = { name: '', phone: '', email: '', address: '', notes: '' };

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers]     = useState([]);
  const [summary, setSummary]         = useState(null);
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState('');
  const [selCust, setSelCust]         = useState(null);
  const [detail, setDetail]           = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [hovRow, setHovRow]           = useState(null);
  const [toast, setToast]             = useState(null);

  const [showForm, setShowForm]       = useState(false);
  const [formMode, setFormMode]       = useState('create'); // create | edit
  const [form, setForm]               = useState(emptyForm);
  const [formLoading, setFormLoading] = useState(false);

  const [confirmDel, setConfirmDel]   = useState(null);

  const cu = getCurrentUser();
  const displayName = (cu?.sub || '').split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const toast_ = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([getCustomers(), getCustomerSummary()]);
      setCustomers(c);
      setSummary(s);
    } catch { toast_('Failed to load', 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (c) => {
    setSelCust(c);
    setDetailLoading(true);
    try { setDetail(await getCustomerDetail(c.id)); } catch { setDetail(null); }
    setDetailLoading(false);
  };

  const closeDetail = () => { setSelCust(null); setDetail(null); };

  const openCreate = () => { setForm(emptyForm); setFormMode('create'); setShowForm(true); };
  const openEdit   = (c) => {
    setForm({ name: c.name || '', phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' });
    setFormMode('edit');
    setSelCust(c);
    setShowForm(true);
  };

  const handleFormSave = async () => {
    if (!form.name.trim()) { toast_('Name is required', 'error'); return; }
    setFormLoading(true);
    try {
      if (formMode === 'create') {
        const nc = await createCustomer(form);
        setCustomers(prev => [...prev, nc]);
        toast_(`Customer "${nc.name}" added`);
      } else {
        const uc = await updateCustomer(selCust.id, form);
        setCustomers(prev => prev.map(c => c.id === selCust.id ? { ...c, ...uc } : c));
        if (detail && detail.id === selCust.id) setDetail(prev => ({ ...prev, ...uc }));
        setSelCust(prev => ({ ...prev, ...uc }));
        toast_('Customer updated');
      }
      setShowForm(false);
      const s = await getCustomerSummary();
      setSummary(s);
    } catch (e) { toast_(e.response?.data?.detail || 'Save failed', 'error'); }
    setFormLoading(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      if (selCust?.id === id) closeDetail();
      setConfirmDel(null);
      toast_('Customer removed');
      const s = await getCustomerSummary();
      setSummary(s);
    } catch (e) { toast_(e.response?.data?.detail || 'Delete failed', 'error'); }
  };

  const nb = (path, icon, label, active) => <NavBtn path={path} icon={icon} label={label} active={active} navigate={navigate} />;

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const STAT_CARDS = summary ? [
    { label: 'Total Customers', value: summary.total_customers,       sub: `+${summary.new_this_month} this month`, icon: <Users size={18} />,       color: '#60a5fa' },
    { label: 'Total Revenue',   value: fmtAED(summary.total_revenue), sub: 'All invoices',                          icon: <DollarSign size={18} />,   color: '#34d399' },
    { label: 'Outstanding',     value: fmtAED(summary.outstanding),   sub: 'Unpaid balances',                       icon: <Clock size={18} />,        color: '#fbbf24' },
    { label: 'Collected',       value: fmtAED(summary.total_paid),    sub: 'Payments received',                     icon: <CheckCircle2 size={18} />, color: '#a78bfa' },
  ] : [];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f0f18', color: '#f1f5f9', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: SIDEBAR_W, background: '#13131f', borderRight: '1px solid rgba(255,255,255,0.055)', display: 'flex', flexDirection: 'column', padding: '20px 10px', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, overflowY: 'auto' }}>
        <div style={{ padding: '6px 10px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Al Hazmi ERP</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{displayName}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {nb('/dashboard',        <LayoutDashboard size={16} />, 'Dashboard',          false)}
          {nb('/inventory',        <Package size={16} />,         'Inventory',           false)}
          {nb('/purchase-orders',  <ClipboardList size={16} />,   'Purchase Orders',     false)}
          {nb('/sale-orders',      <ClipboardList size={16} />,   'Sale Orders',         false)}
          {nb('/invoices',         <FileText size={16} />,        'Invoices (AR)',       false)}
          {nb('/accounts-payable', <Receipt size={16} />,         'Accounts Payable',    false)}
          {nb('/customers',        <Users size={16} />,           'Customers',           true)}
          {nb('/orders',           <ShoppingCart size={16} />,    'Orders',              false)}
          {nb('/suppliers',        <Truck size={16} />,           'Suppliers',           false)}
          {nb('/deliveries',       <MapPin size={16} />,          'Deliveries',          false)}
          {nb('/sales',            <TrendingUp size={16} />,      'Sales Distribution',  false)}
          {nb('/vat-return',       <FileCheck size={16} />,       'VAT Return',          false)}
          {nb('/pnl',              <Activity  size={16} />,       'Profit & Loss',       false)}
          {nb('/reports',          <BarChart2 size={16} />,       'Reports',             false)}
          {nb('/hr',               <UserCheck size={16} />,       'HR / Payroll',        false)}
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: SIDEBAR_W, flex: 1, padding: '28px 32px', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Customers</h1>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>Manage customer accounts and track order history</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={load} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 9, fontSize: 13, color: '#60a5fa', cursor: 'pointer' }}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
            <button onClick={openCreate}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: 'linear-gradient(135deg,rgba(59,130,246,0.3),rgba(96,165,250,0.2))', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 9, fontSize: 13, fontWeight: 600, color: '#93c5fd', cursor: 'pointer' }}>
              <Plus size={14} />
              Add Customer
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
            {STAT_CARDS.map(card => (
              <div key={card.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{card.label}</span>
                  <span style={{ color: card.color, opacity: 0.8 }}>{card.icon}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>{card.value}</div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>{card.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{ position: 'relative', maxWidth: 340, marginBottom: 16 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, email…"
            style={{ ...S.inp, paddingLeft: 34 }} />
        </div>

        {/* Table */}
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Customer', 'Phone', 'Orders', 'Total Spent', 'Outstanding', 'Last Order', ''].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: '#4b5563', padding: 40 }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', color: '#4b5563', padding: 40 }}>No customers found</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} onMouseEnter={() => setHovRow(c.id)} onMouseLeave={() => setHovRow(null)}
                  style={{ background: hovRow === c.id ? 'rgba(59,130,246,0.04)' : 'transparent', transition: 'background 0.12s' }}>
                  {/* Avatar + Name */}
                  <td style={{ ...S.td, cursor: 'pointer' }} onClick={() => openDetail(c)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: avatarColor(c.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {initials(c.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{c.name}</div>
                        {c.email && <div style={{ fontSize: 11.5, color: '#4b5563', marginTop: 2 }}>{c.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ ...S.td, cursor: 'pointer' }} onClick={() => openDetail(c)}>
                    <span style={{ color: '#94a3b8' }}>{c.phone || '—'}</span>
                  </td>
                  <td style={{ ...S.td, cursor: 'pointer' }} onClick={() => openDetail(c)}>
                    <span style={{ fontWeight: 600, color: '#60a5fa' }}>{c.total_orders}</span>
                  </td>
                  <td style={{ ...S.td, cursor: 'pointer' }} onClick={() => openDetail(c)}>
                    <span style={{ fontWeight: 600 }}>{fmtAED(c.total_spent)}</span>
                  </td>
                  <td style={{ ...S.td, cursor: 'pointer' }} onClick={() => openDetail(c)}>
                    <span style={{ color: c.outstanding > 0 ? '#fbbf24' : '#34d399', fontWeight: 600 }}>
                      {c.outstanding > 0 ? fmtAED(c.outstanding) : '—'}
                    </span>
                  </td>
                  <td style={{ ...S.td, cursor: 'pointer' }} onClick={() => openDetail(c)}>
                    <span style={{ color: '#94a3b8' }}>{fmtDate(c.last_order_at)}</span>
                  </td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={e => { e.stopPropagation(); openEdit(c); }}
                        style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setConfirmDel(c); }}
                        style={{ padding: '5px 8px', borderRadius: 7, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* ── Detail Modal ── */}
      {selCust && !showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => e.target === e.currentTarget && closeDetail()}>
          <div style={{ background: '#16161f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: avatarColor(selCust.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {initials(selCust.name)}
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>{selCust.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Customer since {fmtDate(selCust.created_at)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(selCust)}
                  style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa', cursor: 'pointer' }}>
                  Edit
                </button>
                <button onClick={closeDetail} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
              </div>
            </div>

            <div style={{ padding: 24 }}>
              {/* Info row */}
              <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
                {selCust.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#94a3b8' }}>
                    <Phone size={14} style={{ color: '#60a5fa' }} />{selCust.phone}
                  </div>
                )}
                {selCust.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#94a3b8' }}>
                    <Mail size={14} style={{ color: '#60a5fa' }} />{selCust.email}
                  </div>
                )}
                {selCust.address && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#94a3b8' }}>
                    <MapPinIcon size={14} style={{ color: '#60a5fa' }} />{selCust.address}
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Total Orders',  value: selCust.total_orders,            color: '#60a5fa' },
                  { label: 'Total Spent',   value: fmtAED(selCust.total_spent),     color: '#f1f5f9' },
                  { label: 'Outstanding',   value: fmtAED(selCust.outstanding),     color: selCust.outstanding > 0 ? '#fbbf24' : '#34d399' },
                  { label: 'Total Paid',    value: fmtAED(selCust.total_paid),      color: '#34d399' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 16px' }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Order history */}
              <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Order History</div>
              {detailLoading ? (
                <div style={{ color: '#4b5563', textAlign: 'center', padding: 24 }}>Loading…</div>
              ) : !detail?.orders?.length ? (
                <div style={{ color: '#4b5563', textAlign: 'center', padding: 24 }}>No orders yet</div>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['SO #', 'Date', 'SO Status', 'Invoice', 'Invoice Amount', 'Paid', 'Payment Status'].map(h => (
                          <th key={h} style={{ ...S.th, fontSize: 10.5 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detail.orders.map((o, i) => {
                        const invSt = INV_STATUS[o.inv_eff_status] || INV_STATUS.issued;
                        const balance = o.inv_amount - o.inv_paid;
                        return (
                          <tr key={i}>
                            <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12.5, color: '#93c5fd', fontWeight: 600 }}>{o.so_number}</td>
                            <td style={{ ...S.td, fontSize: 12 }}>{fmtDate(o.so_date)}</td>
                            <td style={S.td}>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: SO_STATUS_COLOR[o.so_status] || '#94a3b8', textTransform: 'capitalize' }}>
                                {(o.so_status || '').replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td style={{ ...S.td, fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>{o.inv_number || '—'}</td>
                            <td style={{ ...S.td, fontWeight: 600 }}>{o.inv_amount > 0 ? fmtAED(o.inv_amount) : '—'}</td>
                            <td style={{ ...S.td, color: '#34d399' }}>{o.inv_paid > 0 ? fmtAED(o.inv_paid) : '—'}</td>
                            <td style={S.td}>
                              {o.inv_eff_status ? (
                                <span style={{ fontSize: 11.5, fontWeight: 700, color: invSt.color }}>{invSt.label}</span>
                              ) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {selCust.notes && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, fontSize: 13, color: '#94a3b8' }}>
                  <span style={{ fontWeight: 600, color: '#64748b', marginRight: 8 }}>Notes:</span>{selCust.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Form Modal ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={{ background: '#16161f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, width: '100%', maxWidth: 480, boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{formMode === 'create' ? 'Add Customer' : 'Edit Customer'}</div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={S.lbl}>
                Name *
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Customer name" style={S.inp} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={S.lbl}>
                  Phone
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+971…" style={S.inp} />
                </label>
                <label style={S.lbl}>
                  Email
                  <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@…" style={S.inp} />
                </label>
              </div>
              <label style={S.lbl}>
                Address
                <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Area / city" style={S.inp} />
              </label>
              <label style={S.lbl}>
                Notes
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Any notes about this customer…" rows={3}
                  style={{ ...S.inp, resize: 'vertical', lineHeight: 1.5 }} />
              </label>
              <button onClick={handleFormSave} disabled={formLoading}
                style={{ width: '100%', padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: formLoading ? 'rgba(59,130,246,0.1)' : 'linear-gradient(135deg,rgba(59,130,246,0.3),rgba(96,165,250,0.2))', border: '1px solid rgba(59,130,246,0.4)', color: '#93c5fd', cursor: formLoading ? 'not-allowed' : 'pointer' }}>
                {formLoading ? 'Saving…' : (formMode === 'create' ? 'Add Customer' : 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {confirmDel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#16161f', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 16, padding: '28px 32px', maxWidth: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>Remove Customer?</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>
              <strong style={{ color: '#f1f5f9' }}>{confirmDel.name}</strong> will be removed. Their order history is preserved.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDel(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDel.id)}
                style={{ flex: 1, padding: '10px', borderRadius: 9, fontSize: 13, fontWeight: 600, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer' }}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600, background: toast.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)', border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.3)'}`, color: toast.type === 'error' ? '#ef4444' : '#34d399', zIndex: 999, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          {toast.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          {toast.msg}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
