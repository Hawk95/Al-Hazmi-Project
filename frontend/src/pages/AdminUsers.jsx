import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2,
  Users, Search, ChevronDown, Upload, Plus, ArrowUpDown,
  Pencil, Trash2, KeyRound, ToggleLeft, ToggleRight, X, UserPlus,
  ChevronFirst, ChevronLast, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getCurrentUser } from '../api/auth';
import { getUsers, createUser, updateUser, resetPassword, toggleStatus, deleteUser } from '../api/admin';

const EMPTY_CREATE = { email: '', password: '', full_name: '', phone: '', is_admin: false };
const EMPTY_EDIT   = { email: '', full_name: '', phone: '', is_admin: false };

const AVATAR_PALETTE = [
  { bg: '#ef44441a', color: '#f87171' },
  { bg: '#6366f11a', color: '#818cf8' },
  { bg: '#10b9811a', color: '#34d399' },
  { bg: '#f59e0b1a', color: '#fbbf24' },
  { bg: '#ec48991a', color: '#f472b6' },
  { bg: '#0ea5e91a', color: '#38bdf8' },
];
const avatarColor = str => AVATAR_PALETTE[(str?.charCodeAt(0) || 0) % AVATAR_PALETTE.length];

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)} minute${Math.floor(diff/60)>1?'s':''} ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff/3600)>1?'s':''} ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} day${Math.floor(diff/86400)>1?'s':''} ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} month${Math.floor(diff/2592000)>1?'s':''} ago`;
  return `${Math.floor(diff / 31536000)} year${Math.floor(diff/31536000)>1?'s':''} ago`;
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const STATUS_OPTIONS = ['All Status', 'Active', 'Inactive'];
const ROLE_OPTIONS   = ['All Roles', 'Admin', 'User'];
const ROWS_OPTIONS   = [5, 10, 20, 50];

function Dropdown({ label, icon, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const active = value !== options[0];
  return (
    <div className="um2-dd-wrap" ref={ref}>
      <button
        className={`um2-dd-btn${active ? ' um2-dd-active' : ''}`}
        type="button"
        onClick={() => setOpen(o => !o)}
      >
        {icon && <span className="um2-dd-icon">{icon}</span>}
        <span>{value}</span>
        <ChevronDown size={13} strokeWidth={2} />
      </button>
      {open && (
        <div className="um2-dd-menu">
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              className={`um2-dd-item${opt === value ? ' selected' : ''}`}
              onClick={() => { onChange(opt); setOpen(false); }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const userEmail   = currentUser?.sub || '';
  const displayName = userEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const initials    = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterRole,   setFilterRole]   = useState('All Roles');
  const [sortField,    setSortField]    = useState('id');
  const [sortDir,      setSortDir]      = useState('asc');
  const [selected,     setSelected]     = useState(new Set());
  const [currentPage,  setCurrentPage]  = useState(1);
  const [rowsPerPage,  setRowsPerPage]  = useState(10);

  const [showCreate,    setShowCreate]    = useState(false);
  const [createForm,    setCreateForm]    = useState(EMPTY_CREATE);
  const [createErr,     setCreateErr]     = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [showEdit,    setShowEdit]    = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [editForm,    setEditForm]    = useState(EMPTY_EDIT);
  const [editErr,     setEditErr]     = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [showReset,    setShowReset]    = useState(false);
  const [resetTarget,  setResetTarget]  = useState(null);
  const [newPassword,  setNewPassword]  = useState('');
  const [resetErr,     setResetErr]     = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [showDelete,    setShowDelete]    = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [toast, setToast] = useState('');
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadUsers = async () => {
    try { setLoading(true); setUsers(await getUsers()); setError(''); }
    catch (e) { setError(e.response?.data?.detail || 'Failed to load users'); }
    finally   { setLoading(false); }
  };
  useEffect(() => { loadUsers(); }, []);

  /* sorting */
  const toggleSort = field => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  /* filtered + sorted */
  const processed = useMemo(() => {
    let list = [...users];
    if (search) list = list.filter(u => `${u.full_name || ''} ${u.email}`.toLowerCase().includes(search.toLowerCase()));
    if (filterStatus === 'Active')   list = list.filter(u => u.is_active);
    if (filterStatus === 'Inactive') list = list.filter(u => !u.is_active);
    if (filterRole   === 'Admin')    list = list.filter(u => u.is_admin);
    if (filterRole   === 'User')     list = list.filter(u => !u.is_admin);
    list.sort((a, b) => {
      let av = a[sortField] ?? '', bv = b[sortField] ?? '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return list;
  }, [users, search, filterStatus, filterRole, sortField, sortDir]);

  const totalPages   = Math.max(1, Math.ceil(processed.length / rowsPerPage));
  const paginated    = processed.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const allSelected  = paginated.length > 0 && paginated.every(u => selected.has(u.id));

  const toggleSelectAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) paginated.forEach(u => next.delete(u.id));
      else             paginated.forEach(u => next.add(u.id));
      return next;
    });
  };
  const toggleSelect = id => setSelected(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const goPage = p => { setCurrentPage(Math.max(1, Math.min(totalPages, p))); };
  useEffect(() => { setCurrentPage(1); }, [search, filterStatus, filterRole, rowsPerPage]);

  /* page buttons */
  const pageButtons = useMemo(() => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3)        pages.push('…');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('…');
      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  /* CRUD */
  const handleCreate = async e => {
    e.preventDefault(); setCreateLoading(true); setCreateErr('');
    try { await createUser(createForm); setShowCreate(false); setCreateForm(EMPTY_CREATE); await loadUsers(); showToast('User created successfully'); }
    catch (e) { setCreateErr(e.response?.data?.detail || 'Failed to create user'); }
    finally   { setCreateLoading(false); }
  };
  const openEdit = user => { setEditTarget(user); setEditForm({ email: user.email, full_name: user.full_name || '', phone: user.phone || '', is_admin: user.is_admin }); setEditErr(''); setShowEdit(true); };
  const handleEdit = async e => {
    e.preventDefault(); setEditLoading(true); setEditErr('');
    try { await updateUser(editTarget.id, editForm); setShowEdit(false); await loadUsers(); showToast('User updated'); }
    catch (e) { setEditErr(e.response?.data?.detail || 'Failed to update'); }
    finally   { setEditLoading(false); }
  };
  const openReset = user => { setResetTarget(user); setNewPassword(''); setResetErr(''); setShowReset(true); };
  const handleReset = async e => {
    e.preventDefault(); setResetLoading(true); setResetErr('');
    try { await resetPassword(resetTarget.id, newPassword); setShowReset(false); showToast('Password reset'); }
    catch (e) { setResetErr(e.response?.data?.detail || 'Failed'); }
    finally   { setResetLoading(false); }
  };
  const handleToggle = async id => {
    try { const u = await toggleStatus(id); setUsers(prev => prev.map(x => x.id === u.id ? u : x)); showToast(`User ${u.is_active ? 'activated' : 'deactivated'}`); }
    catch (e) { showToast(e.response?.data?.detail || 'Failed'); }
  };
  const openDelete  = user => { setDeleteTarget(user); setShowDelete(true); };
  const handleDelete = async () => {
    setDeleteLoading(true);
    try { await deleteUser(deleteTarget.id); setShowDelete(false); setDeleteTarget(null); await loadUsers(); showToast('User deleted'); }
    catch (e) { showToast(e.response?.data?.detail || 'Failed'); setShowDelete(false); }
    finally   { setDeleteLoading(false); }
  };

  const SortTh = ({ field, children }) => (
    <th onClick={() => toggleSort(field)} className="um2-th-sort">
      <span className="um2-th-inner">
        {children}
        <ArrowUpDown size={12} strokeWidth={2} className={`um2-sort-icon${sortField === field ? ' active' : ''}`} />
      </span>
    </th>
  );

  return (
    <div className="dashboard-shell">
      {/* Sidebar */}
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
          {[
            { label: 'Overview',   icon: <LayoutDashboard size={15} strokeWidth={1.5} /> },
            { label: 'Inventory',  icon: <Package size={15} strokeWidth={1.5} /> },
            { label: 'Orders',     icon: <ShoppingCart size={15} strokeWidth={1.5} /> },
            { label: 'Suppliers',  icon: <Truck size={15} strokeWidth={1.5} /> },
            { label: 'Deliveries', icon: <MapPin size={15} strokeWidth={1.5} /> },
          ].map(item => (
            <button key={item.label} className="sidebar-item" type="button" onClick={() => navigate('/dashboard')}>
              {item.icon} {item.label}
            </button>
          ))}
          <span className="sidebar-group-label">Analytics</span>
          <button className="sidebar-item" type="button" onClick={() => navigate('/dashboard')}>
            <BarChart2 size={15} strokeWidth={1.5} /> Reports
          </button>
          <span className="sidebar-group-label">Admin</span>
          <button className="sidebar-item active" type="button">
            <Users size={15} strokeWidth={1.5} /> User Management
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-footer-avatar">{initials[0]}</div>
          <div className="sidebar-footer-info">
            <div className="sidebar-footer-name">{displayName}</div>
            <div className="sidebar-footer-serial">Administrator</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="dashboard-content page-enter" style={{ paddingTop: 0 }}>

        {/* Page header */}
        <div className="um2-page-header">
          <h1 className="um2-page-title">User Management</h1>
          <p className="um2-page-subtitle">
            Manage all users in one place. Control access, assign roles, and monitor activity across your platform.
          </p>
        </div>

        {/* Toolbar */}
        <div className="um2-toolbar">
          <div className="um2-search-wrap">
            <Search size={14} className="um2-search-icon" />
            <input className="um2-search-input" placeholder="Search" value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>

          <Dropdown label="Role"   icon={<Users size={13} strokeWidth={1.5} />}   options={ROLE_OPTIONS}   value={filterRole}   onChange={setFilterRole} />
          <Dropdown label="Status" icon={<div className="um2-status-dot" />}       options={STATUS_OPTIONS} value={filterStatus} onChange={setFilterStatus} />

          <div style={{ flex: 1 }} />

          <button className="um2-export-btn" type="button" onClick={() => showToast('Export coming soon')}>
            <Upload size={14} strokeWidth={1.5} />
            Export
          </button>
          <button className="um2-add-btn" type="button" onClick={() => { setCreateErr(''); setShowCreate(true); }}>
            <Plus size={14} strokeWidth={2.5} />
            Add User
          </button>
        </div>

        {/* Table */}
        <div className="um2-table-wrap">
          {loading ? (
            <div className="um2-state-row">Loading users…</div>
          ) : error ? (
            <div className="um2-state-row" style={{ color: 'var(--accent)' }}>{error}</div>
          ) : (
            <table className="um2-table">
              <thead>
                <tr>
                  <th className="um2-th-check">
                    <input type="checkbox" className="um2-checkbox" checked={allSelected} onChange={toggleSelectAll} />
                  </th>
                  <SortTh field="full_name">Full Name</SortTh>
                  <SortTh field="email">Email</SortTh>
                  <th className="um2-th">Username</th>
                  <SortTh field="is_active">Status</SortTh>
                  <SortTh field="is_admin">Role</SortTh>
                  <SortTh field="created_at">Joined Date</SortTh>
                  <SortTh field="last_login">Last Active</SortTh>
                  <th className="um2-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={9} className="um2-state-row">No users match your filters</td></tr>
                ) : paginated.map(user => {
                  const av = avatarColor(user.full_name || user.email);
                  const username = (user.full_name ? user.full_name.toLowerCase().replace(/\s+/g, '') : user.email.split('@')[0]);
                  return (
                    <tr key={user.id} className={selected.has(user.id) ? 'um2-row-selected' : ''}>
                      <td className="um2-td-check">
                        <input type="checkbox" className="um2-checkbox" checked={selected.has(user.id)} onChange={() => toggleSelect(user.id)} />
                      </td>
                      <td>
                        <div className="um2-user-cell">
                          <div className="um2-avatar" style={{ background: av.bg, color: av.color }}>
                            {(user.full_name || user.email)[0].toUpperCase()}
                          </div>
                          <span className="um2-user-name">{user.full_name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No name</span>}</span>
                        </div>
                      </td>
                      <td className="um2-td-secondary">{user.email}</td>
                      <td className="um2-td-secondary">{username}</td>
                      <td>
                        <span className={`um2-badge ${user.is_active ? 'um2-badge-active' : 'um2-badge-inactive'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="um2-td-secondary">{user.is_admin ? 'Admin' : 'User'}</td>
                      <td className="um2-td-secondary">{formatDate(user.created_at)}</td>
                      <td className="um2-td-secondary">{timeAgo(user.last_login)}</td>
                      <td>
                        <div className="um2-actions">
                          <button className="um2-action-btn" title="Edit" type="button" onClick={() => openEdit(user)}>
                            <Pencil size={15} strokeWidth={1.5} />
                          </button>
                          <button className="um2-action-btn um2-action-delete" title="Delete" type="button" onClick={() => openDelete(user)}>
                            <Trash2 size={15} strokeWidth={1.5} />
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

        {/* Footer */}
        {!loading && !error && (
          <div className="um2-footer">
            <div className="um2-footer-left">
              Rows per page
              <select className="um2-rows-select" value={rowsPerPage} onChange={e => setRowsPerPage(Number(e.target.value))}>
                {ROWS_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              of {processed.length} rows
            </div>
            <div className="um2-pagination">
              <button className="um2-page-btn" onClick={() => goPage(1)} disabled={currentPage === 1}><ChevronFirst size={14} /></button>
              <button className="um2-page-btn" onClick={() => goPage(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft size={14} /></button>
              {pageButtons.map((p, i) =>
                p === '…'
                  ? <span key={`e${i}`} className="um2-page-ellipsis">…</span>
                  : <button key={p} className={`um2-page-btn${currentPage === p ? ' um2-page-active' : ''}`} onClick={() => goPage(p)}>{p}</button>
              )}
              <button className="um2-page-btn" onClick={() => goPage(currentPage + 1)} disabled={currentPage === totalPages}><ChevronRight size={14} /></button>
              <button className="um2-page-btn" onClick={() => goPage(totalPages)} disabled={currentPage === totalPages}><ChevronLast size={14} /></button>
            </div>
          </div>
        )}
      </main>

      {/* ── Create Modal ── */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New User</h3>
              <button className="icon-button" type="button" onClick={() => setShowCreate(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} className="modal-body">
              <div className="modal-grid">
                <div><label className="input-label">Full Name</label>
                  <input className="input-field" placeholder="John Smith" value={createForm.full_name}
                    onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))} /></div>
                <div><label className="input-label">Phone</label>
                  <input className="input-field" placeholder="+971 50 000 0000" value={createForm.phone}
                    onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} /></div>
              </div>
              <label className="input-label" style={{ marginTop: 12 }}>Email Address</label>
              <input className="input-field" type="email" placeholder="user@alhazmi.com" required
                value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} />
              <label className="input-label" style={{ marginTop: 12 }}>Password</label>
              <input className="input-field" type="password" placeholder="Min. 8 characters" required minLength={8}
                value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} />
              <label className="checkbox-label" style={{ marginTop: 14 }}>
                <input type="checkbox" className="checkbox-input" checked={createForm.is_admin}
                  onChange={e => setCreateForm(f => ({ ...f, is_admin: e.target.checked }))} />
                Grant admin privileges
              </label>
              {createErr && <div className="status-message error" style={{ marginTop: 10 }}>{createErr}</div>}
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className={`btn btn-primary${createLoading ? ' loading' : ''}`} disabled={createLoading}>
                  {createLoading ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {showEdit && editTarget && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit User</h3>
              <button className="icon-button" type="button" onClick={() => setShowEdit(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleEdit} className="modal-body">
              <div className="modal-grid">
                <div><label className="input-label">Full Name</label>
                  <input className="input-field" value={editForm.full_name}
                    onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} /></div>
                <div><label className="input-label">Phone</label>
                  <input className="input-field" value={editForm.phone}
                    onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
              </div>
              <label className="input-label" style={{ marginTop: 12 }}>Email Address</label>
              <input className="input-field" type="email" required value={editForm.email}
                onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
              <label className="checkbox-label" style={{ marginTop: 14 }}>
                <input type="checkbox" className="checkbox-input" checked={editForm.is_admin}
                  onChange={e => setEditForm(f => ({ ...f, is_admin: e.target.checked }))} />
                Admin privileges
              </label>
              {editErr && <div className="status-message error" style={{ marginTop: 10 }}>{editErr}</div>}
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowEdit(false)}>Cancel</button>
                <button type="submit" className={`btn btn-primary${editLoading ? ' loading' : ''}`} disabled={editLoading}>
                  {editLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {showReset && resetTarget && (
        <div className="modal-overlay" onClick={() => setShowReset(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Reset Password</h3>
              <button className="icon-button" type="button" onClick={() => setShowReset(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleReset} className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                New password for <strong style={{ color: 'var(--text-primary)' }}>{resetTarget.email}</strong>
              </p>
              <label className="input-label">New Password</label>
              <input className="input-field" type="password" placeholder="Min. 8 characters" required minLength={8}
                value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              {resetErr && <div className="status-message error" style={{ marginTop: 10 }}>{resetErr}</div>}
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowReset(false)}>Cancel</button>
                <button type="submit" className={`btn btn-primary${resetLoading ? ' loading' : ''}`} disabled={resetLoading}>
                  {resetLoading ? 'Saving…' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {showDelete && deleteTarget && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--accent)' }}>Delete User</h3>
              <button className="icon-button" type="button" onClick={() => setShowDelete(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.email}</strong>?
                This action cannot be undone.
              </p>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowDelete(false)}>Cancel</button>
                <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleteLoading}>
                  {deleteLoading ? 'Deleting…' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast-notification">{toast}</div>}
    </div>
  );
}
