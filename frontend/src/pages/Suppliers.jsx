import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2, Users, Search, Plus, X, Pencil, Trash2, ChevronDown } from 'lucide-react';
import { getCurrentUser, logout } from '../api/auth';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../api/erp';

const EMPTY = { name: '', contact_person: '', phone: '', email: '', address: '', halal_certified: true, is_active: true };

export default function Suppliers() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
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
    try { setSuppliers(await getSuppliers()); }
    catch { showToast('Failed to load suppliers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setError(''); setEditing(null); setModal('create'); };
  const openEdit = (s) => { setForm({ name: s.name, contact_person: s.contact_person || '', phone: s.phone || '', email: s.email || '', address: s.address || '', halal_certified: s.halal_certified, is_active: s.is_active }); setEditing(s); setError(''); setModal('edit'); };
  const closeModal = () => { setModal(null); setEditing(null); setError(''); };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      if (modal === 'create') {
        const created = await createSupplier(form);
        setSuppliers(prev => [created, ...prev]);
        showToast('Supplier added');
      } else {
        const updated = await updateSupplier(editing.id, form);
        setSuppliers(prev => prev.map(s => s.id === editing.id ? updated : s));
        showToast('Supplier updated');
      }
      closeModal();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSupplier(deleteTarget.id);
      setSuppliers(prev => prev.filter(s => s.id !== deleteTarget.id));
      showToast('Supplier deleted');
    } catch { showToast('Failed to delete'); }
    setDeleteTarget(null);
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.contact_person || '').toLowerCase().includes(search.toLowerCase())
  );

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
          <button className="sidebar-item" type="button" onClick={() => navigate('/inventory')}><Package size={15} strokeWidth={1.5} />Inventory</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/orders')}><ShoppingCart size={15} strokeWidth={1.5} />Orders</button>
          <button className="sidebar-item active" type="button"><Truck size={15} strokeWidth={1.5} />Suppliers</button>
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
            <h1 className="um2-page-title">Suppliers</h1>
            <p className="um2-page-sub">Manage your halal meat suppliers</p>
          </div>
          <button className="um2-add-btn" type="button" onClick={openCreate}>
            <Plus size={14} strokeWidth={2} /> Add Supplier
          </button>
        </div>

        <div className="um2-toolbar">
          <div className="um2-search-wrap">
            <Search size={13} className="um2-search-icon" />
            <input className="um2-search" placeholder="Search suppliers…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="um2-count">{filtered.length} supplier{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="um2-table-wrap">
          <table className="um2-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Halal</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>No suppliers found</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id}>
                  <td><span className="um2-name">{s.name}</span></td>
                  <td><span className="um2-meta">{s.contact_person || '—'}</span></td>
                  <td><span className="um2-meta">{s.phone || '—'}</span></td>
                  <td><span className="um2-meta">{s.email || '—'}</span></td>
                  <td>
                    <span className={`um2-badge ${s.halal_certified ? 'um2-badge-active' : 'um2-badge-inactive'}`}>
                      {s.halal_certified ? 'Certified' : 'No'}
                    </span>
                  </td>
                  <td>
                    <span className={`um2-badge ${s.is_active ? 'um2-badge-active' : 'um2-badge-inactive'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="um2-actions">
                      <button className="um2-action-btn" type="button" title="Edit" onClick={() => openEdit(s)}><Pencil size={13} /></button>
                      <button className="um2-action-btn danger" type="button" title="Delete" onClick={() => setDeleteTarget(s)}><Trash2 size={13} /></button>
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
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 520 }}>
            <div className="modal-header">
              <h2>{modal === 'create' ? 'Add Supplier' : 'Edit Supplier'}</h2>
              <button className="modal-close" type="button" onClick={closeModal}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {error && <div className="um2-error-banner">{error}</div>}
              <div className="um2-form-grid">
                <label className="um2-label">Company Name *
                  <input className="um2-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Al Baraka Farms" />
                </label>
                <label className="um2-label">Contact Person
                  <input className="um2-input" value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} placeholder="e.g. Ahmed Ali" />
                </label>
                <label className="um2-label">Phone
                  <input className="um2-input" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+966 5X XXX XXXX" />
                </label>
                <label className="um2-label">Email
                  <input className="um2-input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="supplier@example.com" />
                </label>
                <label className="um2-label" style={{ gridColumn: '1/-1' }}>Address
                  <textarea className="um2-input" rows={2} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Full address" style={{ resize: 'vertical' }} />
                </label>
                <label className="um2-label">
                  <div className="um2-checkbox-row">
                    <input type="checkbox" checked={form.halal_certified} onChange={e => setForm(p => ({ ...p, halal_certified: e.target.checked }))} />
                    Halal Certified
                  </div>
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
              <button className="um2-btn-primary" type="button" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : modal === 'create' ? 'Add Supplier' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 420 }}>
            <div className="modal-header">
              <h2>Delete Supplier</h2>
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
