import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2,
  TrendingUp, Zap, UserCheck, Users, RefreshCw, ClipboardList,
  FileCheck, FileText, Receipt, AlertCircle, CheckCircle2,
  ChevronDown, ChevronUp, Printer, Calendar, Activity,
} from 'lucide-react';
import { getCurrentUser } from '../api/auth';
import { getVatReturn, getVatPeriods } from '../api/erp';

const SIDEBAR_W = 245;

const S = {
  th: { padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.09em', background: 'linear-gradient(180deg,rgba(59,130,246,0.08),rgba(59,130,246,0.02))', borderBottom: '1px solid rgba(59,130,246,0.12)', whiteSpace: 'nowrap' },
  td: { padding: '12px 16px', fontSize: 13, color: '#cbd5e1', borderBottom: '1px solid rgba(255,255,255,0.035)', verticalAlign: 'middle' },
};

const fmtAED  = n => `AED ${Number(n || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

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

function Box({ number, label, sublabel, value, vatValue, highlight, note }) {
  return (
    <div style={{ background: highlight ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.025)', border: `1px solid ${highlight ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div style={{ minWidth: 44, height: 44, borderRadius: 10, background: highlight ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${highlight ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: highlight ? '#60a5fa' : '#64748b', flexShrink: 0 }}>
        {number}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{sublabel}</div>}
        {note && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={10} />{note}</div>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{fmtAED(value)}</div>
        {vatValue !== undefined && (
          <div style={{ fontSize: 12, color: '#fbbf24', marginTop: 3, fontWeight: 600 }}>VAT: {fmtAED(vatValue)}</div>
        )}
      </div>
    </div>
  );
}

export default function VATReturn() {
  const navigate = useNavigate();
  const [periods, setPeriods]     = useState([]);
  const [selYear, setSelYear]     = useState(new Date().getFullYear());
  const [selQ, setSelQ]           = useState(Math.ceil(new Date().getMonth() / 3) || 1);
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [showInv, setShowInv]     = useState(false);
  const [showBills, setShowBills] = useState(false);

  const cu = getCurrentUser();
  const displayName = (cu?.sub || '').split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const nb = (path, icon, label, active) => <NavBtn path={path} icon={icon} label={label} active={active} navigate={navigate} />;

  const load = async () => {
    setLoading(true);
    try {
      const [d, p] = await Promise.all([getVatReturn(selYear, selQ), getVatPeriods()]);
      setData(d);
      setPeriods(p);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [selYear, selQ]);

  const netVat     = data?.box14_net_vat_payable ?? 0;
  const isPayable  = netVat > 0;
  const isRefund   = netVat < 0;
  const isNil      = netVat === 0;

  const printReport = () => {
    if (!data) return;
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>VAT Return ${data.quarter_label} ${data.year}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1a2332;font-size:13px;padding:30px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:18px;border-bottom:3px solid #1e40af}
  .logo{font-size:22px;font-weight:800;color:#1e40af}
  .logo-sub{font-size:12px;color:#64748b;margin-top:3px}
  .ftabox{background:#f0f4ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 18px;text-align:right}
  .ftabox .title{font-size:15px;font-weight:700;color:#1e40af}
  .ftabox .sub{font-size:11px;color:#475569;margin-top:3px}
  h2{font-size:13px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.1em;padding:14px 0 8px;border-bottom:1px solid #e2e8f0;margin-bottom:12px}
  .box-row{display:flex;align-items:center;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:8px;background:#fafbff}
  .box-num{width:40px;height:40px;border-radius:7px;background:#e0e7ff;color:#1e40af;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0}
  .box-label{flex:1;padding:0 14px}
  .box-label strong{display:block;font-size:13px}
  .box-label span{font-size:11px;color:#64748b}
  .box-amt{text-align:right}
  .box-amt .net{font-size:14px;font-weight:700}
  .box-amt .vat{font-size:11px;color:#d97706;margin-top:2px;font-weight:600}
  .net-row{border:2px solid #1e40af;border-radius:10px;padding:16px 20px;margin:16px 0;display:flex;align-items:center;background:#eff6ff}
  .net-row .label{flex:1;font-size:15px;font-weight:700;color:#1e3a8a}
  .net-row .amount{font-size:22px;font-weight:800;color:${isPayable ? '#dc2626' : isRefund ? '#059669' : '#1e40af'}}
  .status-badge{display:inline-block;padding:4px 14px;border-radius:99px;font-size:12px;font-weight:700;background:${isPayable ? '#fee2e2' : isRefund ? '#dcfce7' : '#e0e7ff'};color:${isPayable ? '#b91c1c' : isRefund ? '#15803d' : '#1e40af'};margin-left:10px}
  table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}
  th{background:#f1f5f9;padding:9px 12px;text-align:left;font-weight:700;color:#475569;font-size:11px;text-transform:uppercase;letter-spacing:0.06em}
  td{padding:9px 12px;border-bottom:1px solid #f1f5f9}
  .note{background:#fef9ec;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;font-size:12px;color:#92400e;margin-top:20px}
  .footer{margin-top:30px;padding-top:14px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between}
  .divider{margin:20px 0;border:none;border-top:1px solid #e2e8f0}
  @media print{body{padding:15px}}
</style></head><body>

<div class="header">
  <div>
    <div class="logo">Al Hazmi Meat Trading</div>
    <div class="logo-sub">VAT Registration — TRN: [Your TRN Number]</div>
    <div class="logo-sub" style="margin-top:4px">Generated: ${data.generated_on}</div>
  </div>
  <div class="ftabox">
    <div class="title">VAT Return — Form 201</div>
    <div class="sub">${data.quarter_label} ${data.year}</div>
    <div class="sub">${fmtDate(data.date_from)} – ${fmtDate(data.date_to)}</div>
    <div class="sub" style="color:#dc2626;font-weight:600;margin-top:4px">Filing Deadline: ${data.filing_deadline}</div>
  </div>
</div>

<h2>Part 1 — VAT on Sales &amp; All Outputs</h2>

<div class="box-row">
  <div class="box-num">1</div>
  <div class="box-label">
    <strong>Standard Rated Supplies (5%)</strong>
    <span>Sales taxable at standard 5% rate</span>
  </div>
  <div class="box-amt">
    <div class="net">${fmtAED(0)}</div>
    <div class="vat">VAT: ${fmtAED(0)}</div>
  </div>
</div>

<div class="box-row" style="background:#f0fdf4;border-color:#86efac">
  <div class="box-num" style="background:#dcfce7;color:#15803d">4</div>
  <div class="box-label">
    <strong>Zero-Rated Supplies (0%)</strong>
    <span>Fresh &amp; frozen meat — UAE Cabinet Decision No. 52/2017</span>
  </div>
  <div class="box-amt">
    <div class="net">${fmtAED(data.box4_zero_rated_sales)}</div>
    <div class="vat" style="color:#15803d">VAT: ${fmtAED(0)}</div>
  </div>
</div>

<div class="box-row">
  <div class="box-num">5</div>
  <div class="box-label">
    <strong>Exempt Supplies</strong>
    <span>Supplies not subject to VAT</span>
  </div>
  <div class="box-amt"><div class="net">${fmtAED(0)}</div></div>
</div>

<div class="box-row" style="background:#eff6ff;border-color:#93c5fd">
  <div class="box-num" style="background:#dbeafe;color:#1d4ed8">8</div>
  <div class="box-label">
    <strong>Total Output Tax Due</strong>
    <span>VAT collected from customers this period</span>
  </div>
  <div class="box-amt"><div class="net">${fmtAED(data.box8_total_output_vat)}</div></div>
</div>

<hr class="divider"/>
<h2>Part 2 — VAT on Expenses &amp; All Inputs</h2>

<div class="box-row">
  <div class="box-num">9</div>
  <div class="box-label">
    <strong>Standard Rated Expenses</strong>
    <span>Purchases from suppliers with 5% VAT</span>
  </div>
  <div class="box-amt">
    <div class="net">${fmtAED(data.box9_expenses_net)}</div>
    <div class="vat">VAT: ${fmtAED(data.box9_input_vat)}</div>
  </div>
</div>

<div class="box-row" style="background:#eff6ff;border-color:#93c5fd">
  <div class="box-num" style="background:#dbeafe;color:#1d4ed8">11</div>
  <div class="box-label">
    <strong>Total Input Tax</strong>
    <span>Recoverable VAT paid to suppliers</span>
  </div>
  <div class="box-amt"><div class="net">${fmtAED(data.box11_total_input_vat)}</div></div>
</div>

<hr class="divider"/>

<div class="net-row">
  <div class="label">
    Box 14 — Net VAT ${isPayable ? 'Payable to FTA' : isRefund ? 'Refundable from FTA' : 'Due (NIL)'}
    <span class="status-badge">${isPayable ? 'PAYABLE' : isRefund ? 'REFUND CLAIM' : 'NIL RETURN'}</span>
  </div>
  <div class="amount">${fmtAED(Math.abs(netVat))}</div>
</div>

<hr class="divider"/>

<h2>Supporting Detail — Sales Invoices (${data.invoice_count})</h2>
<table>
  <thead><tr><th>Invoice #</th><th>Date</th><th>Customer</th><th>Net Amount</th><th>VAT</th><th>Total</th></tr></thead>
  <tbody>
    ${data.invoices.map(i => `<tr>
      <td>${i.invoice_number}</td>
      <td>${fmtDate(i.date)}</td>
      <td>${i.customer_name || '—'}</td>
      <td>${fmtAED(i.net_amount)}</td>
      <td>${fmtAED(i.vat_amount)}</td>
      <td>${fmtAED(i.gross_amount)}</td>
    </tr>`).join('')}
    ${data.invoice_count === 0 ? '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:16px">No invoices in this period</td></tr>' : ''}
  </tbody>
</table>

<hr class="divider"/>

<h2>Supporting Detail — Supplier Bills (${data.bill_count})</h2>
<table>
  <thead><tr><th>Bill #</th><th>Date</th><th>Supplier</th><th>Net Amount</th><th>VAT (Input)</th><th>Total</th></tr></thead>
  <tbody>
    ${data.bills.map(b => `<tr>
      <td>${b.bill_number}</td>
      <td>${fmtDate(b.date)}</td>
      <td>${b.supplier_name || '—'}</td>
      <td>${fmtAED(b.net_amount)}</td>
      <td>${fmtAED(b.vat_amount)}</td>
      <td>${fmtAED(b.gross_amount)}</td>
    </tr>`).join('')}
    ${data.bill_count === 0 ? '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:16px">No bills in this period</td></tr>' : ''}
  </tbody>
</table>

<div class="note">
  ⚠️ <strong>Important:</strong> Fresh and frozen meat supplies are zero-rated under UAE VAT law (Cabinet Decision No. 52 of 2017).
  Output VAT on meat sales should be AED 0. Input VAT paid on supplier bills remains fully recoverable.
  Please verify with your tax advisor before submitting to FTA EmaraTax portal.
</div>

<div class="footer">
  <span>Al Hazmi Meat Trading — VAT Return ${data.quarter_label} ${data.year}</span>
  <span>Generated by Al Hazmi ERP • ${data.generated_on}</span>
</div>

</body></html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f0f18', color: '#f1f5f9', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: SIDEBAR_W, background: '#13131f', borderRight: '1px solid rgba(255,255,255,0.055)', display: 'flex', flexDirection: 'column', padding: '20px 10px', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, overflowY: 'auto' }}>
        <div style={{ padding: '6px 10px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Al Hazmi ERP</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{displayName}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {nb('/dashboard',        <LayoutDashboard size={16} />, 'Dashboard',         false)}
          {nb('/inventory',        <Package size={16} />,         'Inventory',          false)}
          {nb('/purchase-orders',  <ClipboardList size={16} />,   'Purchase Orders',    false)}
          {nb('/sale-orders',      <ClipboardList size={16} />,   'Sale Orders',        false)}
          {nb('/invoices',         <FileText size={16} />,        'Invoices (AR)',      false)}
          {nb('/accounts-payable', <Receipt size={16} />,         'Accounts Payable',   false)}
          {nb('/customers',        <Users size={16} />,           'Customers',          false)}
          {nb('/orders',           <ShoppingCart size={16} />,    'Orders',             false)}
          {nb('/suppliers',        <Truck size={16} />,           'Suppliers',          false)}
          {nb('/deliveries',       <MapPin size={16} />,          'Deliveries',         false)}
          {nb('/sales',            <TrendingUp size={16} />,      'Sales Distribution', false)}
          {nb('/vat-return',       <FileCheck size={16} />,       'VAT Return',         true)}
          {nb('/pnl',              <Activity  size={16} />,       'Profit & Loss',      false)}
          {nb('/reports',          <BarChart2 size={16} />,       'Reports',            false)}
          {nb('/hr',               <UserCheck size={16} />,       'HR / Payroll',       false)}
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: SIDEBAR_W, flex: 1, padding: '28px 36px', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ padding: '4px 12px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 99, fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>UAE FTA</div>
              <div style={{ padding: '4px 12px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 99, fontSize: 11, fontWeight: 700, color: '#fbbf24' }}>Form VAT 201</div>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>VAT Return Report</h1>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>Output tax collected · Input tax paid · Net VAT payable to FTA</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={load} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 9, fontSize: 13, color: '#60a5fa', cursor: 'pointer' }}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
            <button onClick={printReport} disabled={!data}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', background: 'linear-gradient(135deg,rgba(59,130,246,0.25),rgba(96,165,250,0.15))', border: '1px solid rgba(59,130,246,0.4)', borderRadius: 9, fontSize: 13, fontWeight: 600, color: '#93c5fd', cursor: 'pointer' }}>
              <Printer size={14} /> Print / Export
            </button>
          </div>
        </div>

        {/* Period Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 20px', flexWrap: 'wrap' }}>
          <Calendar size={16} style={{ color: '#60a5fa', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Reporting Period:</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[1,2,3,4].map(q => (
              <button key={q} onClick={() => setSelQ(q)}
                style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, border: selQ === q ? '1px solid rgba(59,130,246,0.5)' : '1px solid rgba(255,255,255,0.08)', background: selQ === q ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.03)', color: selQ === q ? '#93c5fd' : '#64748b', cursor: 'pointer', transition: 'all 0.15s' }}>
                {['Q1 Jan–Mar','Q2 Apr–Jun','Q3 Jul–Sep','Q4 Oct–Dec'][q-1]}
              </button>
            ))}
          </div>
          <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
            style={{ padding: '7px 12px', borderRadius: 8, fontSize: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', cursor: 'pointer', appearance: 'none' }}>
            {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {data && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#64748b' }}>
              <span>{fmtDate(data.date_from)} – {fmtDate(data.date_to)}</span>
              <span style={{ color: '#ef4444', fontWeight: 600 }}>Deadline: {data.filing_deadline}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#4b5563', padding: 60 }}>Loading VAT data…</div>
        ) : data && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignItems: 'start' }}>

            {/* Left column — Form 201 boxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Output section */}
              <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                Part 1 — Sales &amp; Outputs
              </div>

              <Box number="1" label="Standard Rated Supplies (5%)"
                sublabel="Sales taxable at 5% — not applicable for fresh/frozen meat"
                value={0} vatValue={0} />

              <Box number="4" label="Zero-Rated Supplies (0%)"
                sublabel="Fresh & frozen meat — UAE Cabinet Decision No. 52/2017"
                value={data.box4_zero_rated_sales} vatValue={0}
                note="Input VAT on business costs is still fully recoverable" />

              <Box number="5" label="Exempt Supplies"
                sublabel="Supplies with no VAT and no input recovery"
                value={0} />

              <Box number="8" label="Total Output Tax Due"
                sublabel="VAT collected from customers this quarter"
                value={data.box8_total_output_vat} highlight />

              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 0' }} />

              {/* Input section */}
              <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                Part 2 — Expenses &amp; Inputs
              </div>

              <Box number="9" label="Standard Rated Expenses"
                sublabel="Purchases from suppliers with 5% VAT"
                value={data.box9_expenses_net} vatValue={data.box9_input_vat} />

              <Box number="11" label="Total Input Tax Recoverable"
                sublabel="VAT paid to suppliers — claimable back from FTA"
                value={data.box11_total_input_vat} highlight />
            </div>

            {/* Right column — Net VAT + stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Box 14 — Net VAT */}
              <div style={{ background: isPayable ? 'rgba(239,68,68,0.08)' : isRefund ? 'rgba(52,211,153,0.08)' : 'rgba(59,130,246,0.08)', border: `2px solid ${isPayable ? 'rgba(239,68,68,0.35)' : isRefund ? 'rgba(52,211,153,0.35)' : 'rgba(59,130,246,0.35)'}`, borderRadius: 16, padding: '24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Box 14 — Net VAT</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: isPayable ? '#f87171' : isRefund ? '#34d399' : '#60a5fa', letterSpacing: '-0.03em' }}>
                  {fmtAED(Math.abs(netVat))}
                </div>
                <div style={{ marginTop: 12 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: isPayable ? 'rgba(239,68,68,0.15)' : isRefund ? 'rgba(52,211,153,0.15)' : 'rgba(59,130,246,0.15)', color: isPayable ? '#f87171' : isRefund ? '#34d399' : '#60a5fa', border: `1px solid ${isPayable ? 'rgba(239,68,68,0.3)' : isRefund ? 'rgba(52,211,153,0.3)' : 'rgba(59,130,246,0.3)'}` }}>
                    {isPayable ? <AlertCircle size={13} /> : isRefund ? <CheckCircle2 size={13} /> : <CheckCircle2 size={13} />}
                    {isPayable ? 'Payable to FTA' : isRefund ? 'Refund from FTA' : 'NIL Return'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 14 }}>
                  Output VAT {fmtAED(data.box8_total_output_vat)} − Input VAT {fmtAED(data.box11_total_input_vat)}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Sales Invoices',    value: data.invoice_count, sub: `in ${data.quarter_label}`,        color: '#60a5fa' },
                  { label: 'Supplier Bills',     value: data.bill_count,   sub: `in ${data.quarter_label}`,        color: '#a78bfa' },
                  { label: 'Total Sales (Net)',  value: fmtAED(data.box4_zero_rated_sales), sub: 'zero-rated', color: '#34d399' },
                  { label: 'Total Purchases',    value: fmtAED(data.box9_expenses_net),    sub: 'excl. VAT',  color: '#fbbf24' },
                ].map(c => (
                  <div key={c.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{c.label}</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: c.color }}>{c.value}</div>
                    <div style={{ fontSize: 11, color: '#4b5563', marginTop: 3 }}>{c.sub}</div>
                  </div>
                ))}
              </div>

              {/* UAE Compliance note */}
              <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, padding: '14px 16px', fontSize: 12.5, color: '#94a3b8', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={14} /> UAE Compliance Note
                </div>
                Fresh and frozen meat is <strong style={{ color: '#f1f5f9' }}>zero-rated (0%)</strong> under UAE Cabinet Decision No. 52 of 2017. Your meat sales appear in <strong style={{ color: '#f1f5f9' }}>Box 4</strong> with no output VAT. Input VAT paid on supplier bills and business expenses is <strong style={{ color: '#f1f5f9' }}>fully recoverable</strong>. File on <strong style={{ color: '#f1f5f9' }}>FTA EmaraTax</strong> portal before <strong style={{ color: '#ef4444' }}>{data.filing_deadline}</strong>.
              </div>
            </div>
          </div>
        )}

        {/* Supporting Tables */}
        {data && (
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Invoices */}
            <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
              <button onClick={() => setShowInv(p => !p)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', color: '#f1f5f9', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText size={15} style={{ color: '#60a5fa' }} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Sales Invoices</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{data.invoice_count} invoice{data.invoice_count !== 1 ? 's' : ''} · {fmtAED(data.box4_zero_rated_sales)} net</span>
                </div>
                {showInv ? <ChevronUp size={16} style={{ color: '#64748b' }} /> : <ChevronDown size={16} style={{ color: '#64748b' }} />}
              </button>
              {showInv && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Invoice #','Date','Customer','Net Amount (Box 4)','VAT Charged','Total'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.invoices.length === 0 ? (
                      <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#4b5563', padding: 24 }}>No invoices in this period</td></tr>
                    ) : data.invoices.map(i => (
                      <tr key={i.id}>
                        <td style={{ ...S.td, fontFamily: 'monospace', color: '#93c5fd', fontWeight: 600 }}>{i.invoice_number}</td>
                        <td style={S.td}>{fmtDate(i.date)}</td>
                        <td style={{ ...S.td, fontWeight: 500 }}>{i.customer_name}</td>
                        <td style={{ ...S.td, color: '#34d399', fontWeight: 600 }}>{fmtAED(i.net_amount)}</td>
                        <td style={{ ...S.td, color: '#fbbf24' }}>{fmtAED(i.vat_amount)}</td>
                        <td style={{ ...S.td, fontWeight: 600 }}>{fmtAED(i.gross_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bills */}
            <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
              <button onClick={() => setShowBills(p => !p)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', color: '#f1f5f9', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Receipt size={15} style={{ color: '#a78bfa' }} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Supplier Bills (Input Tax)</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{data.bill_count} bill{data.bill_count !== 1 ? 's' : ''} · {fmtAED(data.box9_input_vat)} recoverable VAT</span>
                </div>
                {showBills ? <ChevronUp size={16} style={{ color: '#64748b' }} /> : <ChevronDown size={16} style={{ color: '#64748b' }} />}
              </button>
              {showBills && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{['Bill #','Date','Supplier','Net Amount (Box 9)','Input VAT','Total'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.bills.length === 0 ? (
                      <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#4b5563', padding: 24 }}>No bills in this period</td></tr>
                    ) : data.bills.map(b => (
                      <tr key={b.id}>
                        <td style={{ ...S.td, fontFamily: 'monospace', color: '#c4b5fd', fontWeight: 600 }}>{b.bill_number}</td>
                        <td style={S.td}>{fmtDate(b.date)}</td>
                        <td style={{ ...S.td, fontWeight: 500 }}>{b.supplier_name}</td>
                        <td style={{ ...S.td, fontWeight: 600 }}>{fmtAED(b.net_amount)}</td>
                        <td style={{ ...S.td, color: '#34d399', fontWeight: 600 }}>{fmtAED(b.vat_amount)}</td>
                        <td style={{ ...S.td, fontWeight: 600 }}>{fmtAED(b.gross_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
