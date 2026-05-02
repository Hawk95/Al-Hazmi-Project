import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Check, AlertCircle, WifiOff } from 'lucide-react';
import { getProducts, createOrder } from '../api/erp';

const uid = () => Math.random().toString(36).slice(2);

const newRow = () => ({
  _id: uid(),
  product_id: null,
  product_name: '',
  category: '',
  unit: 'kg',
  quantity: '1',
  unit_price: '0',
  discount_pct: '0',
});

const rowTotal = r => {
  const qty   = parseFloat(r.quantity)     || 0;
  const price = parseFloat(r.unit_price)   || 0;
  const disc  = parseFloat(r.discount_pct) || 0;
  return Math.max(0, qty * price * (1 - disc / 100));
};

/* ── Product autocomplete cell ─────────────────────── */
function ProductCell({ row, products, onChange }) {
  const [open, setOpen]   = useState(false);
  const [q, setQ]         = useState(row.product_name);
  const ref               = useRef(null);

  useEffect(() => { setQ(row.product_name); }, [row.product_name]);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const hits = products.filter(p => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8);

  const pick = p => {
    onChange({
      product_id:   p.id,
      product_name: p.name,
      category:     p.category || '',
      unit:         p.unit,
      unit_price:   String(p.price_per_unit),
    });
    setQ(p.name);
    setOpen(false);
  };

  return (
    <div className="co-product-cell" ref={ref}>
      <input
        className="co-cell-input co-product-input"
        value={q}
        placeholder="Search or type product…"
        onChange={e => {
          setQ(e.target.value);
          onChange({ product_name: e.target.value, product_id: null });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && hits.length > 0 && (
        <div className="co-product-dropdown">
          {hits.map(p => (
            <div key={p.id} className="co-product-option" onMouseDown={() => pick(p)}>
              <div className="co-po-name">{p.name}</div>
              <div className="co-po-meta">
                <span className="co-po-cat">{p.category}</span>
                <span>AED {p.price_per_unit.toFixed(2)} / {p.unit}</span>
                <span className={p.stock_qty <= p.min_threshold ? 'co-po-low' : 'co-po-stock'}>
                  {p.stock_qty} {p.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────── */
export default function CreateOrder() {
  const [products, setProducts]   = useState([]);
  const [rows, setRows]           = useState([newRow()]);
  const [customer, setCustomer]   = useState({ name: '', phone: '', address: '' });
  const [notes, setNotes]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(null);
  const [error, setError]         = useState('');
  const [offline, setOffline]     = useState(false);
  const [focusId, setFocusId]     = useState(null);

  /* Load products — also serves as connectivity check */
  useEffect(() => {
    getProducts()
      .then(data => { setProducts(data); setOffline(false); })
      .catch(e => {
        if (e.response?.status === 401 || e.response?.status === 403) {
          window.location.href = '/login';
        } else {
          setOffline(true);
        }
      });
  }, []);

  const updateRow = (id, patch) =>
    setRows(prev => prev.map(r => r._id === id ? { ...r, ...patch } : r));

  const addRow    = () => setRows(prev => [...prev, newRow()]);
  const removeRow = id  => setRows(prev => prev.length > 1 ? prev.filter(r => r._id !== id) : prev);

  const subtotal      = rows.reduce((s, r) => s + rowTotal(r), 0);
  const totalDiscount = rows.reduce((s, r) => {
    const qty   = parseFloat(r.quantity)     || 0;
    const price = parseFloat(r.unit_price)   || 0;
    const disc  = parseFloat(r.discount_pct) || 0;
    return s + qty * price * disc / 100;
  }, 0);

  const handleSave = async () => {
    if (!customer.name.trim())  { setError('Customer name is required'); return; }

    const validRows = rows.filter(r => r.product_name.trim() && (parseFloat(r.quantity) || 0) > 0);
    if (!validRows.length)      { setError('Add at least one item with a name and quantity'); return; }

    setSaving(true);
    setError('');

    const payload = {
      customer_name:    customer.name.trim(),
      customer_phone:   customer.phone.trim()   || null,
      customer_address: customer.address.trim() || null,
      notes:            notes.trim()            || null,
      items: validRows.map(r => ({
        product_id:   r.product_id ? Number(r.product_id) : null,
        product_name: r.product_name.trim(),
        quantity:     parseFloat(r.quantity)   || 1,
        unit_price:   parseFloat(r.unit_price) || 0,
      })),
    };

    try {
      const result = await createOrder(payload);
      setSaved(result);
    } catch (e) {
      if (!e.response) {
        setError('Cannot reach the server. Make sure the backend is running (start_backend.bat).');
        setOffline(true);
      } else if (Array.isArray(e.response?.data?.detail)) {
        setError(e.response.data.detail.map(d => d.msg).join(' · '));
      } else {
        setError(e.response?.data?.detail || e.message || 'Failed to save order');
      }
    } finally {
      setSaving(false);
    }
  };

  /* ── Success screen ── */
  if (saved) {
    return (
      <div className="co-shell">
        <div className="co-success-screen">
          <div className="co-success-icon"><Check size={32} strokeWidth={2.5} /></div>
          <h2>Order Created</h2>
          <p className="co-success-num">{saved.order_number}</p>
          <p className="co-success-sub">
            Total: <strong>AED {saved.total_amount.toFixed(2)}</strong> · {saved.customer_name}
          </p>
          <div className="co-success-actions">
            <button
              className="co-btn-outline"
              onClick={() => { setSaved(null); setRows([newRow()]); setCustomer({ name: '', phone: '', address: '' }); setNotes(''); }}
            >
              New Order
            </button>
            <button className="co-btn-primary" onClick={() => window.close()}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="co-shell">
      {/* ── Top bar ── */}
      <header className="co-topbar">
        <div className="co-topbar-left">
          <div className="co-logo">
            <div className="header-logo-icon">AH</div>
            <div className="header-logo-text">
              <span className="header-logo-name">Al Hazmi</span>
              <span className="header-logo-sub">New Order</span>
            </div>
          </div>
        </div>

        <div className="co-topbar-center">
          <span className="co-topbar-title">Create Order</span>
          {rows.filter(r => r.product_name).length > 0 && (
            <span className="co-topbar-badge">
              {rows.filter(r => r.product_name).length} item{rows.filter(r => r.product_name).length !== 1 ? 's' : ''}
              {' · '}AED {subtotal.toFixed(2)}
            </span>
          )}
        </div>

        <div className="co-topbar-right">
          <button className="co-btn-outline" onClick={() => window.close()}>Cancel</button>
          <button className="co-btn-primary" onClick={handleSave} disabled={saving || offline}>
            {saving ? 'Saving…' : 'Save Order'}
          </button>
        </div>
      </header>

      {/* ── Banners ── */}
      {offline && (
        <div className="co-error-bar">
          <WifiOff size={14} />
          Backend is offline. Run <strong style={{ margin: '0 4px' }}>start_backend.bat</strong> then refresh this page.
        </div>
      )}
      {error && !offline && (
        <div className="co-error-bar"><AlertCircle size={14} />{error}</div>
      )}

      {/* ── Customer info ── */}
      <div className="co-customer-panel">
        <div className="co-customer-fields">
          <div className="co-field-group">
            <label className="co-field-label">Customer Name *</label>
            <input
              className="co-field-input"
              value={customer.name}
              onChange={e => setCustomer(p => ({ ...p, name: e.target.value }))}
              placeholder="Full name"
            />
          </div>
          <div className="co-field-group">
            <label className="co-field-label">Phone</label>
            <input
              className="co-field-input"
              value={customer.phone}
              onChange={e => setCustomer(p => ({ ...p, phone: e.target.value }))}
              placeholder="+971 XX XXX XXXX"
            />
          </div>
          <div className="co-field-group co-field-wide">
            <label className="co-field-label">Delivery Address</label>
            <input
              className="co-field-input"
              value={customer.address}
              onChange={e => setCustomer(p => ({ ...p, address: e.target.value }))}
              placeholder="Full delivery address"
            />
          </div>
          <div className="co-field-group co-field-wide">
            <label className="co-field-label">Notes</label>
            <input
              className="co-field-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Special instructions, cold chain requirements…"
            />
          </div>
        </div>
      </div>

      {/* ── Items table ── */}
      <div className="co-table-section">
        <div className="co-table-wrap">
          <table className="co-table">
            <thead>
              <tr>
                <th className="co-th-num">#</th>
                <th className="co-th-product">Product</th>
                <th className="co-th-cat">Category</th>
                <th className="co-th-qty">Qty</th>
                <th className="co-th-unit">Unit</th>
                <th className="co-th-price">Unit Price (AED)</th>
                <th className="co-th-disc">Disc %</th>
                <th className="co-th-total">Total (AED)</th>
                <th className="co-th-del"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row._id}
                  className={`co-row${focusId === row._id ? ' co-row-focus' : ''}`}
                  onClick={() => setFocusId(row._id)}
                >
                  <td className="co-td-num">{i + 1}</td>

                  <td className="co-td-product">
                    <ProductCell row={row} products={products} onChange={patch => updateRow(row._id, patch)} />
                  </td>

                  <td className="co-td-cat">
                    {row.category
                      ? <span className="co-cat-badge">{row.category}</span>
                      : <span className="co-empty-cell">—</span>}
                  </td>

                  <td className="co-td-qty">
                    <div className="co-qty-wrap">
                      <button
                        className="co-qty-btn"
                        type="button"
                        onClick={() => updateRow(row._id, { quantity: String(Math.max(0.1, (parseFloat(row.quantity) || 1) - 1)) })}
                      >−</button>
                      <input
                        className="co-cell-input co-qty-input"
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={row.quantity}
                        onChange={e => updateRow(row._id, { quantity: e.target.value })}
                      />
                      <button
                        className="co-qty-btn"
                        type="button"
                        onClick={() => updateRow(row._id, { quantity: String((parseFloat(row.quantity) || 1) + 1) })}
                      >+</button>
                    </div>
                  </td>

                  <td className="co-td-unit">
                    <select
                      className="co-cell-input co-unit-select"
                      value={row.unit}
                      onChange={e => updateRow(row._id, { unit: e.target.value })}
                    >
                      {['kg', 'g', 'piece', 'box', 'pack'].map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </td>

                  <td className="co-td-price">
                    <input
                      className="co-cell-input co-num-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.unit_price}
                      onChange={e => updateRow(row._id, { unit_price: e.target.value })}
                    />
                  </td>

                  <td className="co-td-disc">
                    <input
                      className="co-cell-input co-num-input"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={row.discount_pct}
                      onChange={e => updateRow(row._id, { discount_pct: e.target.value })}
                    />
                  </td>

                  <td className="co-td-total">
                    <span className="co-row-total">
                      {rowTotal(row).toFixed(2)}
                      {parseFloat(row.discount_pct) > 0 && (
                        <span className="co-disc-tag">−{row.discount_pct}%</span>
                      )}
                    </span>
                  </td>

                  <td className="co-td-del">
                    <button className="co-del-btn" type="button" onClick={() => removeRow(row._id)}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className="co-add-row" type="button" onClick={addRow}>
            <Plus size={13} strokeWidth={2} /> Add Item
          </button>
        </div>

        {/* ── Totals ── */}
        <div className="co-totals">
          <div className="co-total-row">
            <span>Subtotal ({rows.filter(r => r.product_name).length} item{rows.filter(r => r.product_name).length !== 1 ? 's' : ''})</span>
            <span>AED {(subtotal + totalDiscount).toFixed(2)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="co-total-row co-disc-row">
              <span>Discount</span>
              <span>− AED {totalDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="co-total-row co-grand-total">
            <span>Grand Total</span>
            <span>AED {subtotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
