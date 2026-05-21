import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2, Users,
  Search, Plus, X, Pencil, Trash2, RefreshCw, Phone, Mail, MapPinned,
  CheckCircle2, XCircle, ShieldCheck, LayoutGrid, List, Building2, TrendingUp, Zap, UserCheck,
  ClipboardList, FileCheck, FileText, Receipt
} from 'lucide-react';
import { getCurrentUser, hasHRAccess } from '../api/auth';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../api/erp';

const EMPTY = { name: '', contact_person: '', phone: '', email: '', address: '', is_active: true };

const AVATAR_COLORS = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#be185d'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

const S = {
  input: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#f2f2f7', outline: 'none', boxSizing: 'border-box' },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 500, color: '#9ca3af' },
  th: { padding: '11px 14px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', whiteSpace: 'nowrap' },
  td: { padding: '13px 14px', fontSize: 13, color: '#e5e7eb', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' },
};

function StatCard({ label, value, color, icon, sub }) {
  return (
    <div style={{ background: '#1e1e2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#f2f2f7', lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function SupplierCard({ s, onEdit, onDelete, onToggle }) {
  const color = avatarColor(s.name);
  return (
    <div style={{ background: '#1e1e2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', transition: 'border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>

      {/* Status dot */}
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.is_active ? '#10b981' : '#6b7280', display: 'inline-block' }} />
        <span style={{ fontSize: 11, color: s.is_active ? '#34d399' : '#6b7280', fontWeight: 600 }}>{s.is_active ? 'Active' : 'Inactive'}</span>
      </div>

      {/* Avatar + Name */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingRight: 70 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}22`, border: `2px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color, flexShrink: 0 }}>
          {s.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#f2f2f7', lineHeight: 1.3 }}>{s.name}</div>
          {s.contact_person && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{s.contact_person}</div>}
        </div>
      </div>

      {/* Halal badge */}
      <div style={{ display: 'flex', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>
          <ShieldCheck size={11} /> Halal Certified
        </span>
      </div>

      {/* Contact info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {s.phone && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#d1d5db' }}>
            <Phone size={12} style={{ color: '#6b7280', flexShrink: 0 }} />
            <span>{s.phone}</span>
          </div>
        )}
        {s.email && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#d1d5db' }}>
            <Mail size={12} style={{ color: '#6b7280', flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email}</span>
          </div>
        )}
        {s.address && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#d1d5db' }}>
            <MapPinned size={12} style={{ color: '#6b7280', flexShrink: 0, marginTop: 1 }} />
            <span style={{ lineHeight: 1.4 }}>{s.address}</span>
          </div>
        )}
        {!s.phone && !s.email && !s.address && (
          <span style={{ fontSize: 12, color: '#4b5563', fontStyle: 'italic' }}>No contact details</span>
        )}
      </div>

      {/* Joined date */}
      {s.created_at && (
        <div style={{ fontSize: 11, color: '#4b5563', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
          Added {s.created_at?.slice(0, 10)}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
        <button onClick={() => onToggle(s)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${s.is_active ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, background: s.is_active ? 'rgba(239,68,68,0.07)' : 'rgba(16,185,129,0.07)', color: s.is_active ? '#f87171' : '#34d399', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          {s.is_active ? 'Deactivate' : 'Activate'}
        </button>
        <button onClick={() => onEdit(s)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.08)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(s)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default function Suppliers() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('all');
  const [view, setView]           = useState('cards');
  const [modal, setModal]         = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast]         = useState('');

  const currentUser = getCurrentUser();
  const userEmail   = currentUser?.sub || '';
  const displayName = userEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const initials    = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const showToast = (msg, type = 'info') => { setToast({ msg, type }); setTimeout(() => setToast(''), 2800); };

  const load = async () => {
    setLoading(true);
    try { setSuppliers(await getSuppliers()); }
    catch { showToast('Failed to load suppliers'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const activeCount   = suppliers.filter(s => s.is_active).length;
  const inactiveCount = suppliers.filter(s => !s.is_active).length;

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = s.name.toLowerCase().includes(q) || (s.contact_person || '').toLowerCase().includes(q) || (s.phone || '').includes(q) || (s.email || '').toLowerCase().includes(q);
    const matchFilter = filter === 'all' || (filter === 'active' && s.is_active) || (filter === 'inactive' && !s.is_active);
    return matchSearch && matchFilter;
  });

  const openCreate = () => { setForm(EMPTY); setError(''); setEditing(null); setModal(true); };
  const openEdit   = (s) => { setForm({ name: s.name, contact_person: s.contact_person || '', phone: s.phone || '', email: s.email || '', address: s.address || '', is_active: s.is_active }); setEditing(s); setError(''); setModal(true); };
  const closeModal = () => { setModal(false); setEditing(null); setError(''); };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Company name is required'); return; }
    setSaving(true); setError('');
    try {
      if (!editing) {
        const created = await createSupplier(form);
        setSuppliers(prev => [created, ...prev]);
        showToast('Supplier added successfully', 'success');
      } else {
        const updated = await updateSupplier(editing.id, form);
        setSuppliers(prev => prev.map(s => s.id === editing.id ? updated : s));
        showToast('Supplier updated', 'success');
      }
      closeModal();
    } catch (e) { setError(e.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (s) => {
    try {
      const updated = await updateSupplier(s.id, { is_active: !s.is_active });
      setSuppliers(prev => prev.map(x => x.id === s.id ? updated : x));
      showToast(`${s.name} ${!s.is_active ? 'activated' : 'deactivated'}`, 'success');
    } catch { showToast('Failed to update'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSupplier(deleteTarget.id);
      setSuppliers(prev => prev.filter(s => s.id !== deleteTarget.id));
      showToast('Supplier deleted');
    } catch { showToast('Failed to delete — supplier may be linked to products'); }
    setDeleteTarget(null);
  };

  return (
    <div className="dashboard-shell">
      {/* ── Sidebar ── */}
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
          <button className="sidebar-item" type="button" onClick={() => navigate('/orders')}><ShoppingCart size={15} strokeWidth={1.5} />Orders</button>
          <button className="sidebar-item active" type="button"><Truck size={15} strokeWidth={1.5} />Suppliers</button>
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
          <div className="sidebar-footer-avatar">{initials[0]}</div>
          <div className="sidebar-footer-info"><div className="sidebar-footer-name">{displayName}</div><div className="sidebar-footer-serial">Al Hazmi ERP</div></div>
        </div>
      </aside>

      <main className="dashboard-content page-enter" style={{ paddingTop: 0 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f2f2f7', margin: 0 }}>Suppliers</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '3px 0 0' }}>Manage your halal meat supplier network</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#2563eb', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={14} /> Add Supplier
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, padding: '20px 28px' }}>
          <StatCard label="Total Suppliers"    value={suppliers.length} color="#60a5fa" icon={<Building2 size={18} />} />
          <StatCard label="Active Suppliers"   value={activeCount}      color="#34d399" icon={<CheckCircle2 size={18} />} sub={activeCount > 0 ? 'Operational' : ''} />
          <StatCard label="Inactive"           value={inactiveCount}    color="#f59e0b" icon={<XCircle size={18} />}     sub={inactiveCount > 0 ? 'Review needed' : 'All active'} />
          <StatCard label="Halal Certified"    value={suppliers.length} color="#a78bfa" icon={<ShieldCheck size={18} />} sub="100% certified" />
        </div>

        {/* ── Toolbar ── */}
        <div style={{ padding: '0 28px 20px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
            <input style={{ ...S.input, paddingLeft: 32 }} placeholder="Search by name, contact, phone or email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 4, border: '1px solid rgba(255,255,255,0.07)' }}>
            {[['all','All'], ['active','Active'], ['inactive','Inactive']].map(([v, l]) => (
              <button key={v} onClick={() => setFilter(v)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', background: filter === v ? '#2563eb' : 'transparent', color: filter === v ? '#fff' : '#9ca3af', transition: 'all 0.15s' }}>{l}</button>
            ))}
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, border: '1px solid rgba(255,255,255,0.07)' }}>
            <button onClick={() => setView('cards')} style={{ padding: '5px 8px', borderRadius: 6, border: 'none', background: view === 'cards' ? 'rgba(255,255,255,0.1)' : 'transparent', color: view === 'cards' ? '#f2f2f7' : '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><LayoutGrid size={14} /></button>
            <button onClick={() => setView('table')} style={{ padding: '5px 8px', borderRadius: 6, border: 'none', background: view === 'table' ? 'rgba(255,255,255,0.1)' : 'transparent', color: view === 'table' ? '#f2f2f7' : '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><List size={14} /></button>
          </div>

          <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{filtered.length} of {suppliers.length} suppliers</span>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: '0 28px 28px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Loading suppliers…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
              {suppliers.length === 0 ? 'No suppliers yet — click Add Supplier to get started' : 'No suppliers match your search'}
            </div>
          ) : view === 'cards' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {filtered.map(s => (
                <SupplierCard key={s.id} s={s} onEdit={openEdit} onDelete={setDeleteTarget} onToggle={handleToggle} />
              ))}
            </div>
          ) : (
            /* ── Table view ── */
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1e1e2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
              <thead>
                <tr>
                  <th style={S.th}>Supplier</th>
                  <th style={S.th}>Contact Person</th>
                  <th style={S.th}>Phone</th>
                  <th style={S.th}>Email</th>
                  <th style={S.th}>Address</th>
                  <th style={S.th}>Status</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const color = avatarColor(s.name);
                  return (
                    <tr key={s.id}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={S.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color, flexShrink: 0 }}>
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: '#f2f2f7' }}>{s.name}</span>
                        </div>
                      </td>
                      <td style={{ ...S.td, color: '#d1d5db' }}>{s.contact_person || <span style={{ color: '#4b5563' }}>—</span>}</td>
                      <td style={{ ...S.td, color: '#d1d5db' }}>{s.phone || <span style={{ color: '#4b5563' }}>—</span>}</td>
                      <td style={{ ...S.td, color: '#d1d5db' }}>{s.email || <span style={{ color: '#4b5563' }}>—</span>}</td>
                      <td style={{ ...S.td, color: '#9ca3af', maxWidth: 200 }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{s.address || <span style={{ color: '#4b5563' }}>—</span>}</span>
                      </td>
                      <td style={S.td}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: s.is_active ? '#34d399' : '#9ca3af' }}>
                          {s.is_active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ ...S.td, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button onClick={() => handleToggle(s)} title={s.is_active ? 'Deactivate' : 'Activate'}
                            style={{ padding: '5px 8px', borderRadius: 6, border: `1px solid ${s.is_active ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`, background: s.is_active ? 'rgba(239,68,68,0.07)' : 'rgba(16,185,129,0.07)', color: s.is_active ? '#f87171' : '#34d399', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            {s.is_active ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                          </button>
                          <button onClick={() => openEdit(s)} title="Edit"
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.08)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleteTarget(s)} title="Delete"
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={closeModal}>
          <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: 520, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f2f2f7' }}>{editing ? 'Edit Supplier' : 'Add Supplier'}</h2>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280' }}>{editing ? editing.name : 'Add a new halal meat supplier'}</p>
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>{error}</div>}

              <label style={S.label}>Company Name *
                <input style={S.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Al Baraka Farms" autoFocus />
              </label>

              <label style={S.label}>Contact Person
                <input style={S.input} value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} placeholder="e.g. Ahmed Al Rashid" />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label style={S.label}>Phone
                  <input style={S.input} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+971 5X XXX XXXX" />
                </label>
                <label style={S.label}>Email
                  <input style={S.input} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="supplier@example.com" />
                </label>
              </div>

              <label style={S.label}>Address
                <textarea style={{ ...S.input, resize: 'vertical', minHeight: 70, fontFamily: 'inherit' }} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Full business address" rows={2} />
              </label>

              <div style={{ display: 'flex', gap: 14, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#d1d5db', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#2563eb' }} />
                  Active supplier
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#34d399' }}>
                  <ShieldCheck size={13} /> Halal certified (all suppliers)
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={closeModal} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setDeleteTarget(null)}>
          <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f2f2f7' }}>Delete Supplier</h2>
              <button onClick={() => setDeleteTarget(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#d1d5db' }}>Delete <strong style={{ color: '#f2f2f7' }}>{deleteTarget.name}</strong>?</p>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>This will permanently remove the supplier. Products linked to this supplier will remain but lose their supplier reference.</p>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleDelete} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, padding: '12px 18px', background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : '#1e1e2a', border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 10, color: toast.type === 'success' ? '#34d399' : '#e5e7eb', fontSize: 13, fontWeight: 500, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          {toast.type === 'success' && <CheckCircle2 size={15} />}{toast.msg}
        </div>
      )}
    </div>
  );
}
