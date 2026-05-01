import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2, Users, UserPlus, KeyRound, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { logout, getCurrentUser } from '../api/auth';
import { getUsers, createUser, resetPassword, toggleStatus } from '../api/admin';

const AdminUsers = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const userEmail = currentUser?.sub || '';
  const displayName = userEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const initials = displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: '', password: '', is_admin: false });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [showReset, setShowReset] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');
    try {
      await createUser(createForm);
      setShowCreate(false);
      setCreateForm({ email: '', password: '', is_admin: false });
      await loadUsers();
      showToast('User created successfully');
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    try {
      await resetPassword(resetTarget.id, newPassword);
      setShowReset(false);
      setNewPassword('');
      setResetTarget(null);
      showToast('Password reset successfully');
    } catch (err) {
      setResetError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleToggle = async (userId) => {
    try {
      const updated = await toggleStatus(userId);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast(`User ${updated.is_active ? 'activated' : 'deactivated'}`);
    } catch (err) {
      showToast('Failed to update status');
    }
  };

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo-area">
          <div className="header-logo-icon">M</div>
          <span className="header-logo-name">Meat ERP</span>
        </div>
        <nav className="sidebar-nav">
          <span className="sidebar-group-label">Main</span>
          <button className="sidebar-item" type="button" onClick={() => navigate('/dashboard')}>
            <LayoutDashboard size={15} strokeWidth={1.5} /> Overview
          </button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/dashboard')}>
            <Package size={15} strokeWidth={1.5} /> Inventory
          </button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/dashboard')}>
            <ShoppingCart size={15} strokeWidth={1.5} /> Orders
          </button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/dashboard')}>
            <Truck size={15} strokeWidth={1.5} /> Suppliers
          </button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/dashboard')}>
            <MapPin size={15} strokeWidth={1.5} /> Deliveries
          </button>
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

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div className="header-left">
            <div className="header-pill">Admin</div>
            <h1>User Management</h1>
            <p className="header-subtitle">Create and manage system users, roles, and access control.</p>
          </div>
          <div className="header-right">
            <button className="btn btn-primary" type="button" onClick={() => { setCreateError(''); setShowCreate(true); }}>
              <UserPlus size={14} strokeWidth={1.5} />
              New User
            </button>
          </div>
        </header>

        <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading users…</div>
          ) : error ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--accent)', fontSize: 13 }}>{error}</div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="td-muted">{user.id}</td>
                      <td className="td-primary">{user.email}</td>
                      <td>
                        <span className={`user-badge ${user.is_admin ? 'user-badge-admin' : 'user-badge-user'}`}>
                          {user.is_admin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td>
                        <span className={`user-badge ${user.is_active ? 'user-badge-active' : 'user-badge-inactive'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="td-muted">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            title="Reset Password"
                            type="button"
                            onClick={() => { setResetTarget(user); setNewPassword(''); setResetError(''); setShowReset(true); }}
                          >
                            <KeyRound size={14} strokeWidth={1.5} />
                          </button>
                          <button
                            className="icon-button"
                            title={user.is_active ? 'Deactivate' : 'Activate'}
                            type="button"
                            onClick={() => handleToggle(user.id)}
                          >
                            {user.is_active
                              ? <ToggleRight size={16} strokeWidth={1.5} style={{ color: '#059669' }} />
                              : <ToggleLeft size={16} strokeWidth={1.5} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Create User Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">New User</h3>
              <button className="icon-button" type="button" onClick={() => setShowCreate(false)}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="modal-body">
              <label className="input-label" htmlFor="new-email">Email address</label>
              <input
                id="new-email"
                type="email"
                className="input-field"
                placeholder="user@example.com"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
              <label className="input-label" htmlFor="new-password" style={{ marginTop: 12 }}>Password</label>
              <input
                id="new-password"
                type="password"
                className="input-field"
                placeholder="Min. 8 characters"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={8}
              />
              <label className="checkbox-label" style={{ marginTop: 14 }}>
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={createForm.is_admin}
                  onChange={(e) => setCreateForm((f) => ({ ...f, is_admin: e.target.checked }))}
                />
                Grant admin privileges
              </label>
              {createError && <div className="status-message error" style={{ marginTop: 12 }}>{createError}</div>}
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

      {/* Reset Password Modal */}
      {showReset && resetTarget && (
        <div className="modal-overlay" onClick={() => setShowReset(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Reset Password</h3>
              <button className="icon-button" type="button" onClick={() => setShowReset(false)}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleReset} className="modal-body">
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                Setting new password for <strong style={{ color: 'var(--text-primary)' }}>{resetTarget.email}</strong>
              </p>
              <label className="input-label" htmlFor="reset-password">New Password</label>
              <input
                id="reset-password"
                type="password"
                className="input-field"
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
              {resetError && <div className="status-message error" style={{ marginTop: 12 }}>{resetError}</div>}
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

      {toast && <div className="toast-notification">{toast}</div>}
    </div>
  );
};

export default AdminUsers;
