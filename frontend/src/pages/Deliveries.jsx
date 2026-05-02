import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2, Users, Search, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { getCurrentUser } from '../api/auth';
import { getDeliveries, createDelivery, updateDelivery, deleteDelivery, getOrders } from '../api/erp';

const STATUSES = ['scheduled', 'in_transit', 'delivered', 'failed'];
const STATUS_COLOR = { scheduled: 'info', in_transit: 'warning', delivered: 'active', failed: 'inactive' };
const EMPTY_FORM = { order_id: '', driver_name: '', vehicle: '', scheduled_time: '', delivery_address: '', notes: '' };

export default function Deliveries() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState('');

  const currentUser = getCurrentUser();
  const userEmail = currentUser?.sub || '';
  const displayName = userEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const initials = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const load = async () => {
    try { const [d, o] = await Promise.all([getDeliveries(), getOrders()]); setDeliveries(d); setOrders(o); }
    catch { showToast('Failed to load'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setError(''); setEditing(null); setModal('create'); };
  const openEdit = d => {
    setForm({ order_id: String(d.order_id || ''), driver_name: d.driver_name || '', vehicle: d.vehicle || '', scheduled_time: d.scheduled_time ? d.scheduled_time.slice(0, 16) : '', delivery_address: d.delivery_address || '', notes: d.notes || '', status: d.status });
    setEditing(d); setError(''); setModal('edit');
  };
  const closeModal = () => { setModal(null); setEditing(null); setError(''); };

  const handleSave = async () => {
    setSaving(true); setError('');
    const payload = { ...form, order_id: form.order_id ? parseInt(form.order_id) : null };
    try {
      if (modal === 'create') {
        const created = await createDelivery(payload);
        setDeliveries(prev => [created, ...prev]);
        showToast('Delivery scheduled');
      } else {
        const updated = await updateDelivery(editing.id, payload);
        setDeliveries(prev => prev.map(d => d.id === editing.id ? updated : d));
        showToast('Delivery updated');
      }
      closeModal();
    } catch (e) { setError(e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await deleteDelivery(deleteTarget.id); setDeliveries(prev => prev.filter(d => d.id !== deleteTarget.id)); showToast('Delivery deleted'); }
    catch { showToast('Failed to delete'); }
    setDeleteTarget(null);
  };

  const filtered = deliveries.filter(d => {
    const matchSearch = (d.driver_name || '').toLowerCase().includes(search.toLowerCase()) || (d.order_number || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const badgeClass = s => `um2-badge um2-badge-${STATUS_COLOR[s] || 'inactive'}`;
  const label = s => s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

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
          <button className="sidebar-item" type="button" onClick={() => navigate('/orders')}><ShoppingCart size={15} strokeWidth={1.5} />Orders</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/suppliers')}><Truck size={15} strokeWidth={1.5} />Suppliers</button>
          <button className="sidebar-item active" type="button"><MapPin size={15} strokeWidth={1.5} />Deliveries</button>
          <span className="sidebar-group-label">Analytics</span>
          <button className="sidebar-item" type="button" onClick={() => navigate('/reports')}><BarChart2 size={15} strokeWidth={1.5} />Reports</button>
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
          <div><h1 className="um2-page-title">Deliveries</h1><p className="um2-page-sub">Schedule and track all deliveries</p></div>
          <button className="um2-add-btn" type="button" onClick={openCreate}><Plus size={14} strokeWidth={2} /> Record Delivery</button>
        </div>

        <div className="um2-toolbar">
          <div className="um2-search-wrap"><Search size={13} className="um2-search-icon" /><input className="um2-search" placeholder="Search driver or order…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="um2-filter-tabs">
            <button type="button" className={`um2-filter-tab${statusFilter === 'all' ? ' active' : ''}`} onClick={() => setStatusFilter('all')}>All</button>
            {STATUSES.map(s => <button key={s} type="button" className={`um2-filter-tab${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)}>{label(s)}</button>)}
          </div>
          <span className="um2-count">{filtered.length} deliver{filtered.length !== 1 ? 'ies' : 'y'}</span>
        </div>

        <div className="um2-table-wrap">
          <table className="um2-table">
            <thead><tr><th>Order</th><th>Driver</th><th>Vehicle</th><th>Scheduled</th><th>Address</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Loading…</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>No deliveries found</td></tr>
                : filtered.map(d => (
                  <tr key={d.id}>
                    <td><span className="um2-name">{d.order_number || '—'}</span></td>
                    <td><span className="um2-meta">{d.driver_name || '—'}</span></td>
                    <td><span className="um2-meta">{d.vehicle || '—'}</span></td>
                    <td><span className="um2-meta">{d.scheduled_time ? d.scheduled_time.replace('T', ' ') : '—'}</span></td>
                    <td><span className="um2-meta" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{d.delivery_address || '—'}</span></td>
                    <td><span className={badgeClass(d.status)}>{label(d.status)}</span></td>
                    <td>
                      <div className="um2-actions">
                        <button className="um2-action-btn" type="button" title="Edit" onClick={() => openEdit(d)}><Pencil size={13} /></button>
                        <button className="um2-action-btn danger" type="button" title="Delete" onClick={() => setDeleteTarget(d)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </main>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 540 }}>
            <div className="modal-header"><h2>{modal === 'create' ? 'Schedule Delivery' : 'Edit Delivery'}</h2><button className="modal-close" type="button" onClick={closeModal}><X size={16} /></button></div>
            <div className="modal-body">
              {error && <div className="um2-error-banner">{error}</div>}
              <div className="um2-form-grid">
                <label className="um2-label" style={{ gridColumn: '1/-1' }}>Linked Order
                  <select className="um2-input" value={form.order_id} onChange={e => setForm(p => ({ ...p, order_id: e.target.value }))}>
                    <option value="">— No order —</option>
                    {orders.map(o => <option key={o.id} value={o.id}>{o.order_number} — {o.customer_name}</option>)}
                  </select>
                </label>
                <label className="um2-label">Driver Name<input className="um2-input" value={form.driver_name} onChange={e => setForm(p => ({ ...p, driver_name: e.target.value }))} placeholder="Driver name" /></label>
                <label className="um2-label">Vehicle<input className="um2-input" value={form.vehicle} onChange={e => setForm(p => ({ ...p, vehicle: e.target.value }))} placeholder="e.g. Van – SAU 1234" /></label>
                <label className="um2-label">Scheduled Time<input className="um2-input" type="datetime-local" value={form.scheduled_time} onChange={e => setForm(p => ({ ...p, scheduled_time: e.target.value }))} /></label>
                {modal === 'edit' && (
                  <label className="um2-label">Status
                    <select className="um2-input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                      {STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}
                    </select>
                  </label>
                )}
                <label className="um2-label" style={{ gridColumn: '1/-1' }}>Delivery Address<input className="um2-input" value={form.delivery_address} onChange={e => setForm(p => ({ ...p, delivery_address: e.target.value }))} placeholder="Full delivery address" /></label>
                <label className="um2-label" style={{ gridColumn: '1/-1' }}>Notes<input className="um2-input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" /></label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="um2-btn-ghost" type="button" onClick={closeModal}>Cancel</button>
              <button className="um2-btn-primary" type="button" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : modal === 'create' ? 'Schedule' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 420 }}>
            <div className="modal-header"><h2>Delete Delivery</h2><button className="modal-close" type="button" onClick={() => setDeleteTarget(null)}><X size={16} /></button></div>
            <div className="modal-body"><p style={{ color: 'var(--text-secondary)' }}>Delete this delivery record? This cannot be undone.</p></div>
            <div className="modal-footer">
              <button className="um2-btn-ghost" type="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="um2-btn-danger" type="button" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast-notification info-toast"><span>{toast}</span></div>}
    </div>
  );
}
