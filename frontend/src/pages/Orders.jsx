import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2, Users,
  Search, Plus, X, Pencil, Trash2, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, Clock, Flame, Send, Ban, Eye, TrendingUp
} from 'lucide-react';
import { getCurrentUser } from '../api/auth';
import { getOrders, updateOrder, deleteOrder } from '../api/erp';

const STATUSES = ['pending', 'confirmed', 'preparing', 'dispatched', 'delivered', 'cancelled'];

const STATUS_STYLE = {
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  icon: <Clock size={11} /> },
  confirmed: { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  icon: <CheckCircle2 size={11} /> },
  preparing: { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', icon: <Flame size={11} /> },
  dispatched:{ color: '#fb923c', bg: 'rgba(251,146,60,0.15)',  icon: <Send size={11} /> },
  delivered: { color: '#34d399', bg: 'rgba(52,211,153,0.15)',  icon: <CheckCircle2 size={11} /> },
  cancelled: { color: '#6b7280', bg: 'rgba(107,114,128,0.15)', icon: <Ban size={11} /> },
};

const PIPELINE = ['pending','confirmed','preparing','dispatched','delivered'];

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
      {s.icon}{status}
    </span>
  );
}

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

const S = {
  th: { padding: '11px 14px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', whiteSpace: 'nowrap' },
  td: { padding: '13px 14px', fontSize: 13, color: '#e5e7eb', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' },
  input: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#f2f2f7', outline: 'none', boxSizing: 'border-box' },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 500, color: '#9ca3af' },
};

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expanded, setExpanded]       = useState(null);
  const [editModal, setEditModal]     = useState(null);
  const [editForm, setEditForm]       = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [toast, setToast]             = useState('');

  const currentUser = getCurrentUser();
  const userEmail   = currentUser?.sub || '';
  const displayName = userEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const initials    = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const showToast = (msg, type = 'info') => { setToast({ msg, type }); setTimeout(() => setToast(''), 2800); };

  const load = async () => {
    setLoading(true);
    try { setOrders(await getOrders()); }
    catch { showToast('Failed to load orders'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  /* ── Stats ── */
  const totalRevenue  = orders.reduce((s, o) => s + o.total_amount, 0);
  const pendingCount  = orders.filter(o => o.status === 'pending').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const todayCount    = orders.filter(o => o.created_at?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;

  /* ── Filter ── */
  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = o.customer_name.toLowerCase().includes(q) || o.order_number.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  /* ── Edit ── */
  const openEdit = o => {
    setEditForm({ customer_name: o.customer_name, status: o.status, notes: o.notes || '' });
    setEditModal(o);
    setError('');
  };

  const handleSave = async () => {
    if (!editForm.customer_name.trim()) { setError('Customer name is required'); return; }
    setSaving(true); setError('');
    try {
      const updated = await updateOrder(editModal.id, editForm);
      setOrders(prev => prev.map(o => o.id === editModal.id ? updated : o));
      setEditModal(null);
      showToast('Order updated', 'success');
    } catch (e) { setError(e.response?.data?.detail || 'Failed to update'); }
    finally { setSaving(false); }
  };

  /* ── Quick status change ── */
  const changeStatus = async (order, newStatus) => {
    try {
      const updated = await updateOrder(order.id, { status: newStatus });
      setOrders(prev => prev.map(o => o.id === order.id ? updated : o));
      showToast(`Status → ${newStatus}`, 'success');
    } catch { showToast('Failed to update status'); }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    try {
      await deleteOrder(deleteTarget.id);
      setOrders(prev => prev.filter(o => o.id !== deleteTarget.id));
      showToast('Order deleted');
    } catch { showToast('Failed to delete'); }
    setDeleteTarget(null);
  };

  const toggleExpand = id => setExpanded(prev => prev === id ? null : id);

  /* ── Pipeline step index ── */
  const pipelineIdx = status => PIPELINE.indexOf(status);

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
          <button className="sidebar-item active" type="button"><ShoppingCart size={15} strokeWidth={1.5} />Orders</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/suppliers')}><Truck size={15} strokeWidth={1.5} />Suppliers</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/deliveries')}><MapPin size={15} strokeWidth={1.5} />Deliveries</button>
          <button className="sidebar-item" type="button" onClick={() => navigate('/sales')}><TrendingUp size={15} strokeWidth={1.5} />Sales Distribution</button>
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

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f2f2f7', margin: 0 }}>Orders</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '3px 0 0' }}>Track and manage all customer orders</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={() => window.open('/orders/create', '_blank')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#2563eb', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={14} /> Create Order
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, padding: '20px 28px' }}>
          <StatCard label="Total Orders" value={orders.length} color="#60a5fa" icon={<ShoppingCart size={18} />} />
          <StatCard label="Total Revenue" value={`AED ${totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`} color="#34d399" icon={<CheckCircle2 size={18} />} />
          <StatCard label="Pending" value={pendingCount} color="#f59e0b" sub={pendingCount > 0 ? 'Needs action' : 'All clear'} icon={<Clock size={18} />} />
          <StatCard label="Delivered Today" value={deliveredCount} color="#a78bfa" sub={`${todayCount} new today`} icon={<Send size={18} />} />
        </div>

        {/* ── Status Pipeline Strip ── */}
        <div style={{ margin: '0 28px 20px', padding: '16px 20px', background: '#1e1e2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, display: 'flex', gap: 0, alignItems: 'center' }}>
          {PIPELINE.map((s, i) => {
            const count = orders.filter(o => o.status === s).length;
            const st = STATUS_STYLE[s];
            return (
              <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <div
                  onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                  style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 8, cursor: 'pointer', background: statusFilter === s ? `${st.color}18` : 'transparent', border: statusFilter === s ? `1px solid ${st.color}40` : '1px solid transparent', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: st.color }}>{count}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'capitalize', marginTop: 2 }}>{s}</div>
                </div>
                {i < PIPELINE.length - 1 && <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />}
              </div>
            );
          })}
          <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', margin: '0 12px', height: 40 }} />
          <div
            onClick={() => setStatusFilter(statusFilter === 'cancelled' ? 'all' : 'cancelled')}
            style={{ padding: '8px 14px', borderRadius: 8, cursor: 'pointer', background: statusFilter === 'cancelled' ? 'rgba(107,114,128,0.15)' : 'transparent', border: statusFilter === 'cancelled' ? '1px solid rgba(107,114,128,0.4)' : '1px solid transparent', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#6b7280' }}>{orders.filter(o => o.status === 'cancelled').length}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Cancelled</div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div style={{ padding: '0 28px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
            <input style={{ ...S.input, paddingLeft: 32 }} placeholder="Search by order # or customer name…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{filtered.length} of {orders.length} orders</span>
        </div>

        {/* ── Table ── */}
        <div style={{ padding: '0 28px 28px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1e1e2a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 36 }}></th>
                <th style={S.th}>Order #</th>
                <th style={S.th}>Customer</th>
                <th style={S.th}>Items</th>
                <th style={S.th}>Total</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Next Step</th>
                <th style={S.th}>Date</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ ...S.td, textAlign: 'center', padding: 48, color: '#6b7280' }}>Loading orders…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ ...S.td, textAlign: 'center', padding: 48, color: '#6b7280' }}>
                  {orders.length === 0 ? 'No orders yet — click Create Order to get started' : 'No orders match your search'}
                </td></tr>
              ) : filtered.map(o => {
                const isExpanded = expanded === o.id;
                const nextStatus = PIPELINE[pipelineIdx(o.status) + 1];
                const st = STATUS_STYLE[o.status] || STATUS_STYLE.pending;
                return (
                  <>
                    <tr key={o.id}
                      style={{ background: isExpanded ? 'rgba(37,99,235,0.06)' : 'transparent', transition: 'background 0.15s' }}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}>

                      <td style={S.td}>
                        <button onClick={() => toggleExpand(o.id)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 2, display: 'flex' }}>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>

                      <td style={S.td}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#93c5fd', letterSpacing: '0.03em' }}>{o.order_number}</span>
                      </td>

                      <td style={S.td}>
                        <div style={{ fontWeight: 600, color: '#f2f2f7' }}>{o.customer_name}</div>
                        {o.notes && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.notes}</div>}
                      </td>

                      <td style={S.td}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 22, borderRadius: 6, background: 'rgba(96,165,250,0.12)', color: '#93c5fd', fontSize: 12, fontWeight: 700 }}>
                          {o.items?.length || 0}
                        </span>
                      </td>

                      <td style={{ ...S.td, fontWeight: 700, color: '#34d399', fontSize: 14 }}>
                        AED {o.total_amount.toFixed(2)}
                      </td>

                      <td style={S.td}><StatusBadge status={o.status} /></td>

                      <td style={S.td}>
                        {nextStatus && o.status !== 'cancelled' ? (
                          <button
                            onClick={() => changeStatus(o, nextStatus)}
                            style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${STATUS_STYLE[nextStatus]?.color}40`, background: `${STATUS_STYLE[nextStatus]?.color}10`, color: STATUS_STYLE[nextStatus]?.color, fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                            → {nextStatus}
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: '#4b5563' }}>—</span>
                        )}
                      </td>

                      <td style={{ ...S.td, color: '#9ca3af', fontSize: 12 }}>
                        {o.created_at?.slice(0, 10) || '—'}
                      </td>

                      <td style={{ ...S.td, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button onClick={() => toggleExpand(o.id)} title="View Items"
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.08)', color: '#a78bfa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Eye size={13} />
                          </button>
                          <button onClick={() => openEdit(o)} title="Edit"
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.08)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleteTarget(o)} title="Delete"
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ── Expanded order items ── */}
                    {isExpanded && (
                      <tr key={`${o.id}-exp`}>
                        <td colSpan={9} style={{ padding: '0 14px 14px 50px', background: 'rgba(37,99,235,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          {/* Status pipeline */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 14, marginTop: 12 }}>
                            {PIPELINE.map((s, i) => {
                              const done = pipelineIdx(o.status) >= i;
                              const current = o.status === s;
                              const st = STATUS_STYLE[s];
                              return (
                                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? `${st.color}25` : 'rgba(255,255,255,0.05)', border: `2px solid ${done ? st.color : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: done ? st.color : '#4b5563', boxShadow: current ? `0 0 8px ${st.color}60` : 'none' }}>
                                      {s === 'pending' && <Clock size={12} />}
                                      {s === 'confirmed' && <CheckCircle2 size={12} />}
                                      {s === 'preparing' && <Flame size={12} />}
                                      {s === 'dispatched' && <Send size={12} />}
                                      {s === 'delivered' && <CheckCircle2 size={12} />}
                                    </div>
                                    <span style={{ fontSize: 10, color: done ? st.color : '#4b5563', marginTop: 4, textTransform: 'capitalize', fontWeight: current ? 700 : 400 }}>{s}</span>
                                  </div>
                                  {i < PIPELINE.length - 1 && (
                                    <div style={{ height: 2, flex: 1, background: pipelineIdx(o.status) > i ? STATUS_STYLE[PIPELINE[i + 1]]?.color || '#34d399' : 'rgba(255,255,255,0.07)', marginBottom: 18, borderRadius: 2 }} />
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Items table */}
                          {o.items?.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  {['Product', 'Qty (kg)', 'Unit Price', 'Total'].map(h => (
                                    <th key={h} style={{ padding: '7px 12px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: h === 'Total' ? 'right' : 'left', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {o.items.map(it => (
                                  <tr key={it.id}>
                                    <td style={{ padding: '8px 12px', fontSize: 13, color: '#e5e7eb', fontWeight: 500 }}>{it.product_name}</td>
                                    <td style={{ padding: '8px 12px', fontSize: 13, color: '#9ca3af' }}>{it.quantity}</td>
                                    <td style={{ padding: '8px 12px', fontSize: 13, color: '#9ca3af' }}>AED {it.unit_price.toFixed(2)}</td>
                                    <td style={{ padding: '8px 12px', fontSize: 13, color: '#34d399', fontWeight: 600, textAlign: 'right' }}>AED {it.total_price.toFixed(2)}</td>
                                  </tr>
                                ))}
                                <tr>
                                  <td colSpan={3} style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: '#f2f2f7', textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.07)' }}>Grand Total</td>
                                  <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 700, color: '#34d399', textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.07)' }}>AED {o.total_amount.toFixed(2)}</td>
                                </tr>
                              </tbody>
                            </table>
                          ) : (
                            <p style={{ fontSize: 13, color: '#6b7280' }}>No items recorded.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* ── Edit Modal ── */}
      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditModal(null)}>
          <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: 480 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f2f2f7' }}>Edit Order</h2>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{editModal.order_number}</p>
              </div>
              <button onClick={() => setEditModal(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>{error}</div>}

              <label style={S.label}>Customer Name *
                <input style={S.input} value={editForm.customer_name} onChange={e => setEditForm(p => ({ ...p, customer_name: e.target.value }))} />
              </label>

              <label style={S.label}>Order Status
                <select style={S.input} value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </label>

              <label style={S.label}>Notes
                <input style={S.input} value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
              </label>

              {editModal.items?.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Order Items ({editModal.items.length})</p>
                  {editModal.items.map(it => (
                    <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                      <span style={{ color: '#d1d5db' }}>{it.product_name} <span style={{ color: '#6b7280' }}>× {it.quantity} kg</span></span>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>AED {it.total_price.toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: 13, fontWeight: 700 }}>
                    <span style={{ color: '#9ca3af' }}>Total</span>
                    <span style={{ color: '#34d399' }}>AED {editModal.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setEditModal(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setDeleteTarget(null)}>
          <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f2f2f7' }}>Delete Order</h2>
              <button onClick={() => setDeleteTarget(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#d1d5db' }}>Delete <strong style={{ color: '#f2f2f7', fontFamily: 'monospace' }}>{deleteTarget.order_number}</strong> for <strong style={{ color: '#f2f2f7' }}>{deleteTarget.customer_name}</strong>?</p>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6b7280' }}>Total: AED {deleteTarget.total_amount.toFixed(2)} · {deleteTarget.items?.length || 0} item(s) · This cannot be undone.</p>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleDelete} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Delete Order</button>
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
