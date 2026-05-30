import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2, Users, AlertTriangle, TrendingUp, DollarSign, RefreshCw, Zap, UserCheck, ClipboardList, FileCheck, FileText, Receipt, Activity } from 'lucide-react';
import { getCurrentUser, hasHRAccess } from '../api/auth';
import { getReportSummary, getLowStockReport, getTopProducts, getOrdersByStatus } from '../api/erp';

const STATUS_COLOR = { pending: '#D97706', confirmed: '#2563EB', preparing: '#7C3AED', dispatched: '#EA580C', delivered: '#059669', cancelled: '#6B7280' };

export default function Reports() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [ordersByStatus, setOrdersByStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const currentUser = getCurrentUser();
  const userEmail = currentUser?.sub || '';
  const displayName = userEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const initials = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const load = async () => {
    setLoading(true);
    try {
      const [s, l, t, o] = await Promise.all([getReportSummary(), getLowStockReport(), getTopProducts(), getOrdersByStatus()]);
      setSummary(s); setLowStock(l); setTopProducts(t); setOrdersByStatus(o);
    } catch { showToast('Failed to load reports'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const fmt = n => n?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo-area">
          <div className="header-logo-icon">AH</div>
          <div className="header-logo-text"><span className="header-logo-name">Al Hazmi</span><span className="header-logo-sub">Meat ERP</span></div>
        </div>
        <nav className="sidebar-nav">
          <span className="sidebar-group-label">Main</span>
          <button className="sidebar-item" type="button" onClick={() => navigate('/dashboard')}><LayoutDashboard size={15} strokeWidth={1.5} />Overview</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/inventory')}><Package size={15} strokeWidth={1.5} />Inventory</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/purchase-orders')}><ClipboardList size={15} strokeWidth={1.5} />Purchase Orders</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/sale-orders')}><FileCheck size={15} strokeWidth={1.5} />Sale Orders</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/invoices')}><FileText size={15} strokeWidth={1.5} />Invoices (AR)</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/accounts-payable')}><Receipt size={15} strokeWidth={1.5} />Accounts Payable</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/customers')}><Users size={15} strokeWidth={1.5} />Customers</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/orders')}><ShoppingCart size={15} strokeWidth={1.5} />Orders</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/suppliers')}><Truck size={15} strokeWidth={1.5} />Suppliers</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/deliveries')}><MapPin size={15} strokeWidth={1.5} />Deliveries</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/sales')}><TrendingUp size={15} strokeWidth={1.5} />Sales Distribution</button>
          <span className="sidebar-group-label">Analytics</span>
          <button className="sidebar-item" type="button" onClick={() => navigate('/vat-return')}><FileCheck size={15} strokeWidth={1.5} />VAT Return</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/pnl')}><Activity size={15} strokeWidth={1.5} />Profit &amp; Loss</button>
          <button className="sidebar-item active" type="button"><BarChart2 size={15} strokeWidth={1.5} />Reports</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/forecast')}><Zap size={15} strokeWidth={1.5} />AI Forecast</button>
          {hasHRAccess() && <span className="sidebar-group-label">People</span>}
          {hasHRAccess() && <button className="sidebar-item" type="button" onClick={() => navigate('/hr')}><UserCheck size={15} strokeWidth={1.5} />HR Attendance</button>}
          <span className="sidebar-group-label">Admin</span>
          <button className="sidebar-item" type="button" onClick={() => navigate('/admin/users')}><Users size={15} strokeWidth={1.5} />User Management</button>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-footer-avatar">{initials[0]}</div>
          <div className="sidebar-footer-info"><div className="sidebar-footer-name">{displayName}</div><div className="sidebar-footer-serial">Al Hazmi ERP</div></div>
        </div>
      </aside>

      <main className="dashboard-content page-enter" style={{ paddingTop: 0 }}>
        <div className="um2-page-header">
          <div><h1 className="um2-page-title">Reports</h1><p className="um2-page-sub">Business performance and operational overview</p></div>
          <button className="um2-add-btn" type="button" onClick={load} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading reports…</div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="rpt-summary-grid">
              <div className="rpt-card">
                <div className="rpt-card-icon" style={{ background: 'rgba(5,150,105,0.12)', color: '#34d399' }}><DollarSign size={16} /></div>
                <div className="rpt-card-body">
                  <div className="rpt-card-label">Revenue Today</div>
                  <div className="rpt-card-value">AED {fmt(summary?.revenue?.today)}</div>
                </div>
              </div>
              <div className="rpt-card">
                <div className="rpt-card-icon" style={{ background: 'rgba(37,99,235,0.12)', color: '#60a5fa' }}><DollarSign size={16} /></div>
                <div className="rpt-card-body">
                  <div className="rpt-card-label">Revenue This Month</div>
                  <div className="rpt-card-value">AED {fmt(summary?.revenue?.month)}</div>
                </div>
              </div>
              <div className="rpt-card">
                <div className="rpt-card-icon" style={{ background: 'rgba(229,62,62,0.12)', color: '#f87171' }}><ShoppingCart size={16} /></div>
                <div className="rpt-card-body">
                  <div className="rpt-card-label">Total Orders</div>
                  <div className="rpt-card-value">{summary?.orders?.total || 0}</div>
                </div>
              </div>
              <div className="rpt-card">
                <div className="rpt-card-icon" style={{ background: 'rgba(217,119,6,0.12)', color: '#fbbf24' }}><Package size={16} /></div>
                <div className="rpt-card-body">
                  <div className="rpt-card-label">Pending Orders</div>
                  <div className="rpt-card-value">{summary?.orders?.pending || 0}</div>
                </div>
              </div>
              <div className="rpt-card">
                <div className="rpt-card-icon" style={{ background: 'rgba(79,70,229,0.12)', color: '#818cf8' }}><Package size={16} /></div>
                <div className="rpt-card-body">
                  <div className="rpt-card-label">Inventory Value</div>
                  <div className="rpt-card-value">AED {fmt(summary?.inventory?.value)}</div>
                </div>
              </div>
              <div className="rpt-card">
                <div className="rpt-card-icon" style={{ background: 'rgba(229,62,62,0.12)', color: '#f87171' }}><AlertTriangle size={16} /></div>
                <div className="rpt-card-body">
                  <div className="rpt-card-label">Low Stock Items</div>
                  <div className="rpt-card-value">{summary?.inventory?.low_stock || 0}</div>
                </div>
              </div>
            </div>

            <div className="rpt-two-col">
              {/* Orders by Status */}
              <div className="rpt-panel">
                <h3 className="rpt-panel-title">Orders by Status</h3>
                {ordersByStatus.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>No orders yet</p>
                ) : ordersByStatus.map(row => {
                  const total = ordersByStatus.reduce((s, r) => s + r.count, 0);
                  const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
                  return (
                    <div key={row.status} className="rpt-bar-row">
                      <div className="rpt-bar-label">
                        <span style={{ textTransform: 'capitalize' }}>{row.status}</span>
                        <span>{row.count}</span>
                      </div>
                      <div className="rpt-bar-track">
                        <div className="rpt-bar-fill" style={{ width: `${pct}%`, background: STATUS_COLOR[row.status] || '#6B7280' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Low Stock */}
              <div className="rpt-panel">
                <h3 className="rpt-panel-title"><AlertTriangle size={13} style={{ color: '#F59E0B', marginRight: 6 }} />Low Stock Alert</h3>
                {lowStock.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>All stock levels are healthy</p>
                ) : (
                  <table className="rpt-table">
                    <thead><tr><th>Product</th><th>Stock</th><th>Min</th><th>Supplier</th></tr></thead>
                    <tbody>
                      {lowStock.map(p => (
                        <tr key={p.id}>
                          <td>{p.name}</td>
                          <td style={{ color: '#F59E0B', fontWeight: 600 }}>{p.stock_qty} {p.unit}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{p.min_threshold} {p.unit}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{p.supplier_name || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Top Products */}
            <div className="rpt-panel" style={{ marginTop: 16 }}>
              <h3 className="rpt-panel-title"><TrendingUp size={13} style={{ marginRight: 6 }} />Top Products — Last 30 Days</h3>
              {topProducts.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>No sales data yet. Create orders to see top products.</p>
              ) : (
                <table className="rpt-table">
                  <thead><tr><th>Product</th><th>Orders</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
                  <tbody>
                    {topProducts.map((p, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{p.order_count}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{p.total_qty.toFixed(1)} kg</td>
                        <td style={{ color: '#34d399', fontWeight: 600 }}>AED {fmt(p.total_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </main>

      {toast && <div className="toast-notification info-toast"><span>{toast}</span></div>}
    </div>
  );
}
