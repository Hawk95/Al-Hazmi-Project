import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2,
  TrendingUp, Zap, UserCheck, Users, RefreshCw, ClipboardList,
  FileCheck, FileText, Receipt, ChevronDown, ChevronUp, AlertCircle,
  DollarSign, Activity,
} from 'lucide-react';
import { getCurrentUser } from '../api/auth';
import { getPnlSummary, getPnlSales, getPnlWeekly } from '../api/erp';

const SIDEBAR_W = 245;

const S = {
  th: { padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.09em', background: 'linear-gradient(180deg,rgba(59,130,246,0.08),rgba(59,130,246,0.02))', borderBottom: '1px solid rgba(59,130,246,0.12)', whiteSpace: 'nowrap' },
  td: { padding: '12px 16px', fontSize: 13, color: '#cbd5e1', borderBottom: '1px solid rgba(255,255,255,0.035)', verticalAlign: 'middle' },
};

const fmtAED  = n  => `AED ${Number(n || 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtAED0 = n  => `AED ${Number(n || 0).toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtPct  = n  => `${Number(n || 0).toFixed(1)}%`;

const marginColor = m => m >= 25 ? '#34d399' : m >= 15 ? '#60a5fa' : m >= 5 ? '#fbbf24' : '#f87171';
const marginBg    = m => m >= 25 ? 'rgba(52,211,153,0.1)' : m >= 15 ? 'rgba(96,165,250,0.1)' : m >= 5 ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)';

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

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
        {icon && <div style={{ color, opacity: 0.6 }}>{icon}</div>}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function MarginBadge({ pct }) {
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700, color: marginColor(pct), background: marginBg(pct) }}>
      {fmtPct(pct)}
    </span>
  );
}

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} type="button"
      style={{ padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: active ? 600 : 400, border: 'none', cursor: 'pointer', transition: 'all 0.15s', color: active ? '#f1f5f9' : '#6b7280', background: active ? 'rgba(59,130,246,0.15)' : 'transparent', boxShadow: active ? 'inset 0 0 0 1px rgba(59,130,246,0.3)' : 'none' }}>
      {label}
    </button>
  );
}

function WeeklyTab({ weekly }) {
  const [expanded, setExpanded] = useState(null);

  if (!weekly.length) return <div style={{ textAlign: 'center', padding: '60px 0', color: '#4b5563' }}>No weekly data yet.</div>;

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <S.TH />
            <th style={S.th}>Week</th>
            <th style={{ ...S.th, textAlign: 'right' }}>Revenue</th>
            <th style={{ ...S.th, textAlign: 'right' }}>Cost</th>
            <th style={{ ...S.th, textAlign: 'right' }}>Gross Profit</th>
            <th style={{ ...S.th, textAlign: 'center' }}>Margin</th>
            <th style={{ ...S.th, textAlign: 'center' }}>Orders</th>
          </tr>
        </thead>
        <tbody>
          {weekly.map(w => {
            const isOpen = expanded === w.week_start;
            return [
              <tr key={w.week_start}
                onClick={() => setExpanded(isOpen ? null : w.week_start)}
                style={{ cursor: 'pointer', background: isOpen ? 'rgba(59,130,246,0.05)' : 'transparent' }}
                onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}>
                <td style={{ ...S.td, width: 36, paddingRight: 0 }}>
                  <span style={{ color: '#60a5fa' }}>{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                </td>
                <td style={S.td}>
                  <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{w.week_label}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{w.customers.length} customer{w.customers.length !== 1 ? 's' : ''}</div>
                </td>
                <td style={{ ...S.td, textAlign: 'right', color: '#93c5fd', fontWeight: 600 }}>{fmtAED0(w.revenue)}</td>
                <td style={{ ...S.td, textAlign: 'right', color: '#f87171' }}>{fmtAED0(w.cost)}</td>
                <td style={{ ...S.td, textAlign: 'right', color: w.profit >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>{fmtAED0(w.profit)}</td>
                <td style={{ ...S.td, textAlign: 'center' }}><MarginBadge pct={w.margin_pct} /></td>
                <td style={{ ...S.td, textAlign: 'center', color: '#94a3b8' }}>{w.order_count}</td>
              </tr>,
              isOpen && (
                <tr key={`${w.week_start}-detail`}>
                  <td colSpan={7} style={{ padding: '0 0 4px 40px', background: 'rgba(15,17,23,0.6)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ ...S.th, background: 'transparent', color: '#475569', fontSize: 10 }}>Customer</th>
                          <th style={{ ...S.th, background: 'transparent', color: '#475569', fontSize: 10, textAlign: 'right' }}>Revenue</th>
                          <th style={{ ...S.th, background: 'transparent', color: '#475569', fontSize: 10, textAlign: 'right' }}>Cost</th>
                          <th style={{ ...S.th, background: 'transparent', color: '#475569', fontSize: 10, textAlign: 'right' }}>Profit</th>
                          <th style={{ ...S.th, background: 'transparent', color: '#475569', fontSize: 10, textAlign: 'center' }}>Margin</th>
                          <th style={{ ...S.th, background: 'transparent', color: '#475569', fontSize: 10, textAlign: 'center' }}>Orders</th>
                        </tr>
                      </thead>
                      <tbody>
                        {w.customers.map((c, i) => (
                          <tr key={i}>
                            <td style={{ ...S.td, fontSize: 12, borderBottom: 'none', paddingLeft: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#60a5fa', flexShrink: 0 }}>
                                  {(c.customer_name || '?')[0].toUpperCase()}
                                </div>
                                {c.customer_name}
                              </div>
                            </td>
                            <td style={{ ...S.td, textAlign: 'right', fontSize: 12, borderBottom: 'none', color: '#93c5fd' }}>{fmtAED0(c.revenue)}</td>
                            <td style={{ ...S.td, textAlign: 'right', fontSize: 12, borderBottom: 'none', color: '#f87171' }}>{fmtAED0(c.cost)}</td>
                            <td style={{ ...S.td, textAlign: 'right', fontSize: 12, borderBottom: 'none', color: c.profit >= 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>{fmtAED0(c.profit)}</td>
                            <td style={{ ...S.td, textAlign: 'center', fontSize: 12, borderBottom: 'none' }}>
                              {c.revenue > 0 ? <MarginBadge pct={c.revenue > 0 ? Math.round((c.profit / c.revenue) * 1000) / 10 : 0} /> : '—'}
                            </td>
                            <td style={{ ...S.td, textAlign: 'center', fontSize: 12, borderBottom: 'none', color: '#64748b' }}>{c.orders}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

function OrdersTab({ sales }) {
  if (!sales.length) return <div style={{ textAlign: 'center', padding: '60px 0', color: '#4b5563' }}>No sale orders found.</div>;

  const statusColor = s => ({ delivered: '#34d399', dispatched: '#60a5fa', approved: '#fbbf24', pending: '#94a3b8' })[s] || '#94a3b8';

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={S.th}>SO #</th>
            <th style={S.th}>Customer</th>
            <th style={S.th}>Date</th>
            <th style={S.th}>Status</th>
            <th style={{ ...S.th, textAlign: 'right' }}>Revenue</th>
            <th style={{ ...S.th, textAlign: 'right' }}>Cost</th>
            <th style={{ ...S.th, textAlign: 'right' }}>Profit</th>
            <th style={{ ...S.th, textAlign: 'center' }}>Margin</th>
          </tr>
        </thead>
        <tbody>
          {sales.map(s => (
            <tr key={s.so_id}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <td style={S.td}>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#60a5fa' }}>{s.so_number}</span>
              </td>
              <td style={S.td}>{s.customer_name || '—'}</td>
              <td style={{ ...S.td, color: '#94a3b8', fontSize: 12 }}>
                {s.so_date ? new Date(s.so_date).toLocaleDateString('en-AE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </td>
              <td style={S.td}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: statusColor(s.so_status), textTransform: 'capitalize' }}>
                  {s.so_status}
                </span>
              </td>
              <td style={{ ...S.td, textAlign: 'right', color: '#93c5fd' }}>{fmtAED0(s.revenue)}</td>
              <td style={{ ...S.td, textAlign: 'right', color: '#f87171' }}>{fmtAED0(s.cost)}</td>
              <td style={{ ...S.td, textAlign: 'right', color: s.profit >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>
                {fmtAED0(s.profit)}
              </td>
              <td style={{ ...S.td, textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <MarginBadge pct={s.margin_pct} />
                  {s.has_unknown_cost && (
                    <span title="Some product costs are unknown — margin is approximate">
                      <AlertCircle size={12} color="#f59e0b" />
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductsTab({ products }) {
  if (!products.length) return <div style={{ textAlign: 'center', padding: '60px 0', color: '#4b5563' }}>No product data yet.</div>;

  const maxRev = Math.max(...products.map(p => p.revenue), 1);

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={S.th}>#</th>
            <th style={S.th}>Product</th>
            <th style={{ ...S.th, textAlign: 'right' }}>Revenue</th>
            <th style={{ ...S.th, textAlign: 'right' }}>Cost</th>
            <th style={{ ...S.th, textAlign: 'right' }}>Profit</th>
            <th style={{ ...S.th, textAlign: 'center' }}>Margin</th>
            <th style={{ ...S.th, minWidth: 120 }}>Revenue Share</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => (
            <tr key={p.name}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <td style={{ ...S.td, color: '#4b5563', fontSize: 12, width: 36 }}>{i + 1}</td>
              <td style={S.td}>
                <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{p.name}</div>
              </td>
              <td style={{ ...S.td, textAlign: 'right', color: '#93c5fd' }}>{fmtAED0(p.revenue)}</td>
              <td style={{ ...S.td, textAlign: 'right', color: '#f87171' }}>{fmtAED0(p.cost)}</td>
              <td style={{ ...S.td, textAlign: 'right', color: p.profit >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>{fmtAED0(p.profit)}</td>
              <td style={{ ...S.td, textAlign: 'center' }}><MarginBadge pct={p.margin_pct} /></td>
              <td style={S.td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(p.revenue / maxRev) * 100}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius: 99, transition: 'width 0.4s ease' }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b', minWidth: 38, textAlign: 'right' }}>
                    {maxRev > 0 ? `${Math.round((p.revenue / maxRev) * 100)}%` : '0%'}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Fix: S.TH is used in WeeklyTab but S doesn't have TH — add empty cell helper
S.TH = () => <th style={{ ...S.th, width: 36, padding: '11px 0 11px 16px' }} />;

export default function ProfitLoss() {
  const navigate = useNavigate();
  const user     = getCurrentUser();
  const [tab, setTab]       = useState('weekly');
  const [summary, setSummary] = useState(null);
  const [sales, setSales]   = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, sa, w] = await Promise.all([getPnlSummary(), getPnlSales(), getPnlWeekly()]);
      setSummary(s);
      setSales(sa);
      setWeekly(w);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const nb = (path, icon, label, active) => (
    <NavBtn path={path} icon={icon} label={label} active={active} navigate={navigate} />
  );

  const totalRevenue = summary?.total_revenue ?? 0;
  const totalCost    = summary?.total_cost    ?? 0;
  const totalProfit  = summary?.total_profit  ?? 0;
  const avgMargin    = summary?.avg_margin_pct ?? 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f1117', color: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Sidebar */}
      <aside style={{ width: SIDEBAR_W, minHeight: '100vh', background: 'linear-gradient(180deg,#0d0f18 0%,#111827 100%)', borderRight: '1px solid rgba(255,255,255,0.05)', position: 'fixed', top: 0, left: 0, display: 'flex', flexDirection: 'column', padding: '20px 12px', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🥩</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Al Hazmi</div>
            <div style={{ fontSize: 10.5, color: '#64748b' }}>Meat Trading</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {nb('/dashboard',        <LayoutDashboard size={16} />, 'Dashboard',          false)}
          {nb('/inventory',        <Package size={16} />,         'Inventory',           false)}
          {nb('/purchase-orders',  <ClipboardList size={16} />,   'Purchase Orders',     false)}
          {nb('/sale-orders',      <ClipboardList size={16} />,   'Sale Orders',         false)}
          {nb('/invoices',         <FileText size={16} />,        'Invoices (AR)',       false)}
          {nb('/accounts-payable', <Receipt size={16} />,         'Accounts Payable',    false)}
          {nb('/customers',        <Users size={16} />,           'Customers',           false)}
          {nb('/orders',           <ShoppingCart size={16} />,    'Orders',              false)}
          {nb('/suppliers',        <Truck size={16} />,           'Suppliers',           false)}
          {nb('/deliveries',       <MapPin size={16} />,          'Deliveries',          false)}
          {nb('/sales',            <TrendingUp size={16} />,      'Sales Distribution',  false)}
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '14px 8px 5px' }}>Analytics</div>
          {nb('/vat-return',       <FileCheck size={16} />,       'VAT Return',          false)}
          {nb('/pnl',              <Activity size={16} />,        'Profit & Loss',       true)}
          {nb('/reports',          <BarChart2 size={16} />,       'Reports',             false)}
          <div style={{ fontSize: 9.5, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '14px 8px 5px' }}>People</div>
          {nb('/hr',               <UserCheck size={16} />,       'HR / Payroll',        false)}
        </div>
        {user && (
          <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 8 }}>
            <div style={{ fontSize: 12, color: '#f1f5f9', fontWeight: 600 }}>{user.username}</div>
            <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2, textTransform: 'capitalize' }}>{user.role}</div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main style={{ marginLeft: SIDEBAR_W, flex: 1, padding: '28px 36px', minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ padding: '4px 12px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 99, fontSize: 11, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Income Statement</div>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Profit & Loss</h1>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>Revenue · Cost of Goods · Gross Profit · Margin per order & product</p>
          </div>
          <button onClick={load} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 9, fontSize: 13, color: '#60a5fa', cursor: 'pointer' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          <StatCard
            label="Total Revenue"
            value={fmtAED0(totalRevenue)}
            sub={`${summary?.total_orders ?? 0} sale orders`}
            color="#60a5fa"
            icon={<DollarSign size={16} />}
          />
          <StatCard
            label="Cost of Goods"
            value={fmtAED0(totalCost)}
            sub={totalRevenue > 0 ? `${fmtPct((totalCost / totalRevenue) * 100)} of revenue` : ''}
            color="#f87171"
            icon={<TrendingUp size={16} style={{ transform: 'rotate(180deg)' }} />}
          />
          <StatCard
            label="Gross Profit"
            value={fmtAED0(totalProfit)}
            sub={totalProfit >= 0 ? 'net positive' : 'net loss'}
            color={totalProfit >= 0 ? '#34d399' : '#f87171'}
            icon={<Activity size={16} />}
          />
          <StatCard
            label="Avg Margin"
            value={fmtPct(avgMargin)}
            sub={avgMargin >= 20 ? 'Healthy' : avgMargin >= 10 ? 'Moderate' : 'Low — review costs'}
            color={marginColor(avgMargin)}
          />
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 11, padding: 4, width: 'fit-content' }}>
          <TabBtn label="Weekly Breakdown" active={tab === 'weekly'}  onClick={() => setTab('weekly')} />
          <TabBtn label="By Sale Order"    active={tab === 'orders'}  onClick={() => setTab('orders')} />
          <TabBtn label="By Product"       active={tab === 'products'} onClick={() => setTab('products')} />
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#4b5563' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <div>Loading P&L data…</div>
          </div>
        )}

        {/* Tab content */}
        {!loading && tab === 'weekly'   && <WeeklyTab   weekly={weekly} />}
        {!loading && tab === 'orders'   && <OrdersTab   sales={sales} />}
        {!loading && tab === 'products' && <ProductsTab products={summary?.products ?? []} />}

        {/* Cost note */}
        {!loading && (
          <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <AlertCircle size={14} color="#fbbf24" style={{ marginTop: 1, flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
              <strong style={{ color: '#fbbf24' }}>Cost basis:</strong> Weighted average purchase price per product from all received Purchase Orders.
              Orders containing products with no purchase history show{' '}
              <span style={{ color: '#fbbf24' }}>⚠ approximate margin</span>.
            </p>
          </div>
        )}

      </main>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
