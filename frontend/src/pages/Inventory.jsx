import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2, Users, Search, Plus, X, Pencil, Trash2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { getCurrentUser } from '../api/auth';
import { getProducts, createProduct, updateProduct, adjustStock, deleteProduct, getSuppliers } from '../api/erp';

const CATEGORIES = ['Beef', 'Lamb', 'Chicken', 'Seafood', 'Veal', 'Goat', 'Other'];
const EMPTY_FORM = { name: '', category: 'Beef', unit: 'kg', price_per_unit: '', stock_qty: '', min_threshold: '10', supplier_id: '', is_active: true };

export default function Inventory() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [stockModal, setStockModal] = useState(null);
  const [stockQty, setStockQty] = useState('');
  const [stockReason, setStockReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState('');

  const currentUser = getCurrentUser();
  const userEmail = currentUser?.sub || '';
  const displayName = userEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const initials = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const load = async () => {
    try {
      const [p, s] = await Promise.all([getProducts(), getSuppliers()]);
      setProducts(p); setSuppliers(s);
    } catch { showToast('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setError(''); setEditing(null); setModal('create'); };
  const openEdit = (p) => {
    setForm({ name: p.name, category: p.category || 'Beef', unit: p.unit, price_per_unit: String(p.price_per_unit), stock_qty: String(p.stock_qty), min_threshold: String(p.min_threshold), supplier_id: String(p.supplier_id || ''), is_active: p.is_active });
    setEditing(p); setError(''); setModal('edit');
  };
  const closeModal = () => { setModal(null); setEditing(null); setError(''); };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.price_per_unit || isNaN(form.price_per_unit)) { setError('Valid price required'); return; }
    setSaving(true); setError('');
    const payload = { ...form, price_per_unit: parseFloat(form.price_per_unit), stock_qty: parseFloat(form.stock_qty || 0), min_threshold: parseFloat(form.min_threshold || 10), supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null };
    try {
      if (modal === 'create') {
        const created = await createProduct(payload);
        setProducts(prev => [created, ...prev]);
        showToast('Product added');
      } else {
        const updated = await updateProduct(editing.id, payload);
        setProducts(prev => prev.map(p => p.id === editing.id ? updated : p));
        showToast('Product updated');
      }
      closeModal();
    } catch (e) { setError(e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleStockAdj = async (dir) => {
    const qty = parseFloat(stockQty);
    if (!qty || isNaN(qty) || qty <= 0) return;
    try {
      const updated = await adjustStock(stockModal.id, { qty_change: dir === 'in' ? qty : -qty, reason: stockReason });
      setProducts(prev => prev.map(p => p.id === stockModal.id ? updated : p));
      showToast(`Stock ${dir === 'in' ? 'added' : 'removed'}`);
      setStockModal(null); setStockQty(''); setStockReason('');
    } catch { showToast('Stock adjustment failed'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget.id);
      setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
      showToast('Product deleted');
    } catch { showToast('Failed to delete'); }
    setDeleteTarget(null);
  };

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'All' || p.category === catFilter;
    return matchSearch && matchCat;
  });

  const isLow = (p) => p.stock_qty <= p.min_threshold;

  return (
    <div className="dashboard-shell">
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
          <button className="sidebar-item" type="button" onClick={() => navigate('/dashboard')}><LayoutDashboard size={15} strokeWidth={1.5} />Overview</button>
          <button className="sidebar-item active" type="button"><Package size={15} strokeWidth={1.5} />Inventory</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/orders')}><ShoppingCart size={15} strokeWidth={1.5} />Orders</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/suppliers')}><Truck size={15} strokeWidth={1.5} />Suppliers</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/deliveries')}><MapPin size={15} strokeWidth={1.5} />Deliveries</button>
          <span className="sidebar-group-label">Analytics</span>
          <button className="sidebar-item" type="button" onClick={() => navigate('/reports')}><BarChart2 size={15} strokeWidth={1.5} />Reports</button>
          <span className="sidebar-group-label">Admin</span>
          <button className="sidebar-item" type="button" onClick={() => navigate('/admin/users')}><Users size={15} strokeWidth={1.5} />User Management</button>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-footer-avatar">{initials[0]}</div>
          <div className="sidebar-footer-info">
            <div className="sidebar-footer-name">{displayName}</div>
            <div className="sidebar-footer-serial">Al Hazmi ERP</div>
          </div>
        </div>
      </aside>

      <main className="dashboard-content page-enter" style={{ paddingTop: 0 }}>
        <div className="um2-page-header">
          <div>
            <h1 className="um2-page-title">Inventory</h1>
            <p className="um2-page-sub">Track stock levels and manage halal meat products</p>
          </div>
          <button className="um2-add-btn" type="button" onClick={() => navigate('/products/add')}>
            <Plus size={14} strokeWidth={2} /> Add Product
          </button>
        </div>

        <div className="um2-toolbar">
          <div className="um2-search-wrap">
            <Search size={13} className="um2-search-icon" />
            <input className="um2-search" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="um2-filter-tabs">
            {['All', ...CATEGORIES].map(c => (
              <button key={c} type="button" className={`um2-filter-tab${catFilter === c ? ' active' : ''}`} onClick={() => setCatFilter(c)}>{c}</button>
            ))}
          </div>
          <span className="um2-count">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="um2-table-wrap">
          <table className="um2-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Price / Unit</th>
                <th>Supplier</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>No products found</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isLow(p) && <AlertTriangle size={13} style={{ color: 'var(--color-warning, #D97706)', flexShrink: 0 }} />}
                      <span className="um2-name">{p.name}</span>
                    </div>
                  </td>
                  <td><span className="um2-meta">{p.category || '—'}</span></td>
                  <td>
                    <span style={{ fontWeight: 600, color: isLow(p) ? '#F59E0B' : 'var(--text-primary)', fontSize: 13 }}>
                      {p.stock_qty} {p.unit}
                    </span>
                    {isLow(p) && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>low</span>}
                  </td>
                  <td><span className="um2-meta">AED {p.price_per_unit.toFixed(2)}</span></td>
                  <td><span className="um2-meta">{p.supplier_name || '—'}</span></td>
                  <td>
                    <span className={`um2-badge ${p.is_active ? 'um2-badge-active' : 'um2-badge-inactive'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="um2-actions">
                      <button className="um2-action-btn" type="button" title="Stock In" onClick={() => { setStockModal(p); setStockQty(''); setStockReason(''); }}><TrendingUp size={13} /></button>
                      <button className="um2-action-btn" type="button" title="Edit" onClick={() => openEdit(p)}><Pencil size={13} /></button>
                      <button className="um2-action-btn danger" type="button" title="Delete" onClick={() => setDeleteTarget(p)}><Trash2 size={13} /></button>
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
            <div className="modal-header">
              <h2>{modal === 'create' ? 'Add Product' : 'Edit Product'}</h2>
              <button className="modal-close" type="button" onClick={closeModal}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {error && <div className="um2-error-banner">{error}</div>}
              <div className="um2-form-grid">
                <label className="um2-label" style={{ gridColumn: '1/-1' }}>Product Name *
                  <input className="um2-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Beef Ribs Premium" />
                </label>
                <label className="um2-label">Category
                  <select className="um2-input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="um2-label">Unit
                  <select className="um2-input" value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}>
                    {['kg', 'g', 'piece', 'box', 'pack'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </label>
                <label className="um2-label">Price per Unit (AED) *
                  <input className="um2-input" type="number" min="0" step="0.01" value={form.price_per_unit} onChange={e => setForm(p => ({ ...p, price_per_unit: e.target.value }))} placeholder="0.00" />
                </label>
                <label className="um2-label">Current Stock
                  <input className="um2-input" type="number" min="0" step="0.1" value={form.stock_qty} onChange={e => setForm(p => ({ ...p, stock_qty: e.target.value }))} placeholder="0" />
                </label>
                <label className="um2-label">Min. Threshold
                  <input className="um2-input" type="number" min="0" step="0.1" value={form.min_threshold} onChange={e => setForm(p => ({ ...p, min_threshold: e.target.value }))} placeholder="10" />
                </label>
                <label className="um2-label">Supplier
                  <select className="um2-input" value={form.supplier_id} onChange={e => setForm(p => ({ ...p, supplier_id: e.target.value }))}>
                    <option value="">— None —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </label>
                <label className="um2-label">
                  <div className="um2-checkbox-row">
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
                    Active
                  </div>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="um2-btn-ghost" type="button" onClick={closeModal}>Cancel</button>
              <button className="um2-btn-primary" type="button" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : modal === 'create' ? 'Add Product' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {stockModal && (
        <div className="modal-overlay" onClick={() => setStockModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
            <div className="modal-header">
              <h2>Adjust Stock — {stockModal.name}</h2>
              <button className="modal-close" type="button" onClick={() => setStockModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Current: <strong style={{ color: 'var(--text-primary)' }}>{stockModal.stock_qty} {stockModal.unit}</strong></p>
              <label className="um2-label">Quantity ({stockModal.unit})
                <input className="um2-input" type="number" min="0" step="0.1" value={stockQty} onChange={e => setStockQty(e.target.value)} placeholder="0" autoFocus />
              </label>
              <label className="um2-label" style={{ marginTop: 12 }}>Reason (optional)
                <input className="um2-input" value={stockReason} onChange={e => setStockReason(e.target.value)} placeholder="e.g. Delivery received" />
              </label>
            </div>
            <div className="modal-footer">
              <button className="um2-btn-ghost" type="button" onClick={() => setStockModal(null)}>Cancel</button>
              <button className="um2-btn-danger" type="button" onClick={() => handleStockAdj('out')} disabled={!stockQty}><TrendingDown size={14} /> Remove</button>
              <button className="um2-btn-primary" type="button" onClick={() => handleStockAdj('in')} disabled={!stockQty}><TrendingUp size={14} /> Add Stock</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 420 }}>
            <div className="modal-header">
              <h2>Delete Product</h2>
              <button className="modal-close" type="button" onClick={() => setDeleteTarget(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)' }}>Delete <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong>? This cannot be undone.</p>
            </div>
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
