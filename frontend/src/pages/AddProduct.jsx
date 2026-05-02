import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Check, AlertCircle, Package } from 'lucide-react';
import { getSuppliers, createProduct } from '../api/erp';

const CATEGORIES = ['Beef', 'Lamb', 'Chicken', 'Seafood', 'Veal', 'Goat', 'Other'];
const UNITS = ['kg', 'g', 'piece', 'box', 'pack'];
const uid = () => Math.random().toString(36).slice(2);

const newRow = () => ({
  _id: uid(),
  name: '',
  category: 'Beef',
  unit: 'kg',
  price_per_unit: '',
  stock_qty: '0',
  min_threshold: '10',
  supplier_id: '',
  is_active: true,
});

function CellSelect({ value, options, onChange, placeholder }) {
  return (
    <select
      className="co-cell-input co-unit-select"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  );
}

export default function AddProduct() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [rows, setRows] = useState([newRow(), newRow(), newRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(0);
  const [rowErrors, setRowErrors] = useState({});

  useEffect(() => { getSuppliers().then(setSuppliers).catch(() => {}); }, []);

  const updateRow = (id, patch) =>
    setRows(prev => prev.map(r => r._id === id ? { ...r, ...patch } : r));

  const addRow = () => setRows(prev => [...prev, newRow()]);
  const removeRow = id => setRows(prev => prev.length > 1 ? prev.filter(r => r._id !== id) : prev);

  const validate = () => {
    const errs = {};
    rows.forEach(r => {
      if (!r.name.trim()) errs[r._id] = 'Name required';
      else if (!r.price_per_unit || isNaN(r.price_per_unit) || parseFloat(r.price_per_unit) < 0)
        errs[r._id] = 'Valid price required';
    });
    return errs;
  };

  const handleSave = async () => {
    // only save rows that have a name filled in
    const filledRows = rows.filter(r => r.name.trim());
    if (!filledRows.length) { setError('Fill in at least one product name'); return; }

    const errs = validate();
    const filledErrs = Object.fromEntries(Object.entries(errs).filter(([id]) => filledRows.some(r => r._id === id)));
    if (Object.keys(filledErrs).length) { setRowErrors(filledErrs); setError('Fix highlighted errors before saving'); return; }

    setSaving(true); setError(''); setRowErrors({});
    let count = 0;
    const failures = [];
    for (const r of filledRows) {
      try {
        await createProduct({
          name: r.name.trim(),
          category: r.category || null,
          unit: r.unit,
          price_per_unit: parseFloat(r.price_per_unit),
          stock_qty: parseFloat(r.stock_qty || 0),
          min_threshold: parseFloat(r.min_threshold || 10),
          supplier_id: r.supplier_id ? parseInt(r.supplier_id) : null,
          is_active: r.is_active,
        });
        count++;
      } catch (e) {
        failures.push(`"${r.name}": ${e.response?.data?.detail || 'failed'}`);
      }
    }
    setSaving(false);
    setSaved(count);
    if (failures.length) setError(failures.join(' · '));
    if (count > 0) setRows([newRow(), newRow(), newRow()]);
  };

  const supplierOptions = suppliers.map(s => ({ value: s.id, label: s.name }));

  return (
    <div className="co-shell">
      {/* Top bar */}
      <header className="co-topbar">
        <div className="co-topbar-left">
          <button className="co-btn-outline" style={{ gap: 6, display: 'flex', alignItems: 'center' }} onClick={() => navigate('/inventory')}>
            <ArrowLeft size={14} /> Inventory
          </button>
        </div>
        <div className="co-topbar-center">
          <Package size={15} style={{ color: 'var(--text-muted)' }} />
          <span className="co-topbar-title">Add Products</span>
          {rows.filter(r => r.name.trim()).length > 0 && (
            <span className="co-topbar-badge">
              {rows.filter(r => r.name.trim()).length} product{rows.filter(r => r.name.trim()).length !== 1 ? 's' : ''} ready
            </span>
          )}
        </div>
        <div className="co-topbar-right">
          <button className="co-btn-outline" onClick={() => navigate('/inventory')}>Cancel</button>
          <button className="co-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Products'}
          </button>
        </div>
      </header>

      {/* Status bar */}
      {error && (
        <div className="co-error-bar"><AlertCircle size={14} />{error}</div>
      )}
      {saved > 0 && !error && (
        <div className="co-success-bar">
          <Check size={14} />
          {saved} product{saved !== 1 ? 's' : ''} saved successfully. Add more below or go back to Inventory.
        </div>
      )}

      {/* Hint */}
      <div className="ap-hint">
        <span>Fill in product rows below. Empty rows are ignored on save. Click any cell to edit inline.</span>
      </div>

      {/* Table */}
      <div className="co-table-section" style={{ paddingTop: 0 }}>
        <div className="co-table-wrap">
          <table className="co-table" style={{ minWidth: 1000 }}>
            <thead>
              <tr>
                <th className="co-th-num">#</th>
                <th style={{ minWidth: 220 }}>Product Name *</th>
                <th style={{ width: 110 }}>Category</th>
                <th style={{ width: 80 }}>Unit</th>
                <th style={{ width: 130 }}>Price / Unit (AED)</th>
                <th style={{ width: 110 }}>Stock Qty</th>
                <th style={{ width: 110 }}>Min Threshold</th>
                <th style={{ minWidth: 160 }}>Supplier</th>
                <th style={{ width: 60 }}>Active</th>
                <th className="co-th-del"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row._id}
                  className={`co-row${rowErrors[row._id] ? ' ap-row-error' : ''}${row.name.trim() ? ' ap-row-filled' : ''}`}
                >
                  <td className="co-td-num">{i + 1}</td>

                  {/* Name */}
                  <td>
                    <input
                      className="co-cell-input"
                      value={row.name}
                      onChange={e => updateRow(row._id, { name: e.target.value })}
                      placeholder="e.g. Beef Ribs Premium"
                    />
                    {rowErrors[row._id] && (
                      <div className="ap-cell-error">{rowErrors[row._id]}</div>
                    )}
                  </td>

                  {/* Category */}
                  <td>
                    <CellSelect
                      value={row.category}
                      options={CATEGORIES}
                      onChange={v => updateRow(row._id, { category: v })}
                    />
                  </td>

                  {/* Unit */}
                  <td>
                    <CellSelect
                      value={row.unit}
                      options={UNITS}
                      onChange={v => updateRow(row._id, { unit: v })}
                    />
                  </td>

                  {/* Price */}
                  <td>
                    <input
                      className="co-cell-input co-num-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.price_per_unit}
                      onChange={e => updateRow(row._id, { price_per_unit: e.target.value })}
                      placeholder="0.00"
                    />
                  </td>

                  {/* Stock Qty */}
                  <td>
                    <input
                      className="co-cell-input co-num-input"
                      type="number"
                      min="0"
                      step="0.1"
                      value={row.stock_qty}
                      onChange={e => updateRow(row._id, { stock_qty: e.target.value })}
                    />
                  </td>

                  {/* Min Threshold */}
                  <td>
                    <input
                      className="co-cell-input co-num-input"
                      type="number"
                      min="0"
                      step="0.1"
                      value={row.min_threshold}
                      onChange={e => updateRow(row._id, { min_threshold: e.target.value })}
                    />
                  </td>

                  {/* Supplier */}
                  <td>
                    <CellSelect
                      value={row.supplier_id}
                      options={supplierOptions}
                      onChange={v => updateRow(row._id, { supplier_id: v })}
                      placeholder="— None —"
                    />
                  </td>

                  {/* Active */}
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className="ap-checkbox"
                      checked={row.is_active}
                      onChange={e => updateRow(row._id, { is_active: e.target.checked })}
                    />
                  </td>

                  {/* Delete */}
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
            <Plus size={13} strokeWidth={2} /> Add Row
          </button>
        </div>

        {/* Footer summary */}
        <div className="ap-footer">
          <div className="ap-footer-info">
            <span className="ap-footer-count">{rows.filter(r => r.name.trim()).length}</span>
            <span className="ap-footer-label">products ready to save</span>
            <span className="ap-footer-sep">·</span>
            <span className="ap-footer-label">{rows.filter(r => !r.name.trim()).length} empty rows (will be ignored)</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="co-btn-outline" onClick={() => setRows([newRow(), newRow(), newRow()])}>Clear All</button>
            <button className="co-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : `Save ${rows.filter(r => r.name.trim()).length || ''} Product${rows.filter(r => r.name.trim()).length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
