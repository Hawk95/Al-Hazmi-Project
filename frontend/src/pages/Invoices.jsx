import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2,
  TrendingUp, Zap, UserCheck, Users, X, RefreshCw, CheckCircle2,
  AlertCircle, ClipboardList, FileCheck, Search, ArrowRight,
  DollarSign, Clock, Wallet, FileText, CreditCard, Ban, Printer, Receipt, Activity,
} from 'lucide-react';
import { getCurrentUser } from '../api/auth';
import { getInvoices, getInvoiceSummary, getInvoiceDetail, payInvoice, updateInvoice } from '../api/erp';

const SIDEBAR_W = 245;

const SC = {
  draft:   { label: 'Draft',         color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.22)', dot: '#64748b', glow: '' },
  issued:  { label: 'Issued',        color: '#60a5fa', bg: 'rgba(96,165,250,0.11)',  border: 'rgba(96,165,250,0.25)',  dot: '#3b82f6', glow: 'rgba(59,130,246,0.25)' },
  overdue: { label: 'Overdue',       color: '#f97316', bg: 'rgba(249,115,22,0.11)',  border: 'rgba(249,115,22,0.25)',  dot: '#ea580c', glow: 'rgba(249,115,22,0.3)' },
  paid:    { label: 'Fully Paid',    color: '#34d399', bg: 'rgba(52,211,153,0.11)',  border: 'rgba(52,211,153,0.25)',  dot: '#10b981', glow: 'rgba(16,185,129,0.25)' },
  voided:  { label: 'Voided',        color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.18)', dot: '#4b5563', glow: '' },
  pending: { label: 'Pending Bills', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.22)',  dot: '#f59e0b', glow: 'rgba(251,191,36,0.25)' },
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

const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtAED  = n => n > 0 ? `AED ${Number(n).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—';

function StatusPill({ status }) {
  const c = SC[status] || SC.draft;
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

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices]         = useState([]);
  const [summary, setSummary]           = useState(null);
  const [loading, setLoading]           = useState(false);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selInv, setSelInv]             = useState(null);
  const [detail, setDetail]             = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast]               = useState(null);
  const [hovRow, setHovRow]             = useState(null);

  // Payment form state
  const [payForm, setPayForm] = useState({ paid_amount: '', payment_method: 'cash', payment_notes: '', payment_date: today() });
  const [payLoading, setPayLoading] = useState(false);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ customer_name: '', customer_phone: '', due_date: '', items: [] });
  const [saveLoading, setSaveLoading] = useState(false);

  const cu = getCurrentUser();
  const displayName = (cu?.sub || '').split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const toast_ = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const [inv, sum] = await Promise.all([getInvoices(), getInvoiceSummary()]);
      setInvoices(inv);
      setSummary(sum);
    } catch { toast_('Failed to load', 'error'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openModal = async (inv) => {
    setSelInv(inv);
    setEditMode(false);
    setPayForm({ paid_amount: String(inv.balance_due || inv.total_amount), payment_method: 'cash', payment_notes: '', payment_date: today() });
    setDetailLoading(true);
    try { setDetail(await getInvoiceDetail(inv.id)); } catch { setDetail(null); }
    setDetailLoading(false);
  };

  const closeModal = () => { setSelInv(null); setDetail(null); setEditMode(false); };

  const enterEditMode = () => {
    setEditData({
      customer_name:  selInv.customer_name  || '',
      customer_phone: selInv.customer_phone || '',
      due_date:       selInv.due_date ? selInv.due_date.slice(0, 10) : '',
      total_amount:   selInv.total_amount  || 0,
      paid_amount:    selInv.paid_amount   || 0,
      items: (detail?.items || []).map(it => ({ ...it, unit_price: it.unit_price || 0 })),
    });
    setEditMode(true);
  };

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      const updated = await updateInvoice(selInv.id, {
        customer_name:  editData.customer_name  || null,
        customer_phone: editData.customer_phone || null,
        due_date:       editData.due_date        || null,
        total_amount:   parseFloat(editData.total_amount) || null,
        paid_amount:    parseFloat(editData.paid_amount) >= 0 ? parseFloat(editData.paid_amount) : null,
        items: editData.items.map(it => ({ id: it.id, unit_price: parseFloat(it.unit_price) || 0 })),
      });
      setInvoices(prev => prev.map(i => i.id === selInv.id ? { ...i, ...updated } : i));
      setSelInv(prev => ({ ...prev, ...updated }));
      const newDetail = await getInvoiceDetail(selInv.id);
      setDetail(newDetail);
      setEditMode(false);
      toast_('Invoice updated');
      const sum = await getInvoiceSummary();
      setSummary(sum);
    } catch (e) { toast_(e.response?.data?.detail || 'Update failed', 'error'); }
    setSaveLoading(false);
  };

  const updateEditItem = (idx, field, val) => {
    setEditData(prev => {
      const items = prev.items.map((it, i) => {
        if (i !== idx) return it;
        const updated = { ...it, [field]: val };
        if (field === 'unit_price') {
          const price = parseFloat(val) || 0;
          updated.total_price = Math.round(it.quantity * price * 100) / 100;
        }
        return updated;
      });
      return { ...prev, items };
    });
  };

  const handlePay = async () => {
    if (!selInv) return;
    const amt = parseFloat(payForm.paid_amount);
    if (!amt || amt <= 0) { toast_('Enter a valid amount', 'error'); return; }
    setPayLoading(true);
    try {
      const updated = await payInvoice(selInv.id, { paid_amount: amt, payment_method: payForm.payment_method, payment_notes: payForm.payment_notes || null, payment_date: payForm.payment_date || null });
      setInvoices(prev => prev.map(i => i.id === selInv.id ? { ...i, ...updated } : i));
      setSelInv(prev => ({ ...prev, ...updated }));
      setDetail(prev => prev ? { ...prev, ...updated } : null);
      const [sum] = await Promise.all([getInvoiceSummary()]);
      setSummary(sum);
      toast_(amt >= selInv.total_amount ? 'Invoice marked as Paid' : 'Payment recorded');
    } catch (e) { toast_(e.response?.data?.detail || 'Payment failed', 'error'); }
    setPayLoading(false);
  };

  const nb = (path, icon, label, active) => <NavBtn path={path} icon={icon} label={label} active={active} navigate={navigate} />;

  const printInvoice = () => {
    const inv   = selInv;
    const items = detail?.items || [];
    const fmtD  = d => d ? new Date(d).toLocaleDateString('en-AE', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
    const fmtN  = n => Number(n || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const methodLabel = METHODS.find(m => m.value === inv.payment_method)?.label || inv.payment_method || '—';
    const statusBadge = { paid: { bg: '#dcfce7', color: '#15803d', border: '#86efac', text: '✓ Payment Received' }, overdue: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', text: '⚠ Payment Overdue' }, issued: { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', text: 'Payment Pending' }, draft: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', text: 'Draft' }, voided: { bg: '#f1f5f9', color: '#6b7280', border: '#cbd5e1', text: 'Voided' } };
    const badge = statusBadge[inv.effective_status] || statusBadge.draft;

    const stampColor = inv.effective_status === 'paid' ? '#16a34a' : inv.effective_status === 'voided' ? '#6b7280' : null;
    const stampText  = inv.effective_status === 'paid' ? 'PAID' : inv.effective_status === 'voided' ? 'VOID' : null;

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${inv.invoice_number}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter','Segoe UI',Arial,sans-serif;background:#f0f4f8;color:#1a2332;font-size:13px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .wrapper{width:210mm;min-height:297mm;margin:0 auto;background:#fff;position:relative;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,0.15)}

  /* ── HEADER BAND ── */
  .header-band{background:linear-gradient(135deg,#0f2040 0%,#1a3a6e 60%,#1e4080 100%);padding:28px 32px 24px;position:relative;overflow:hidden}
  .header-band::after{content:'';position:absolute;right:-40px;top:-40px;width:220px;height:220px;border-radius:50%;background:rgba(255,255,255,0.04)}
  .header-band::before{content:'';position:absolute;right:60px;bottom:-60px;width:160px;height:160px;border-radius:50%;background:rgba(59,130,246,0.08)}
  .hb-inner{display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1}
  .co-name{font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;line-height:1.1}
  .co-tag{font-size:10px;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:0.14em;margin-top:5px}
  .co-addr{font-size:11px;color:rgba(255,255,255,0.45);margin-top:8px;line-height:1.6}
  .inv-side{text-align:right}
  .inv-type{font-size:11px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.2em;margin-bottom:6px}
  .inv-title{font-size:32px;font-weight:800;color:#ffffff;letter-spacing:1px;text-transform:uppercase;line-height:1}
  .inv-num-badge{display:inline-block;margin-top:8px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:6px;padding:5px 14px;font-size:13px;font-weight:700;color:#93c5fd;font-family:monospace;letter-spacing:0.05em}

  /* ── ACCENT BAR ── */
  .accent-bar{height:4px;background:linear-gradient(90deg,#3b82f6 0%,#60a5fa 40%,#93c5fd 70%,#bfdbfe 100%)}

  /* ── BODY PADDING ── */
  .body{padding:24px 32px}

  /* ── INFO GRID ── */
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
  .info-card{border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
  .info-card-head{background:#f8fafc;padding:8px 14px;border-bottom:1px solid #e2e8f0;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.14em}
  .info-card-body{padding:12px 14px}
  .info-row{display:flex;justify-content:space-between;align-items:baseline;padding:4px 0;border-bottom:1px solid #f8fafc}
  .info-row:last-child{border-bottom:none}
  .ik{font-size:11.5px;color:#94a3b8;font-weight:400}
  .iv{font-size:12px;color:#1e293b;font-weight:600}
  .bill-name{font-size:18px;font-weight:800;color:#0f2040;margin-bottom:4px;line-height:1.2}
  .bill-sub{font-size:12px;color:#64748b;line-height:1.7}

  /* ── ITEMS TABLE ── */
  .section-hd{font-size:9.5px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}
  table{width:100%;border-collapse:collapse;margin-bottom:20px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0}
  thead tr{background:linear-gradient(135deg,#0f2040,#1a3a6e)}
  thead th{padding:10px 14px;font-size:10px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.1em;text-align:left}
  thead th.r{text-align:right}
  tbody tr{border-bottom:1px solid #f1f5f9}
  tbody tr:last-child{border-bottom:none}
  tbody tr:nth-child(even){background:#f9fafb}
  tbody td{padding:11px 14px;font-size:12.5px;color:#334155}
  tbody td.r{text-align:right}
  .num-cell{color:#94a3b8;font-size:11px;font-weight:500}
  .prod-cell{font-weight:600;color:#1e293b}
  .amt-cell{font-weight:700;color:#0f2040}

  /* ── TOTALS ── */
  .bottom-row{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;gap:16px}
  .pay-terms{flex:1;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-size:11.5px;color:#64748b;line-height:1.9}
  .pay-terms strong{color:#1e293b;display:block;font-size:12px;margin-bottom:4px}
  .totals-box{width:290px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
  .trow{display:flex;justify-content:space-between;align-items:center;padding:9px 16px;font-size:12.5px;border-bottom:1px solid #f1f5f9;color:#334155}
  .trow:last-child{border:none;background:linear-gradient(135deg,#0f2040,#1a3a6e);color:#fff;font-weight:800;font-size:14.5px;padding:13px 16px}
  .tval{font-family:monospace;font-weight:600}
  .tval-paid{font-family:monospace;font-weight:600;color:#16a34a}
  .tval-grand{font-family:monospace;font-weight:800;color:#fff}

  /* ── STATUS BAND ── */
  .status-band{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-radius:10px;margin-bottom:24px;border:1.5px solid}
  .sbadge-text{font-size:13px;font-weight:700}
  .sbadge-sub{font-size:11px;margin-top:3px;opacity:0.75}
  .s-ref{text-align:right;font-size:11px;line-height:1.8}
  .s-ref strong{font-size:12px}

  /* ── WATERMARK STAMP ── */
  .stamp-wrap{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;display:flex;align-items:center;justify-content:center}
  .stamp-inner{transform:rotate(-35deg);opacity:0.07;font-size:96px;font-weight:900;letter-spacing:10px;text-transform:uppercase;font-family:'Inter','Segoe UI',Arial,sans-serif;color:${stampColor || '#000'};border:8px solid ${stampColor || '#000'};padding:6px 28px;border-radius:8px;white-space:nowrap;line-height:1}

  /* ── FOOTER ── */
  .footer{border-top:2px solid #0f2040;padding-top:16px;display:flex;justify-content:space-between;align-items:flex-start;margin-top:4px}
  .footer-left .thank{font-size:14px;font-weight:800;color:#0f2040;margin-bottom:3px}
  .footer-left p{font-size:10.5px;color:#64748b;line-height:1.7}
  .footer-right{text-align:right;font-size:10px;color:#94a3b8;line-height:1.9}
  .footer-right strong{color:#64748b}

  @media print{
    body{background:#fff}
    .wrapper{box-shadow:none;margin:0}
    @page{size:A4;margin:0}
  }
</style></head>
<body>
<div class="wrapper">

  ${stampText ? `<div class="stamp-wrap"><div class="stamp-inner">${stampText}</div></div>` : ''}

  <div class="header-band">
    <div class="hb-inner">
      <div>
        <div class="co-name">Al Hazmi Meat Trading</div>
        <div class="co-tag">Premium Meat Distribution &amp; Supply</div>
        <div class="co-addr">Dubai, United Arab Emirates<br>TRN: 100123456700003</div>
      </div>
      <div class="inv-side">
        <div class="inv-type">Original</div>
        <div class="inv-title">Tax Invoice</div>
        <div class="inv-num-badge">${inv.invoice_number}</div>
      </div>
    </div>
  </div>
  <div class="accent-bar"></div>

  <div class="body">

    <div class="info-grid">
      <div class="info-card">
        <div class="info-card-head">Invoice Details</div>
        <div class="info-card-body">
          <div class="info-row"><span class="ik">Invoice No.</span><span class="iv">${inv.invoice_number}</span></div>
          <div class="info-row"><span class="ik">Sale Order</span><span class="iv">${inv.so_number}</span></div>
          <div class="info-row"><span class="ik">Issue Date</span><span class="iv">${fmtD(inv.created_at)}</span></div>
          <div class="info-row"><span class="ik">Due Date</span><span class="iv" style="color:${inv.effective_status==='overdue'?'#dc2626':'inherit'}">${fmtD(inv.due_date)}</span></div>
        </div>
      </div>
      <div class="info-card">
        <div class="info-card-head">Bill To</div>
        <div class="info-card-body">
          <div class="bill-name">${inv.customer_name || '—'}</div>
          ${inv.customer_phone ? `<div class="bill-sub">Tel: ${inv.customer_phone}</div>` : ''}
          <div class="bill-sub" style="margin-top:6px;color:#94a3b8;font-size:11px">Ref: ${inv.so_number}</div>
        </div>
      </div>
    </div>

    <div class="section-hd">Line Items</div>
    <table>
      <thead>
        <tr>
          <th style="width:36px">#</th>
          <th>Product / Description</th>
          <th class="r" style="width:110px">Qty (kg)</th>
          <th class="r" style="width:120px">Unit Price</th>
          <th class="r" style="width:130px">Amount (AED)</th>
        </tr>
      </thead>
      <tbody>
        ${items.length
          ? items.map((it, i) => `<tr>
              <td class="num-cell">${i + 1}</td>
              <td class="prod-cell">${it.product_name}</td>
              <td class="r">${parseFloat(it.quantity).toFixed(2)}</td>
              <td class="r" style="color:#64748b">${it.unit_price > 0 ? fmtN(it.unit_price) : '—'}</td>
              <td class="r amt-cell">${it.total_price > 0 ? fmtN(it.total_price) : '—'}</td>
            </tr>`).join('')
          : `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:24px;font-style:italic">No line items available</td></tr>`
        }
      </tbody>
    </table>

    <div class="bottom-row">
      ${inv.effective_status !== 'paid' && inv.effective_status !== 'voided' ? `
      <div class="pay-terms">
        <strong>Payment Instructions</strong>
        Payment due by ${fmtD(inv.due_date)}<br>
        Methods accepted: Bank Transfer · Cash · Cheque<br>
        Please quote <strong style="color:#1e293b">${inv.invoice_number}</strong> on all payments
      </div>` : `<div></div>`}
      <div class="totals-box">
        <div class="trow"><span>Subtotal</span><span class="tval">AED ${fmtN(inv.subtotal || inv.total_amount)}</span></div>
        <div class="trow"><span>VAT (${inv.vat_rate || 5}%)</span><span class="tval" style="color:#d97706">AED ${fmtN(inv.vat_amount || 0)}</span></div>
        <div class="trow" style="border-bottom:1px solid #f1f5f9"><span style="font-weight:700;color:#1e293b">Total (incl. VAT)</span><span class="tval" style="font-weight:700;color:#1e293b">AED ${fmtN(inv.total_amount)}</span></div>
        ${inv.paid_amount > 0 ? `<div class="trow"><span>Amount Paid</span><span class="tval-paid">− AED ${fmtN(inv.paid_amount)}</span></div>` : ''}
        <div class="trow">
          <span>${inv.balance_due > 0 ? 'Balance Due' : 'Total Amount'}</span>
          <span class="tval-grand">AED ${fmtN(inv.balance_due > 0 ? inv.balance_due : inv.total_amount)}</span>
        </div>
      </div>
    </div>

    <div class="status-band" style="background:${badge.bg};border-color:${badge.border}">
      <div>
        <div class="sbadge-text" style="color:${badge.color}">${badge.text}</div>
        ${inv.effective_status === 'paid' && inv.paid_at
          ? `<div class="sbadge-sub" style="color:${badge.color}">Paid on ${fmtD(inv.paid_at)} via ${methodLabel}${inv.payment_notes ? ' — ' + inv.payment_notes : ''}</div>`
          : inv.effective_status === 'overdue'
          ? `<div class="sbadge-sub" style="color:${badge.color}">Was due ${fmtD(inv.due_date)}</div>`
          : ''
        }
      </div>
      <div class="s-ref" style="color:${badge.color}">
        <strong>${inv.invoice_number}</strong><br>
        ${new Date().toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' })}
      </div>
    </div>

    <div class="footer">
      <div class="footer-left">
        <div class="thank">Thank you for your business!</div>
        <p>Al Hazmi Meat Trading · Dubai, United Arab Emirates<br>For billing enquiries, contact your account manager.</p>
      </div>
      <div class="footer-right">
        <strong>Computer Generated Document</strong><br>
        No signature required<br>
        Printed: ${new Date().toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' })}
      </div>
    </div>

  </div>
</div>
</body></html>`;

    const win = window.open('', '_blank', 'width=900,height=750');
    if (!win) { toast_('Allow pop-ups to print', 'error'); return; }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  };

  const counts = useMemo(() => {
    const c = { all: invoices.length, draft: 0, issued: 0, overdue: 0, paid: 0, voided: 0 };
    invoices.forEach(i => { if (c[i.effective_status] !== undefined) c[i.effective_status]++; });
    c.pending = (c.issued || 0) + (c.overdue || 0);
    return c;
  }, [invoices]);

  const filtered = useMemo(() => invoices.filter(i => {
    if (statusFilter === 'pending') {
      if (i.effective_status !== 'issued' && i.effective_status !== 'overdue') return false;
    } else if (statusFilter !== 'all' && i.effective_status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!i.invoice_number.toLowerCase().includes(q) && !(i.customer_name || '').toLowerCase().includes(q) && !(i.so_number || '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [invoices, statusFilter, search]);

  const STAT_CARDS = [
    { label: 'Total Invoiced', value: fmtAED(summary?.total_invoiced || 0),    color: '#60a5fa', icon: <FileText size={20} />,    sub: `${counts.all} invoices`,                               filter: 'all' },
    { label: 'Pending Bills',  value: fmtAED(summary?.total_outstanding || 0), color: '#fbbf24', icon: <Clock size={20} />,        sub: `${counts.pending || 0} unpaid · click to view`,        filter: 'pending' },
    { label: 'Overdue',        value: fmtAED(summary?.total_overdue || 0),     color: '#f97316', icon: <AlertCircle size={20} />,  sub: `${counts.overdue || 0} past due · click to view`,      filter: 'overdue' },
    { label: 'Fully Paid',     value: fmtAED(summary?.total_paid || 0),        color: '#34d399', icon: <CheckCircle2 size={20} />, sub: `${counts.paid || 0} paid · click to view`,             filter: 'paid' },
  ];

  const canPay = s => s === 'issued' || s === 'overdue';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#080b14', color: '#f1f5f9', fontFamily: 'Inter,system-ui,sans-serif' }}>

      {/* Sidebar */}
      <aside style={{ width: SIDEBAR_W, minWidth: SIDEBAR_W, height: '100vh', background: '#0d1117', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '18px 14px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0, boxShadow: '0 4px 14px rgba(59,130,246,0.4)' }}>AH</div>
            <div><div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>Al Hazmi</div><div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '0.05em' }}>MEAT ERP</div></div>
          </div>
        </div>
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '10px 8px 5px' }}>Main</div>
          {nb('/dashboard',       <LayoutDashboard size={15} />, 'Overview',          false)}
          {nb('/inventory',       <Package         size={15} />, 'Inventory',          false)}
          {nb('/purchase-orders', <ClipboardList   size={15} />, 'Purchase Orders',    false)}
          {nb('/sale-orders',     <FileCheck       size={15} />, 'Sale Orders',        false)}
          {nb('/invoices',        <FileText        size={15} />, 'Invoices (AR)',      true)}
          {nb('/accounts-payable',<Receipt         size={15} />, 'Accounts Payable',   false)}
          {nb('/customers',       <Users           size={15} />, 'Customers',           false)}
          {nb('/orders',          <ShoppingCart    size={15} />, 'Orders',             false)}
          {nb('/suppliers',       <Truck           size={15} />, 'Suppliers',          false)}
          {nb('/deliveries',      <MapPin          size={15} />, 'Deliveries',         false)}
          {nb('/sales',           <TrendingUp      size={15} />, 'Sales Distribution', false)}
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '14px 8px 5px' }}>Analytics</div>
          {nb('/vat-return',      <FileCheck       size={15} />, 'VAT Return',         false)}
          {nb('/pnl',             <Activity        size={15} />, 'Profit & Loss',      false)}
          {nb('/reports',         <BarChart2       size={15} />, 'Reports',            false)}
          {nb('/forecast',        <Zap             size={15} />, 'AI Forecast',        false)}
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '14px 8px 5px' }}>People</div>
          {nb('/hr',              <UserCheck       size={15} />, 'HR Attendance',      false)}
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '14px 8px 5px' }}>Admin</div>
          {nb('/admin/users',     <Users           size={15} />, 'User Management',    false)}
        </nav>
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{displayName[0] || 'U'}</div>
          <div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div><div style={{ fontSize: 10, color: '#94a3b8' }}>Al Hazmi ERP</div></div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>

        {/* Depth radials */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse 60% 40% at 70% 0%,rgba(59,130,246,0.04) 0%,transparent 60%), radial-gradient(ellipse 40% 30% at 100% 100%,rgba(139,92,246,0.04) 0%,transparent 60%)' }} />

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(13,17,23,0.8)', backdropFilter: 'blur(12px)', flexShrink: 0, position: 'relative', zIndex: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg,#3b82f6,#60a5fa)' }} />
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f1f5f9', letterSpacing: -0.5 }}>Invoices</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8', paddingLeft: 14 }}>
              {['Issued', 'Overdue', 'Paid'].map((s, i, arr) => (
                <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: i === arr.length - 1 ? '#34d399' : '#64748b' }}>{s}</span>
                  {i < arr.length - 1 && <ArrowRight size={9} style={{ color: '#94a3b8' }} />}
                </span>
              ))}
            </div>
          </div>
          <button type="button" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, padding: '16px 28px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
          {STAT_CARDS.map(c => {
            const isActive = statusFilter === c.filter;
            return (
              <div key={c.label} onClick={() => setStatusFilter(c.filter)}
                style={{ background: isActive ? `${c.color}0f` : 'rgba(255,255,255,0.03)', border: `1px solid ${isActive ? c.color + '40' : c.color + '18'}`, borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s', boxShadow: isActive ? `0 0 0 2px ${c.color}28, 0 8px 24px ${c.color}12` : 'none' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: isActive ? 3 : 2, background: `linear-gradient(90deg,${c.color}${isActive ? 'cc' : '60'},${c.color}15)`, borderRadius: '14px 14px 0 0', transition: 'height 0.15s' }} />
                <div style={{ width: 42, height: 42, borderRadius: 12, background: `${c.color}${isActive ? '22' : '14'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, flexShrink: 0, boxShadow: `0 4px 16px ${c.color}20` }}>{c.icon}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', lineHeight: 1, letterSpacing: -0.3 }}>{loading ? '—' : c.value}</div>
                  <div style={{ fontSize: 11, color: isActive ? c.color : '#94a3b8', marginTop: 3, fontWeight: isActive ? 700 : 500 }}>{c.label}</div>
                  <div style={{ fontSize: 10, color: `${c.color}99`, marginTop: 2 }}>{loading ? '' : c.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Search + filter pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px 14px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
          <div style={{ position: 'relative', width: 300 }}>
            <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice #, customer, SO…"
              style={{ ...S.inp, paddingLeft: 34 }} />
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {['all', 'pending', 'overdue', 'paid', 'draft', 'voided'].map(s => {
              const active = statusFilter === s;
              const cfg = SC[s];
              const label = s === 'all' ? 'All' : cfg?.label;
              const cnt   = s === 'all' ? counts.all : (counts[s] || 0);
              return (
                <button key={s} type="button" onClick={() => setStatusFilter(s)}
                  style={{ padding: '6px 13px', borderRadius: 99, fontSize: 11.5, fontWeight: 600, border: `1px solid ${active ? (cfg?.border || 'rgba(255,255,255,0.2)') : 'rgba(255,255,255,0.06)'}`, background: active ? (cfg?.bg || 'rgba(255,255,255,0.08)') : 'rgba(255,255,255,0.02)', color: active ? (cfg?.color || '#f1f5f9') : '#94a3b8', cursor: 'pointer', transition: 'all 0.15s', boxShadow: active && cfg?.glow ? `0 0 12px ${cfg.glow}` : 'none' }}>
                  {label} <span style={{ opacity: 0.7 }}>({cnt})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflow: 'hidden', padding: '0 28px 24px', minHeight: 0, position: 'relative', zIndex: 1 }}>
          <div style={{ height: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loading ? (
                <div style={{ padding: 80, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading invoices…</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 80, textAlign: 'center' }}>
                  <FileText size={48} style={{ opacity: 0.08, display: 'block', margin: '0 auto 18px', color: '#60a5fa' }} />
                  <div style={{ color: '#94a3b8', fontSize: 14 }}>{search || statusFilter !== 'all' ? 'No invoices match your filter.' : 'No invoices yet — approve a Sale Order to generate one.'}</div>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      {['Invoice #', 'Customer', 'SO #', 'Date', 'Due Date', 'Amount', 'Paid', 'Balance', 'Status', 'Action'].map(col => (
                        <th key={col} style={{ ...S.th, textAlign: ['Amount', 'Paid', 'Balance'].includes(col) ? 'right' : col === 'Action' ? 'center' : 'left' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(inv => {
                      const isHov = hovRow === inv.id;
                      const es    = inv.effective_status;
                      return (
                        <tr key={inv.id}
                          onMouseEnter={() => setHovRow(inv.id)} onMouseLeave={() => setHovRow(null)}
                          onClick={() => openModal(inv)}
                          style={{ cursor: 'pointer', transition: 'background 0.1s', background: isHov ? 'rgba(255,255,255,0.025)' : 'transparent' }}>
                          <td style={S.td}>
                            <span style={{ fontWeight: 700, color: '#60a5fa', fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.02em' }}>{inv.invoice_number}</span>
                          </td>
                          <td style={S.td}>
                            <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{inv.customer_name || '—'}</div>
                            {inv.customer_phone && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{inv.customer_phone}</div>}
                          </td>
                          <td style={{ ...S.td }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>{inv.so_number}</span>
                          </td>
                          <td style={{ ...S.td, color: '#94a3b8', fontSize: 12 }}>{fmtDate(inv.created_at)}</td>
                          <td style={{ ...S.td, fontSize: 12 }}>
                            {inv.due_date ? (
                              <span style={{ color: es === 'overdue' ? '#f97316' : '#64748b', fontWeight: es === 'overdue' ? 700 : 400 }}>{fmtDate(inv.due_date)}</span>
                            ) : '—'}
                          </td>
                          <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{fmtAED(inv.total_amount)}</td>
                          <td style={{ ...S.td, textAlign: 'right', fontWeight: 600, color: inv.paid_amount > 0 ? '#34d399' : '#64748b', fontSize: 13 }}>
                            {inv.paid_amount > 0 ? fmtAED(inv.paid_amount) : '—'}
                          </td>
                          <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: inv.balance_due > 0 ? (es === 'overdue' ? '#f97316' : '#fbbf24') : '#34d399', fontSize: 13 }}>
                            {inv.balance_due > 0 ? fmtAED(inv.balance_due) : <span style={{ color: '#34d399', fontSize: 12 }}>Cleared</span>}
                          </td>
                          <td style={S.td}><StatusPill status={es} /></td>
                          <td style={{ ...S.td, textAlign: 'center' }}>
                            {canPay(es) && (
                              <button type="button" onClick={e => { e.stopPropagation(); openModal(inv); }}
                                style={{ padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.1)', color: '#34d399', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                Record Payment
                              </button>
                            )}
                            {es === 'paid' && <span style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>Paid</span>}
                            {es === 'voided' && <span style={{ fontSize: 12, color: '#94a3b8' }}>Voided</span>}
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
      </div>

      {/* Invoice Detail Modal */}
      {selInv && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
          onClick={closeModal}>
          <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22, width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 50px 120px rgba(0,0,0,0.85)' }}
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ padding: '22px 28px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: '#60a5fa', fontFamily: 'monospace', letterSpacing: '0.03em' }}>{selInv.invoice_number}</span>
                  <StatusPill status={selInv.effective_status} />
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  SO: <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{selInv.so_number}</span>
                  <span style={{ margin: '0 8px', color: '#94a3b8' }}>·</span>
                  Created {fmtDate(selInv.created_at)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {editMode ? (
                  <>
                    <button type="button" onClick={handleSave} disabled={saveLoading}
                      style={{ background: saveLoading ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 9, padding: '7px 18px', color: '#fff', cursor: saveLoading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, boxShadow: saveLoading ? 'none' : '0 4px 14px rgba(16,185,129,0.3)' }}>
                      {saveLoading ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={() => setEditMode(false)}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 9, padding: '7px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {selInv.effective_status !== 'voided' && (
                      <button type="button" onClick={enterEditMode} disabled={detailLoading}
                        style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 9, padding: '7px 16px', color: '#fbbf24', cursor: detailLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, opacity: detailLoading ? 0.5 : 1 }}>
                        Edit
                      </button>
                    )}
                    <button type="button" onClick={printInvoice} disabled={detailLoading}
                      style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 9, padding: '7px 16px', color: '#60a5fa', cursor: detailLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, opacity: detailLoading ? 0.5 : 1 }}>
                      <Printer size={14} /> Print
                    </button>
                    <button type="button" onClick={closeModal} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 9, padding: '7px 8px', color: '#94a3b8', cursor: 'pointer' }}><X size={15} /></button>
                  </>
                )}
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px 28px' }}>

              {/* Customer + Due date cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                {editMode ? (
                  <>
                    {[
                      { l: 'Customer Name', key: 'customer_name', type: 'text', placeholder: 'Customer name' },
                      { l: 'Phone',         key: 'customer_phone', type: 'text', placeholder: '+971…' },
                      { l: 'Due Date',      key: 'due_date', type: 'date', placeholder: '' },
                    ].map(f => (
                      <div key={f.key} style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ fontSize: 10, color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>{f.l}</div>
                        <input type={f.type} value={editData[f.key]} placeholder={f.placeholder}
                          onChange={e => setEditData(prev => ({ ...prev, [f.key]: e.target.value }))}
                          style={{ ...S.inp, padding: '7px 10px', fontSize: 13, fontWeight: 600, colorScheme: 'dark' }} />
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {[
                      { l: 'Customer',    v: selInv.customer_name || '—' },
                      { l: 'Phone',       v: selInv.customer_phone || '—' },
                      { l: 'Due Date',    v: fmtDate(selInv.due_date), urgent: selInv.effective_status === 'overdue' },
                    ].map(f => (
                      <div key={f.l} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>{f.l}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: f.urgent ? '#f97316' : '#e2e8f0' }}>{f.v}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Amount summary bar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                {editMode ? (() => {
                  const total   = parseFloat(editData.total_amount) || 0;
                  const paid    = parseFloat(editData.paid_amount)  || 0;
                  const balance = Math.max(0, total - paid);
                  return (
                    <>
                      {[
                        { l: 'Invoice Amount', key: 'total_amount', val: editData.total_amount, color: '#60a5fa' },
                        { l: 'Amount Paid',    key: 'paid_amount',  val: editData.paid_amount,  color: '#34d399' },
                      ].map(f => (
                        <div key={f.key} style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.22)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>{f.l}</div>
                          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' }}>
                            <span style={{ padding: '8px 10px', color: '#64748b', fontSize: 12, fontWeight: 700, borderRight: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>AED</span>
                            <input type="number" step="0.01" min="0" value={f.val}
                              onChange={e => setEditData(prev => ({ ...prev, [f.key]: e.target.value }))}
                              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '8px 10px', fontSize: 15, fontWeight: 800, color: f.color, textAlign: 'right', caretColor: f.color }} />
                          </div>
                        </div>
                      ))}
                      <div style={{ background: `${balance > 0 ? '#fbbf24' : '#34d399'}08`, border: `1px solid ${balance > 0 ? '#fbbf24' : '#34d399'}20`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>Balance Due</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: balance > 0 ? '#fbbf24' : '#34d399' }}>{balance > 0 ? fmtAED(balance) : 'Cleared'}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>auto-calculated</div>
                      </div>
                    </>
                  );
                })() : (
                  <>
                    {/* Invoice Amount with VAT breakdown */}
                    <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>Invoice Amount</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#60a5fa' }}>{fmtAED(selInv.total_amount)}</div>
                      {selInv.subtotal > 0 && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(96,165,250,0.12)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                            <span>Subtotal</span><span>{fmtAED(selInv.subtotal)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#fbbf24' }}>
                            <span>VAT ({selInv.vat_rate || 5}%)</span><span>+ {fmtAED(selInv.vat_amount)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Amount Paid */}
                    <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>Amount Paid</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#34d399' }}>{selInv.paid_amount > 0 ? fmtAED(selInv.paid_amount) : '—'}</div>
                    </div>
                    {/* Balance Due */}
                    <div style={{ background: `${selInv.balance_due > 0 ? (selInv.effective_status === 'overdue' ? '#f97316' : '#fbbf24') : '#34d399'}08`, border: `1px solid ${selInv.balance_due > 0 ? (selInv.effective_status === 'overdue' ? '#f97316' : '#fbbf24') : '#34d399'}20`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6 }}>Balance Due</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: selInv.balance_due > 0 ? (selInv.effective_status === 'overdue' ? '#f97316' : '#fbbf24') : '#34d399' }}>
                        {selInv.balance_due > 0 ? fmtAED(selInv.balance_due) : 'Cleared'}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Line items */}
              {detailLoading ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading items…</div>
              ) : (detail?.items?.length > 0 || (editMode && editData.items.length > 0)) && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: editMode ? '#fbbf24' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                    Line Items {editMode && <span style={{ fontSize: 9, fontWeight: 500, color: '#fbbf24', marginLeft: 6 }}>— edit unit prices below</span>}
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${editMode ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>
                        {['Product', 'Qty (kg)', 'Unit Price (AED)', 'Total'].map((h, i) => (
                          <th key={h} style={{ ...S.th, textAlign: i > 0 ? 'right' : 'left', padding: '11px 16px' }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {(editMode ? editData.items : detail.items).map((it, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                            <td style={{ ...S.td, fontWeight: 600, padding: '11px 16px' }}>{it.product_name}</td>
                            <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: '#f1f5f9', padding: '11px 16px' }}>{parseFloat(it.quantity).toFixed(2)}</td>
                            <td style={{ ...S.td, textAlign: 'right', padding: '8px 16px' }}>
                              {editMode ? (
                                <input type="number" step="0.01" min="0" value={it.unit_price}
                                  onChange={e => updateEditItem(i, 'unit_price', e.target.value)}
                                  style={{ ...S.inp, width: 110, padding: '6px 10px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#fbbf24' }} />
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: 12 }}>{it.unit_price > 0 ? `AED ${parseFloat(it.unit_price).toFixed(2)}` : '—'}</span>
                              )}
                            </td>
                            <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: editMode ? '#fbbf24' : '#cbd5e1', padding: '11px 16px' }}>
                              {it.total_price > 0 ? fmtAED(it.total_price) : '—'}
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background: 'rgba(59,130,246,0.05)', borderTop: '1px solid rgba(59,130,246,0.15)' }}>
                          <td colSpan={3} style={{ ...S.td, fontWeight: 700, color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '13px 16px' }}>Total</td>
                          <td style={{ ...S.td, textAlign: 'right', fontWeight: 800, color: '#60a5fa', fontSize: 16, padding: '13px 16px' }}>
                            {editMode
                              ? fmtAED(editData.items.reduce((s, it) => s + (it.total_price || 0), 0))
                              : fmtAED(selInv.total_amount)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Payment info (if already paid) */}
              {selInv.effective_status === 'paid' && selInv.paid_at && (
                <div style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Payment Received</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {[
                      { l: 'Amount',  v: fmtAED(selInv.paid_amount) },
                      { l: 'Method',  v: METHODS.find(m => m.value === selInv.payment_method)?.label || selInv.payment_method || '—' },
                      { l: 'Date',    v: fmtDate(selInv.paid_at) },
                    ].map(f => (
                      <div key={f.l}>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{f.l}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#34d399' }}>{f.v}</div>
                      </div>
                    ))}
                  </div>
                  {selInv.payment_notes && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 12, borderTop: '1px solid rgba(52,211,153,0.12)', paddingTop: 10 }}>{selInv.payment_notes}</div>}
                </div>
              )}

              {/* Record payment form */}
              {canPay(selInv.effective_status) && (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px 22px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18 }}>Record Payment</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <label style={S.lbl}>
                      Amount (AED) *
                      <input type="number" step="0.01" min="0.01" max={selInv.balance_due} value={payForm.paid_amount}
                        onChange={e => setPayForm(p => ({ ...p, paid_amount: e.target.value }))} style={S.inp} />
                    </label>
                    <label style={S.lbl}>
                      Payment Method
                      <select value={payForm.payment_method} onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))} style={{ ...S.inp, colorScheme: 'dark' }}>
                        {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </label>
                    <label style={S.lbl}>
                      Payment Date
                      <input type="date" value={payForm.payment_date} onChange={e => setPayForm(p => ({ ...p, payment_date: e.target.value }))} style={{ ...S.inp, colorScheme: 'dark' }} />
                    </label>
                    <label style={S.lbl}>
                      Notes (optional)
                      <input value={payForm.payment_notes} onChange={e => setPayForm(p => ({ ...p, payment_notes: e.target.value }))} placeholder="Reference, cheque number…" style={S.inp} />
                    </label>
                  </div>
                  <button type="button" onClick={handlePay} disabled={payLoading}
                    style={{ width: '100%', padding: '14px', borderRadius: 11, background: payLoading ? 'rgba(52,211,153,0.3)' : 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: payLoading ? 'not-allowed' : 'pointer', boxShadow: payLoading ? 'none' : '0 6px 20px rgba(16,185,129,0.35)', letterSpacing: '0.01em' }}>
                    {payLoading ? 'Recording…' : `Record Payment — ${fmtAED(parseFloat(payForm.paid_amount) || 0)}`}
                  </button>
                </div>
              )}

              {selInv.effective_status === 'voided' && (
                <div style={{ textAlign: 'center', padding: '15px', borderRadius: 12, background: 'rgba(107,114,128,0.06)', border: '1px solid rgba(107,114,128,0.15)', color: '#6b7280', fontSize: 14, fontWeight: 600 }}>
                  Invoice Voided — Sale Order was returned
                </div>
              )}
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
