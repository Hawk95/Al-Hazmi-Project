import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2, Users,
  TrendingUp, AlertTriangle, CheckCircle2, RefreshCw, Zap, UserCheck,
  ArrowUp, ArrowDown, Minus, Clock, Target, Activity,
} from 'lucide-react';
import { getCurrentUser, hasHRAccess } from '../api/auth';
import { getProducts, getDistributions } from '../api/erp';

Chart.register(...registerables);

// ── constants ──────────────────────────────────────────────────────────────

const TYPE_COLOR = {
  Lamb:    '#8b5cf6',
  Beef:    '#ef4444',
  Chicken: '#f59e0b',
  Goat:    '#10b981',
  Camel:   '#3b82f6',
};

const RISK_CFG = {
  critical: { label: 'Critical',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)' },
  warning:  { label: 'Low Stock',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)' },
  safe:     { label: 'Adequate',    color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)' },
  nodata:   { label: 'No History',  color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.25)' },
};

// ── computation ────────────────────────────────────────────────────────────

function computeForecasts(products, distributions) {
  const today = new Date();

  // Build per-type, per-date net sold map
  const byType = {};
  for (const d of distributions) {
    const net = Math.max(0, d.quantity_kg - (d.returned_qty || 0));
    if (!byType[d.meat_type]) byType[d.meat_type] = {};
    byType[d.meat_type][d.distribution_date] = (byType[d.meat_type][d.distribution_date] || 0) + net;
  }

  const allTypes = [...new Set(distributions.map(d => d.meat_type))];

  return allTypes.map(meatType => {
    const dailyMap = byType[meatType] || {};

    const sumWindow = (offsetStart, days) => {
      let total = 0;
      for (let i = offsetStart; i < offsetStart + days; i++) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        total += dailyMap[d.toISOString().slice(0, 10)] || 0;
      }
      return total;
    };

    const sum30  = sumWindow(0, 30);
    const sum7   = sumWindow(0, 7);
    const sumP7  = sumWindow(7, 7);    // previous 7 days
    const avg30  = sum30 / 30;
    const avg7   = sum7 / 7;
    const avgP7  = sumP7 / 7;

    const trendPct = avgP7 > 0 ? ((avg7 - avgP7) / avgP7) * 100 : 0;
    const trend = trendPct > 10 ? 'up' : trendPct < -10 ? 'down' : 'stable';

    // Weighted forecast: recent data carries more weight
    const forecastDaily = avg7 * 0.65 + avg30 * 0.35;

    // Match products by name or category containing the meat type keyword
    const matched = products.filter(p =>
      p.is_active && (
        p.name.toLowerCase().includes(meatType.toLowerCase()) ||
        (p.category || '').toLowerCase().includes(meatType.toLowerCase())
      )
    );
    const totalStock = matched.reduce((s, p) => s + (p.quantity_kg || 0), 0);
    const minStock   = matched.reduce((s, p) => s + (p.min_stock_kg || 0), 0);
    const daysLeft   = forecastDaily > 0 ? Math.floor(totalStock / forecastDaily) : null;

    const risk = forecastDaily === 0 ? 'nodata'
      : daysLeft !== null && daysLeft <= 5  ? 'critical'
      : daysLeft !== null && daysLeft <= 14 ? 'warning'
      : 'safe';

    const dataPoints  = Object.keys(dailyMap).length;
    const confidence  = Math.min(95, Math.round(45 + dataPoints * 3));

    return {
      meatType,
      matched,
      totalStock: Math.round(totalStock * 10) / 10,
      minStock:   Math.round(minStock * 10) / 10,
      avgDaily:   Math.round(forecastDaily * 10) / 10,
      daysLeft,
      forecast7d:  Math.round(forecastDaily * 7),
      forecast30d: Math.round(forecastDaily * 30),
      trend,
      trendPct: Math.abs(trendPct).toFixed(0),
      risk,
      confidence,
      color: TYPE_COLOR[meatType] || '#6b7280',
      totalSold: Math.round(sum30 * 10) / 10,
      dataPoints,
    };
  }).sort((a, b) => {
    const o = { critical: 0, warning: 1, safe: 2, nodata: 3 };
    return o[a.risk] - o[b.risk];
  });
}

function buildChart(canvas, distributions, forecasts) {
  const today = new Date();

  // Group actual data by type and date
  const byType = {};
  for (const d of distributions) {
    const net = Math.max(0, d.quantity_kg - (d.returned_qty || 0));
    if (!byType[d.meat_type]) byType[d.meat_type] = {};
    byType[d.meat_type][d.distribution_date] = (byType[d.meat_type][d.distribution_date] || 0) + net;
  }

  // 14 days history + today + 14 days forecast = 29 points
  const labels = [];
  for (let i = -14; i <= 14; i++) {
    const d = new Date(today); d.setDate(d.getDate() + i);
    if (i === 0) labels.push('Today');
    else labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }

  const topTypes = forecasts.filter(f => f.avgDaily > 0).slice(0, 3);
  const datasets = [];

  topTypes.forEach(fc => {
    const color = fc.color;
    const historical = [];
    const forecast   = [];

    for (let i = -14; i <= 14; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      if (i <= 0) {
        historical.push(byType[fc.meatType]?.[dateStr] || 0);
        forecast.push(i === 0 ? (byType[fc.meatType]?.[dateStr] || fc.avgDaily) : null);
      } else {
        historical.push(null);
        // smooth forecast curve with gentle sine wave variation
        const variation = fc.avgDaily * 0.1 * Math.sin(i * 0.9);
        forecast.push(Math.max(0, fc.avgDaily + variation));
      }
    }

    datasets.push({
      label: fc.meatType,
      data: historical,
      borderColor: color,
      backgroundColor: 'transparent',
      borderWidth: 2.5,
      tension: 0.45,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: color,
    });
    datasets.push({
      label: `${fc.meatType} forecast`,
      data: forecast,
      borderColor: color + 'aa',
      backgroundColor: color + '12',
      borderWidth: 2,
      borderDash: [6, 4],
      tension: 0.45,
      pointRadius: 0,
      pointHoverRadius: 4,
      fill: { target: 'origin', above: color + '08' },
    });
  });

  // "TODAY" vertical line plugin
  const todayLinePlugin = {
    id: 'todayLine',
    afterDraw(chart) {
      const { ctx, scales: { x, y } } = chart;
      const xPx = x.getPixelForValue(14); // index 14 = Today
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(xPx, y.top);
      ctx.lineTo(xPx, y.bottom);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NOW', xPx, y.top + 10);
      // Shading for forecast zone
      ctx.fillStyle = 'rgba(139,92,246,0.03)';
      ctx.fillRect(xPx, y.top, x.right - xPx, y.bottom - y.top);
      ctx.restore();
    },
  };

  return new Chart(canvas, {
    type: 'line',
    plugins: [todayLinePlugin],
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: '#6b7280',
            font: { size: 11 },
            padding: 18,
            usePointStyle: true,
            filter: item => !item.text.includes('forecast'),
          },
        },
        tooltip: {
          backgroundColor: '#1a1a27',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: '#f2f2f7',
          bodyColor: '#9ca3af',
          padding: 12,
          callbacks: {
            label: ctx => ctx.parsed.y != null ? ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} kg` : null,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#374151', font: { size: 10 }, maxTicksLimit: 12 },
          border: { display: false },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#374151', font: { size: 10 }, callback: v => `${v}` },
          border: { display: false },
          beginAtZero: true,
        },
      },
    },
  });
}

function generateInsights(distributions, forecasts) {
  if (!distributions.length) return [];
  const insights = [];

  const topSold = [...forecasts].sort((a, b) => b.totalSold - a.totalSold)[0];
  if (topSold?.totalSold > 0)
    insights.push({ icon: <TrendingUp size={13} />, color: '#8b5cf6', text: `${topSold.meatType} is the highest-volume product — ${topSold.totalSold} kg sold in the last 30 days.` });

  const growing = forecasts.find(f => f.trend === 'up');
  if (growing)
    insights.push({ icon: <ArrowUp size={13} />, color: '#10b981', text: `${growing.meatType} demand grew +${growing.trendPct}% week-over-week. Consider increasing stock.` });

  const declining = forecasts.find(f => f.trend === 'down');
  if (declining)
    insights.push({ icon: <ArrowDown size={13} />, color: '#f59e0b', text: `${declining.meatType} demand dropped −${declining.trendPct}% vs last week. Review ordering.` });

  const critical = forecasts.find(f => f.risk === 'critical');
  if (critical)
    insights.push({ icon: <AlertTriangle size={13} />, color: '#ef4444', text: `${critical.meatType} will run out in ~${critical.daysLeft} days at current demand. Reorder now.` });

  const emirateTotals = {};
  for (const d of distributions)
    emirateTotals[d.emirate] = (emirateTotals[d.emirate] || 0) + (d.quantity_kg - (d.returned_qty || 0));
  const topEmirate = Object.entries(emirateTotals).sort((a, b) => b[1] - a[1])[0];
  if (topEmirate)
    insights.push({ icon: <MapPin size={13} />, color: '#3b82f6', text: `${topEmirate[0]} is the top-performing emirate with ${topEmirate[1].toFixed(0)} kg total sold.` });

  const totalTaken = distributions.reduce((s, d) => s + d.quantity_kg, 0);
  const totalReturned = distributions.reduce((s, d) => s + (d.returned_qty || 0), 0);
  if (totalTaken > 0) {
    const rate = ((totalReturned / totalTaken) * 100).toFixed(1);
    insights.push({ icon: <Activity size={13} />, color: '#6b7280', text: `Return rate is ${rate}% overall — ${rate < 10 ? 'excellent sell-through' : rate < 20 ? 'moderate returns' : 'high returns, investigate'}.` });
  }

  return insights.slice(0, 5);
}

// ── sub-components ─────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color, icon, alert }) {
  return (
    <div style={{ background: '#1a1a27', border: `1px solid ${color}28`, borderRadius: 16, padding: '22px 22px 18px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: `radial-gradient(circle, ${color}18, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: '#f2f2f7', lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 5 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color, marginTop: 6, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

function RiskBadge({ risk }) {
  const r = RISK_CFG[risk] || RISK_CFG.nodata;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 20, background: r.bg, color: r.color, border: `1px solid ${r.border}`, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {risk === 'critical' && <AlertTriangle size={10} />}
      {risk === 'warning'  && <Clock size={10} />}
      {risk === 'safe'     && <CheckCircle2 size={10} />}
      {risk === 'nodata'   && <Minus size={10} />}
      {r.label}
    </span>
  );
}

function TrendChip({ trend, pct }) {
  if (trend === 'up')   return <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:12, color:'#10b981', fontWeight:700 }}><ArrowUp size={12} />+{pct}%</span>;
  if (trend === 'down') return <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:12, color:'#ef4444', fontWeight:700 }}><ArrowDown size={12} />−{pct}%</span>;
  return <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:12, color:'#6b7280', fontWeight:500 }}><Minus size={12} />Stable</span>;
}

function StockBar({ current, min, color }) {
  if (!min || min === 0) return <span style={{ fontSize: 11, color: '#374151' }}>—</span>;
  const pct = Math.min(100, (current / (min * 3)) * 100);
  const barColor = pct < 33 ? '#ef4444' : pct < 66 ? '#f59e0b' : '#10b981';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 70, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 11, color: barColor, fontWeight: 600 }}>{Math.round(pct)}%</span>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────

export default function Forecast() {
  const navigate = useNavigate();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [insights, setInsights] = useState([]);
  const [lastRun, setLastRun] = useState(null);
  const [analysing, setAnalysing] = useState(false);

  const currentUser = getCurrentUser();
  const userEmail = currentUser?.sub || '';
  const displayName = userEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const initials = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, dists] = await Promise.all([getProducts(), getDistributions()]);
      setProducts(prods);
      setDistributions(dists);
      const fc = computeForecasts(prods, dists);
      setForecasts(fc);
      setInsights(generateInsights(dists, fc));
      setLastRun(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const runAnalysis = async () => {
    setAnalysing(true);
    await loadData();
    setAnalysing(false);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; }
    if (forecasts.length > 0)
      chartInstance.current = buildChart(chartRef.current, distributions, forecasts);
    return () => { if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; } };
  }, [forecasts, distributions]);

  // Summary stats
  const criticalCount  = forecasts.filter(f => f.risk === 'critical').length;
  const warningCount   = forecasts.filter(f => f.risk === 'warning').length;
  const forecast7dTotal = forecasts.reduce((s, f) => s + (f.forecast7d || 0), 0);
  const avgConfidence  = forecasts.length ? Math.round(forecasts.reduce((s, f) => s + f.confidence, 0) / forecasts.length) : 0;
  const firstStockout  = forecasts.filter(f => f.daysLeft !== null).sort((a, b) => a.daysLeft - b.daysLeft)[0];

  const S = {
    th: { padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)', whiteSpace: 'nowrap' },
    td: { padding: '14px 16px', fontSize: 13, color: '#e5e7eb', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' },
  };

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

      {/* ── Sidebar ── */}
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
          {sidebarBtn('/sales', <TrendingUp size={15} strokeWidth={1.5} />, 'Sales Distribution')}
          <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 8px', marginTop: 8 }}>Analytics</div>
          {sidebarBtn('/reports', <BarChart2 size={15} strokeWidth={1.5} />, 'Reports')}
          {sidebarBtn('/forecast', <Zap size={15} strokeWidth={1.5} />, 'AI Forecast', true)}
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

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: '28px 32px', overflow: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f2f2f7', margin: 0 }}>AI Demand Forecasting</h1>
              {/* AI badge */}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: 'linear-gradient(135deg,rgba(139,92,246,0.25),rgba(99,102,241,0.25))', border: '1px solid rgba(139,92,246,0.4)', fontSize: 10, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.08em' }}>
                <Zap size={10} fill="#a78bfa" /> AI POWERED
              </span>
              <span style={{ padding: '2px 8px', borderRadius: 10, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>BETA</span>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              Predict stock needs before they run out · {lastRun ? `Last analysed at ${lastRun}` : 'Loading analysis…'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={loadData} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
            </button>
            <button type="button" onClick={runAnalysis} disabled={analysing || loading}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, background: analysing ? '#374151' : 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: analysing ? 'default' : 'pointer', boxShadow: analysing ? 'none' : '0 4px 14px rgba(124,58,237,0.35)' }}>
              <Zap size={13} fill={analysing ? 'transparent' : '#fff'} /> {analysing ? 'Analysing…' : 'Run Analysis'}
            </button>
          </div>
        </div>

        {/* ── Metric cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          <MetricCard
            label="At-Risk Products"
            value={loading ? '—' : criticalCount + warningCount}
            sub={criticalCount > 0 ? `${criticalCount} critical · ${warningCount} low stock` : warningCount > 0 ? `${warningCount} low stock` : 'All stock levels healthy'}
            color={criticalCount > 0 ? '#ef4444' : warningCount > 0 ? '#f59e0b' : '#10b981'}
            icon={<AlertTriangle size={18} />}
          />
          <MetricCard
            label="7-Day Predicted Demand"
            value={loading ? '—' : `${forecast7dTotal} kg`}
            sub={`across ${forecasts.length} meat types`}
            color="#8b5cf6"
            icon={<Activity size={18} />}
          />
          <MetricCard
            label="Forecast Confidence"
            value={loading ? '—' : `${avgConfidence}%`}
            sub={avgConfidence >= 80 ? 'High confidence' : avgConfidence >= 60 ? 'Moderate confidence' : 'Needs more data'}
            color="#10b981"
            icon={<Target size={18} />}
          />
          <MetricCard
            label="Earliest Stockout"
            value={loading ? '—' : firstStockout ? `${firstStockout.daysLeft}d` : 'Safe'}
            sub={firstStockout ? `${firstStockout.meatType} — reorder soon` : 'No stockouts predicted'}
            color={firstStockout?.risk === 'critical' ? '#ef4444' : firstStockout?.risk === 'warning' ? '#f59e0b' : '#10b981'}
            icon={<Clock size={18} />}
          />
        </div>

        {/* ── Chart + Insights row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, marginBottom: 24 }}>

          {/* Demand Forecast Chart */}
          <div style={{ background: '#1a1a27', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '22px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f2f2f7' }}>Demand Forecast</div>
                <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>14-day historical · 14-day projection</div>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 11, color: '#4b5563' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ display: 'inline-block', width: 20, height: 2, background: '#8b5cf6', borderRadius: 1 }} /> Actual
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ display: 'inline-block', width: 20, height: 2, background: '#8b5cf680', borderRadius: 1, backgroundImage: 'repeating-linear-gradient(90deg,#8b5cf680 0,#8b5cf680 6px,transparent 6px,transparent 10px)' }} /> Forecast
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)' }} /> Forecast zone
                </span>
              </div>
            </div>
            <div style={{ height: 260, position: 'relative' }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#374151', fontSize: 13 }}>Loading forecast data…</div>
              ) : forecasts.filter(f => f.avgDaily > 0).length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10 }}>
                  <Activity size={32} color="#374151" strokeWidth={1} />
                  <div style={{ fontSize: 13, color: '#4b5563', textAlign: 'center' }}>No distribution data yet<br /><span style={{ fontSize: 11 }}>Start recording sales to see demand trends</span></div>
                </div>
              ) : (
                <canvas ref={chartRef} />
              )}
            </div>
          </div>

          {/* AI Insights Panel */}
          <div style={{ background: '#1a1a27', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 16, padding: '22px 22px', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,rgba(139,92,246,0.25),rgba(99,102,241,0.25))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(139,92,246,0.3)' }}>
                <Zap size={15} color="#a78bfa" fill="#a78bfa" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f2f2f7' }}>AI Insights</div>
                <div style={{ fontSize: 11, color: '#4b5563' }}>Auto-generated from data</div>
              </div>
            </div>

            {/* Insight list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              {loading ? (
                <div style={{ color: '#374151', fontSize: 13, paddingTop: 20 }}>Generating insights…</div>
              ) : insights.length === 0 ? (
                <div style={{ color: '#374151', fontSize: 13, paddingTop: 20 }}>No data yet — record distributions to get AI insights.</div>
              ) : insights.map((insight, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: `${insight.color}08`, border: `1px solid ${insight.color}18`, borderRadius: 10 }}>
                  <span style={{ color: insight.color, flexShrink: 0, marginTop: 1 }}>{insight.icon}</span>
                  <span style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.55 }}>{insight.text}</span>
                </div>
              ))}
            </div>

            {/* Risk breakdown */}
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 11, color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Stock Risk Distribution</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { label: 'Critical', count: criticalCount, color: '#ef4444' },
                  { label: 'Low Stock', count: warningCount, color: '#f59e0b' },
                  { label: 'Adequate', count: forecasts.filter(f => f.risk === 'safe').length, color: '#10b981' },
                  { label: 'No Data',  count: forecasts.filter(f => f.risk === 'nodata').length, color: '#4b5563' },
                ].filter(b => b.count > 0).map(b => (
                  <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 20, background: `${b.color}12`, border: `1px solid ${b.color}28` }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: b.color }} />
                    <span style={{ fontSize: 11, color: b.color, fontWeight: 600 }}>{b.count} {b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Forecast Table ── */}
        <div style={{ background: '#1a1a27', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f2f2f7' }}>Product Forecast Detail</div>
              <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>Predictions based on weighted moving average of sales history</div>
            </div>
            {forecasts.length > 0 && (
              <span style={{ fontSize: 12, color: '#4b5563' }}>{forecasts.length} meat type{forecasts.length !== 1 ? 's' : ''} analysed</span>
            )}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={S.th}>Meat Type</th>
                <th style={S.th}>Current Stock</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Avg Daily Use</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Days Left</th>
                <th style={{ ...S.th, textAlign: 'right' }}>7-Day Need</th>
                <th style={{ ...S.th, textAlign: 'right' }}>30-Day Need</th>
                <th style={S.th}>Trend (7d)</th>
                <th style={S.th}>Confidence</th>
                <th style={S.th}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '52px 0', color: '#374151', fontSize: 13 }}>Running forecast analysis…</td></tr>
              ) : forecasts.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '52px 0', color: '#374151', fontSize: 13 }}>No distribution data yet — start recording sales to enable forecasting</td></tr>
              ) : forecasts.map(fc => (
                <tr key={fc.meatType}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                  {/* Meat Type */}
                  <td style={S.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${fc.color}15`, border: `1px solid ${fc.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: fc.color, boxShadow: `0 0 6px ${fc.color}80` }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#f2f2f7' }}>{fc.meatType}</div>
                        <div style={{ fontSize: 11, color: '#4b5563' }}>{fc.matched.length} product{fc.matched.length !== 1 ? 's' : ''} matched</div>
                      </div>
                    </div>
                  </td>

                  {/* Current Stock */}
                  <td style={S.td}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f2f2f7', marginBottom: 5 }}>
                      {fc.totalStock > 0 ? `${fc.totalStock} kg` : <span style={{ color: '#374151' }}>No stock</span>}
                    </div>
                    <StockBar current={fc.totalStock} min={fc.minStock} color={fc.color} />
                  </td>

                  {/* Avg Daily */}
                  <td style={{ ...S.td, textAlign: 'right' }}>
                    {fc.avgDaily > 0 ? (
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb' }}>{fc.avgDaily} <span style={{ fontSize: 11, color: '#4b5563', fontWeight: 400 }}>kg/day</span></span>
                    ) : (
                      <span style={{ color: '#374151', fontSize: 12 }}>—</span>
                    )}
                  </td>

                  {/* Days Left */}
                  <td style={{ ...S.td, textAlign: 'right' }}>
                    {fc.daysLeft !== null ? (
                      <span style={{ fontSize: 16, fontWeight: 800, color: fc.risk === 'critical' ? '#ef4444' : fc.risk === 'warning' ? '#f59e0b' : '#10b981' }}>
                        {fc.daysLeft}
                        <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 3, color: '#4b5563' }}>d</span>
                      </span>
                    ) : (
                      <span style={{ color: '#374151', fontSize: 12 }}>—</span>
                    )}
                  </td>

                  {/* 7-Day Need */}
                  <td style={{ ...S.td, textAlign: 'right' }}>
                    {fc.forecast7d > 0 ? (
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#a78bfa' }}>{fc.forecast7d} <span style={{ fontSize: 11, color: '#4b5563', fontWeight: 400 }}>kg</span></span>
                    ) : <span style={{ color: '#374151' }}>—</span>}
                  </td>

                  {/* 30-Day Need */}
                  <td style={{ ...S.td, textAlign: 'right' }}>
                    {fc.forecast30d > 0 ? (
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#818cf8' }}>{fc.forecast30d} <span style={{ fontSize: 11, color: '#4b5563', fontWeight: 400 }}>kg</span></span>
                    ) : <span style={{ color: '#374151' }}>—</span>}
                  </td>

                  {/* Trend */}
                  <td style={S.td}><TrendChip trend={fc.trend} pct={fc.trendPct} /></td>

                  {/* Confidence */}
                  <td style={{ ...S.td, minWidth: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${fc.confidence}%`, background: `linear-gradient(90deg,${fc.color}cc,${fc.color}60)`, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#6b7280', minWidth: 28, textAlign: 'right' }}>{fc.confidence}%</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#374151', marginTop: 3 }}>{fc.dataPoints} data pt{fc.dataPoints !== 1 ? 's' : ''}</div>
                  </td>

                  {/* Risk */}
                  <td style={S.td}><RiskBadge risk={fc.risk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Reorder Recommendations ── */}
        {forecasts.filter(f => f.risk === 'critical' || f.risk === 'warning').length > 0 && (
          <div style={{ background: '#1a1a27', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={15} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f2f2f7' }}>Reorder Recommendations</div>
                <div style={{ fontSize: 11, color: '#4b5563' }}>AI-suggested actions based on current stock and demand</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
              {forecasts.filter(f => f.risk === 'critical' || f.risk === 'warning').map(fc => {
                const r = RISK_CFG[fc.risk];
                const reorderQty = fc.forecast30d - fc.totalStock;
                return (
                  <div key={fc.meatType} style={{ background: `${r.color}06`, border: `1px solid ${r.color}20`, borderRadius: 12, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#f2f2f7' }}>{fc.meatType}</span>
                      </div>
                      <RiskBadge risk={fc.risk} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#6b7280' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Current stock</span>
                        <strong style={{ color: '#e5e7eb' }}>{fc.totalStock} kg</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>30-day demand</span>
                        <strong style={{ color: '#e5e7eb' }}>{fc.forecast30d} kg</strong>
                      </div>
                      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600 }}>Suggested reorder</span>
                        <strong style={{ color: r.color, fontSize: 13 }}>{Math.max(0, reorderQty).toFixed(0)} kg</strong>
                      </div>
                      {fc.daysLeft !== null && (
                        <div style={{ marginTop: 6, padding: '6px 10px', background: `${r.color}10`, borderRadius: 7, fontSize: 11, color: r.color, fontWeight: 600, textAlign: 'center' }}>
                          {fc.risk === 'critical' ? `⚠ Stockout in ${fc.daysLeft} days — order immediately` : `Stock lasts ${fc.daysLeft} more days`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
