import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, LineController, ArcElement, DoughnutController, Tooltip, Legend, Filler } from 'chart.js';

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
import { LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2, DollarSign, AlertTriangle, Clock, Plus, UserPlus, FileText, List, Search, Bell, Users } from 'lucide-react';
import { logout, getCurrentUser } from '../api/auth';

const Home = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [avatar, setAvatar] = useState(() => localStorage.getItem('erpAvatar') || '');
  const [serial, setSerial] = useState(() => localStorage.getItem('erpSerial') || '#MDE-00001');
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

  useEffect(() => {
    if (avatar) {
      localStorage.setItem('erpAvatar', avatar);
    }
  }, [avatar]);

  useEffect(() => {
    if (!localStorage.getItem('erpSerial')) {
      localStorage.setItem('erpSerial', serial);
    }
  }, [serial]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openPhotoPicker = () => fileInputRef.current?.click();

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
      }
    };
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
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    return `${weekday}, ${day} ${month}`;
  })();

  const [lineRange, setLineRange] = useState('week');
  const [donutRange, setDonutRange] = useState('week');

  const lineChartRef = useRef(null);
  const donutChartRef = useRef(null);
  const lineChartInstance = useRef(null);
  const donutChartInstance = useRef(null);

  useEffect(() => {
    if (lineChartRef.current) {
      Chart.getChart(lineChartRef.current)?.destroy();
      lineChartInstance.current = new Chart(lineChartRef.current, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [
            {
              label: 'Stock In',
              data: [320, 410, 380, 460, 490, 520, 540],
              borderColor: '#059669',
              backgroundColor: 'rgba(5,150,105,0.06)',
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointHoverBackgroundColor: '#059669',
              borderWidth: 1.5,
            },
            {
              label: 'Stock Out',
              data: [210, 190, 230, 220, 260, 240, 270],
              borderColor: '#E53E3E',
              backgroundColor: 'rgba(229,62,62,0.06)',
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointHoverBackgroundColor: '#E53E3E',
              borderWidth: 1.5,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true },
          },
        },
      });
    }

    if (donutChartRef.current) {
      Chart.getChart(donutChartRef.current)?.destroy();
      donutChartInstance.current = new Chart(donutChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Pending', 'Confirmed', 'Delivered', 'Cancelled'],
          datasets: [
            {
              data: [18, 42, 28, 12],
              backgroundColor: ['#D97706', '#2563EB', '#059669', '#E53E3E'],
              borderWidth: 0,
              hoverOffset: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '75%',
        },
      });
    }

    return () => {
      lineChartInstance.current?.destroy();
      donutChartInstance.current?.destroy();
    };
  }, []);

  return (
    <div className="dashboard-shell">
      <header className="dashboard-topbar">
        {/* Left: Logo */}
        <div className="header-logo">
          <div className="header-logo-icon">M</div>
          <span className="header-logo-name">Meat ERP</span>
        </div>

        {/* Center: Search */}
        <div className="header-search">
          <Search className="header-search-icon" size={14} />
          <input type="text" className="header-search-input" placeholder="Search..." />
        </div>

        {/* Right: Controls */}
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
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-haspopup="true"
            aria-expanded={isDropdownOpen}
          >
            {avatar ? <img src={avatar} alt="Profile" /> : initials}
          </button>

          {isDropdownOpen && (
            <div className="header-dropdown">
              <button type="button" className="header-dropdown-item" onClick={() => { setIsDropdownOpen(false); navigate('/settings/profile'); }}>Profile</button>
              <button type="button" className="header-dropdown-item" onClick={() => { openPhotoPicker(); setIsDropdownOpen(false); }}>Change Photo</button>
              <button type="button" className="header-dropdown-item" onClick={() => showComingSoon('Account Info')}>Account Info</button>
              <div className="header-dropdown-divider" />
              <button type="button" className="header-dropdown-item logout" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleAvatarChange}
        />
      </header>

      <aside className="dashboard-sidebar">
        <div className="sidebar-logo-area">
          <div className="header-logo-icon">M</div>
          <span className="header-logo-name">Meat ERP</span>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-group-label">Main</span>
          <button className="sidebar-item active" type="button" data-label="Overview">
            <LayoutDashboard size={15} strokeWidth={1.5} />
            Overview
          </button>
          <button className="sidebar-item" type="button" data-label="Inventory">
            <Package size={15} strokeWidth={1.5} />
            Inventory
          </button>
          <button className="sidebar-item" type="button" data-label="Orders">
            <ShoppingCart size={15} strokeWidth={1.5} />
            Orders
            <span className="sidebar-badge">14</span>
          </button>
          <button className="sidebar-item" type="button" data-label="Suppliers">
            <Truck size={15} strokeWidth={1.5} />
            Suppliers
          </button>
          <button className="sidebar-item" type="button" data-label="Deliveries">
            <MapPin size={15} strokeWidth={1.5} />
            Deliveries
            <span className="sidebar-badge">3</span>
          </button>

          <span className="sidebar-group-label">Analytics</span>
          <button className="sidebar-item" type="button" data-label="Reports">
            <BarChart2 size={15} strokeWidth={1.5} />
            Reports
          </button>
          <span className="sidebar-group-label">Admin</span>
          <button className="sidebar-item" type="button" onClick={() => navigate('/admin/users')}>
            <Users size={15} strokeWidth={1.5} />
            User Management
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-avatar">
            {avatar ? <img src={avatar} alt="avatar" /> : initials[0]}
          </div>
          <div className="sidebar-footer-info">
            <div className="sidebar-footer-name">{displayName}</div>
            <div className="sidebar-footer-serial">{serial}</div>
          </div>
        </div>
      </aside>

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div className="header-left">
            <div className="header-pill">Meat ERP</div>
            <h1>Distribution command center</h1>
            <p className="header-subtitle">Operational control for stock, orders, suppliers, and shipments.</p>
            <div className="header-time">Today • {liveTime.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} • {liveTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
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
          <button className="qa-btn primary" type="button" onClick={() => showComingSoon('Create Order')}>
            <Plus size={14} strokeWidth={1.5} />
            Create Order
          </button>
          <button className="qa-btn" type="button" onClick={() => showComingSoon('Add Product')}>
            <Package size={14} strokeWidth={1.5} />
            Add Product
          </button>
          <button className="qa-btn" type="button" onClick={() => showComingSoon('Add Supplier')}>
            <UserPlus size={14} strokeWidth={1.5} />
            Add Supplier
          </button>
          <button className="qa-btn" type="button" onClick={() => showComingSoon('Record Delivery')}>
            <Truck size={14} strokeWidth={1.5} />
            Record Delivery
          </button>
          <button className="qa-btn" type="button" onClick={() => showComingSoon('Generate Report')}>
            <FileText size={14} strokeWidth={1.5} />
            Generate Report
          </button>
          <button className="qa-btn" type="button" onClick={() => showComingSoon('View All Orders')}>
            <List size={14} strokeWidth={1.5} />
            View All Orders
          </button>
        </div>

        <section className="metric-section">
          <div className="metric-grid-4">
            <article className="metric-card">
              <div className="metric-card-row1">
                <Package size={16} strokeWidth={1.5} className="metric-icon" />
                <span className="metric-badge positive">Stable</span>
              </div>
              <div className="metric-label">Stock Available</div>
              <div className="metric-card-bottom">
                <div className="metric-value">3,420 kg</div>
                <div className="metric-trend positive">↑ 4.2% vs yesterday</div>
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-card-row1">
                <ShoppingCart size={16} strokeWidth={1.5} className="metric-icon" />
                <span className="metric-badge warning">Pending</span>
              </div>
              <div className="metric-label">Pending Orders</div>
              <div className="metric-card-bottom">
                <div className="metric-value">14</div>
                <div className="metric-trend negative">↓ 2.8% vs target</div>
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-card-row1">
                <Truck size={16} strokeWidth={1.5} className="metric-icon" />
                <span className="metric-badge neutral">Active</span>
              </div>
              <div className="metric-label">Active Suppliers</div>
              <div className="metric-card-bottom">
                <div className="metric-value">5</div>
                <div className="metric-trend positive">↑ 8.4% vs last month</div>
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-card-row1">
                <MapPin size={16} strokeWidth={1.5} className="metric-icon" />
                <span className="metric-badge info">Today</span>
              </div>
              <div className="metric-label">Deliveries Today</div>
              <div className="metric-card-bottom">
                <div className="metric-value">3</div>
                <div className="metric-trend positive">↑ 12% vs average</div>
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
                <div className="metric-value">$18,450</div>
                <div className="metric-trend positive">↑ 5.6% vs yesterday</div>
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-card-row1">
                <AlertTriangle size={16} strokeWidth={1.5} className="metric-icon" />
                <span className="metric-badge warning">Alert</span>
              </div>
              <div className="metric-label">Low Stock Items</div>
              <div className="metric-card-bottom">
                <div className="metric-value">7</div>
                <div className="metric-trend negative">↓ 3 new alerts</div>
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-card-row1">
                <Clock size={16} strokeWidth={1.5} className="metric-icon" />
                <span className="metric-badge neutral">Avg</span>
              </div>
              <div className="metric-label">Avg Delivery Time</div>
              <div className="metric-card-bottom">
                <div className="metric-value">2h 18m</div>
                <div className="metric-trend positive">↑ 1.2% improvement</div>
              </div>
            </article>
          </div>
        </section>

        <section className="chart-grid">
          <div className="chart-card">
            <div className="chart-header">
              <h3>Stock Movement</h3>
              <div className="chart-range-pills">
                {['week', 'month', 'quarter'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`chart-range-pill${lineRange === r ? ' active' : ''}`}
                    onClick={() => setLineRange(r)}
                  >
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
                  <button
                    key={r}
                    type="button"
                    className={`chart-range-pill${donutRange === r ? ' active' : ''}`}
                    onClick={() => setDonutRange(r)}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="donut-chart">
              <canvas ref={donutChartRef} />
              <div className="donut-center">
                <div className="donut-center-value">100</div>
                <div className="donut-center-label">Orders</div>
              </div>
            </div>
          </div>
        </section>

        <section className="summary-grid">
          <div className="summary-panel">
            <div>
              <h2>Today’s Summary</h2>
              <p>April 29, 2026 • 08:45 AM</p>
            </div>
            <div className="summary-value">
              <span>Temperature</span>
              <strong>18°C</strong>
            </div>
            <div className="summary-value">
              <span>Humidity</span>
              <strong>62%</strong>
            </div>
            <div className="summary-value">
              <span>Warehouse load</span>
              <strong>82%</strong>
            </div>
          </div>

          <div className="quick-actions-panel">
            <h3>Quick Actions</h3>
            <div className="quick-actions-list">
              <button className="quick-action" type="button" onClick={() => showComingSoon('Stock check')}>Stock check</button>
              <button className="quick-action" type="button" onClick={() => showComingSoon('Invoice review')}>Invoice review</button>
              <button className="quick-action" type="button" onClick={() => showComingSoon('Route assign')}>Route assign</button>
              <button className="quick-action" type="button" onClick={() => showComingSoon('Supplier note')}>Supplier note</button>
            </div>
          </div>
        </section>

        <section className="feed-grid">
          <div className="activity-feed">
            <div className="activity-feed-header">
              <div className="activity-feed-title">
                <span className="activity-live-dot" />
                <h3>Recent Activity</h3>
              </div>
              <button type="button" className="view-all-link" onClick={() => showComingSoon('Activity log')}>View all →</button>
            </div>
            <ul className="activity-list">
              <li className="activity-item">
                <div className="activity-icon-circle blue">
                  <Truck size={14} strokeWidth={1.5} />
                </div>
                <div className="activity-desc">
                  <div className="activity-desc-main">Order #3748 dispatched</div>
                  <div className="activity-desc-sub">Confirmed and sent to delivery team</div>
                </div>
                <span className="activity-time">12 min ago</span>
              </li>
              <li className="activity-item">
                <div className="activity-icon-circle green">
                  <Package size={14} strokeWidth={1.5} />
                </div>
                <div className="activity-desc">
                  <div className="activity-desc-main">Stock replenished — chilled beef</div>
                  <div className="activity-desc-sub">450 kg added to inventory</div>
                </div>
                <span className="activity-time">28 min ago</span>
              </li>
              <li className="activity-item">
                <div className="activity-icon-circle yellow">
                  <AlertTriangle size={14} strokeWidth={1.5} />
                </div>
                <div className="activity-desc">
                  <div className="activity-desc-main">Low stock alert created</div>
                  <div className="activity-desc-sub">Pork loin fell below threshold</div>
                </div>
                <span className="activity-time">38 min ago</span>
              </li>
              <li className="activity-item">
                <div className="activity-icon-circle red">
                  <ShoppingCart size={14} strokeWidth={1.5} />
                </div>
                <div className="activity-desc">
                  <div className="activity-desc-main">Order #3721 cancelled</div>
                  <div className="activity-desc-sub">Customer changed delivery details</div>
                </div>
                <span className="activity-time">1 hr ago</span>
              </li>
              <li className="activity-item">
                <div className="activity-icon-circle green">
                  <MapPin size={14} strokeWidth={1.5} />
                </div>
                <div className="activity-desc">
                  <div className="activity-desc-main">Delivery route updated</div>
                  <div className="activity-desc-sub">New ETA pushed to warehouse team</div>
                </div>
                <span className="activity-time">2 hrs ago</span>
              </li>
            </ul>
          </div>

          <div className="low-stock-panel">
            <div className="low-stock-header">
              <div className="low-stock-title">
                <AlertTriangle size={14} strokeWidth={1.5} />
                <h3>Low Stock</h3>
              </div>
              <button type="button" className="reorder-all-btn" onClick={() => showComingSoon('Reorder all')}>Reorder all →</button>
            </div>
            <div className="low-stock-list">
              <div className="low-stock-row">
                <div className="low-stock-row-top">
                  <span className="low-stock-name">Beef ribs</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="low-stock-qty warning">12 kg / 24 min</span>
                    <button type="button" className="reorder-btn" onClick={() => showComingSoon('Reorder beef ribs')}>Reorder</button>
                  </div>
                </div>
                <div className="low-stock-bar">
                  <div className="low-stock-fill moderate" style={{ width: '50%' }} />
                </div>
              </div>
              <div className="low-stock-row">
                <div className="low-stock-row-top">
                  <span className="low-stock-name">Pork loin</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="low-stock-qty critical">8 kg / 22 min</span>
                    <button type="button" className="reorder-btn" onClick={() => showComingSoon('Reorder pork loin')}>Reorder</button>
                  </div>
                </div>
                <div className="low-stock-bar">
                  <div className="low-stock-fill critical" style={{ width: '36%' }} />
                </div>
              </div>
              <div className="low-stock-row">
                <div className="low-stock-row-top">
                  <span className="low-stock-name">Frozen seafood</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="low-stock-qty warning">6 kg / 18 min</span>
                    <button type="button" className="reorder-btn" onClick={() => showComingSoon('Reorder seafood')}>Reorder</button>
                  </div>
                </div>
                <div className="low-stock-bar">
                  <div className="low-stock-fill critical" style={{ width: '33%' }} />
                </div>
              </div>
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
