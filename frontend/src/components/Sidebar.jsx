import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ClipboardList, FileCheck, FileText,
  Receipt, Users, ShoppingCart, Truck, MapPin, TrendingUp, Activity,
  BarChart2, Zap, UserCheck, Settings, X, Menu,
} from 'lucide-react';
import { getCurrentUser, hasHRAccess } from '../api/auth';

export default function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = useState(false);

  // Auto-close when navigating (mobile)
  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else      document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const currentUser = getCurrentUser();
  const userEmail   = currentUser?.sub || '';
  const displayName = userEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const initial     = displayName[0]?.toUpperCase() || '?';
  const avatar      = localStorage.getItem('user_avatar') || null;

  const go = (path) => { navigate(path); setOpen(false); };
  const cls = (path) =>
    location.pathname === path ? 'sidebar-item active' : 'sidebar-item';

  return (
    <>
      {/* ── Hamburger (mobile only) ── */}
      <button className="sidebar-hamburger" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* ── Backdrop (mobile only) ── */}
      {open && (
        <div className="sidebar-backdrop" onClick={() => setOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`dashboard-sidebar${open ? ' sidebar-open' : ''}`}>

        {/* Logo */}
        <div className="sidebar-logo-area">
          <div className="header-logo-icon">AH</div>
          <div className="header-logo-text">
            <span className="header-logo-name">Al Hazmi</span>
            <span className="header-logo-sub">Meat ERP</span>
          </div>
          {/* Close button inside sidebar on mobile */}
          <button className="sidebar-close-btn" onClick={() => setOpen(false)} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <span className="sidebar-group-label">Main</span>
          <button className={cls('/dashboard')}       type="button" onClick={() => go('/dashboard')}><LayoutDashboard size={15} strokeWidth={1.5} />Overview</button>
          <button className={cls('/inventory')}       type="button" onClick={() => go('/inventory')}><Package size={15} strokeWidth={1.5} />Inventory</button>
          <button className={cls('/purchase-orders')} type="button" onClick={() => go('/purchase-orders')}><ClipboardList size={15} strokeWidth={1.5} />Purchase Orders</button>
          <button className={cls('/sale-orders')}     type="button" onClick={() => go('/sale-orders')}><FileCheck size={15} strokeWidth={1.5} />Sale Orders</button>
          <button className={cls('/invoices')}        type="button" onClick={() => go('/invoices')}><FileText size={15} strokeWidth={1.5} />Invoices (AR)</button>
          <button className={cls('/accounts-payable')} type="button" onClick={() => go('/accounts-payable')}><Receipt size={15} strokeWidth={1.5} />Accounts Payable</button>
          <button className={cls('/customers')}       type="button" onClick={() => go('/customers')}><Users size={15} strokeWidth={1.5} />Customers</button>
          <button className={cls('/orders')}          type="button" onClick={() => go('/orders')}><ShoppingCart size={15} strokeWidth={1.5} />Orders</button>
          <button className={cls('/suppliers')}       type="button" onClick={() => go('/suppliers')}><Truck size={15} strokeWidth={1.5} />Suppliers</button>
          <button className={cls('/deliveries')}      type="button" onClick={() => go('/deliveries')}><MapPin size={15} strokeWidth={1.5} />Deliveries</button>
          <button className={cls('/sales')}           type="button" onClick={() => go('/sales')}><TrendingUp size={15} strokeWidth={1.5} />Sales Distribution</button>

          <span className="sidebar-group-label">Analytics</span>
          <button className={cls('/vat-return')} type="button" onClick={() => go('/vat-return')}><FileCheck size={15} strokeWidth={1.5} />VAT Return</button>
          <button className={cls('/pnl')}        type="button" onClick={() => go('/pnl')}><Activity size={15} strokeWidth={1.5} />Profit &amp; Loss</button>
          <button className={cls('/reports')}    type="button" onClick={() => go('/reports')}><BarChart2 size={15} strokeWidth={1.5} />Reports</button>
          <button className={cls('/forecast')}   type="button" onClick={() => go('/forecast')}><Zap size={15} strokeWidth={1.5} />AI Forecast</button>

          {hasHRAccess() && <span className="sidebar-group-label">People</span>}
          {hasHRAccess() && <button className={cls('/hr')} type="button" onClick={() => go('/hr')}><UserCheck size={15} strokeWidth={1.5} />HR Attendance</button>}

          <span className="sidebar-group-label">Fleet</span>
          <button className={cls('/truck-tracking')} type="button" onClick={() => go('/truck-tracking')}><Truck size={15} strokeWidth={1.5} />Truck Tracking</button>

          <span className="sidebar-group-label">Admin</span>
          <button className={cls('/admin/users')}    type="button" onClick={() => go('/admin/users')}><Users size={15} strokeWidth={1.5} />User Management</button>
          <button className={cls('/admin/settings')} type="button" onClick={() => go('/admin/settings')}><Settings size={15} strokeWidth={1.5} />Company Settings</button>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-avatar">
            {avatar ? <img src={avatar} alt="avatar" /> : initial}
          </div>
          <div className="sidebar-footer-info">
            <div className="sidebar-footer-name">{displayName}</div>
            <div className="sidebar-footer-serial">Al Hazmi ERP</div>
          </div>
        </div>
      </aside>
    </>
  );
}
