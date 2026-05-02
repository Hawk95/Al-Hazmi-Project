import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2, Users, Search, Plus, X, Pencil, Trash2 } from 'lucide-react';
import { getCurrentUser } from '../api/auth';
import { getOrders, createOrder, updateOrder, deleteOrder, getProducts } from '../api/erp';

const STATUSES = ['pending', 'confirmed', 'preparing', 'dispatched', 'delivered', 'cancelled'];
const STATUS_COLOR = { pending: 'warning', confirmed: 'info', preparing: 'info', dispatched: 'warning', delivered: 'active', cancelled: 'inactive' };
const EMPTY_FORM = { customer_name: '', customer_phone: '', customer_address: '', notes: '' };
const EMPTY_ITEM = { product_id: '', product_name: '', quantity: '', unit_price: '' };

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
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
    try {
      const [o, p] = await Promise.all([getOrders(), getProducts()]);
      setOrders(o); setProducts(p);
    } catch { showToast('Failed to load'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setItems([{ ...EMPTY_ITEM }]); setError(''); setEditing(null); setModal('create'); };
  const openEdit = o => { setForm({ customer_name: o.customer_name, customer_phone: o.customer_phone || '', customer_address: o.customer_address || '', notes: o.notes || '', status: o.status }); setEditing(o); setError(''); setModal('edit'); };
  const closeModal = () => { setModal(null); setEditing(null); setError(''); };

  const setItem = (i, field, val) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  const pickProduct = (i, productId) => {
    const p = products.find(p => String(p.id) === productId);
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, product_id: productId, product_name: p ? p.name : '', unit_price: p ? String(p.price_per_unit) : '' } : it));
  };

  const handleSave = async () => {
    if (!form.customer_name.trim()) { setError('Customer name required'); return; }
    if (modal === 'create') {
      const validItems = items.filter(it => it.product_name.trim() && parseFloat(it.quantity) > 0 && parseFloat(it.unit_price) >= 0);
      if (!validItems.length) { setError('Add at least one item'); return; }
    }
    setSaving(true); setError('');
    try {
      if (modal === 'create') {
        const payload = { ...form, items: items.filter(it => it.product_name.trim()).map(it => ({ product_id: it.product_id ? parseInt(it.product_id) : null, product_name: it.product_name, quantity: parseFloat(it.quantity), unit_price: parseFloat(it.unit_price) })) };
        const created = await createOrder(payload);
        setOrders(prev => [created, ...prev]);
        showToast('Order created');
      } else {
        const updated = await updateOrder(editing.id, form);
        setOrders(prev => prev.map(o => o.id === editing.id ? updated : o));
        showToast('Order updated');
      }
      closeModal();
    } catch (e) { setError(e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await deleteOrder(deleteTarget.id); setOrders(prev => prev.filter(o => o.id !== deleteTarget.id)); showToast('Order deleted'); }
    catch { showToast('Failed to delete'); }
    setDeleteTarget(null);
  };

  const filtered = orders.filter(o => {
    const matchSearch = o.customer_name.toLowerCase().includes(search.toLowerCase()) || o.order_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const badgeClass = s => `um2-badge um2-badge-${STATUS_COLOR[s] || 'inactive'}`;

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
          <button className="sidebar-item active" type="button"><ShoppingCart size={15} strokeWidth={1.5} />Orders</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/suppliers')}><Truck size={15} strokeWidth={1.5} />Suppliers</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/deliveries')}><MapPin size={15} strokeWidth={1.5} />Deliveries</button>
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
          <div><h1 className="um2-page-title">Orders</h1><p className="um2-page-sub">Create and manage customer orders</p></div>
          <button className="um2-add-btn" type="button" onClick={() => window.open('/orders/create', '_blank')}><Plus size={14} strokeWidth={2} /> Create Order</button>
        </div>

        <div className="um2-toolbar">
          <div className="um2-search-wrap"><Search size={13} className="um2-search-icon" /><input className="um2-search" placeholder="Search by order # or customer…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="um2-filter-tabs">
            <button type="button" className={`um2-filter-tab${statusFilter === 'all' ? ' active' : ''}`} onClick={() => setStatusFilter('all')}>All</button>
            {STATUSES.map(s => <button key={s} type="button" className={`um2-filter-tab${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>)}
          </div>
          <span className="um2-count">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="um2-table-wrap">
          <table className="um2-table">
            <thead><tr><th>Order #</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Loading…</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>No orders found</td></tr>
                : filtered.map(o => (
                  <tr key={o.id}>
                    <td><span className="um2-name">{o.order_number}</span></td>
                    <td>
                      <div className="um2-name">{o.customer_name}</div>
                      {o.customer_phone && <div className="um2-meta">{o.customer_phone}</div>}
                    </td>
                    <td><span className="um2-meta">{o.items?.length || 0} item{(o.items?.length || 0) !== 1 ? 's' : ''}</span></td>
                    <td><span style={{ fontWeight: 600, fontSize: 13 }}>AED {o.total_amount.toFixed(2)}</span></td>
                    <td><span className={badgeClass(o.status)}>{o.status}</span></td>
                    <td><span className="um2-meta">{o.created_at?.slice(0, 10) || '—'}</span></td>
                    <td>
                      <div className="um2-actions">
                        <button className="um2-action-btn" type="button" title="Edit" onClick={() => openEdit(o)}><Pencil size={13} /></button>
                        <button className="um2-action-btn danger" type="button" title="Delete" onClick={() => setDeleteTarget(o)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </main>

      {modal === 'create' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header"><h2>Create Order</h2><button className="modal-close" type="button" onClick={closeModal}><X size={16} /></button></div>
            <div className="modal-body">
              {error && <div className="um2-error-banner">{error}</div>}
              <div className="um2-form-grid">
                <label className="um2-label" style={{ gridColumn: '1/-1' }}>Customer Name *<input className="um2-input" value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} placeholder="Full name" /></label>
                <label className="um2-label">Phone<input className="um2-input" value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} placeholder="+966 5X XXX XXXX" /></label>
                <label className="um2-label">Address<input className="um2-input" value={form.customer_address} onChange={e => setForm(p => ({ ...p, customer_address: e.target.value }))} placeholder="Delivery address" /></label>
                <label className="um2-label" style={{ gridColumn: '1/-1' }}>Notes<input className="um2-input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" /></label>
              </div>
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Order Items</span>
                  <button type="button" className="um2-btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setItems(prev => [...prev, { ...EMPTY_ITEM }])}>+ Add Item</button>
                </div>
                {items.map((it, i) => (
                  <div key={i} className="um2-order-item-row">
                    <select className="um2-input" style={{ flex: 2 }} value={it.product_id} onChange={e => pickProduct(i, e.target.value)}>
                      <option value="">Custom / type below</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input className="um2-input" style={{ flex: 2 }} value={it.product_name} onChange={e => setItem(i, 'product_name', e.target.value)} placeholder="Product name" />
                    <input className="um2-input" style={{ flex: 1 }} type="number" min="0" step="0.1" value={it.quantity} onChange={e => setItem(i, 'quantity', e.target.value)} placeholder="Qty" />
                    <input className="um2-input" style={{ flex: 1 }} type="number" min="0" step="0.01" value={it.unit_price} onChange={e => setItem(i, 'unit_price', e.target.value)} placeholder="Price" />
                    {items.length > 1 && <button type="button" className="um2-action-btn danger" onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}><X size={12} /></button>}
                  </div>
                ))}
                <div style={{ textAlign: 'right', marginTop: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Total: AED {items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0), 0).toFixed(2)}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="um2-btn-ghost" type="button" onClick={closeModal}>Cancel</button>
              <button className="um2-btn-primary" type="button" onClick={handleSave} disabled={saving}>{saving ? 'Creating…' : 'Create Order'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'edit' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 520 }}>
            <div className="modal-header"><h2>Edit Order — {editing?.order_number}</h2><button className="modal-close" type="button" onClick={closeModal}><X size={16} /></button></div>
            <div className="modal-body">
              {error && <div className="um2-error-banner">{error}</div>}
              <div className="um2-form-grid">
                <label className="um2-label" style={{ gridColumn: '1/-1' }}>Customer Name *<input className="um2-input" value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} /></label>
                <label className="um2-label">Phone<input className="um2-input" value={form.customer_phone} onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))} /></label>
                <label className="um2-label">Address<input className="um2-input" value={form.customer_address} onChange={e => setForm(p => ({ ...p, customer_address: e.target.value }))} /></label>
                <label className="um2-label">Status
                  <select className="um2-input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </label>
                <label className="um2-label">Notes<input className="um2-input" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></label>
              </div>
              {editing?.items?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Items</p>
                  {editing.items.map(it => (
                    <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border-faint)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{it.product_name} × {it.quantity}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>AED {it.total_price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="um2-btn-ghost" type="button" onClick={closeModal}>Cancel</button>
              <button className="um2-btn-primary" type="button" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 420 }}>
            <div className="modal-header"><h2>Delete Order</h2><button className="modal-close" type="button" onClick={() => setDeleteTarget(null)}><X size={16} /></button></div>
            <div className="modal-body"><p style={{ color: 'var(--text-secondary)' }}>Delete <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.order_number}</strong>? This cannot be undone.</p></div>
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
