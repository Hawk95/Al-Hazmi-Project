import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart, CategoryScale, LinearScale, PointElement, LineElement, LineController,
  ArcElement, DoughnutController, Tooltip, Legend, Filler,
} from 'chart.js';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, LineController, ArcElement, DoughnutController, Tooltip, Legend, Filler);
Chart.defaults.color = '#6B7280';
Chart.defaults.font.family = 'Inter';
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = '#1E1E25';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.08)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.titleFont = { size: 11, weight: '600' };
Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
Chart.defaults.scale.grid.color = 'rgba(255,255,255,0.04)';
Chart.defaults.scale.border.display = false;

import {
  LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2,
  DollarSign, AlertTriangle, Clock, Plus, UserPlus, FileText, List, Receipt,
  Search, Bell, Users, RefreshCw, TrendingUp, Zap, UserCheck, ClipboardList, FileCheck,
} from 'lucide-react';
import { logout, getCurrentUser, hasHRAccess } from '../api/auth';
import {
  getReportSummary, getOrdersByStatus, getLowStockReport, getRevenueTrend, getOrders, getStockSummary,
} from '../api/erp';

const STATUS_COLOR = {
  pending: '#D97706', confirmed: '#2563EB', preparing: '#7c3aed',
  shipped: '#0891b2', delivered: '#059669', cancelled: '#E53E3E',
};
const STATUS_ACTIVITY_COLOR = {
  pending: 'yellow', confirmed: 'blue', preparing: 'blue',
  shipped: 'blue', delivered: 'green', cancelled: 'red',
};

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00').getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

const buildDateRange = (days) => {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
};

const fmtAED = (n) => `AED ${Math.round(n || 0).toLocaleString()}`;
const fmtKg = (n) => `${Math.round(n || 0).toLocaleString()} kg`;

const Home = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [avatar, setAvatar] = useState(() => localStorage.getItem('erpAvatar') || '');
  const [serial] = useState(() => localStorage.getItem('erpSerial') || '#MDE-00001');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [comingSoonMsg, setComingSoonMsg] = useState('');

  const currentUser = getCurrentUser();
  const userEmail = currentUser?.sub || 'admin@example.com';
  const displayName = userEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const showComingSoon = (feature) => {
    setComingSoonMsg(`${feature} — coming soon`);
    setTimeout(() => setComingSoonMsg(''), 2500);
  };

  useEffect(() => { if (avatar) localStorage.setItem('erpAvatar', avatar); }, [avatar]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };
  const openPhotoPicker = () => fileInputRef.current?.click();
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') setAvatar(reader.result); };
    reader.readAsDataURL(file);
    setIsDropdownOpen(false);
  };

  const [liveTime, setLiveTime] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setLiveTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const formattedDate = (() => {
    const d = liveTime;
    return `${d.toLocaleDateString('en-US', { weekday: 'short' })}, ${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
  })();

  // ─── Live data ───────────────────────────────────────────────────────────────
  const [dashData, setDashData] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [ordersByStatus, setOrdersByStatus] = useState([]);
  const [stockSummary, setStockSummary] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const loadDashboard = () => {
    setDataLoading(true);
    Promise.all([
      getReportSummary(),
      getOrdersByStatus(),
      getLowStockReport(),
      getRevenueTrend(),
      getOrders(),
      getStockSummary(),
    ]).then(([summary, byStatus, lowStock, trend, orders, stock]) => {
      setDashData(summary);
      setOrdersByStatus(byStatus);
      setLowStockItems(lowStock.slice(0, 5));
      setRevenueTrend(trend);
      setRecentOrders(orders.slice(0, 5));
      setStockSummary(stock);
    }).catch(() => {}).finally(() => setDataLoading(false));
  };

  useEffect(() => { loadDashboard(); }, []);

  // ─── Charts ──────────────────────────────────────────────────────────────────
  const [lineRange, setLineRange] = useState('week');
  const [donutRange, setDonutRange] = useState('week');
  const lineChartRef = useRef(null);
  const donutChartRef = useRef(null);

  useEffect(() => {
    if (!lineChartRef.current) return;
    Chart.getChart(lineChartRef.current)?.destroy();

    const days = lineRange === 'week' ? 7 : 30;
    const dateRange = buildDateRange(days);
    const revenueMap = {};
    revenueTrend.forEach((t) => { revenueMap[t.date] = t.revenue; });

    const labels = dateRange.map((d) => {
      const dt = new Date(d + 'T00:00:00');
      return lineRange === 'week'
        ? dt.toLocaleDateString('en-US', { weekday: 'short' })
        : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const data = dateRange.map((d) => revenueMap[d] || 0);

    new Chart(lineChartRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue (AED)',
            data,
            borderColor: '#059669',
            backgroundColor: 'rgba(5,150,105,0.08)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#059669',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => `AED ${Number(v).toLocaleString()}` },
          },
        },
        plugins: {
          tooltip: {
            callbacks: { label: (ctx) => ` AED ${Number(ctx.parsed.y).toLocaleString()}` },
          },
        },
      },
    });
  }, [revenueTrend, lineRange]);

  useEffect(() => {
    if (!donutChartRef.current || ordersByStatus.length === 0) return;
    Chart.getChart(donutChartRef.current)?.destroy();

    new Chart(donutChartRef.current, {
      type: 'doughnut',
      data: {
        labels: ordersByStatus.map((s) => s.status.replace(/\b\w/g, (c) => c.toUpperCase())),
        datasets: [
          {
            data: ordersByStatus.map((s) => s.count),
            backgroundColor: ordersByStatus.map((s) => STATUS_COLOR[s.status] || '#6b7280'),
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed} orders` },
          },
        },
      },
    });
  }, [ordersByStatus]);

  const totalOrders = ordersByStatus.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="dashboard-shell">
      <header className="dashboard-topbar">
        <div className="header-logo">
          <div className="header-logo-icon">AH</div>
          <div className="header-logo-text">
            <span className="header-logo-name">Al Hazmi</span>
            <span className="header-logo-sub">Meat ERP</span>
          </div>
        </div>

        <div className="header-search">
          <Search className="header-search-icon" size={14} />
          <input type="text" className="header-search-input" placeholder="Search..." />
        </div>

        <div className="header-right" ref={dropdownRef}>
          <div className="header-live">
            <span className="header-live-dot" />
            <span className="header-live-text">Live</span>
          </div>
          <span className="header-date">{formattedDate}</span>
          <button className="header-bell" type="button" aria-label="Notifications">
            <Bell size={16} />
            <span className="header-bell-dot" />
          </button>
          <span className="header-serial">{serial}</span>
          <button
            className="header-avatar"
            type="button"
            onClick={() => setIsDropdownOpen((p) => !p)}
          >
            {avatar ? <img src={avatar} alt="Profile" /> : initials}
          </button>

          {isDropdownOpen && (
            <div className="header-dropdown">
              <button type="button" className="header-dropdown-item" onClick={() => { setIsDropdownOpen(false); navigate('/settings/profile'); }}>Profile</button>
              <button type="button" className="header-dropdown-item" onClick={() => { openPhotoPicker(); setIsDropdownOpen(false); }}>Change Photo</button>
              <div className="header-dropdown-divider" />
              <button type="button" className="header-dropdown-item logout" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
      </header>

      <aside className="dashboard-sidebar">
        <div className="sidebar-logo-area">
          <div className="header-logo-icon">AH</div>
          <div className="header-logo-text">
            <span className="header-logo-name">Al Hazmi</span>
            <span className="header-logo-sub">Meat ERP</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <span className="sidebar-group-label">Main</span>
          <button className="sidebar-item active" type="button"><LayoutDashboard size={15} strokeWidth={1.5} />Overview</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/inventory')}><Package size={15} strokeWidth={1.5} />Inventory</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/purchase-orders')}><ClipboardList size={15} strokeWidth={1.5} />Purchase Orders</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/sale-orders')}><FileCheck size={15} strokeWidth={1.5} />Sale Orders</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/invoices')}><FileText size={15} strokeWidth={1.5} />Invoices (AR)</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/accounts-payable')}><Receipt size={15} strokeWidth={1.5} />Accounts Payable</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/orders')}><ShoppingCart size={15} strokeWidth={1.5} />Orders</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/suppliers')}><Truck size={15} strokeWidth={1.5} />Suppliers</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/deliveries')}><MapPin size={15} strokeWidth={1.5} />Deliveries</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/sales')}><TrendingUp size={15} strokeWidth={1.5} />Sales Distribution</button>
          <span className="sidebar-group-label">Analytics</span>
          <button className="sidebar-item" type="button" onClick={() => navigate('/reports')}><BarChart2 size={15} strokeWidth={1.5} />Reports</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/forecast')}><Zap size={15} strokeWidth={1.5} />AI Forecast</button>
          {hasHRAccess() && <span className="sidebar-group-label">People</span>}
          {hasHRAccess() && <button className="sidebar-item" type="button" onClick={() => navigate('/hr')}><UserCheck size={15} strokeWidth={1.5} />HR Attendance</button>}
          <span className="sidebar-group-label">Admin</span>
          <button className="sidebar-item" type="button" onClick={() => navigate('/admin/users')}><Users size={15} strokeWidth={1.5} />User Management</button>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-footer-avatar">{avatar ? <img src={avatar} alt="avatar" /> : initials[0]}</div>
          <div className="sidebar-footer-info">
            <div className="sidebar-footer-name">{displayName}</div>
            <div className="sidebar-footer-serial">{serial}</div>
          </div>
        </div>
      </aside>

      <main className="dashboard-content page-enter">
        <header className="dashboard-header">
          <div className="header-left">
            <div className="header-pill">Meat ERP</div>
            <h1>Distribution command center</h1>
            <p className="header-subtitle">Operational control for stock, orders, suppliers, and shipments.</p>
            <div className="header-time">
              Today • {liveTime.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} • {liveTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div className="header-right">
            <div className="account-chip">ACC# 74G‑20V‑91K</div>
            <div className="profile-card">
              <div className="profile-avatar">{initials}</div>
              <div className="profile-info">
                <div className="profile-name">{displayName}</div>
                <div className="profile-role">{userEmail}</div>
              </div>
              <button className="upload-btn" type="button" onClick={openPhotoPicker}>Upload</button>
            </div>
          </div>
        </header>

        <div className="quick-actions-toolbar">
          <button className="qa-btn primary" type="button" onClick={() => window.open('/orders/create', '_blank')}><Plus size={14} strokeWidth={1.5} />Create Order</button>
          <button className="qa-btn" type="button" onClick={() => navigate('/products/add')}><Package size={14} strokeWidth={1.5} />Add Product</button>
          <button className="qa-btn" type="button" onClick={() => navigate('/suppliers')}><UserPlus size={14} strokeWidth={1.5} />Add Supplier</button>
          <button className="qa-btn" type="button" onClick={() => navigate('/deliveries')}><Truck size={14} strokeWidth={1.5} />Record Delivery</button>
          <button className="qa-btn" type="button" onClick={() => navigate('/reports')}><FileText size={14} strokeWidth={1.5} />Generate Report</button>
          <button className="qa-btn" type="button" onClick={() => navigate('/orders')}><List size={14} strokeWidth={1.5} />View All Orders</button>
          <button className="qa-btn" type="button" onClick={loadDashboard}><RefreshCw size={14} strokeWidth={1.5} />Refresh</button>
        </div>

        {/* ── KPI Cards ── */}
        <section className="metric-section">
          <div className="metric-grid-4">
            <article className="metric-card" onClick={() => navigate('/sale-orders')} style={{ cursor: 'pointer' }}>
              <div className="metric-card-row1">
                <Package size={16} strokeWidth={1.5} className="metric-icon" />
                <span className="metric-badge positive">Available</span>
              </div>
              <div className="metric-label">Available Stock</div>
              <div className="metric-card-bottom">
                <div className="metric-value">{dataLoading ? '—' : fmtKg(stockSummary.reduce((s, p) => s + p.available, 0))}</div>
                <div className="metric-trend positive" style={{ fontSize: 11 }}>
                  {dataLoading ? '' : (() => {
                    const res = stockSummary.reduce((s,p) => s+p.reserved, 0);
                    const dis = stockSummary.reduce((s,p) => s+p.dispatched, 0);
                    const exp = stockSummary.reduce((s,p) => s+p.expected, 0);
                    return `${fmtKg(res)} reserved · ${fmtKg(dis)} dispatched · ${fmtKg(exp)} incoming`;
                  })()}
                </div>
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-card-row1">
                <ShoppingCart size={16} strokeWidth={1.5} className="metric-icon" />
                <span className="metric-badge warning">Pending</span>
              </div>
              <div className="metric-label">Pending Orders</div>
              <div className="metric-card-bottom">
                <div className="metric-value">{dataLoading ? '—' : (dashData?.orders?.pending ?? 0)}</div>
                <div className="metric-trend positive">
                  {dataLoading ? '' : `of ${dashData?.orders?.total ?? 0} total orders`}
                </div>
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-card-row1">
                <Truck size={16} strokeWidth={1.5} className="metric-icon" />
                <span className="metric-badge neutral">Active</span>
              </div>
              <div className="metric-label">Active Suppliers</div>
              <div className="metric-card-bottom">
                <div className="metric-value">{dataLoading ? '—' : (dashData?.suppliers?.active ?? 0)}</div>
                <div className="metric-trend positive">verified suppliers</div>
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-card-row1">
                <MapPin size={16} strokeWidth={1.5} className="metric-icon" />
                <span className="metric-badge info">Today</span>
              </div>
              <div className="metric-label">Deliveries Today</div>
              <div className="metric-card-bottom">
                <div className="metric-value">{dataLoading ? '—' : (dashData?.deliveries?.today ?? 0)}</div>
                <div className="metric-trend positive">scheduled for today</div>
              </div>
            </article>
          </div>

          <div className="metric-grid-3">
            <article className="metric-card">
              <div className="metric-card-row1">
                <DollarSign size={16} strokeWidth={1.5} className="metric-icon" />
                <span className="metric-badge positive">Daily</span>
              </div>
              <div className="metric-label">Revenue Today</div>
              <div className="metric-card-bottom">
                <div className="metric-value">{dataLoading ? '—' : fmtAED(dashData?.revenue?.today)}</div>
                <div className="metric-trend positive">
                  {dataLoading ? '' : `${fmtAED(dashData?.revenue?.month)} this month`}
                </div>
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-card-row1">
                <AlertTriangle size={16} strokeWidth={1.5} className="metric-icon" />
                <span className="metric-badge warning">Alert</span>
              </div>
              <div className="metric-label">Low Stock Items</div>
              <div className="metric-card-bottom">
                <div className="metric-value">{dataLoading ? '—' : (dashData?.inventory?.low_stock ?? 0)}</div>
                <div className="metric-trend negative">
                  {dataLoading ? '' : dashData?.inventory?.low_stock > 0 ? `${dashData.inventory.low_stock} below threshold` : 'all levels OK'}
                </div>
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-card-row1">
                <Clock size={16} strokeWidth={1.5} className="metric-icon" />
                <span className="metric-badge neutral">Value</span>
              </div>
              <div className="metric-label">Inventory Value</div>
              <div className="metric-card-bottom">
                <div className="metric-value">{dataLoading ? '—' : fmtAED(dashData?.inventory?.value)}</div>
                <div className="metric-trend positive">total stock at cost</div>
              </div>
            </article>
          </div>
        </section>

        {/* ── Charts ── */}
        <section className="chart-grid">
          <div className="chart-card">
            <div className="chart-header">
              <h3>Revenue Trend</h3>
              <div className="chart-range-pills">
                {['week', 'month'].map((r) => (
                  <button key={r} type="button" className={`chart-range-pill${lineRange === r ? ' active' : ''}`} onClick={() => setLineRange(r)}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="chart-canvas-wrapper">
              <canvas ref={lineChartRef} />
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3>Orders by Status</h3>
              <div className="chart-range-pills">
                {['week', 'month', 'quarter'].map((r) => (
                  <button key={r} type="button" className={`chart-range-pill${donutRange === r ? ' active' : ''}`} onClick={() => setDonutRange(r)}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="donut-chart">
              <canvas ref={donutChartRef} />
              <div className="donut-center">
                <div className="donut-center-value">{dataLoading ? '—' : totalOrders}</div>
                <div className="donut-center-label">Orders</div>
              </div>
            </div>
            {/* Legend */}
            {ordersByStatus.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', padding: '12px 16px 4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {ordersByStatus.map((s) => (
                  <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#9ca3af' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[s.status] || '#6b7280', display: 'inline-block' }} />
                    {s.status.charAt(0).toUpperCase() + s.status.slice(1)}: {s.count}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Bottom panels ── */}
        <section className="feed-grid">
          <div className="activity-feed">
            <div className="activity-feed-header">
              <div className="activity-feed-title">
                <span className="activity-live-dot" />
                <h3>Recent Orders</h3>
              </div>
              <button type="button" className="view-all-link" onClick={() => navigate('/orders')}>View all →</button>
            </div>
            <ul className="activity-list">
              {recentOrders.length === 0 && !dataLoading && (
                <li className="activity-item" style={{ color: '#4b5563', fontSize: 13 }}>No orders yet</li>
              )}
              {recentOrders.map((o) => (
                <li key={o.id} className="activity-item">
                  <div className={`activity-icon-circle ${STATUS_ACTIVITY_COLOR[o.status] || 'blue'}`}>
                    <ShoppingCart size={14} strokeWidth={1.5} />
                  </div>
                  <div className="activity-desc">
                    <div className="activity-desc-main">{o.order_number} — {o.customer_name}</div>
                    <div className="activity-desc-sub">
                      {o.status?.charAt(0).toUpperCase() + o.status?.slice(1)} · {fmtAED(o.total_amount)}
                    </div>
                  </div>
                  <span className="activity-time">{formatRelativeTime(o.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="low-stock-panel">
            <div className="low-stock-header">
              <div className="low-stock-title">
                <AlertTriangle size={14} strokeWidth={1.5} />
                <h3>Low Stock</h3>
              </div>
              <button type="button" className="reorder-all-btn" onClick={() => navigate('/inventory')}>View inventory →</button>
            </div>
            <div className="low-stock-list">
              {lowStockItems.length === 0 && !dataLoading && (
                <div style={{ color: '#4b5563', fontSize: 13, padding: '12px 0' }}>All stock levels are healthy</div>
              )}
              {lowStockItems.map((item) => {
                const pct = item.min_threshold > 0 ? Math.min(100, Math.round((item.stock_qty / item.min_threshold) * 100)) : 0;
                const isCritical = pct < 50;
                return (
                  <div key={item.id} className="low-stock-row">
                    <div className="low-stock-row-top">
                      <span className="low-stock-name">{item.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`low-stock-qty ${isCritical ? 'critical' : 'warning'}`}>
                          {item.stock_qty.toFixed(1)} kg / min {item.min_threshold.toFixed(0)} kg
                        </span>
                        <button type="button" className="reorder-btn" onClick={() => navigate('/inventory')}>Restock</button>
                      </div>
                    </div>
                    <div className="low-stock-bar">
                      <div className={`low-stock-fill ${isCritical ? 'critical' : 'moderate'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {comingSoonMsg && (
        <div className="toast-notification info-toast">
          <span>🚧 {comingSoonMsg}</span>
        </div>
      )}
    </div>
  );
};

export default Home;
