import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2,
  TrendingUp, Zap, UserCheck, Users, X, RefreshCw, CheckCircle2,
  AlertCircle, ClipboardList, FileCheck, Search, DollarSign,
  Clock, Wallet, FileText, CreditCard, Receipt,
} from 'lucide-react';
import { getCurrentUser } from '../api/auth';
import { getBills, getBillSummary, getBillDetail, payBill, updateBill } from '../api/erp';

const SIDEBAR_W = 245;

const SC = {
  issued:  { label: 'Issued',    color: '#60a5fa', bg: 'rgba(96,165,250,0.11)',  border: 'rgba(96,165,250,0.25)',  dot: '#3b82f6', glow: 'rgba(59,130,246,0.25)' },
  overdue: { label: 'Overdue',   color: '#f97316', bg: 'rgba(249,115,22,0.11)',  border: 'rgba(249,115,22,0.25)',  dot: '#ea580c', glow: 'rgba(249,115,22,0.3)' },
  paid:    { label: 'Paid',      color: '#34d399', bg: 'rgba(52,211,153,0.11)',  border: 'rgba(52,211,153,0.25)',  dot: '#10b981', glow: 'rgba(16,185,129,0.25)' },
  pending: { label: 'Pending',   color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.22)',  dot: '#f59e0b', glow: 'rgba(251,191,36,0.25)' },
};

const METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque',        label: 'Cheque' },
];

const S = {
  inp: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 13px', fontSize: 13, color: '#f1f5f9', outline: 'none', boxSizing: 'border-box', caretColor: '#60a5fa' },
  lbl: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 500, color: '#94a3b8' },
  th:  { padding: '13px 18px', fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap', userSelect: 'none', background: 'linear-gradient(180deg,rgba(59,130,246,0.08) 0%,rgba(59,130,246,0.02) 100%)', borderBottom: '1px solid rgba(59,130,246,0.12)' },
  td:  { padding: '14px 18px', fontSize: 13, color: '#cbd5e1', borderBottom: '1px solid rgba(255,255,255,0.035)', verticalAlign: 'middle' },
};

const today  = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtAED  = n => n > 0 ? `AED ${Number(n).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—';

function StatusPill({ status }) {
  const c = SC[status] || SC.issued;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px 5px 9px', borderRadius: 99, fontSize: 11.5, fontWeight: 700, background: c.bg, color: c.color, border: `1px solid ${c.border}`, boxShadow: c.glow ? `0 0 10px ${c.glow}` : 'none', letterSpacing: '0.02em' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, boxShadow: c.glow ? `0 0 5px ${c.dot}` : 'none', flexShrink: 0 }} />
      {c.label}
    </span>
  );
}

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

export default function AccountsPayable() {
  const navigate = useNavigate();
  const [bills, setBills]               = useState([]);
  const [summary, setSummary]           = useState(null);
  const [loading, setLoading]           = useState(false);
  const [search, setSearch]             = useState('');
  const [filter, setFilter]             = useState('all');
  const [selBill, setSelBill]           = useState(null);
  const [detail, setDetail]             = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast]               = useState(null);
  const [hovRow, setHovRow]             = useState(null);

  const [payForm, setPayForm] = useState({ paid_amount: '', payment_method: 'cash', payment_notes: '', payment_date: today() });
  const [payLoading, setPayLoading] = useState(false);

  const [editMode, setEditMode]     = useState(false);
  const [editData, setEditData]     = useState({ supplier_name: '', due_date: '', total_amount: 0, paid_amount: 0 });
  const [saveLoading, setSaveLoading] = useState(false);

  const cu = getCurrentUser();
  const displayName = (cu?.sub || '').split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const toast_ = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const [b, s] = await Promise.all([getBills(), getBillSummary()]);
      setBills(b);
      setSummary(s);
    } catch { toast_('Failed to load', 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openModal = async (bill) => {
    setSelBill(bill);
    setEditMode(false);
    setPayForm({ paid_amount: String(bill.balance_due || bill.total_amount), payment_method: 'cash', payment_notes: '', payment_date: today() });
    setDetailLoading(true);
    try { setDetail(await getBillDetail(bill.id)); } catch { setDetail(null); }
    setDetailLoading(false);
  };

  const closeModal = () => { setSelBill(null); setDetail(null); setEditMode(false); };

  const enterEditMode = () => {
    setEditData({
      supplier_name: selBill.supplier_name || '',
      due_date:      selBill.due_date ? selBill.due_date.slice(0, 10) : '',
      total_amount:  selBill.total_amount || 0,
      paid_amount:   selBill.paid_amount  || 0,
    });
    setEditMode(true);
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      const updated = await updateBill(selBill.id, {
        supplier_name: editData.supplier_name || null,
        due_date:      editData.due_date       || null,
        total_amount:  parseFloat(editData.total_amount) >= 0 ? parseFloat(editData.total_amount) : null,
        paid_amount:   parseFloat(editData.paid_amount) >= 0  ? parseFloat(editData.paid_amount)  : null,
      });
      setBills(prev => prev.map(b => b.id === selBill.id ? { ...b, ...updated } : b));
      setSelBill(prev => ({ ...prev, ...updated }));
      const newDetail = await getBillDetail(selBill.id);
      setDetail(newDetail);
      setEditMode(false);
      toast_('Bill updated');
      const s = await getBillSummary();
      setSummary(s);
    } catch (e) { toast_(e.response?.data?.detail || 'Update failed', 'error'); }
    setSaveLoading(false);
  };

  const handlePay = async () => {
    if (!selBill) return;
    const amt = parseFloat(payForm.paid_amount);
    if (!amt || amt <= 0) { toast_('Enter a valid amount', 'error'); return; }
    setPayLoading(true);
    try {
      const updated = await payBill(selBill.id, { paid_amount: amt, payment_method: payForm.payment_method, payment_notes: payForm.payment_notes || null, payment_date: payForm.payment_date || null });
      setBills(prev => prev.map(b => b.id === selBill.id ? { ...b, ...updated } : b));
      setSelBill(prev => ({ ...prev, ...updated }));
      setDetail(prev => prev ? { ...prev, ...updated } : null);
      const s = await getBillSummary();
      setSummary(s);
      toast_(amt >= selBill.total_amount ? 'Bill marked as Paid' : 'Payment recorded');
    } catch (e) { toast_(e.response?.data?.detail || 'Payment failed', 'error'); }
    setPayLoading(false);
  };

  const nb = (path, icon, label, active) => <NavBtn path={path} icon={icon} label={label} active={active} navigate={navigate} />;

  const pendingCount = useMemo(() => bills.filter(b => b.effective_status !== 'paid').length, [bills]);

  const filtered = useMemo(() => {
    let list = [...bills];
    if (filter === 'pending') list = list.filter(b => b.effective_status !== 'paid');
    else if (filter === 'paid')    list = list.filter(b => b.effective_status === 'paid');
    else if (filter === 'overdue') list = list.filter(b => b.effective_status === 'overdue');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        b.bill_number?.toLowerCase().includes(q) ||
        b.supplier_name?.toLowerCase().includes(q) ||
        b.po_number?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [bills, filter, search]);

  const STAT_CARDS = summary ? [
    { key: 'all',     label: 'Total Billed',   value: fmtAED(summary.total_billed),       icon: <FileText size={18} />, color: '#60a5fa' },
    { key: 'pending', label: 'Outstanding',     value: fmtAED(summary.total_outstanding),  icon: <Clock size={18} />,    color: '#fbbf24', count: pendingCount },
    { key: 'overdue', label: 'Overdue',         value: fmtAED(summary.total_overdue),      icon: <AlertCircle size={18} />, color: '#f97316', count: summary.counts?.overdue || 0 },
    { key: 'paid',    label: 'Total Paid',      value: fmtAED(summary.total_paid),         icon: <CheckCircle2 size={18} />, color: '#34d399', count: summary.counts?.paid || 0 },
  ] : [];

  const isAmber = editMode;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f0f18', color: '#f1f5f9', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: SIDEBAR_W, background: '#13131f', borderRight: '1px solid rgba(255,255,255,0.055)', display: 'flex', flexDirection: 'column', padding: '20px 10px', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, overflowY: 'auto' }}>
        <div style={{ padding: '6px 10px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>Al Hazmi ERP</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{displayName}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {nb('/dashboard',       <LayoutDashboard size={16} />, 'Dashboard',         false)}
          {nb('/inventory',       <Package size={16} />,         'Inventory',          false)}
          {nb('/purchase-orders', <ShoppingCart size={16} />,    'Purchase Orders',    false)}
          {nb('/sale-orders',     <ClipboardList size={16} />,   'Sale Orders',        false)}
          {nb('/invoices',        <FileCheck size={16} />,       'Invoices (AR)',      false)}
          {nb('/accounts-payable',<Receipt size={16} />,         'Accounts Payable',   true)}
          {nb('/sales',           <TrendingUp size={16} />,      'Sales Distribution', false)}
          {nb('/deliveries',      <Truck size={16} />,           'Deliveries',         false)}
          {nb('/suppliers',       <Users size={16} />,           'Suppliers',          false)}
          {nb('/reports',         <BarChart2 size={16} />,       'Reports',            false)}
          {nb('/hr',              <UserCheck size={16} />,       'HR / Payroll',       false)}
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: SIDEBAR_W, flex: 1, padding: '28px 32px', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Accounts Payable</h1>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>Supplier bills from received purchase orders</p>
          </div>
          <button onClick={load} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 9, fontSize: 13, color: '#60a5fa', cursor: 'pointer' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Stat Cards */}
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
            {STAT_CARDS.map(card => (
              <div key={card.key} onClick={() => setFilter(card.key)}
                style={{ background: filter === card.key ? `rgba(${card.color === '#60a5fa' ? '59,130,246' : card.color === '#fbbf24' ? '251,191,36' : card.color === '#f97316' ? '249,115,22' : '52,211,153'},0.14)` : 'rgba(255,255,255,0.03)', border: `1px solid ${filter === card.key ? card.color + '55' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '16px 20px', cursor: 'pointer', transition: 'all 0.18s', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{card.label}</span>
                  <span style={{ color: card.color, opacity: 0.8 }}>{card.icon}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>{card.value}</div>
                {card.count !== undefined && (
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>{card.count} bill{card.count !== 1 ? 's' : ''}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Search + filter pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bill # / supplier / PO…"
              style={{ ...S.inp, paddingLeft: 34 }} />
          </div>
          {['all', 'pending', 'overdue', 'paid'].map(f => {
            const labels = { all: 'All', pending: 'Pending', overdue: 'Overdue', paid: 'Paid' };
            const active = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)}
                style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: active ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.07)', background: active ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.03)', color: active ? '#60a5fa' : '#94a3b8', cursor: 'pointer', transition: 'all 0.15s' }}>
                {labels[f]}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Bill #', 'PO #', 'Supplier', 'Bill Amount', 'Paid', 'Balance Due', 'Due Date', 'Status'].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ ...S.td, textAlign: 'center', color: '#4b5563', padding: '40px' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ ...S.td, textAlign: 'center', color: '#4b5563', padding: '40px' }}>No bills found</td></tr>
              ) : filtered.map(b => (
                <tr key={b.id} onClick={() => openModal(b)} onMouseEnter={() => setHovRow(b.id)} onMouseLeave={() => setHovRow(null)}
                  style={{ cursor: 'pointer', background: hovRow === b.id ? 'rgba(59,130,246,0.05)' : 'transparent', transition: 'background 0.12s' }}>
                  <td style={S.td}><span style={{ fontWeight: 600, color: '#93c5fd', fontFamily: 'monospace', fontSize: 12.5 }}>{b.bill_number}</span></td>
                  <td style={S.td}><span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: 12 }}>{b.po_number || '—'}</span></td>
                  <td style={S.td}><span style={{ fontWeight: 500 }}>{b.supplier_name || '—'}</span></td>
                  <td style={S.td}><span style={{ fontWeight: 600 }}>{fmtAED(b.total_amount)}</span></td>
                  <td style={S.td}><span style={{ color: '#34d399' }}>{b.paid_amount > 0 ? fmtAED(b.paid_amount) : '—'}</span></td>
                  <td style={S.td}><span style={{ color: b.balance_due > 0 ? '#fbbf24' : '#34d399', fontWeight: 600 }}>{b.balance_due > 0 ? fmtAED(b.balance_due) : '—'}</span></td>
                  <td style={S.td}><span style={{ color: b.effective_status === 'overdue' ? '#f97316' : '#94a3b8' }}>{fmtDate(b.due_date)}</span></td>
                  <td style={S.td}><StatusPill status={b.effective_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {selBill && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{ background: '#16161f', border: `1px solid ${isAmber ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 18, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${isAmber ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.08)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Receipt size={18} style={{ color: isAmber ? '#fbbf24' : '#60a5fa' }} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{selBill.bill_number}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{selBill.po_number ? `From ${selBill.po_number}` : 'Manual bill'}</div>
                </div>
                <StatusPill status={selBill.effective_status} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {!editMode && selBill.effective_status !== 'paid' && (
                  <button onClick={enterEditMode}
                    style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', cursor: 'pointer' }}>
                    Edit
                  </button>
                )}
                {editMode && (
                  <>
                    <button onClick={handleSave} disabled={saveLoading}
                      style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24', cursor: 'pointer' }}>
                      {saveLoading ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditMode(false)}
                      style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </>
                )}
                <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Info cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                {/* Supplier */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Supplier</div>
                  {editMode ? (
                    <input value={editData.supplier_name} onChange={e => setEditData(p => ({ ...p, supplier_name: e.target.value }))}
                      style={{ ...S.inp, fontSize: 13 }} />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{selBill.supplier_name || '—'}</div>
                  )}
                </div>

                {/* Due Date */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${selBill.effective_status === 'overdue' ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Due Date</div>
                  {editMode ? (
                    <input type="date" value={editData.due_date} onChange={e => setEditData(p => ({ ...p, due_date: e.target.value }))}
                      style={{ ...S.inp, fontSize: 13, colorScheme: 'dark' }} />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: selBill.effective_status === 'overdue' ? '#f97316' : '#f1f5f9' }}>{fmtDate(selBill.due_date)}</div>
                  )}
                </div>

                {/* PO Reference */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>PO Reference</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#93c5fd', fontFamily: 'monospace' }}>{selBill.po_number || '—'}</div>
                </div>
              </div>

              {/* Amount cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                {/* Bill Amount */}
                <div style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Bill Amount</div>
                  {editMode ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: '#60a5fa', fontWeight: 700 }}>AED</span>
                      <input type="number" value={editData.total_amount} onChange={e => setEditData(p => ({ ...p, total_amount: e.target.value }))}
                        style={{ ...S.inp, fontSize: 14, fontWeight: 700, color: '#f1f5f9', flex: 1 }} />
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{fmtAED(selBill.total_amount)}</div>
                      {selBill.vat_amount > 0 && (
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                          Subtotal {fmtAED(selBill.subtotal)} + VAT ({selBill.vat_rate || 5}%) {fmtAED(selBill.vat_amount)}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Amount Paid */}
                <div style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Amount Paid</div>
                  {editMode ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: '#34d399', fontWeight: 700 }}>AED</span>
                      <input type="number" value={editData.paid_amount} onChange={e => setEditData(p => ({ ...p, paid_amount: e.target.value }))}
                        style={{ ...S.inp, fontSize: 14, fontWeight: 700, color: '#f1f5f9', flex: 1 }} />
                    </div>
                  ) : (
                    <div style={{ fontSize: 18, fontWeight: 700, color: selBill.paid_amount > 0 ? '#34d399' : '#94a3b8' }}>
                      {selBill.paid_amount > 0 ? fmtAED(selBill.paid_amount) : '—'}
                    </div>
                  )}
                </div>

                {/* Balance Due */}
                <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Balance Due</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: selBill.balance_due > 0 ? '#fbbf24' : '#34d399' }}>
                    {editMode
                      ? fmtAED(Math.max(0, (parseFloat(editData.total_amount) || 0) - (parseFloat(editData.paid_amount) || 0)))
                      : (selBill.balance_due > 0 ? fmtAED(selBill.balance_due) : 'Cleared')}
                  </div>
                </div>
              </div>

              {/* Line Items */}
              {detailLoading ? (
                <div style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', padding: 20 }}>Loading items…</div>
              ) : (detail?.items || []).length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>PO Items</div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          {['Product', 'Qty', 'Unit Price', 'Total'].map(h => (
                            <th key={h} style={{ ...S.th, fontSize: 10.5 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(detail?.items || []).map((it, i) => (
                          <tr key={i}>
                            <td style={{ ...S.td, fontSize: 13 }}>{it.product_name}</td>
                            <td style={{ ...S.td, fontSize: 13 }}>{Number(it.quantity).toLocaleString()} kg</td>
                            <td style={{ ...S.td, fontSize: 13 }}>{fmtAED(it.unit_price)}</td>
                            <td style={{ ...S.td, fontSize: 13, fontWeight: 600 }}>{fmtAED(it.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payment section */}
              {!editMode && selBill.effective_status !== 'paid' && (
                <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CreditCard size={15} style={{ color: '#60a5fa' }} /> Record Payment
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label style={S.lbl}>
                      Amount (AED)
                      <input type="number" value={payForm.paid_amount} onChange={e => setPayForm(p => ({ ...p, paid_amount: e.target.value }))}
                        placeholder="0.00" style={S.inp} />
                    </label>
                    <label style={S.lbl}>
                      Date
                      <input type="date" value={payForm.payment_date} onChange={e => setPayForm(p => ({ ...p, payment_date: e.target.value }))}
                        style={{ ...S.inp, colorScheme: 'dark' }} />
                    </label>
                    <label style={S.lbl}>
                      Method
                      <select value={payForm.payment_method} onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}
                        style={{ ...S.inp, appearance: 'none' }}>
                        {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </label>
                    <label style={S.lbl}>
                      Notes
                      <input value={payForm.payment_notes} onChange={e => setPayForm(p => ({ ...p, payment_notes: e.target.value }))}
                        placeholder="Optional" style={S.inp} />
                    </label>
                  </div>
                  <button onClick={handlePay} disabled={payLoading}
                    style={{ marginTop: 14, width: '100%', padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: payLoading ? 'rgba(52,211,153,0.1)' : 'linear-gradient(135deg,rgba(16,185,129,0.25),rgba(52,211,153,0.15))', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399', cursor: payLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <CheckCircle2 size={15} />
                    {payLoading ? 'Processing…' : 'Mark Payment'}
                  </button>
                </div>
              )}

              {/* Paid confirmation */}
              {selBill.effective_status === 'paid' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 12 }}>
                  <CheckCircle2 size={16} style={{ color: '#34d399', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#34d399' }}>Paid</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{selBill.payment_method ? `via ${METHODS.find(m => m.value === selBill.payment_method)?.label || selBill.payment_method}` : ''}{selBill.paid_at ? ` on ${fmtDate(selBill.paid_at)}` : ''}</div>
                  </div>
                </div>
              )}
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
