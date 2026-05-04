import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2, Users,
  Search, Plus, X, Pencil, Trash2, AlertTriangle, TrendingUp, TrendingDown,
  RefreshCw, ArrowUpDown, CheckCircle2, XCircle, Filter
} from 'lucide-react';
import { getCurrentUser } from '../api/auth';
import { getProducts, createProduct, updateProduct, adjustStock, deleteProduct } from '../api/erp';

const CATEGORIES = ['Beef', 'Lamb', 'Chicken', 'Seafood', 'Veal', 'Goat', 'Other'];
const EMPTY_FORM = { name: '', category: 'Beef', price_per_unit: '', stock_qty: '', min_threshold: '10', is_active: true };

const CAT_COLORS = {
  Beef: '#ef4444', Lamb: '#8b5cf6', Chicken: '#f59e0b',
  Seafood: '#06b6d4', Veal: '#ec4899', Goat: '#10b981', Other: '#6b7280',
};

function StockBar({ qty, min }) {
  const pct = min > 0 ? Math.min(100, Math.round((qty / (min * 3)) * 100)) : 100;
  const color = qty <= 0 ? '#ef4444' : qty <= min ? '#f59e0b' : '#10b981';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 52, textAlign: 'right' }}>
        {qty.toFixed(1)} kg
      </span>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ background: 'var(--bg-card, #1e1e2a)', border: '1px solid var(--border-subtle, rgba(255,255,255,0.07))', borderRadius: 12, padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary, #f2f2f7)', lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function Inventory() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [stockModal, setStockModal] = useState(null);
  const [stockQty, setStockQty] = useState('');
  const [stockDir, setStockDir] = useState('in');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState('');
  const [selected, setSelected] = useState(new Set());

  const currentUser = getCurrentUser();
  const userEmail = currentUser?.sub || '';
  const displayName = userEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const initials = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(''), 2800);
  };

  const load = async () => {
    setLoading(true);
    try {
      const p = await getProducts();
      setProducts(p);
    } catch { showToast('Failed to load products'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── Stats ───────────────────────────────────────────────
  const totalValue = products.reduce((s, p) => s + p.stock_qty * p.price_per_unit, 0);
  const lowStockCount = products.filter(p => p.stock_qty <= p.min_threshold && p.stock_qty > 0).length;
  const outOfStock = products.filter(p => p.stock_qty <= 0).length;
  const activeCount = products.filter(p => p.is_active).length;

  // ── Filter + Sort ───────────────────────────────────────
  const filtered = products
    .filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.category || '').toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === 'All' || p.category === catFilter;
      const matchStatus = statusFilter === 'All'
        || (statusFilter === 'Low' && p.stock_qty > 0 && p.stock_qty <= p.min_threshold)
        || (statusFilter === 'Out' && p.stock_qty <= 0)
        || (statusFilter === 'OK' && p.stock_qty > p.min_threshold)
        || (statusFilter === 'Inactive' && !p.is_active);
      return matchSearch && matchCat && matchStatus;
    })
    .sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ k }) => sortKey === k
    ? <span style={{ color: '#60a5fa', fontSize: 10 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
    : <ArrowUpDown size={11} style={{ opacity: 0.3 }} />;

  // ── Modals ──────────────────────────────────────────────
  const openCreate = () => { setForm(EMPTY_FORM); setError(''); setEditing(null); setModal('form'); };
  const openEdit = (p) => {
    setForm({ name: p.name, category: p.category || 'Beef', price_per_unit: String(p.price_per_unit), stock_qty: String(p.stock_qty), min_threshold: String(p.min_threshold), is_active: p.is_active });
    setEditing(p); setError(''); setModal('form');
  };
  const closeModal = () => { setModal(null); setEditing(null); setError(''); };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Product name is required'); return; }
    if (!form.price_per_unit || isNaN(form.price_per_unit) || parseFloat(form.price_per_unit) < 0) { setError('Valid price is required'); return; }
    setSaving(true); setError('');
    const payload = {
      name: form.name.trim(),
      category: form.category || null,
      price_per_unit: parseFloat(form.price_per_unit),
      stock_qty: parseFloat(form.stock_qty || 0),
      min_threshold: parseFloat(form.min_threshold || 10),
      is_active: form.is_active,
      unit: 'kg',
    };
    try {
      if (!editing) {
        const created = await createProduct(payload);
        setProducts(prev => [created, ...prev]);
        showToast('Product added successfully', 'success');
      } else {
        const updated = await updateProduct(editing.id, payload);
        setProducts(prev => prev.map(p => p.id === editing.id ? updated : p));
        showToast('Product updated', 'success');
      }
      closeModal();
    } catch (e) { setError(e.response?.data?.detail || 'Failed to save product'); }
    finally { setSaving(false); }
  };

  const handleStockAdj = async () => {
    const qty = parseFloat(stockQty);
    if (!qty || qty <= 0) return;
    try {
      const updated = await adjustStock(stockModal.id, { qty_change: stockDir === 'in' ? qty : -qty });
      setProducts(prev => prev.map(p => p.id === stockModal.id ? updated : p));
      showToast(`Stock ${stockDir === 'in' ? 'added' : 'removed'}: ${qty} kg`, 'success');
      setStockModal(null); setStockQty(''); setStockDir('in');
    } catch { showToast('Stock adjustment failed'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProduct(deleteTarget.id);
      setProducts(prev => prev.filter(p => p.id !== deleteTarget.id));
      showToast('Product deleted');
    } catch { showToast('Failed to delete product'); }
    setDeleteTarget(null);
  };

  const toggleSelect = (id) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const toggleAll = () => setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(p => p.id)));

  const stockStatus = (p) => {
    if (!p.is_active) return { label: 'Inactive', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' };
    if (p.stock_qty <= 0) return { label: 'Out of Stock', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
    if (p.stock_qty <= p.min_threshold) return { label: 'Low Stock', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
    return { label: 'In Stock', color: '#10b981', bg: 'rgba(16,185,129,0.15)' };
  };

  const S = { // shared inline styles
    th: { padding: '11px 14px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' },
    td: { padding: '12px 14px', fontSize: 13, color: '#e5e7eb', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' },
    input: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#f2f2f7', outline: 'none', boxSizing: 'border-box' },
    label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 500, color: '#9ca3af' },
  };

  return (
    <div className="dashboard-shell">
      {/* ── Sidebar ── */}
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
          <button className="sidebar-item" type="button" onClick={() => navigate('/sales')}><TrendingUp size={15} strokeWidth={1.5} />Sales Distribution</button>
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

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f2f2f7', margin: 0 }}>Inventory</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '3px 0 0' }}>Manage halal meat products and stock levels</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <button onClick={() => navigate('/products/add')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#2563eb', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={14} /> Add Product
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, padding: '20px 28px' }}>
          <StatCard label="Total Products" value={products.length} color="#60a5fa" icon={<Package size={18} />} />
          <StatCard label="Inventory Value" value={`AED ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} color="#34d399" icon={<TrendingUp size={18} />} />
          <StatCard label="Low Stock Alerts" value={lowStockCount} sub={lowStockCount > 0 ? 'Needs reorder' : 'All healthy'} color="#f59e0b" icon={<AlertTriangle size={18} />} />
          <StatCard label="Out of Stock" value={outOfStock} sub={outOfStock > 0 ? 'Urgent' : 'None'} color="#ef4444" icon={<XCircle size={18} />} />
        </div>

        {/* ── Toolbar ── */}
        <div style={{ padding: '0 28px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: 200 }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
            <input
              style={{ ...S.input, paddingLeft: 32 }}
              placeholder="Search products or category…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 4, border: '1px solid rgba(255,255,255,0.07)' }}>
            {['All', 'OK', 'Low', 'Out', 'Inactive'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '5px 11px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', background: statusFilter === s ? '#2563eb' : 'transparent', color: statusFilter === s ? '#fff' : '#9ca3af', transition: 'all 0.15s' }}>
                {s === 'OK' ? 'In Stock' : s === 'Low' ? 'Low Stock' : s === 'Out' ? 'Out of Stock' : s}
              </button>
            ))}
          </div>

          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            style={{ ...S.input, width: 'auto', paddingRight: 28, cursor: 'pointer' }}
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
            {filtered.length} of {products.length} products
          </span>
        </div>

        {/* ── Table ── */}
        <div style={{ padding: '0 28px 28px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-card, #1e1e2a)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 36, cursor: 'default' }}>
                  <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                </th>
                <th style={S.th} onClick={() => toggleSort('name')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>Product <SortIcon k="name" /></span>
                </th>
                <th style={S.th} onClick={() => toggleSort('category')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>Category <SortIcon k="category" /></span>
                </th>
                <th style={{ ...S.th, minWidth: 160 }}>Stock Level</th>
                <th style={S.th} onClick={() => toggleSort('min_threshold')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>Min Threshold <SortIcon k="min_threshold" /></span>
                </th>
                <th style={S.th} onClick={() => toggleSort('price_per_unit')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>Price / kg <SortIcon k="price_per_unit" /></span>
                </th>
                <th style={S.th} onClick={() => toggleSort('stock_qty')}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>Stock Value <SortIcon k="stock_qty" /></span>
                </th>
                <th style={S.th}>Status</th>
                <th style={{ ...S.th, cursor: 'default' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ ...S.td, textAlign: 'center', padding: '48px', color: '#6b7280' }}>Loading products…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ ...S.td, textAlign: 'center', padding: '48px', color: '#6b7280' }}>
                  {products.length === 0 ? 'No products yet — click Add Product to get started' : 'No products match your filters'}
                </td></tr>
              ) : filtered.map(p => {
                const st = stockStatus(p);
                const value = p.stock_qty * p.price_per_unit;
                const catColor = CAT_COLORS[p.category] || '#6b7280';
                return (
                  <tr key={p.id} style={{ background: selected.has(p.id) ? 'rgba(37,99,235,0.08)' : 'transparent', transition: 'background 0.15s' }}
                    onMouseEnter={e => { if (!selected.has(p.id)) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                    onMouseLeave={e => { if (!selected.has(p.id)) e.currentTarget.style.background = 'transparent'; }}>

                    <td style={S.td}>
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} style={{ cursor: 'pointer' }} />
                    </td>

                    <td style={S.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${catColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Package size={14} style={{ color: catColor }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#f2f2f7', fontSize: 13 }}>{p.name}</div>
                          {p.stock_qty <= p.min_threshold && p.stock_qty > 0 && (
                            <div style={{ fontSize: 11, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                              <AlertTriangle size={10} /> Reorder needed
                            </div>
                          )}
                          {p.stock_qty <= 0 && (
                            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>Out of stock</div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={S.td}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${catColor}18`, color: catColor }}>
                        {p.category || '—'}
                      </span>
                    </td>

                    <td style={S.td}>
                      <StockBar qty={p.stock_qty} min={p.min_threshold} />
                    </td>

                    <td style={{ ...S.td, color: '#9ca3af' }}>
                      {p.min_threshold.toFixed(1)} kg
                    </td>

                    <td style={{ ...S.td, fontWeight: 600, color: '#f2f2f7' }}>
                      AED {p.price_per_unit.toFixed(2)}
                    </td>

                    <td style={{ ...S.td, color: '#34d399', fontWeight: 600 }}>
                      AED {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td style={S.td}>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>

                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => { setStockModal(p); setStockQty(''); setStockDir('in'); }}
                          title="Adjust Stock"
                          style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <TrendingUp size={13} />
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          title="Edit"
                          style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.08)', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          title="Delete"
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

          {/* Selected banner */}
          {selected.size > 0 && (
            <div style={{ marginTop: 12, padding: '10px 16px', background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#93c5fd' }}>{selected.size} product{selected.size !== 1 ? 's' : ''} selected</span>
              <button onClick={() => setSelected(new Set())} style={{ fontSize: 12, color: '#93c5fd', background: 'none', border: 'none', cursor: 'pointer' }}>Clear selection</button>
            </div>
          )}
        </div>
      </main>

      {/* ── Add / Edit Modal ── */}
      {modal === 'form' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={closeModal}>
          <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: 500, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f2f2f7' }}>{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>{error}</div>}

              <label style={S.label}>Product Name *
                <input style={S.input} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Beef Ribs Premium" autoFocus />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label style={S.label}>Category
                  <select style={S.input} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label style={S.label}>Price per kg (AED) *
                  <input style={S.input} type="number" min="0" step="0.01" value={form.price_per_unit} onChange={e => setForm(p => ({ ...p, price_per_unit: e.target.value }))} placeholder="0.00" />
                </label>
                <label style={S.label}>Current Stock (kg)
                  <input style={S.input} type="number" min="0" step="0.1" value={form.stock_qty} onChange={e => setForm(p => ({ ...p, stock_qty: e.target.value }))} placeholder="0" />
                </label>
                <label style={S.label}>Min. Threshold (kg)
                  <input style={S.input} type="number" min="0" step="0.1" value={form.min_threshold} onChange={e => setForm(p => ({ ...p, min_threshold: e.target.value }))} placeholder="10" />
                </label>
              </div>

              <label style={{ ...S.label, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                <span>Active product (visible in orders)</span>
              </label>

              {form.price_per_unit && form.stock_qty && (
                <div style={{ padding: '10px 14px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 8, fontSize: 13, color: '#34d399' }}>
                  Stock value: AED {(parseFloat(form.price_per_unit || 0) * parseFloat(form.stock_qty || 0)).toFixed(2)}
                </div>
              )}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={closeModal} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stock Adjust Modal ── */}
      {stockModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setStockModal(null)}>
          <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: 420 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f2f2f7' }}>Adjust Stock</h2>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280' }}>{stockModal.name}</p>
              </div>
              <button onClick={() => setStockModal(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 6, padding: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                <button onClick={() => setStockDir('in')} style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', background: stockDir === 'in' ? 'rgba(16,185,129,0.2)' : 'transparent', color: stockDir === 'in' ? '#10b981' : '#9ca3af', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <TrendingUp size={14} /> Stock In
                </button>
                <button onClick={() => setStockDir('out')} style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', background: stockDir === 'out' ? 'rgba(239,68,68,0.2)' : 'transparent', color: stockDir === 'out' ? '#ef4444' : '#9ca3af', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <TrendingDown size={14} /> Stock Out
                </button>
              </div>

              <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#6b7280' }}>Current Stock</span>
                <strong style={{ color: '#f2f2f7' }}>{stockModal.stock_qty.toFixed(1)} kg</strong>
              </div>

              <label style={S.label}>Quantity (kg)
                <input style={S.input} type="number" min="0.1" step="0.1" value={stockQty} onChange={e => setStockQty(e.target.value)} placeholder="0.0" autoFocus />
              </label>

              {stockQty && parseFloat(stockQty) > 0 && (
                <div style={{ padding: '10px 14px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 8, fontSize: 13, color: '#93c5fd' }}>
                  New stock: {Math.max(0, stockModal.stock_qty + (stockDir === 'in' ? 1 : -1) * parseFloat(stockQty || 0)).toFixed(1)} kg
                </div>
              )}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setStockModal(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleStockAdj} disabled={!stockQty || parseFloat(stockQty) <= 0}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: stockDir === 'in' ? '#10b981' : '#ef4444', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                {stockDir === 'in' ? 'Add Stock' : 'Remove Stock'}
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
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f2f2f7' }}>Delete Product</h2>
              <button onClick={() => setDeleteTarget(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#d1d5db' }}>
                Are you sure you want to delete <strong style={{ color: '#f2f2f7' }}>{deleteTarget.name}</strong>? This action cannot be undone.
              </p>
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, fontSize: 12, color: '#fca5a5' }}>
                Current stock: {deleteTarget.stock_qty.toFixed(1)} kg · Value: AED {(deleteTarget.stock_qty * deleteTarget.price_per_unit).toFixed(2)}
              </div>
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
          {toast.type === 'success' ? <CheckCircle2 size={15} /> : null}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
