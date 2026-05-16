import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2,
  TrendingUp, Zap, UserCheck, Users, Plus, X, RefreshCw, CheckCircle2,
  AlertCircle, ClipboardList, FileCheck, Search, ArrowRight,
  RotateCcw, Send, PackageCheck, Clock, ChevronRight,
} from 'lucide-react';
import { getCurrentUser } from '../api/auth';
import {
  getSaleOrders, createSaleOrder, approveSO, dispatchSO, deliverSO, rejectSO,
  getReturns, confirmReturn, getInvoices, getProducts, getStockSummary,
} from '../api/erp';

const SIDEBAR_W = 245;

const SC = {
  draft:            { label: 'Draft',           color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.22)', dot: '#64748b',  glow: '' },
  approved:         { label: 'Approved',         color: '#60a5fa', bg: 'rgba(96,165,250,0.11)', border: 'rgba(96,165,250,0.25)',  dot: '#3b82f6',  glow: 'rgba(59,130,246,0.25)' },
  out_for_delivery: { label: 'Out for Delivery', color: '#fbbf24', bg: 'rgba(251,191,36,0.11)', border: 'rgba(251,191,36,0.25)',  dot: '#f59e0b',  glow: 'rgba(245,158,11,0.25)' },
  delivered:        { label: 'Delivered',        color: '#34d399', bg: 'rgba(52,211,153,0.11)', border: 'rgba(52,211,153,0.25)',  dot: '#10b981',  glow: 'rgba(16,185,129,0.25)' },
  returned:         { label: 'Returned',         color: '#fb7185', bg: 'rgba(251,113,133,0.11)', border: 'rgba(251,113,133,0.25)', dot: '#f43f5e', glow: 'rgba(244,63,94,0.25)' },
};

const INV_STATUS = {
  draft:  { label: 'Draft',  color: '#64748b' },
  issued: { label: 'Issued', color: '#60a5fa' },
  paid:   { label: 'Paid',   color: '#34d399' },
  voided: { label: 'Voided', color: '#fb7185' },
};

const SO_STEPS = ['draft', 'approved', 'out_for_delivery', 'delivered'];

const S = {
  inp: {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '10px 13px', fontSize: 13, color: '#f1f5f9', outline: 'none',
    boxSizing: 'border-box', caretColor: '#34d399', transition: 'border-color 0.2s',
  },
  lbl: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 500, color: '#64748b' },
  th: {
    padding: '13px 18px', fontSize: 11, fontWeight: 700, color: '#60a5fa',
    textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap', userSelect: 'none',
    background: 'linear-gradient(180deg,rgba(59,130,246,0.08) 0%,rgba(59,130,246,0.02) 100%)',
    borderBottom: '1px solid rgba(59,130,246,0.12)',
  },
  td: { padding: '14px 18px', fontSize: 13, color: '#cbd5e1', borderBottom: '1px solid rgba(255,255,255,0.035)', verticalAlign: 'middle' },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtAED  = n => n > 0 ? `AED ${Number(n).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—';

function StatusPill({ status }) {
  const c = SC[status] || SC.draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 12px 5px 9px', borderRadius: 99, fontSize: 11.5, fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      boxShadow: c.glow ? `0 0 10px ${c.glow}` : 'none', letterSpacing: '0.02em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, boxShadow: c.glow ? `0 0 5px ${c.dot}` : 'none', flexShrink: 0 }} />
      {c.label}
    </span>
  );
}

function NavBtn({ path, icon, label, active, navigate }) {
  return (
    <button type="button" onClick={() => !active && navigate(path)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px', borderRadius: 9,
        fontSize: 13, fontWeight: active ? 600 : 400, border: 'none', width: '100%', textAlign: 'left',
        cursor: active ? 'default' : 'pointer', transition: 'all 0.15s',
        color: active ? '#f1f5f9' : '#4b5563',
        background: active ? 'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(96,165,250,0.08))' : 'transparent',
        boxShadow: active ? 'inset 0 0 0 1px rgba(59,130,246,0.25)' : 'none',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
      <span style={{ color: active ? '#60a5fa' : '#64748b', flexShrink: 0, transition: 'color 0.15s' }}>{icon}</span>
      {label}
    </button>
  );
}

export default function SaleOrders() {
  const navigate = useNavigate();
  const [tab, setTab]               = useState('orders');
  const [sos, setSos]               = useState([]);
  const [returns, setReturns]       = useState([]);
  const [invoices, setInvoices]     = useState([]);
  const [products, setProducts]     = useState([]);
  const [stockMap, setStockMap]     = useState({});
  const [loading, setLoading]       = useState(false);
  const [toast, setToast]           = useState(null);
  const [drawer, setDrawer]         = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showReject, setShowReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hovRow, setHovRow]         = useState(null);
  const [form, setForm]             = useState({ customer_name: '', customer_phone: '', notes: '', items: [] });

  const cu = getCurrentUser();
  const displayName = (cu?.sub || '').split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const toast_ = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const load = async () => {
    setLoading(true);
    try {
      const [s, r, inv, prods, stock] = await Promise.all([getSaleOrders(), getReturns(), getInvoices(), getProducts(), getStockSummary()]);
      setSos(s); setReturns(r); setInvoices(inv); setProducts(prods);
      const map = {};
      stock.forEach(p => { map[p.id] = p; });
      setStockMap(map);
    } catch { toast_('Failed to load data', 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c = { all: sos.length, draft: 0, approved: 0, out_for_delivery: 0, delivered: 0, returned: 0 };
    sos.forEach(s => { if (c[s.status] !== undefined) c[s.status]++; });
    return c;
  }, [sos]);

  const filtered = useMemo(() => sos.filter(s => {
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchSearch = !search || s.so_number.toLowerCase().includes(search.toLowerCase()) || (s.customer_name || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  }), [sos, statusFilter, search]);

  const selSo = drawer ? (sos.find(s => s.id === drawer.id) || drawer) : null;

  const addItem    = () => setForm(f => ({ ...f, items: [...f.items, { product_id: '', product_name: '', quantity: '', unit_price: '' }] }));
  const removeItem = i  => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updItem    = (i, field, val) => setForm(f => {
    const items = [...f.items]; items[i] = { ...items[i], [field]: val };
    if (field === 'product_id') { const pr = products.find(p => p.id === parseInt(val)); if (pr) { items[i].product_name = pr.name; items[i].unit_price = pr.price_per_kg || 0; } }
    return { ...f, items };
  });

  const handleCreate = async () => {
    if (!form.customer_name.trim()) { toast_('Customer name required', 'error'); return; }
    if (!form.items.length || form.items.some(it => !it.product_id || !it.quantity)) { toast_('Add at least one complete item', 'error'); return; }
    setActionLoading(true);
    try {
      const res = await createSaleOrder({
        customer_name: form.customer_name, customer_phone: form.customer_phone || null,
        notes: form.notes || null,
        items: form.items.map(it => ({ product_id: parseInt(it.product_id), product_name: it.product_name, quantity: parseFloat(it.quantity), unit_price: parseFloat(it.unit_price) || 0 })),
      });
      await load(); setDrawer(res); setShowCreate(false); setForm({ customer_name: '', customer_phone: '', notes: '', items: [] });
      toast_('Sale Order created successfully');
    } catch (e) { toast_(e.response?.data?.detail || 'Failed to create', 'error'); }
    setActionLoading(false);
  };

  const handleAction = async (so, action) => {
    if (action === 'reject') { setShowReject(so); return; }
    setActionLoading(true);
    try {
      let res;
      if (action === 'approve')  res = await approveSO(so.id);
      if (action === 'dispatch') res = await dispatchSO(so.id);
      if (action === 'deliver')  res = await deliverSO(so.id);
      await load(); setDrawer(res);
      const labels = { approve: 'approved — stock reserved & invoice generated', dispatch: 'dispatched', deliver: 'marked delivered' };
      toast_(`SO ${labels[action] || action}`);
    } catch (e) { toast_(e.response?.data?.detail || 'Action failed', 'error'); }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast_('Rejection reason required', 'error'); return; }
    setActionLoading(true);
    try {
      const res = await rejectSO(showReject.id, { reason: rejectReason });
      await load(); setDrawer(res); setShowReject(null); setRejectReason('');
      toast_('Return Entry & Credit Note created');
    } catch (e) { toast_(e.response?.data?.detail || 'Failed', 'error'); }
    setActionLoading(false);
  };

  const handleConfirmReturn = async reId => {
    setActionLoading(true);
    try {
      await confirmReturn(reId); await load();
      toast_('Stock moved back to Available');
    } catch (e) { toast_(e.response?.data?.detail || 'Failed', 'error'); }
    setActionLoading(false);
  };

  const STAT_CARDS = [
    { label: 'Total Orders',      value: counts.all,              color: '#60a5fa', icon: <FileCheck size={20} />,    sub: 'all time' },
    { label: 'Pending Approval',  value: counts.draft,            color: '#94a3b8', icon: <Clock size={20} />,        sub: 'awaiting action' },
    { label: 'Out for Delivery',  value: counts.out_for_delivery, color: '#fbbf24', icon: <Send size={20} />,         sub: 'in transit' },
    { label: 'Delivered',         value: counts.delivered,        color: '#34d399', icon: <PackageCheck size={20} />, sub: 'completed' },
  ];

  const nb = (path, icon, label, active) => <NavBtn path={path} icon={icon} label={label} active={active} navigate={navigate} />;

  const pendingReturns = returns.filter(r => r.status === 'pending').length;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#080b14', color: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: SIDEBAR_W, minWidth: SIDEBAR_W, height: '100vh', background: '#0d1117', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '18px 14px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0, boxShadow: '0 4px 14px rgba(59,130,246,0.4)' }}>AH</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>Al Hazmi</div>
              <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.05em' }}>MEAT ERP</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#64748b', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '10px 8px 5px' }}>Main</div>
          {nb('/dashboard',       <LayoutDashboard size={15} />, 'Overview',          false)}
          {nb('/inventory',       <Package         size={15} />, 'Inventory',          false)}
          {nb('/purchase-orders', <ClipboardList   size={15} />, 'Purchase Orders',    false)}
          {nb('/sale-orders',     <FileCheck       size={15} />, 'Sale Orders',        true)}
          {nb('/orders',          <ShoppingCart    size={15} />, 'Orders',             false)}
          {nb('/suppliers',       <Truck           size={15} />, 'Suppliers',          false)}
          {nb('/deliveries',      <MapPin          size={15} />, 'Deliveries',         false)}
          {nb('/sales',           <TrendingUp      size={15} />, 'Sales Distribution', false)}
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#64748b', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '14px 8px 5px' }}>Analytics</div>
          {nb('/reports',         <BarChart2       size={15} />, 'Reports',            false)}
          {nb('/forecast',        <Zap             size={15} />, 'AI Forecast',        false)}
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#64748b', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '14px 8px 5px' }}>People</div>
          {nb('/hr',              <UserCheck       size={15} />, 'HR Attendance',      false)}
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#64748b', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '14px 8px 5px' }}>Admin</div>
          {nb('/admin/users',     <Users           size={15} />, 'User Management',    false)}
        </nav>

        <div style={{ padding: '12px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{displayName[0] || 'U'}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
            <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.04em' }}>Al Hazmi ERP</div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>

        {/* Subtle gradient radials for depth */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 60% 40% at 70% 0%,rgba(59,130,246,0.04) 0%,transparent 60%), radial-gradient(ellipse 40% 30% at 100% 100%,rgba(139,92,246,0.04) 0%,transparent 60%)' }} />

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(13,17,23,0.8)', backdropFilter: 'blur(12px)', flexShrink: 0, position: 'relative', zIndex: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg,#3b82f6,#60a5fa)' }} />
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f1f5f9', letterSpacing: -0.5 }}>Sale Orders</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b', paddingLeft: 14 }}>
              {['Draft', 'Approved', 'Out for Delivery', 'Delivered'].map((s, i, arr) => (
                <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: i === arr.length - 1 ? '#60a5fa' : '#64748b' }}>{s}</span>
                  {i < arr.length - 1 && <ArrowRight size={9} style={{ color: '#64748b' }} />}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={load}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#475569', fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
              <RefreshCw size={13} /> Refresh
            </button>
            {tab === 'orders' && (
              <button type="button" onClick={() => setShowCreate(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 22px', borderRadius: 9, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(59,130,246,0.4)', letterSpacing: '0.01em' }}>
                <Plus size={15} /> New Sale Order
              </button>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, padding: '16px 28px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
          {STAT_CARDS.map(c => (
            <div key={c.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${c.color}18`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${c.color}60,${c.color}15)`, borderRadius: '14px 14px 0 0' }} />
              <div style={{ width: 42, height: 42, borderRadius: 12, background: `${c.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, flexShrink: 0, boxShadow: `0 4px 16px ${c.color}20` }}>
                {c.icon}
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', lineHeight: 1, letterSpacing: -0.5 }}>{c.value}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, fontWeight: 500 }}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, padding: '0 28px 12px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
          {[
            ['orders', 'Sale Orders', null],
            ['returns', 'Returns', pendingReturns],
            ['invoices', 'Invoices', null],
          ].map(([k, l, badge]) => {
            const active = tab === k;
            return (
              <button key={k} type="button" onClick={() => setTab(k)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: active ? 'rgba(59,130,246,0.12)' : 'transparent', color: active ? '#60a5fa' : '#64748b', boxShadow: active ? 'inset 0 0 0 1px rgba(59,130,246,0.2)' : 'none' }}>
                {l}
                {badge > 0 && (
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#f59e0b', color: '#000', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && (
          <>
            {/* Search + filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px 14px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
              <div style={{ position: 'relative', width: 300 }}>
                <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SO # or customer…"
                  style={{ ...S.inp, paddingLeft: 34 }} />
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {['all', 'draft', 'approved', 'out_for_delivery', 'delivered', 'returned'].map(s => {
                  const active = statusFilter === s;
                  const cfg = SC[s];
                  const cnt = s === 'all' ? counts.all : counts[s];
                  return (
                    <button key={s} type="button" onClick={() => setStatusFilter(s)}
                      style={{ padding: '6px 13px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap', border: `1px solid ${active ? (cfg?.border || 'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.06)'}`, background: active ? (cfg?.bg || 'rgba(255,255,255,0.08)') : 'rgba(255,255,255,0.02)', color: active ? (cfg?.color || '#f1f5f9') : '#64748b', boxShadow: active && cfg?.glow ? `0 0 12px ${cfg.glow}` : 'none' }}>
                      {s === 'all' ? 'All' : cfg?.label} <span style={{ opacity: 0.7 }}>({cnt})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table — full width */}
            <div style={{ flex: 1, overflow: 'hidden', padding: '0 28px 24px', minHeight: 0, position: 'relative', zIndex: 1 }}>
              <div style={{ height: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {loading ? (
                    <div style={{ padding: 80, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Loading sale orders…</div>
                  ) : filtered.length === 0 ? (
                    <div style={{ padding: 80, textAlign: 'center' }}>
                      <FileCheck size={48} style={{ opacity: 0.08, display: 'block', margin: '0 auto 18px', color: '#60a5fa' }} />
                      <div style={{ color: '#64748b', fontSize: 14 }}>{search || statusFilter !== 'all' ? 'No orders match your filter.' : 'No sale orders yet.'}</div>
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                          {['SO Number', 'Customer', 'Items', 'Total Amount', 'Invoice', 'Date', 'Status', 'Actions'].map(col => (
                            <th key={col} style={{ ...S.th, textAlign: col === 'Total Amount' ? 'right' : col === 'Actions' ? 'center' : 'left' }}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(so => {
                          const isHov = hovRow === so.id;
                          return (
                            <tr key={so.id}
                              onMouseEnter={() => setHovRow(so.id)} onMouseLeave={() => setHovRow(null)}
                              onClick={() => setDrawer(so)}
                              style={{ cursor: 'pointer', transition: 'background 0.1s', borderLeft: '3px solid transparent', background: isHov ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                              <td style={S.td}>
                                <span style={{ fontWeight: 700, color: '#60a5fa', fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.02em' }}>{so.so_number}</span>
                              </td>
                              <td style={S.td}>
                                <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13 }}>{so.customer_name}</div>
                                {so.customer_phone && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{so.customer_phone}</div>}
                              </td>
                              <td style={S.td}>
                                <div style={{ fontWeight: 600, color: '#cbd5e1', fontSize: 13 }}>{so.items.length} item{so.items.length !== 1 ? 's' : ''}</div>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {so.items.slice(0, 2).map(i => i.product_name).join(', ')}{so.items.length > 2 ? ` +${so.items.length - 2}` : ''}
                                </div>
                              </td>
                              <td style={{ ...S.td, textAlign: 'right' }}>
                                <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{fmtAED(so.total_amount)}</span>
                              </td>
                              <td style={S.td}>
                                {so.invoice ? (
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', fontFamily: 'monospace' }}>{so.invoice.invoice_number}</div>
                                    <div style={{ fontSize: 10, color: INV_STATUS[so.invoice.status]?.color || '#64748b', marginTop: 2, fontWeight: 600 }}>{INV_STATUS[so.invoice.status]?.label}</div>
                                  </div>
                                ) : <span style={{ color: '#64748b', fontSize: 12 }}>—</span>}
                              </td>
                              <td style={{ ...S.td, color: '#64748b', fontSize: 12 }}>{fmtDate(so.created_at)}</td>
                              <td style={S.td}><StatusPill status={so.status} /></td>
                              <td style={{ ...S.td, textAlign: 'center' }}>
                                <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                                  {so.status === 'draft' && (
                                    <button type="button" onClick={() => handleAction(so, 'approve')} disabled={actionLoading}
                                      style={{ padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: '1px solid rgba(96,165,250,0.35)', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', cursor: 'pointer', whiteSpace: 'nowrap' }}>Approve</button>
                                  )}
                                  {so.status === 'approved' && (
                                    <button type="button" onClick={() => handleAction(so, 'dispatch')} disabled={actionLoading}
                                      style={{ padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: '1px solid rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', cursor: 'pointer', whiteSpace: 'nowrap' }}>Dispatch</button>
                                  )}
                                  {so.status === 'out_for_delivery' && (
                                    <>
                                      <button type="button" onClick={() => handleAction(so, 'deliver')} disabled={actionLoading}
                                        style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: '1px solid rgba(52,211,153,0.35)', background: 'rgba(52,211,153,0.1)', color: '#34d399', cursor: 'pointer' }}>Delivered</button>
                                      <button type="button" onClick={() => handleAction(so, 'reject')} disabled={actionLoading}
                                        style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: '1px solid rgba(251,113,133,0.35)', background: 'rgba(251,113,133,0.1)', color: '#fb7185', cursor: 'pointer' }}>Rejected</button>
                                    </>
                                  )}
                                  {(so.status === 'delivered' || so.status === 'returned') && (
                                    <span style={{ fontSize: 12, color: so.status === 'delivered' ? '#34d399' : '#fb7185', fontWeight: 600 }}>
                                      {so.status === 'delivered' ? 'Complete' : 'Returned'}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── SO Detail Modal ── */}
        {selSo && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
            onClick={() => setDrawer(null)}>
            <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22, width: '100%', maxWidth: 720, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 50px 120px rgba(0,0,0,0.85)' }}
              onClick={e => e.stopPropagation()}>

              {/* Modal header */}
              <div style={{ padding: '20px 26px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '22px 22px 0 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#60a5fa', fontFamily: 'monospace', letterSpacing: '0.02em' }}>{selSo.so_number}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{selSo.customer_name}{selSo.customer_phone ? ` · ${selSo.customer_phone}` : ''} · {fmtDate(selSo.created_at)}</div>
                  </div>
                  <StatusPill status={selSo.status} />
                </div>
                <button type="button" onClick={() => setDrawer(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 9, padding: '7px 8px', color: '#64748b', cursor: 'pointer' }}><X size={15} /></button>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, padding: '22px 26px' }}>
                {/* Progress */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: '18px 24px', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {SO_STEPS.map((s, i) => {
                      const cfg = SC[s];
                      const idx = SO_STEPS.indexOf(selSo.status === 'returned' ? 'out_for_delivery' : selSo.status);
                      const done = idx >= i; const curr = idx === i;
                      return (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: done ? cfg.dot : 'rgba(255,255,255,0.06)', border: `2px solid ${done ? cfg.dot : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.25s', boxShadow: curr ? `0 0 20px ${cfg.dot}80` : done ? `0 0 10px ${cfg.dot}40` : 'none' }}>
                              {done && <CheckCircle2 size={16} style={{ color: '#fff' }} />}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: done ? 700 : 400, color: done ? cfg.color : '#64748b', marginTop: 7, textAlign: 'center', whiteSpace: 'nowrap' }}>{cfg.label}</div>
                          </div>
                          {i < SO_STEPS.length - 1 && (
                            <div style={{ height: 2, flex: 1, maxWidth: 60, background: idx > i ? `linear-gradient(90deg,${SC[SO_STEPS[i]].dot},${SC[SO_STEPS[i + 1]].dot})` : 'rgba(255,255,255,0.05)', marginBottom: 28, borderRadius: 1, transition: 'background 0.25s' }} />
                          )}
                        </div>
                      );
                    })}
                    {selSo.status === 'returned' && (
                      <>
                        <div style={{ height: 2, width: 40, background: 'rgba(251,113,133,0.3)', marginBottom: 28 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(244,63,94,0.55)' }}>
                            <RotateCcw size={15} style={{ color: '#fff' }} />
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#fb7185', marginTop: 7 }}>Returned</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Invoice + Return entry row */}
                {(selSo.invoice || selSo.return_entry) && (
                  <div style={{ display: 'grid', gridTemplateColumns: selSo.invoice && selSo.return_entry ? '1fr 1fr' : '1fr', gap: 14, marginBottom: 18 }}>
                    {selSo.invoice && (
                      <div style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.07),rgba(96,165,250,0.03))', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Invoice</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#60a5fa', fontFamily: 'monospace' }}>{selSo.invoice.invoice_number}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, color: INV_STATUS[selSo.invoice.status]?.color, fontWeight: 700, marginBottom: 5 }}>{INV_STATUS[selSo.invoice.status]?.label}</div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0' }}>{fmtAED(selSo.invoice.total_amount)}</div>
                        </div>
                      </div>
                    )}
                    {selSo.return_entry && (
                      <div style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: 12, padding: '14px 18px' }}>
                        <div style={{ fontSize: 11, color: '#fb7185', fontWeight: 700, marginBottom: 5 }}>Return Entry — {selSo.return_entry.re_number}</div>
                        <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{selSo.return_entry.rejection_reason}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, color: selSo.return_entry.status === 'received' ? '#34d399' : '#fbbf24' }}>
                          {selSo.return_entry.status === 'received' ? 'Stock returned to warehouse' : 'Awaiting physical return'}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selSo.notes && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '11px 16px', marginBottom: 18 }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Notes</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{selSo.notes}</div>
                  </div>
                )}

                {/* Items */}
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Line Items</div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden', marginBottom: 22 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>
                      {['Product', 'Qty (kg)', 'Price / kg', 'Total'].map((h, i) => (
                        <th key={h} style={{ ...S.th, textAlign: i > 0 ? 'right' : 'left', padding: '11px 16px' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {selSo.items.map((it, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                          <td style={{ ...S.td, fontWeight: 500, padding: '12px 16px' }}>{it.product_name}</td>
                          <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: '#f1f5f9', padding: '12px 16px' }}>{parseFloat(it.quantity).toFixed(2)}</td>
                          <td style={{ ...S.td, textAlign: 'right', color: '#64748b', padding: '12px 16px', fontSize: 12 }}>{it.unit_price > 0 ? `AED ${parseFloat(it.unit_price).toFixed(0)}` : '—'}</td>
                          <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: '#60a5fa', padding: '12px 16px' }}>{fmtAED(it.total_price)}</td>
                        </tr>
                      ))}
                      <tr style={{ background: 'rgba(59,130,246,0.05)', borderTop: '1px solid rgba(59,130,246,0.15)' }}>
                        <td colSpan={3} style={{ ...S.td, fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '12px 16px' }}>Total Amount</td>
                        <td style={{ ...S.td, textAlign: 'right', fontWeight: 800, color: '#60a5fa', fontSize: 18, padding: '12px 16px' }}>{fmtAED(selSo.total_amount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Action buttons */}
                {selSo.status === 'draft' && (
                  <button type="button" onClick={() => handleAction(selSo, 'approve')} disabled={actionLoading}
                    style={{ width: '100%', padding: '14px', borderRadius: 11, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1, boxShadow: '0 6px 20px rgba(59,130,246,0.45)' }}>
                    {actionLoading ? 'Processing…' : 'Approve — Reserve Stock & Generate Invoice'}
                  </button>
                )}
                {selSo.status === 'approved' && (
                  <button type="button" onClick={() => handleAction(selSo, 'dispatch')} disabled={actionLoading}
                    style={{ width: '100%', padding: '14px', borderRadius: 11, background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1, boxShadow: '0 6px 20px rgba(245,158,11,0.45)' }}>
                    {actionLoading ? 'Processing…' : 'Dispatch — Out for Delivery'}
                  </button>
                )}
                {selSo.status === 'out_for_delivery' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button type="button" onClick={() => handleAction(selSo, 'deliver')} disabled={actionLoading}
                      style={{ padding: '14px', borderRadius: 11, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1, boxShadow: '0 6px 18px rgba(16,185,129,0.45)' }}>
                      Mark Delivered
                    </button>
                    <button type="button" onClick={() => handleAction(selSo, 'reject')} disabled={actionLoading}
                      style={{ padding: '14px', borderRadius: 11, background: 'linear-gradient(135deg,#f43f5e,#dc2626)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1, boxShadow: '0 6px 18px rgba(244,63,94,0.4)' }}>
                      Rejected by Driver
                    </button>
                  </div>
                )}
                {selSo.status === 'delivered' && (
                  <div style={{ textAlign: 'center', padding: '14px', borderRadius: 11, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#34d399', fontSize: 14, fontWeight: 700 }}>Delivery Complete</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── RETURNS TAB ── */}
        {tab === 'returns' && (
          <div style={{ flex: 1, overflow: 'hidden', padding: '0 28px 24px', minHeight: 0, position: 'relative', zIndex: 1 }}>
            <div style={{ height: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {returns.length === 0 ? (
                  <div style={{ padding: 80, textAlign: 'center' }}>
                    <RotateCcw size={48} style={{ opacity: 0.08, display: 'block', margin: '0 auto 18px', color: '#fb7185' }} />
                    <div style={{ color: '#64748b', fontSize: 14 }}>No return entries yet.</div>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Return #', 'SO #', 'Customer', 'Reason', 'Items', 'Status', 'Action'].map((col, i) => (
                          <th key={col} style={{ ...S.th, textAlign: col === 'Action' ? 'center' : 'left' }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {returns.map((r, i) => (
                        <tr key={r.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                          <td style={{ ...S.td, fontWeight: 700, color: '#fb7185', fontFamily: 'monospace' }}>{r.re_number}</td>
                          <td style={{ ...S.td, color: '#60a5fa', fontFamily: 'monospace', fontWeight: 600 }}>{r.so_number}</td>
                          <td style={{ ...S.td, fontWeight: 500 }}>{r.customer_name}</td>
                          <td style={{ ...S.td, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b', fontSize: 12 }}>{r.rejection_reason || '—'}</td>
                          <td style={{ ...S.td, color: '#64748b', fontSize: 12 }}>{r.items.map(i => `${i.product_name} (${parseFloat(i.quantity).toFixed(1)}kg)`).join(', ')}</td>
                          <td style={S.td}>
                            <span style={{ padding: '5px 12px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, background: r.status === 'received' ? 'rgba(52,211,153,0.1)' : 'rgba(251,191,36,0.1)', color: r.status === 'received' ? '#34d399' : '#fbbf24', border: `1px solid ${r.status === 'received' ? 'rgba(52,211,153,0.25)' : 'rgba(251,191,36,0.25)'}` }}>
                              {r.status === 'received' ? 'Returned to Stock' : 'Pending'}
                            </span>
                          </td>
                          <td style={{ ...S.td, textAlign: 'center' }}>
                            {r.status === 'pending' ? (
                              <button type="button" onClick={() => handleConfirmReturn(r.id)} disabled={actionLoading}
                                style={{ padding: '6px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', cursor: actionLoading ? 'not-allowed' : 'pointer' }}>
                                Confirm Receipt
                              </button>
                            ) : <span style={{ fontSize: 12, color: '#64748b' }}>Done</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── INVOICES TAB ── */}
        {tab === 'invoices' && (
          <div style={{ flex: 1, overflow: 'hidden', padding: '0 28px 24px', minHeight: 0, position: 'relative', zIndex: 1 }}>
            <div style={{ height: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {invoices.length === 0 ? (
                  <div style={{ padding: 80, textAlign: 'center' }}>
                    <FileCheck size={48} style={{ opacity: 0.08, display: 'block', margin: '0 auto 18px', color: '#60a5fa' }} />
                    <div style={{ color: '#64748b', fontSize: 14 }}>No invoices yet.</div>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Invoice #', 'SO #', 'Customer', 'Amount', 'Status', 'Date'].map((col) => (
                          <th key={col} style={{ ...S.th, textAlign: col === 'Amount' ? 'right' : 'left' }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv, i) => {
                        const sc = INV_STATUS[inv.status] || INV_STATUS.draft;
                        return (
                          <tr key={inv.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                            <td style={{ ...S.td, fontWeight: 700, color: '#60a5fa', fontFamily: 'monospace' }}>{inv.invoice_number}</td>
                            <td style={{ ...S.td, color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>{inv.so_number}</td>
                            <td style={{ ...S.td, fontWeight: 500 }}>{inv.customer_name}</td>
                            <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{fmtAED(inv.total_amount)}</td>
                            <td style={S.td}>
                              <span style={{ padding: '5px 12px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, color: sc.color, background: `${sc.color}14`, border: `1px solid ${sc.color}30` }}>{sc.label}</span>
                            </td>
                            <td style={{ ...S.td, color: '#64748b', fontSize: 12 }}>{fmtDate(inv.created_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Create SO Modal ── */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setShowCreate(false)}>
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22, padding: 32, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 50px 120px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f1f5f9', letterSpacing: -0.3 }}>New Sale Order</h3>
                <p style={{ margin: '5px 0 0', fontSize: 12, color: '#64748b' }}>Create draft — approve to reserve stock</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#64748b', cursor: 'pointer', padding: '7px 8px', borderRadius: 9 }}><X size={15} /></button>
            </div>

            <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 10, padding: '10px 14px', marginBottom: 22, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
              <span style={{ color: '#34d399', fontWeight: 600 }}>Available: </span>
              {Object.values(stockMap).filter(p => p.available > 0).map(p => `${p.name} (${p.available.toFixed(1)}kg)`).join(' · ') || 'No stock available'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
              <label style={{ ...S.lbl, gridColumn: '1/-1' }}>Customer Name *<input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Full customer name" style={S.inp} /></label>
              <label style={S.lbl}>Phone<input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} placeholder="+971…" style={S.inp} /></label>
              <label style={S.lbl}>Notes<input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" style={S.inp} /></label>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Line Items</div>
            {form.items.length === 0 && <div style={{ textAlign: 'center', padding: '18px 0', color: '#64748b', fontSize: 13, border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 10, marginBottom: 12 }}>No items — click Add Item below</div>}
            {form.items.map((it, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 34px', gap: 9, marginBottom: 9, alignItems: 'end' }}>
                <label style={S.lbl}>{i === 0 && 'Product'}
                  <select value={it.product_id} onChange={e => updItem(i, 'product_id', e.target.value)} style={{ ...S.inp, colorScheme: 'dark' }}>
                    <option value="">— Select product —</option>
                    {products.filter(p => p.is_active).map(p => {
                      const s = stockMap[p.id];
                      return <option key={p.id} value={p.id}>{p.name} {s ? `(${s.available.toFixed(1)}kg)` : ''}</option>;
                    })}
                  </select>
                </label>
                <label style={S.lbl}>{i === 0 && 'Qty (kg)'}<input type="number" value={it.quantity} onChange={e => updItem(i, 'quantity', e.target.value)} placeholder="0.00" style={S.inp} /></label>
                <label style={S.lbl}>{i === 0 && 'Price/kg'}<input type="number" value={it.unit_price} onChange={e => updItem(i, 'unit_price', e.target.value)} placeholder="0.00" style={S.inp} /></label>
                <button type="button" onClick={() => removeItem(i)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '9px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' }}><X size={13} /></button>
              </div>
            ))}
            <button type="button" onClick={addItem} style={{ width: '100%', padding: '11px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.09)', color: '#64748b', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 4, marginBottom: 24 }}>
              <Plus size={13} /> Add Item
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '13px', borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#475569', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={handleCreate} disabled={actionLoading} style={{ flex: 2, padding: '13px', borderRadius: 11, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1, boxShadow: '0 6px 20px rgba(16,185,129,0.4)' }}>
                {actionLoading ? 'Creating…' : 'Create Sale Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {showReject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setShowReject(null)}>
          <div style={{ background: '#0d1117', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 22, padding: 32, width: '100%', maxWidth: 460, boxShadow: '0 50px 120px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fb7185', margin: 0, letterSpacing: -0.2 }}>Rejected by Driver</h3>
              <button type="button" onClick={() => setShowReject(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#64748b', cursor: 'pointer', padding: '7px 8px', borderRadius: 9 }}><X size={15} /></button>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.65 }}>
              Creates a Return Entry + Credit Note and moves <span style={{ color: '#f1f5f9', fontWeight: 700, fontFamily: 'monospace' }}>{showReject.so_number}</span> to Returned status.
            </p>
            <label style={{ ...S.lbl, marginBottom: 24 }}>
              Rejection Reason *
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="Enter reason for rejection…" style={{ ...S.inp, resize: 'vertical' }} />
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setShowReject(null)} style={{ flex: 1, padding: '13px', borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#475569', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button type="button" onClick={handleReject} disabled={actionLoading} style={{ flex: 2, padding: '13px', borderRadius: 11, background: 'linear-gradient(135deg,#f43f5e,#dc2626)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1, boxShadow: '0 6px 20px rgba(244,63,94,0.4)' }}>
                {actionLoading ? 'Processing…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, right: 28, background: toast.type === 'error' ? 'rgba(220,38,38,0.96)' : 'rgba(5,150,105,0.96)', color: '#fff', borderRadius: 13, padding: '13px 22px', fontSize: 13, fontWeight: 600, boxShadow: '0 10px 40px rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', gap: 10, backdropFilter: 'blur(10px)', border: `1px solid ${toast.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}` }}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {toast.msg}
        </div>
      )}
    </div>
  );
}
