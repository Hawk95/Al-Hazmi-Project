import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2, Users,
  Search, Plus, X, Pencil, Trash2, RefreshCw, UserCheck, Zap, TrendingUp, Save,
  Clock, FileText, CheckCircle2, AlertCircle, CalendarDays, DollarSign, TrendingDown, Wallet,
} from 'lucide-react';
import { getCurrentUser, getMe } from '../api/auth';
import {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  getAttendance, saveAttendanceBulk, getPayroll,
} from '../api/erp';

const DEPARTMENTS = ['Management', 'Drivers', 'Warehouse', 'Sales', 'Office', 'Other'];

const STATUS_CFG = {
  not_marked: { label: '— Not Marked —', color: '#4b5563', bg: 'rgba(75,85,99,0.1)',    border: 'rgba(75,85,99,0.25)'   },
  present:    { label: 'Present',        color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.35)' },
  absent:     { label: 'Absent',         color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.35)'  },
  late:       { label: 'Late',           color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)' },
  half_day:   { label: 'Half Day',       color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.35)' },
  leave:      { label: 'Leave',          color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.35)' },
};

const DEPT_CFG = {
  Management: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.28)' },
  Drivers:    { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.28)'  },
  Warehouse:  { color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.28)'  },
  Sales:      { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.28)'  },
  Office:     { color: '#e879f9', bg: 'rgba(232,121,249,0.12)', border: 'rgba(232,121,249,0.28)' },
  Other:      { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)',  border: 'rgba(156,163,175,0.22)' },
};

const AVATAR_PALETTE = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316','#eab308','#10b981','#06b6d4','#3b82f6','#a78bfa'];
const avatarColor = name => { let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h); return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]; };
const nameInitials = name => name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY_EMP = () => ({ name: '', department: 'Office', position: '', phone: '', email: '', is_active: true, shift_start: '09:00', shift_end: '18:00', monthly_salary: '', hourly_rate: '', portal_pin: '' });

const S = {
  input:  { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#f2f2f7', outline: 'none', boxSizing: 'border-box', caretColor: '#f2f2f7' },
  label:  { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 500, color: '#9ca3af' },
  th:     { padding: '13px 16px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.025)', whiteSpace: 'nowrap' },
  td:     { padding: '13px 16px', fontSize: 13, color: '#e5e7eb', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' },
  cellIn: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 7, padding: '6px 9px', fontSize: 12, color: '#f2f2f7', outline: 'none', caretColor: '#f2f2f7', boxSizing: 'border-box', transition: 'border-color 0.15s' },
};

function sidebarBtn(path, icon, label, active, nav) {
  return (
    <button className={`sidebar-item${active ? ' active' : ''}`} type="button" onClick={() => !active && nav(path)}>
      {icon}{label}
    </button>
  );
}

export default function HR({ isModal = false, onClose = null }) {
  const navigate = useNavigate();

  const [permitted, setPermitted]   = useState(null);
  const [tab, setTab]               = useState('attendance');
  const [date, setDate]             = useState(today());
  const [deptFilter, setDeptFilter] = useState('');
  const [rows, setRows]             = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState('');
  const [empModal, setEmpModal]     = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [empForm, setEmpForm]       = useState(EMPTY_EMP());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch]         = useState('');
  const [error, setError]           = useState('');
  const [hoveredRow, setHoveredRow] = useState(null);
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrollData, setPayrollData]   = useState([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollDetail, setPayrollDetail]   = useState(null);

  const currentUser = getCurrentUser();
  const userEmail   = currentUser?.sub || '';
  const displayName = userEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const initials    = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(''), 2800); };

  const loadAttendance = async () => {
    setLoading(true);
    try { const data = await getAttendance(date); setRows(data.map(r => ({ ...r, dirty: false }))); }
    catch { showToast('Failed to load attendance', 'error'); }
    setLoading(false);
  };

  const loadEmployees = async () => { try { setEmployees(await getEmployees()); } catch {} };

  const loadPayroll = async (month) => {
    setPayrollLoading(true);
    try { setPayrollData(await getPayroll(month)); } catch { showToast('Failed to load payroll', 'error'); }
    setPayrollLoading(false);
  };

  useEffect(() => {
    getMe().then(p => { if (p.is_admin || p.hr_access) setPermitted(true); else { if (isModal) onClose?.(); else navigate('/dashboard'); } })
           .catch(() => { if (isModal) onClose?.(); else navigate('/dashboard'); });
  }, []);

  useEffect(() => { if (permitted) loadAttendance(); }, [date, permitted]);
  useEffect(() => { if (permitted) loadEmployees();  }, [permitted]);
  useEffect(() => { if (permitted && tab === 'payroll') loadPayroll(payrollMonth); }, [permitted, tab, payrollMonth]);

  const updateRow = (empId, field, value) =>
    setRows(prev => prev.map(r => {
      if (r.employee_id !== empId) return r;
      const updated = { ...r, [field]: value, dirty: true };
      if (field === 'check_in' && (r.status === 'present' || r.status === 'late' || r.status === 'not_marked')) {
        if (value) {
          const threshold = r.shift_start || '09:00';
          updated.status = value > threshold ? 'late' : 'present';
        }
      }
      return updated;
    }));

  const saveAll = async () => {
    if (!rows.length) return;
    setSaving(true);
    try {
      const toSave = rows.filter(r => r.status !== 'not_marked');
      if (!toSave.length) { setSaving(false); showToast('Nothing to save'); return; }
      await saveAttendanceBulk({ records: toSave.map(r => ({ employee_id: r.employee_id, employee_name: r.employee_name, attendance_date: date, status: r.status, check_in: r.check_in || null, check_out: r.check_out || null, notes: r.notes || '' })) });
      setRows(prev => prev.map(r => ({ ...r, dirty: false })));
      showToast('Attendance saved');
    } catch { showToast('Failed to save', 'error'); }
    setSaving(false);
  };

  const openAddEmp  = () => { setEmpForm(EMPTY_EMP()); setEditingEmp(null); setError(''); setEmpModal(true); };
  const openEditEmp = e => { setEmpForm({ name: e.name, department: e.department || 'Office', position: e.position || '', phone: e.phone || '', email: e.email || '', is_active: e.is_active, shift_start: e.shift_start || '09:00', shift_end: e.shift_end || '18:00', monthly_salary: e.monthly_salary || '', hourly_rate: e.hourly_rate || '', portal_pin: e.portal_pin || '' }); setEditingEmp(e); setError(''); setEmpModal(true); };

  const saveEmp = async () => {
    if (!empForm.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    const payload = {
      ...empForm,
      monthly_salary: empForm.monthly_salary === '' ? 0 : parseFloat(empForm.monthly_salary) || 0,
      hourly_rate:    empForm.hourly_rate    === '' ? 0 : parseFloat(empForm.hourly_rate)    || 0,
      portal_pin:     empForm.portal_pin     || null,
    };
    try {
      if (editingEmp) await updateEmployee(editingEmp.id, payload);
      else            await createEmployee(payload);
      await loadEmployees(); await loadAttendance();
      setEmpModal(false);
      showToast(editingEmp ? 'Employee updated' : 'Employee added');
    } catch { setError('Failed to save employee'); }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteEmployee(deleteTarget.id); await loadEmployees(); await loadAttendance(); showToast('Employee deleted'); }
    catch { showToast('Failed to delete', 'error'); }
    setDeleteTarget(null);
  };

  const filtered     = deptFilter ? rows.filter(r => r.department === deptFilter) : rows;
  const searchedEmps = employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));
  const dirtyCount   = rows.filter(r => r.dirty).length;
  const rowCounts    = rows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  const sb = (path, icon, label, active = false) => sidebarBtn(path, icon, label, active, navigate);

  if (!permitted) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: isModal ? '100%' : '100vh', background: '#13131a', color: '#6b7280', fontSize: 14 }}>
      Checking access…
    </div>
  );

  return (
    <div style={{ display: 'flex', ...(isModal ? { height: '100%' } : { minHeight: '100vh' }), background: 'var(--bg-primary, #13131a)', color: 'var(--text-primary, #f2f2f7)', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Sidebar ── */}
      <aside className="sidebar" style={{ display: isModal ? 'none' : undefined }}>
        <div className="sidebar-logo-area">
          <div className="header-logo-icon">AH</div>
          <div className="header-logo-text"><span className="header-logo-name">Al Hazmi</span><span className="header-logo-sub">Meat ERP</span></div>
        </div>
        <nav className="sidebar-nav">
          <span className="sidebar-group-label">Main</span>
          {sb('/dashboard',   <LayoutDashboard size={15} strokeWidth={1.5} />, 'Overview')}
          {sb('/inventory',   <Package         size={15} strokeWidth={1.5} />, 'Inventory')}
          {sb('/orders',      <ShoppingCart    size={15} strokeWidth={1.5} />, 'Orders')}
          {sb('/suppliers',   <Truck           size={15} strokeWidth={1.5} />, 'Suppliers')}
          {sb('/deliveries',  <MapPin          size={15} strokeWidth={1.5} />, 'Deliveries')}
          {sb('/sales',       <TrendingUp      size={15} strokeWidth={1.5} />, 'Sales Distribution')}
          <span className="sidebar-group-label">Analytics</span>
          {sb('/reports',     <BarChart2       size={15} strokeWidth={1.5} />, 'Reports')}
          {sb('/forecast',    <Zap             size={15} strokeWidth={1.5} />, 'AI Forecast')}
          <span className="sidebar-group-label">People</span>
          {sb('/hr',          <UserCheck       size={15} strokeWidth={1.5} />, 'HR Attendance', true)}
          <span className="sidebar-group-label">Admin</span>
          {sb('/admin/users', <Users           size={15} strokeWidth={1.5} />, 'User Management')}
        </nav>
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="sidebar-footer-avatar">{initials[0]}</div>
          <div className="sidebar-footer-info">
            <div className="sidebar-footer-name">{displayName}</div>
            <div className="sidebar-footer-serial">Al Hazmi ERP</div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="dashboard-content page-enter" style={{ paddingTop: 0, ...(isModal ? { flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden' } : {}) }}>

        {/* Header */}
        <div className="um2-page-header">
          <div>
            <h1 className="um2-page-title">HR Attendance</h1>
            <p className="um2-page-sub">Track daily staff attendance</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isModal && (
              <button type="button" onClick={onClose}
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '8px 16px', color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <X size={13} /> Close
              </button>
            )}
            <button type="button" onClick={() => { loadAttendance(); loadEmployees(); }}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', color: '#9ca3af', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={13} /> Refresh
            </button>
            {tab === 'attendance' && (
              <button type="button" onClick={saveAll} disabled={saving || !rows.length}
                style={{ background: saving ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg,#10b981,#059669)', border: 'none', borderRadius: 8, padding: '8px 20px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: saving ? 'none' : '0 4px 14px rgba(16,185,129,0.3)' }}>
                <Save size={13} />{saving ? 'Saving…' : `Save All${dirtyCount ? ` (${dirtyCount})` : ''}`}
              </button>
            )}
            {tab === 'employees' && (
              <button type="button" onClick={openAddEmp}
                style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', borderRadius: 8, padding: '8px 20px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 14px rgba(59,130,246,0.3)' }}>
                <Plus size={13} /> Add Employee
              </button>
            )}
          </div>
        </div>

        {/* Summary chips */}
        <div style={{ display: 'flex', gap: 10, padding: '0 24px 20px', flexWrap: 'wrap' }}>
          {[
            { key: 'total',      label: 'Total Staff',  value: rows.length,                                                                    color: '#6b7280', icon: <Users size={14} /> },
            { key: 'not_marked', label: 'Not Marked',   value: rowCounts.not_marked || 0,                                                      color: '#4b5563', icon: <AlertCircle size={14} /> },
            { key: 'at_work',    label: 'At Work',      value: (rowCounts.present||0)+(rowCounts.late||0)+(rowCounts.half_day||0),             color: '#10b981', icon: <CheckCircle2 size={14} /> },
            { key: 'absent',     label: 'Absent',       value: rowCounts.absent    || 0,                                                       color: '#ef4444', icon: <AlertCircle size={14} /> },
            { key: 'late',       label: 'Late',         value: rowCounts.late      || 0,                                                       color: '#f59e0b', icon: <Clock size={14} /> },
            { key: 'half_day',   label: 'Half Day',     value: rowCounts.half_day  || 0,                                                       color: '#3b82f6', icon: <CalendarDays size={14} /> },
            { key: 'leave',      label: 'On Leave',     value: rowCounts.leave     || 0,                                                       color: '#8b5cf6', icon: <FileText size={14} /> },
          ].map(c => (
            <div key={c.key} style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))`, border: `1px solid ${c.color}28`, borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 120 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c.color}18`, border: `1px solid ${c.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, flexShrink: 0 }}>
                {c.icon}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#f2f2f7', lineHeight: 1 }}>{c.value}</div>
                <div style={{ fontSize: 11, color: c.color, marginTop: 3, fontWeight: 500 }}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + controls */}
        <div style={{ padding: '0 24px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 3, gap: 2 }}>
            {[['attendance', 'Attendance'], ['employees', 'Employees'], ['payroll', 'Payroll']].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setTab(key)}
                style={{ padding: '7px 20px', borderRadius: 8, border: 'none', background: tab === key ? 'rgba(255,255,255,0.1)' : 'transparent', color: tab === key ? '#f2f2f7' : '#6b7280', fontSize: 13, fontWeight: tab === key ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'attendance' && (
            <>
              <div style={{ position: 'relative' }}>
                <CalendarDays size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  style={{ ...S.input, width: 175, paddingLeft: 30 }} />
              </div>
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                style={{ ...S.input, width: 175 }}>
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </>
          )}
          {tab === 'employees' && (
            <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
              <input placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ ...S.input, paddingLeft: 30 }} />
            </div>
          )}
          {tab === 'payroll' && (
            <div style={{ position: 'relative' }}>
              <CalendarDays size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
              <input type="month" value={payrollMonth} onChange={e => setPayrollMonth(e.target.value)}
                style={{ ...S.input, width: 185, paddingLeft: 30, colorScheme: 'dark' }} />
            </div>
          )}
        </div>

        {/* ── Tables ── */}
        <div style={{ padding: '0 24px 40px' }}>

          {/* Attendance table */}
          {tab === 'attendance' && (
            <div style={{ background: 'var(--bg-card,#1e1e2a)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
              {loading ? (
                <div style={{ padding: 80, textAlign: 'center', color: '#6b7280' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTopColor: '#3b82f6', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
                  Loading attendance…
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 80, textAlign: 'center', color: '#6b7280' }}>
                  <UserCheck size={40} style={{ opacity: 0.2, display: 'block', margin: '0 auto 14px' }} />
                  <div style={{ fontSize: 14 }}>No employees found. Switch to the Employees tab and add staff first.</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...S.th, width: 44, textAlign: 'center' }}>#</th>
                        <th style={{ ...S.th, minWidth: 190 }}>Employee</th>
                        <th style={{ ...S.th, minWidth: 120 }}>Department</th>
                        <th style={{ ...S.th, minWidth: 140 }}>Attendance</th>
                        <th style={{ ...S.th, minWidth: 100 }}>Arrival</th>
                        <th style={{ ...S.th, minWidth: 155 }}>Check In</th>
                        <th style={{ ...S.th, minWidth: 75  }}>Via</th>
                        <th style={{ ...S.th, minWidth: 155 }}>Check Out</th>
                        <th style={{ ...S.th, minWidth: 190 }}>Notes</th>
                        <th style={{ ...S.th, width: 50, textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row, idx) => {
                        const isNotMarked = row.status === 'not_marked';
                        const isPhysical  = row.status === 'present' || row.status === 'late';
                        const noTime      = isPhysical && !row.check_in;
                        const attendVal   = isPhysical ? 'present' : row.status;
                        const attendOpts  = ['not_marked', 'present', 'absent', 'half_day', 'leave'];
                        const attendCfg   = noTime
                          ? { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.35)' }
                          : STATUS_CFG[attendVal] || STATUS_CFG.not_marked;
                        const isLate      = row.status === 'late';
                        const isHovered  = hoveredRow === row.employee_id;
                        const deptCfg    = DEPT_CFG[row.department] || DEPT_CFG.Other;
                        const aColor     = avatarColor(row.employee_name);

                        const handleAttendChange = val => {
                          if (val === 'present') {
                            const threshold = row.shift_start || '09:00';
                            updateRow(row.employee_id, 'status', (row.check_in && row.check_in > threshold) ? 'late' : 'present');
                          } else if (val === 'not_marked') {
                            updateRow(row.employee_id, 'status', 'not_marked');
                          } else {
                            updateRow(row.employee_id, 'status', val);
                          }
                        };

                        return (
                          <tr key={row.employee_id}
                            onMouseEnter={() => setHoveredRow(row.employee_id)}
                            onMouseLeave={() => setHoveredRow(null)}
                            style={{
                              background: row.dirty ? 'rgba(59,130,246,0.05)' : isHovered ? 'rgba(255,255,255,0.02)' : 'transparent',
                              borderLeft: row.dirty ? '3px solid #3b82f6' : '3px solid transparent',
                              transition: 'background 0.12s',
                            }}>

                            {/* # */}
                            <td style={{ ...S.td, color: '#4b5563', fontSize: 12, textAlign: 'center', width: 44 }}>{idx + 1}</td>

                            {/* Employee */}
                            <td style={{ ...S.td }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${aColor}22`, border: `1.5px solid ${aColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: aColor, flexShrink: 0, letterSpacing: 0.5 }}>
                                  {nameInitials(row.employee_name)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: '#f2f2f7', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {row.employee_name}
                                    {row.dirty && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', flexShrink: 0, display: 'inline-block' }} />}
                                  </div>
                                  {row.position && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{row.position}</div>}
                                </div>
                              </div>
                            </td>

                            {/* Department */}
                            <td style={{ ...S.td }}>
                              {row.department ? (
                                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: deptCfg.bg, color: deptCfg.color, border: `1px solid ${deptCfg.border}`, whiteSpace: 'nowrap' }}>
                                  {row.department}
                                </span>
                              ) : <span style={{ color: '#374151' }}>—</span>}
                            </td>

                            {/* Attendance select */}
                            <td style={{ ...S.td }}>
                              <select value={attendVal} onChange={e => handleAttendChange(e.target.value)}
                                style={{ background: attendCfg.bg, border: `1px solid ${attendCfg.border}`, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, color: attendCfg.color, outline: 'none', cursor: 'pointer', width: '100%', appearance: 'none', WebkitAppearance: 'none' }}>
                                {attendOpts.map(s => <option key={s} value={s} style={{ background: '#1e1e2a', color: '#f2f2f7', fontWeight: 400 }}>{STATUS_CFG[s].label}</option>)}
                              </select>
                            </td>

                            {/* Arrival badge */}
                            <td style={{ ...S.td }}>
                              {isPhysical && !noTime ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                  background: isLate ? 'rgba(245,158,11,0.14)' : 'rgba(16,185,129,0.12)',
                                  color:      isLate ? '#f59e0b'              : '#10b981',
                                  border:     `1px solid ${isLate ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.3)'}`,
                                  whiteSpace: 'nowrap',
                                }}>
                                  {isLate ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}
                                  {isLate ? 'Late' : 'On Time'}
                                </span>
                              ) : <span style={{ color: '#374151', fontSize: 13 }}>—</span>}
                            </td>

                            {/* Check In */}
                            <td style={{ ...S.td, padding: '10px 12px' }}>
                              <input type="time" value={row.check_in || ''} onChange={e => updateRow(row.employee_id, 'check_in', e.target.value)}
                                style={{ display: 'block', width: '100%', minWidth: 120, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '6px 10px', fontSize: 13, color: '#f2f2f7', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }} />
                            </td>

                            {/* Via (GPS/Manual badge) */}
                            <td style={{ ...S.td, textAlign: 'center' }}>
                              {row.check_in_method === 'gps' ? (
                                <span title="GPS check-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.28)', whiteSpace: 'nowrap' }}>
                                  📍 GPS
                                </span>
                              ) : row.check_in ? (
                                <span title="Manual check-in" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: 'rgba(107,114,128,0.1)', color: '#6b7280', border: '1px solid rgba(107,114,128,0.2)', whiteSpace: 'nowrap' }}>
                                  ✎ Manual
                                </span>
                              ) : <span style={{ color: '#374151', fontSize: 13 }}>—</span>}
                            </td>

                            {/* Check Out */}
                            <td style={{ ...S.td, padding: '10px 12px' }}>
                              <input type="time" value={row.check_out || ''} onChange={e => updateRow(row.employee_id, 'check_out', e.target.value)}
                                style={{ display: 'block', width: '100%', minWidth: 120, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '6px 10px', fontSize: 13, color: '#f2f2f7', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }} />
                            </td>

                            {/* Notes */}
                            <td style={{ ...S.td }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '1px 8px' }}>
                                <FileText size={11} style={{ color: '#4b5563', flexShrink: 0 }} />
                                <input type="text" value={row.notes || ''} onChange={e => updateRow(row.employee_id, 'notes', e.target.value)}
                                  placeholder="Add note…"
                                  style={{ background: 'transparent', border: 'none', fontSize: 12, color: '#e5e7eb', outline: 'none', padding: '5px 0', flex: 1, caretColor: '#f2f2f7' }} />
                              </div>
                            </td>

                            {/* Edit */}
                            <td style={{ ...S.td, textAlign: 'center' }}>
                              <button type="button"
                                onClick={() => { const emp = employees.find(e => e.id === row.employee_id); if (emp) openEditEmp(emp); }}
                                title="Edit employee"
                                style={{ background: isHovered ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 7, padding: '6px 8px', color: '#60a5fa', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                <Pencil size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Employees table */}
          {tab === 'employees' && (
            <div style={{ background: 'var(--bg-card,#1e1e2a)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, minWidth: 200 }}>Employee</th>
                    <th style={{ ...S.th, minWidth: 120 }}>Department</th>
                    <th style={{ ...S.th, minWidth: 140 }}>Position</th>
                    <th style={{ ...S.th, minWidth: 140 }}>Phone</th>
                    <th style={{ ...S.th, minWidth: 140 }}>Shift Hours</th>
                    <th style={{ ...S.th, minWidth: 90  }}>Status</th>
                    <th style={{ ...S.th, minWidth: 90  }}>Portal PIN</th>
                    <th style={{ ...S.th, minWidth: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {searchedEmps.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ ...S.td, textAlign: 'center', padding: 60, color: '#6b7280' }}>
                        <Users size={36} style={{ opacity: 0.2, display: 'block', margin: '0 auto 14px' }} />
                        No employees yet. Click "Add Employee" to get started.
                      </td>
                    </tr>
                  ) : searchedEmps.map(e => {
                    const deptCfg = DEPT_CFG[e.department] || DEPT_CFG.Other;
                    const aColor  = avatarColor(e.name);
                    return (
                      <tr key={e.id}
                        onMouseEnter={() => setHoveredRow(`e-${e.id}`)}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{ background: hoveredRow === `e-${e.id}` ? 'rgba(255,255,255,0.02)' : 'transparent', transition: 'background 0.12s' }}>

                        <td style={S.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${aColor}22`, border: `1.5px solid ${aColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: aColor, flexShrink: 0 }}>
                              {nameInitials(e.name)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#f2f2f7', fontSize: 13 }}>{e.name}</div>
                              {e.email && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{e.email}</div>}
                            </div>
                          </div>
                        </td>

                        <td style={S.td}>
                          {e.department ? (
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: deptCfg.bg, color: deptCfg.color, border: `1px solid ${deptCfg.border}`, whiteSpace: 'nowrap' }}>
                              {e.department}
                            </span>
                          ) : <span style={{ color: '#374151' }}>—</span>}
                        </td>

                        <td style={{ ...S.td, color: '#9ca3af', fontSize: 12 }}>{e.position || '—'}</td>
                        <td style={{ ...S.td, color: '#9ca3af', fontSize: 12 }}>{e.phone || '—'}</td>

                        <td style={S.td}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 10px' }}>
                            <Clock size={11} style={{ color: '#6b7280' }} />
                            <span style={{ fontSize: 12, color: '#e5e7eb', fontWeight: 500 }}>{e.shift_start || '09:00'}</span>
                            <span style={{ color: '#374151', fontSize: 11 }}>—</span>
                            <span style={{ fontSize: 12, color: '#e5e7eb', fontWeight: 500 }}>{e.shift_end || '18:00'}</span>
                          </div>
                        </td>

                        <td style={S.td}>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: e.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.12)',
                            color: e.is_active ? '#10b981' : '#6b7280',
                            border: `1px solid ${e.is_active ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.3)'}` }}>
                            {e.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        <td style={{ ...S.td, textAlign: 'center' }}>
                          {e.portal_pin ? (
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>Set</span>
                          ) : (
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>Not Set</span>
                          )}
                        </td>

                        <td style={S.td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button type="button" onClick={() => openEditEmp(e)}
                              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 7, padding: '5px 12px', color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500 }}>
                              <Pencil size={11} /> Edit
                            </button>
                            <button type="button" onClick={() => setDeleteTarget(e)}
                              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '5px 12px', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500 }}>
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Payroll tab ── */}
          {tab === 'payroll' && (() => {
            const totalSalary    = payrollData.reduce((s, r) => s + r.monthly_salary, 0);
            const totalDeduction = payrollData.reduce((s, r) => s + r.total_deduction, 0);
            const totalNet       = payrollData.reduce((s, r) => s + r.net_pay, 0);
            const fmtMin = mins => { const h = Math.floor(mins / 60); const m = Math.round(mins % 60); return h ? `${h}h ${m}m` : `${m}m`; };
            const fmtAED = n => `AED ${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            return (
              <>
                {/* Payroll summary cards */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Total Payroll',   value: fmtAED(totalSalary),    color: '#6b7280', icon: <Wallet size={15} /> },
                    { label: 'Total Deductions', value: fmtAED(totalDeduction), color: '#ef4444', icon: <TrendingDown size={15} /> },
                    { label: 'Net Payable',      value: fmtAED(totalNet),       color: '#10b981', icon: <DollarSign size={15} /> },
                  ].map(c => (
                    <div key={c.label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${c.color}25`, borderRadius: 12, padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 200 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 11, background: `${c.color}15`, border: `1px solid ${c.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, flexShrink: 0 }}>{c.icon}</div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#f2f2f7' }}>{c.value}</div>
                        <div style={{ fontSize: 11, color: c.color, fontWeight: 500, marginTop: 2 }}>{c.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'var(--bg-card,#1e1e2a)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflowX: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
                  {payrollLoading ? (
                    <div style={{ padding: 80, textAlign: 'center', color: '#6b7280' }}>Loading payroll…</div>
                  ) : payrollData.length === 0 ? (
                    <div style={{ padding: 80, textAlign: 'center', color: '#6b7280' }}>
                      <DollarSign size={40} style={{ opacity: 0.2, display: 'block', margin: '0 auto 14px' }} />
                      No payroll data for this month. Make sure employees have a monthly salary set.
                    </div>
                  ) : (
                    <div>
                      <table style={{ width: '100%', minWidth: 1300, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ ...S.th, minWidth: 190 }}>Employee</th>
                            <th style={{ ...S.th, minWidth: 110 }}>Department</th>
                            <th style={{ ...S.th, minWidth: 100, textAlign: 'right' }}>Salary/mo</th>
                            <th style={{ ...S.th, minWidth: 100, textAlign: 'right' }}>AED/hr</th>
                            <th style={{ ...S.th, minWidth: 90,  textAlign: 'center' }}>Present</th>
                            <th style={{ ...S.th, minWidth: 80,  textAlign: 'center' }}>Absent</th>
                            <th style={{ ...S.th, minWidth: 80,  textAlign: 'center' }}>Late</th>
                            <th style={{ ...S.th, minWidth: 90,  textAlign: 'center' }}>Half Day</th>
                            <th style={{ ...S.th, minWidth: 100, textAlign: 'right' }}>Late Time</th>
                            <th style={{ ...S.th, minWidth: 110, textAlign: 'right', color: '#f97316' }}>Early Leave</th>
                            <th style={{ ...S.th, minWidth: 120, textAlign: 'right', color: '#e879f9' }}>Missing Hrs</th>
                            <th style={{ ...S.th, minWidth: 110, textAlign: 'right' }}>Late Ded.</th>
                            <th style={{ ...S.th, minWidth: 110, textAlign: 'right' }}>Absent Ded.</th>
                            <th style={{ ...S.th, minWidth: 110, textAlign: 'right', color: '#ef4444' }}>Total Ded.</th>
                            <th style={{ ...S.th, minWidth: 120, textAlign: 'right', color: '#10b981' }}>Net Pay</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payrollData.map(r => {
                            const aColor  = avatarColor(r.employee_name);
                            const deptCfg = DEPT_CFG[r.department] || DEPT_CFG.Other;
                            const hasDeduction = r.total_deduction > 0;
                            return (
                              <tr key={r.employee_id}
                                onMouseEnter={() => setHoveredRow(`p-${r.employee_id}`)}
                                onMouseLeave={() => setHoveredRow(null)}
                                onClick={() => setPayrollDetail(r)}
                                style={{ background: hoveredRow === `p-${r.employee_id}` ? 'rgba(255,255,255,0.05)' : 'transparent', transition: 'background 0.12s', cursor: 'pointer' }}>

                                <td style={S.td}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 9, background: `${aColor}22`, border: `1.5px solid ${aColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: aColor, flexShrink: 0 }}>
                                      {nameInitials(r.employee_name)}
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: 600, color: '#f2f2f7', fontSize: 13 }}>{r.employee_name}</div>
                                      {r.position && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{r.position}</div>}
                                    </div>
                                  </div>
                                </td>

                                <td style={S.td}>
                                  {r.department ? (
                                    <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: deptCfg.bg, color: deptCfg.color, border: `1px solid ${deptCfg.border}`, whiteSpace: 'nowrap' }}>{r.department}</span>
                                  ) : <span style={{ color: '#374151' }}>—</span>}
                                </td>

                                <td style={{ ...S.td, textAlign: 'right', fontWeight: 600, color: '#e5e7eb' }}>
                                  {r.monthly_salary > 0 ? fmtAED(r.monthly_salary) : <span style={{ color: '#4b5563', fontSize: 12 }}>Not set</span>}
                                </td>
                                <td style={{ ...S.td, textAlign: 'right' }}>
                                  {r.hourly_rate > 0 ? (
                                    <span style={{ fontWeight: 600, color: '#a78bfa', fontSize: 13 }}>{r.hourly_rate.toFixed(2)}</span>
                                  ) : (
                                    <span style={{ color: '#4b5563', fontSize: 11 }}>{r.daily_rate > 0 ? `~${(r.hourly_rate).toFixed(2)}` : '—'}</span>
                                  )}
                                </td>

                                <td style={{ ...S.td, textAlign: 'center' }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>{r.present_days}</span>
                                </td>
                                <td style={{ ...S.td, textAlign: 'center' }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: r.absent_days > 0 ? '#ef4444' : '#6b7280' }}>{r.absent_days}</span>
                                </td>
                                <td style={{ ...S.td, textAlign: 'center' }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: r.late_days > 0 ? '#f59e0b' : '#6b7280' }}>{r.late_days}</span>
                                </td>
                                <td style={{ ...S.td, textAlign: 'center' }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: r.half_days > 0 ? '#3b82f6' : '#6b7280' }}>{r.half_days}</span>
                                </td>

                                <td style={{ ...S.td, textAlign: 'right' }}>
                                  {r.total_late_minutes > 0 ? (
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                                      {fmtMin(r.total_late_minutes)}
                                    </span>
                                  ) : <span style={{ color: '#374151', fontSize: 12 }}>—</span>}
                                </td>

                                <td style={{ ...S.td, textAlign: 'right' }}>
                                  {r.total_early_minutes > 0 ? (
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#f97316', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                                      {fmtMin(r.total_early_minutes)}
                                    </span>
                                  ) : <span style={{ color: '#374151', fontSize: 12 }}>—</span>}
                                </td>

                                {(() => {
                                  const total = r.total_late_minutes + r.total_early_minutes;
                                  return (
                                    <td style={{ ...S.td, textAlign: 'right' }}>
                                      {total > 0 ? (
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#e879f9', background: 'rgba(232,121,249,0.1)', border: '1px solid rgba(232,121,249,0.28)', borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                                          {fmtMin(total)}
                                        </span>
                                      ) : <span style={{ color: '#374151', fontSize: 12 }}>—</span>}
                                    </td>
                                  );
                                })()}

                                <td style={{ ...S.td, textAlign: 'right', fontSize: 13, color: r.late_deduction > 0 ? '#f87171' : '#6b7280', fontWeight: r.late_deduction > 0 ? 600 : 400 }}>
                                  {r.late_deduction > 0 ? `- ${fmtAED(r.late_deduction)}` : '—'}
                                </td>
                                <td style={{ ...S.td, textAlign: 'right', fontSize: 13, color: r.absent_deduction > 0 ? '#f87171' : '#6b7280', fontWeight: r.absent_deduction > 0 ? 600 : 400 }}>
                                  {r.absent_deduction > 0 ? `- ${fmtAED(r.absent_deduction)}` : '—'}
                                </td>

                                <td style={{ ...S.td, textAlign: 'right' }}>
                                  {hasDeduction ? (
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                                      - {fmtAED(r.total_deduction)}
                                    </span>
                                  ) : <span style={{ color: '#374151', fontSize: 12 }}>—</span>}
                                </td>

                                <td style={{ ...S.td, textAlign: 'right' }}>
                                  {r.monthly_salary > 0 ? (
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 6, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                                      {fmtAED(r.net_pay)}
                                    </span>
                                  ) : <span style={{ color: '#4b5563', fontSize: 12 }}>—</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {/* Totals row */}
                        <tfoot>
                          <tr style={{ background: 'rgba(255,255,255,0.03)', borderTop: '2px solid rgba(255,255,255,0.08)' }}>
                            <td colSpan={2} style={{ ...S.td, fontWeight: 700, color: '#9ca3af', fontSize: 12 }}>TOTALS</td>
                            <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: '#f2f2f7' }}>{fmtAED(totalSalary)}</td>
                            <td colSpan={5} style={S.td}></td>
                            <td colSpan={5} style={S.td}></td>
                            <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: '#f87171' }}>- {fmtAED(totalDeduction)}</td>
                            <td style={{ ...S.td, textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{fmtAED(totalNet)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </main>

      {/* ── Employee modal ── */}
      {empModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setEmpModal(false)}>
          <div style={{ background: '#1a1a26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: 30, width: '100%', maxWidth: 480, boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f2f2f7', margin: 0 }}>{editingEmp ? 'Edit Employee' : 'Add Employee'}</h3>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Fill in the employee details below</p>
              </div>
              <button type="button" onClick={() => setEmpModal(false)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer', padding: '6px 7px', borderRadius: 8, display: 'flex', alignItems: 'center' }}>
                <X size={15} />
              </button>
            </div>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 18 }}>
                {error}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label style={{ ...S.label, gridColumn: '1/-1' }}>
                Full Name *
                <input value={empForm.name} onChange={e => setEmpForm(p => ({ ...p, name: e.target.value }))} style={S.input} placeholder="Employee name" />
              </label>
              <label style={S.label}>
                Department
                <select value={empForm.department} onChange={e => setEmpForm(p => ({ ...p, department: e.target.value }))} style={S.input}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <label style={S.label}>
                Position / Job Title
                <input value={empForm.position} onChange={e => setEmpForm(p => ({ ...p, position: e.target.value }))} style={S.input} placeholder="e.g. Driver, Cashier" />
              </label>
              <label style={S.label}>
                Phone
                <input value={empForm.phone} onChange={e => setEmpForm(p => ({ ...p, phone: e.target.value }))} style={S.input} placeholder="+971 50 000 0000" />
              </label>
              <label style={S.label}>
                Email
                <input value={empForm.email} onChange={e => setEmpForm(p => ({ ...p, email: e.target.value }))} style={S.input} placeholder="email@example.com" />
              </label>
              <label style={S.label}>
                Shift Start
                <input type="time" value={empForm.shift_start} onChange={e => setEmpForm(p => ({ ...p, shift_start: e.target.value }))} style={{ ...S.input, colorScheme: 'dark', minWidth: 120 }} />
              </label>
              <label style={S.label}>
                Shift End
                <input type="time" value={empForm.shift_end} onChange={e => setEmpForm(p => ({ ...p, shift_end: e.target.value }))} style={{ ...S.input, colorScheme: 'dark', minWidth: 120 }} />
              </label>
              <label style={S.label}>
                Monthly Salary (AED)
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 12, pointerEvents: 'none' }}>AED</span>
                  <input type="number" min="0" step="0.01" value={empForm.monthly_salary} onChange={e => setEmpForm(p => ({ ...p, monthly_salary: e.target.value }))}
                    style={{ ...S.input, paddingLeft: 46 }} placeholder="0.00" />
                </div>
              </label>
              <label style={S.label}>
                Hourly Rate (AED/hr)
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 12, pointerEvents: 'none' }}>AED</span>
                  <input type="number" min="0" step="0.01" value={empForm.hourly_rate} onChange={e => setEmpForm(p => ({ ...p, hourly_rate: e.target.value }))}
                    style={{ ...S.input, paddingLeft: 46 }} placeholder="e.g. 6.00" />
                </div>
              </label>
              <div style={{ gridColumn: '1/-1', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#60a5fa' }}>
                If hourly rate is set, it's used directly for late deductions. Otherwise deductions are derived from monthly salary ÷ 26 days ÷ 8 hrs.
              </div>
              <label style={{ ...S.label, gridColumn: '1/-1' }}>
                Portal PIN (4 digits)
                <div style={{ position: 'relative' }}>
                  <input type="text" maxLength={4} inputMode="numeric" pattern="[0-9]*"
                    value={empForm.portal_pin}
                    onChange={e => setEmpForm(p => ({ ...p, portal_pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    style={{ ...S.input, letterSpacing: 8, fontWeight: 700, fontSize: 18 }}
                    placeholder="Leave blank to keep unchanged" />
                </div>
                <span style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>Employee uses this PIN to log into the self-service portal at /portal</span>
              </label>
              <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 14px' }}
                onClick={() => setEmpForm(p => ({ ...p, is_active: !p.is_active }))}>
                <div style={{ width: 38, height: 22, borderRadius: 11, background: empForm.is_active ? '#10b981' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 3, left: empForm.is_active ? 19 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#e5e7eb', fontWeight: 500 }}>Active Employee</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Appears in daily attendance list</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEmpModal(false)}
                style={{ padding: '9px 22px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
              <button type="button" onClick={saveEmp} disabled={saving}
                style={{ padding: '9px 26px', borderRadius: 9, background: 'linear-gradient(135deg,#3b82f6,#2563eb)', border: 'none', color: '#fff', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }}>
                {saving ? 'Saving…' : editingEmp ? 'Update Employee' : 'Add Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setDeleteTarget(null)}>
          <div style={{ background: '#1a1a26', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 18, padding: 30, width: '100%', maxWidth: 400, boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Trash2 size={20} style={{ color: '#f87171' }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f2f2f7', margin: '0 0 8px' }}>Delete Employee?</h3>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 24px', lineHeight: 1.6 }}>
              This will permanently delete <strong style={{ color: '#f2f2f7' }}>{deleteTarget.name}</strong> and all their attendance records. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setDeleteTarget(null)}
                style={{ padding: '9px 22px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
              <button type="button" onClick={confirmDelete}
                style={{ padding: '9px 22px', borderRadius: 9, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payroll Detail Modal ── */}
      {payrollDetail && (() => {
        const r = payrollDetail;
        const aColor  = avatarColor(r.employee_name);
        const deptCfg = DEPT_CFG[r.department] || DEPT_CFG.Other;
        const fmtMin  = mins => { const h = Math.floor(mins / 60); const m = Math.round(mins % 60); return h ? `${h}h ${m}m` : `${m}m`; };
        const fmtAED  = n => `AED ${Number(n).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const totalMissing = r.total_late_minutes + r.total_early_minutes;
        const monthLabel = new Date(payrollMonth + '-01').toLocaleDateString('en-AE', { month: 'long', year: 'numeric' });

        const StatRow = ({ label, value, color, bold }) => (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: 13, color: '#9ca3af' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color: color || '#f2f2f7' }}>{value}</span>
          </div>
        );

        return (
          <div onClick={() => setPayrollDetail(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: '#1a1a26', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 40px 100px rgba(0,0,0,0.6)', overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.08))', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${aColor}22`, border: `2px solid ${aColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: aColor, flexShrink: 0 }}>
                  {nameInitials(r.employee_name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#f2f2f7' }}>{r.employee_name}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 5, alignItems: 'center' }}>
                    {r.department && <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: deptCfg.bg, color: deptCfg.color, border: `1px solid ${deptCfg.border}` }}>{r.department}</span>}
                    {r.position && <span style={{ fontSize: 12, color: '#6b7280' }}>{r.position}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{monthLabel}</div>
                  <button onClick={() => setPayrollDetail(null)}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 7px', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div style={{ padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' }}>

                {/* Net Pay highlight */}
                <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.06))', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Net Payable</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#10b981', marginTop: 3 }}>{fmtAED(r.net_pay)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Base Salary</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#e5e7eb' }}>{r.monthly_salary > 0 ? fmtAED(r.monthly_salary) : '—'}</div>
                  </div>
                </div>

                {/* Attendance */}
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Attendance</div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '0 14px', marginBottom: 18 }}>
                  <StatRow label="Present Days"  value={r.present_days}  color="#10b981" />
                  <StatRow label="Absent Days"   value={r.absent_days}   color={r.absent_days  > 0 ? '#ef4444' : '#6b7280'} />
                  <StatRow label="Late Arrivals" value={r.late_days}     color={r.late_days    > 0 ? '#f59e0b' : '#6b7280'} />
                  <StatRow label="Half Days"     value={r.half_days}     color={r.half_days    > 0 ? '#3b82f6' : '#6b7280'} />
                  <StatRow label="Leave Days"    value={r.leave_days}    color={r.leave_days   > 0 ? '#8b5cf6' : '#6b7280'} />
                </div>

                {/* Time */}
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Missing Time</div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '0 14px', marginBottom: 18 }}>
                  <StatRow label="Late Arrivals Time"  value={r.total_late_minutes  > 0 ? fmtMin(r.total_late_minutes)  : '—'} color="#f59e0b" />
                  <StatRow label="Early Departures"    value={r.total_early_minutes > 0 ? fmtMin(r.total_early_minutes) : '—'} color="#f97316" />
                  <StatRow label="Total Missing Hours" value={totalMissing > 0 ? fmtMin(totalMissing) : '—'} color="#e879f9" bold />
                </div>

                {/* Deductions */}
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Deductions</div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '0 14px', marginBottom: 18 }}>
                  <StatRow label="Rate"               value={`${fmtAED(r.hourly_rate)} / hr · ${fmtAED(r.daily_rate)} / day`} color="#a78bfa" />
                  <StatRow label="Late Deduction"     value={r.late_deduction    > 0 ? `- ${fmtAED(r.late_deduction)}`    : '—'} color={r.late_deduction    > 0 ? '#f87171' : '#6b7280'} />
                  <StatRow label="Early Deduction"    value={r.early_deduction   > 0 ? `- ${fmtAED(r.early_deduction)}`   : '—'} color={r.early_deduction   > 0 ? '#f87171' : '#6b7280'} />
                  <StatRow label="Absent Deduction"   value={r.absent_deduction  > 0 ? `- ${fmtAED(r.absent_deduction)}`  : '—'} color={r.absent_deduction  > 0 ? '#f87171' : '#6b7280'} />
                  <StatRow label="Half Day Deduction" value={r.half_deduction    > 0 ? `- ${fmtAED(r.half_deduction)}`    : '—'} color={r.half_deduction    > 0 ? '#f87171' : '#6b7280'} />
                  <StatRow label="Total Deduction"    value={r.total_deduction   > 0 ? `- ${fmtAED(r.total_deduction)}`   : '—'} color="#ef4444" bold />
                </div>

                {/* Formula */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 16px', fontSize: 13 }}>
                  <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{r.monthly_salary > 0 ? fmtAED(r.monthly_salary) : '—'}</span>
                  <span style={{ color: '#4b5563' }}>−</span>
                  <span style={{ color: '#f87171', fontWeight: 600 }}>{fmtAED(r.total_deduction)}</span>
                  <span style={{ color: '#4b5563' }}>=</span>
                  <span style={{ color: '#10b981', fontWeight: 800, fontSize: 15 }}>{fmtAED(r.net_pay)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, right: 28, background: toast.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(16,185,129,0.95)', backdropFilter: 'blur(8px)', color: '#fff', borderRadius: 12, padding: '13px 22px', fontSize: 13, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.35)', zIndex: 2000, display: 'flex', alignItems: 'center', gap: 8 }}>
          {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
