import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, MapPin, BarChart2,
  TrendingUp, Zap, UserCheck, Users, Plus, X, RefreshCw, CheckCircle2,
  AlertCircle, ClipboardList, FileCheck, FileText, Search, ChevronRight,
  ArrowRight, Boxes, Clock, PackageCheck, Send, Receipt, Activity,
} from 'lucide-react';
import { getCurrentUser } from '../api/auth';
import {
  getPurchaseOrders, createPurchaseOrder, approvePO, transitPO, receivePO,
  getProducts, getSuppliers,
} from '../api/erp';

const SIDEBAR_W = 245;

const SC = {
  draft:      { label: 'Draft',      color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.22)', dot: '#64748b',  glow: '' },
  approved:   { label: 'Approved',   color: '#60a5fa', bg: 'rgba(96,165,250,0.11)',  border: 'rgba(96,165,250,0.25)',  dot: '#3b82f6',  glow: 'rgba(59,130,246,0.25)' },
  in_transit: { label: 'In Transit', color: '#fbbf24', bg: 'rgba(251,191,36,0.11)',  border: 'rgba(251,191,36,0.25)',  dot: '#f59e0b',  glow: 'rgba(245,158,11,0.25)' },
  received:   { label: 'Received',   color: '#34d399', bg: 'rgba(52,211,153,0.11)',  border: 'rgba(52,211,153,0.25)',  dot: '#10b981',  glow: 'rgba(16,185,129,0.25)' },
};

const STEPS = ['draft','approved','in_transit','received'];

const S = {
  inp: { width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 13px', fontSize:13, color:'#f1f5f9', outline:'none', boxSizing:'border-box', caretColor:'#60a5fa', transition:'border-color 0.2s' },
  lbl: { display:'flex', flexDirection:'column', gap:6, fontSize:12, fontWeight:500, color:'#64748b' },
  th:  { padding:'13px 18px', fontSize:11, fontWeight:700, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'0.1em', whiteSpace:'nowrap', userSelect:'none', background:'linear-gradient(180deg,rgba(59,130,246,0.08) 0%,rgba(59,130,246,0.02) 100%)', borderBottom:'1px solid rgba(59,130,246,0.12)' },
  td:  { padding:'14px 18px', fontSize:13, color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.035)', verticalAlign:'middle' },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-AE',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtAED  = n => n > 0 ? `AED ${Number(n).toLocaleString('en',{minimumFractionDigits:0,maximumFractionDigits:0})}` : '—';

function StatusPill({ status }) {
  const c = SC[status] || SC.draft;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 12px 5px 9px', borderRadius:99, fontSize:11.5, fontWeight:700, background:c.bg, color:c.color, border:`1px solid ${c.border}`, boxShadow:c.glow?`0 0 10px ${c.glow}`:'none', letterSpacing:'0.02em' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c.dot, boxShadow:c.glow?`0 0 5px ${c.dot}`:'none', flexShrink:0 }} />
      {c.label}
    </span>
  );
}

function NavBtn({ path, icon, label, active, navigate }) {
  return (
    <button type="button" onClick={() => !active && navigate(path)}
      style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 13px', borderRadius:9, fontSize:13, fontWeight:active?600:400, border:'none', width:'100%', textAlign:'left', cursor:active?'default':'pointer', transition:'all 0.15s', color:active?'#f1f5f9':'#4b5563', background:active?'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(96,165,250,0.08))':'transparent', boxShadow:active?'inset 0 0 0 1px rgba(59,130,246,0.25)':'none' }}
      onMouseEnter={e => { if(!active) e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}
      onMouseLeave={e => { if(!active) e.currentTarget.style.background='transparent'; }}>
      <span style={{ color:active?'#60a5fa':'#64748b', flexShrink:0, transition:'color 0.15s' }}>{icon}</span>
      {label}
    </button>
  );
}

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [pos, setPos]           = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState(null);
  const [drawer, setDrawer]     = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showGRN, setShowGRN]   = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm]         = useState({ supplier_id:'', expected_date:'', notes:'', items:[] });
  const [grnItems, setGrnItems] = useState([]);
  const [hovRow, setHovRow]     = useState(null);

  const cu = getCurrentUser();
  const displayName = (cu?.sub||'').split('@')[0].replace(/[._-]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());

  const toast_ = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };

  const load = async () => {
    setLoading(true);
    try {
      const [p,s,pr] = await Promise.all([getPurchaseOrders(),getSuppliers(),getProducts()]);
      setPos(p); setSuppliers(s); setProducts(pr);
    } catch { toast_('Failed to load','error'); }
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  const counts = useMemo(()=>{
    const c={all:pos.length,draft:0,approved:0,in_transit:0,received:0};
    pos.forEach(p=>{ if(c[p.status]!==undefined) c[p.status]++; });
    return c;
  },[pos]);

  const filtered = useMemo(()=>{
    return pos.filter(p=>{
      const matchStatus = statusFilter==='all' || p.status===statusFilter;
      const matchSearch = !search || p.po_number.toLowerCase().includes(search.toLowerCase()) || (p.supplier_name||'').toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  },[pos,statusFilter,search]);

  const totalValue = pos => pos.reduce((s,it)=>s+it.quantity*(it.unit_price||0),0);

  const addItem = () => setForm(f=>({...f,items:[...f.items,{product_id:'',product_name:'',quantity:'',unit_price:''}]}));
  const removeItem = i => setForm(f=>({...f,items:f.items.filter((_,idx)=>idx!==i)}));
  const updItem = (i,field,val) => setForm(f=>{
    const items=[...f.items]; items[i]={...items[i],[field]:val};
    if(field==='product_id'){ const pr=products.find(p=>p.id===parseInt(val)); if(pr){items[i].product_name=pr.name;items[i].unit_price=pr.price_per_kg||0;} }
    return{...f,items};
  });

  const handleCreate = async () => {
    if(!form.items.length||form.items.some(it=>!it.product_id||!it.quantity)){ toast_('Add at least one complete item','error'); return; }
    setActionLoading(true);
    try {
      const sup=suppliers.find(s=>s.id===parseInt(form.supplier_id));
      const res=await createPurchaseOrder({ supplier_id:parseInt(form.supplier_id)||null, supplier_name:sup?.name||null, expected_date:form.expected_date||null, notes:form.notes||null, items:form.items.map(it=>({product_id:parseInt(it.product_id),product_name:it.product_name,quantity:parseFloat(it.quantity),unit_price:parseFloat(it.unit_price)||0})) });
      await load(); setDrawer(res); setShowCreate(false); setForm({supplier_id:'',expected_date:'',notes:'',items:[]});
      toast_('Purchase Order created');
    } catch(e){ toast_(e.response?.data?.detail||'Failed','error'); }
    setActionLoading(false);
  };

  const handleAction = async (po, action) => {
    if(action==='receive'){ setShowGRN(po); setGrnItems(po.items.map(it=>({...it,received_qty:it.quantity}))); return; }
    setActionLoading(true);
    try {
      let res;
      if(action==='approve') res=await approvePO(po.id);
      else if(action==='transit') res=await transitPO(po.id);
      await load(); setDrawer(res);
      toast_(action==='approve'?'PO approved — stock marked Expected':'PO marked In Transit');
    } catch(e){ toast_(e.response?.data?.detail||'Failed','error'); }
    setActionLoading(false);
  };

  const handleGRN = async () => {
    setActionLoading(true);
    try {
      const res=await receivePO(showGRN.id,{items:grnItems.map(it=>({product_id:it.product_id,product_name:it.product_name,expected_qty:parseFloat(it.quantity),received_qty:parseFloat(it.received_qty)||0}))});
      await load(); setDrawer(res); setShowGRN(null);
      toast_('GRN confirmed — stock added to Available');
    } catch(e){ toast_(e.response?.data?.detail||'GRN failed','error'); }
    setActionLoading(false);
  };

  const selPo = drawer ? (pos.find(p=>p.id===drawer.id)||drawer) : null;

  const ACTION_BTN = {
    draft:      { label:'Approve',         color:'#3b82f6', action:'approve'  },
    approved:   { label:'Mark In Transit', color:'#f59e0b', action:'transit'  },
    in_transit: { label:'Confirm GRN',     color:'#10b981', action:'receive'  },
  };

  const STAT_CARDS = [
    { label:'Total POs',   value:counts.all,       color:'#60a5fa', icon:<ClipboardList size={20}/> },
    { label:'Pending',     value:counts.draft,      color:'#94a3b8', icon:<Clock size={20}/>         },
    { label:'In Transit',  value:counts.in_transit, color:'#fbbf24', icon:<Send size={20}/>          },
    { label:'Received',    value:counts.received,   color:'#34d399', icon:<PackageCheck size={20}/> },
  ];

  const nb = (path,icon,label,active) => <NavBtn path={path} icon={icon} label={label} active={active} navigate={navigate} />;

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'#080b14', color:'#f1f5f9', fontFamily:'Inter,system-ui,sans-serif' }}>

      {/* ── Sidebar 245px ── */}
      <aside style={{ width:SIDEBAR_W, minWidth:SIDEBAR_W, height:'100vh', background:'#0d1117', borderRight:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'18px 14px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:11, background:'linear-gradient(135deg,#3b82f6,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#fff', flexShrink:0, boxShadow:'0 4px 14px rgba(59,130,246,0.4)' }}>AH</div>
            <div><div style={{ fontSize:14, fontWeight:700, color:'#f1f5f9', lineHeight:1.2 }}>Al Hazmi</div><div style={{ fontSize:10, color:'#64748b', letterSpacing:'0.05em' }}>MEAT ERP</div></div>
          </div>
        </div>

        <nav style={{ flex:1, overflowY:'auto', padding:'10px 8px' }}>
          <div style={{ fontSize:9.5, fontWeight:700, color:'#64748b', letterSpacing:'0.14em', textTransform:'uppercase', padding:'10px 8px 5px' }}>Main</div>
          {nb('/dashboard',       <LayoutDashboard size={15}/>, 'Overview',          false)}
          {nb('/inventory',       <Package         size={15}/>, 'Inventory',          false)}
          {nb('/purchase-orders', <ClipboardList   size={15}/>, 'Purchase Orders',    true)}
          {nb('/sale-orders',     <FileCheck       size={15}/>, 'Sale Orders',        false)}
          {nb('/invoices',        <FileText        size={15}/>, 'Invoices (AR)',        false)}
          {nb('/accounts-payable',<Receipt         size={15}/>, 'Accounts Payable',    false)}
          {nb('/customers',       <Users           size={15}/>, 'Customers',            false)}
          {nb('/orders',          <ShoppingCart    size={15}/>, 'Orders',             false)}
          {nb('/suppliers',       <Truck           size={15}/>, 'Suppliers',          false)}
          {nb('/deliveries',      <MapPin          size={15}/>, 'Deliveries',         false)}
          {nb('/sales',           <TrendingUp      size={15}/>, 'Sales Distribution', false)}
          <div style={{ fontSize:9.5, fontWeight:700, color:'#64748b', letterSpacing:'0.14em', textTransform:'uppercase', padding:'14px 8px 5px' }}>Analytics</div>
          {nb('/vat-return',      <FileCheck       size={15}/>, 'VAT Return',         false)}
          {nb('/pnl',             <Activity        size={15}/>, 'Profit & Loss',      false)}
          {nb('/reports',         <BarChart2       size={15}/>, 'Reports',            false)}
          {nb('/forecast',        <Zap             size={15}/>, 'AI Forecast',        false)}
          <div style={{ fontSize:9.5, fontWeight:700, color:'#64748b', letterSpacing:'0.14em', textTransform:'uppercase', padding:'14px 8px 5px' }}>People</div>
          {nb('/hr',              <UserCheck       size={15}/>, 'HR Attendance',      false)}
          <div style={{ fontSize:9.5, fontWeight:700, color:'#64748b', letterSpacing:'0.14em', textTransform:'uppercase', padding:'14px 8px 5px' }}>Admin</div>
          {nb('/admin/users',     <Users           size={15}/>, 'User Management',    false)}
        </nav>

        <div style={{ padding:'12px 12px', borderTop:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'linear-gradient(135deg,#3b82f6,#2563eb)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>{displayName[0]||'U'}</div>
          <div style={{ minWidth:0 }}><div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayName}</div><div style={{ fontSize:10, color:'#64748b', letterSpacing:'0.04em' }}>Al Hazmi ERP</div></div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0, position:'relative' }}>

        {/* Depth radials */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0, background:'radial-gradient(ellipse 60% 40% at 70% 0%,rgba(59,130,246,0.04) 0%,transparent 60%), radial-gradient(ellipse 40% 30% at 100% 100%,rgba(139,92,246,0.04) 0%,transparent 60%)' }} />

        {/* Top bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 28px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(13,17,23,0.8)', backdropFilter:'blur(12px)', flexShrink:0, position:'relative', zIndex:10 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
              <div style={{ width:4, height:22, borderRadius:2, background:'linear-gradient(180deg,#3b82f6,#60a5fa)' }} />
              <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:'#f1f5f9', letterSpacing:-0.5 }}>Purchase Orders</h1>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'#64748b', paddingLeft:14 }}>
              {['Draft','Approved','In Transit','Received'].map((s,i,arr)=>(
                <span key={s} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ color:i===arr.length-1?'#34d399':'#64748b' }}>{s}</span>
                  {i<arr.length-1 && <ArrowRight size={9} style={{ color:'#64748b' }}/>}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button type="button" onClick={load} style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 16px', borderRadius:9, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#475569', fontSize:13, cursor:'pointer' }}>
              <RefreshCw size={13}/> Refresh
            </button>
            <button type="button" onClick={()=>setShowCreate(true)} style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 22px', borderRadius:9, background:'linear-gradient(135deg,#3b82f6,#2563eb)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 20px rgba(59,130,246,0.4)', letterSpacing:'0.01em' }}>
              <Plus size={15}/> New PO
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, padding:'16px 28px', flexShrink:0, position:'relative', zIndex:1 }}>
          {STAT_CARDS.map(c=>(
            <div key={c.label} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid ${c.color}18`, borderRadius:14, padding:'16px 20px', display:'flex', alignItems:'center', gap:16, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${c.color}60,${c.color}15)`, borderRadius:'14px 14px 0 0' }} />
              <div style={{ width:42, height:42, borderRadius:12, background:`${c.color}14`, display:'flex', alignItems:'center', justifyContent:'center', color:c.color, flexShrink:0, boxShadow:`0 4px 16px ${c.color}20` }}>{c.icon}</div>
              <div><div style={{ fontSize:26, fontWeight:800, color:'#f1f5f9', lineHeight:1, letterSpacing:-0.5 }}>{c.value}</div><div style={{ fontSize:12, color:'#64748b', marginTop:3, fontWeight:500 }}>{c.label}</div></div>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'0 28px 14px', flexShrink:0, position:'relative', zIndex:1 }}>
          <div style={{ position:'relative', width:300 }}>
            <Search size={13} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#64748b' }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search PO number or supplier…"
              style={{ ...S.inp, paddingLeft:34 }}/>
          </div>
          <div style={{ display:'flex', gap:5 }}>
            {['all','draft','approved','in_transit','received'].map(s=>{
              const active = statusFilter===s;
              const cfg = SC[s];
              return (
                <button key={s} type="button" onClick={()=>setStatusFilter(s)}
                  style={{ padding:'6px 13px', borderRadius:99, fontSize:11.5, fontWeight:600, border:`1px solid ${active?(cfg?.border||'rgba(255,255,255,0.2)'):'rgba(255,255,255,0.06)'}`, background:active?(cfg?.bg||'rgba(255,255,255,0.08)'):'rgba(255,255,255,0.02)', color:active?(cfg?.color||'#f1f5f9'):'#64748b', cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s', boxShadow:active&&cfg?.glow?`0 0 12px ${cfg.glow}`:'none' }}>
                  {s==='all'?'All':cfg?.label} <span style={{ opacity:0.7 }}>({s==='all'?counts.all:counts[s]})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table area */}
        <div style={{ flex:1, overflow:'hidden', padding:'0 28px 24px', minHeight:0, position:'relative', zIndex:1 }}>
          <div style={{ height:'100%', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <div style={{ overflowY:'auto', flex:1 }}>
              {loading ? (
                <div style={{ padding:80, textAlign:'center', color:'#64748b', fontSize:13 }}>Loading purchase orders…</div>
              ) : filtered.length===0 ? (
                <div style={{ padding:80, textAlign:'center' }}>
                  <ClipboardList size={48} style={{ opacity:0.08, display:'block', margin:'0 auto 18px', color:'#60a5fa' }}/>
                  <div style={{ color:'#64748b', fontSize:14 }}>{search||statusFilter!=='all'?'No POs match your filter.':'No purchase orders yet.'}</div>
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ position:'sticky', top:0, zIndex:10 }}>
                      {['PO Number','Supplier','Items','Total Value','Expected','Created','Status','Action'].map((col)=>(
                        <th key={col} style={{ ...S.th, textAlign:col==='Total Value'?'right':col==='Action'?'center':'left' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(po=>{
                      const isActive = selPo?.id===po.id;
                      const isHov = hovRow===po.id;
                      const ab = ACTION_BTN[po.status];
                      const tv = totalValue(po.items);
                      return (
                        <tr key={po.id}
                          onMouseEnter={()=>setHovRow(po.id)} onMouseLeave={()=>setHovRow(null)}
                          onClick={()=>setDrawer(po)}
                          style={{ cursor:'pointer', transition:'background 0.1s', borderLeft:`3px solid ${isActive?'#3b82f6':'transparent'}`, background:isActive?'rgba(59,130,246,0.07)':isHov?'rgba(255,255,255,0.025)':'transparent' }}>
                          <td style={S.td}>
                            <span style={{ fontWeight:700, color:'#60a5fa', fontFamily:'monospace', fontSize:13, letterSpacing:'0.02em' }}>{po.po_number}</span>
                          </td>
                          <td style={S.td}>
                            <span style={{ fontWeight:600, color:po.supplier_name?'#e2e8f0':'#64748b' }}>{po.supplier_name||'—'}</span>
                          </td>
                          <td style={S.td}>
                            <div style={{ fontWeight:600, color:'#cbd5e1', fontSize:13 }}>{po.items.length} item{po.items.length!==1?'s':''}</div>
                            <div style={{ fontSize:11, color:'#64748b', marginTop:2, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{po.items.slice(0,2).map(i=>i.product_name).join(', ')}{po.items.length>2?` +${po.items.length-2}`:''}</div>
                          </td>
                          <td style={{ ...S.td, textAlign:'right', fontWeight:700, color:'#f1f5f9', fontSize:14 }}>{fmtAED(tv)}</td>
                          <td style={{ ...S.td, color:'#64748b', fontSize:12 }}>{fmtDate(po.expected_date)}</td>
                          <td style={{ ...S.td, color:'#64748b', fontSize:12 }}>{fmtDate(po.created_at)}</td>
                          <td style={S.td}><StatusPill status={po.status}/></td>
                          <td style={{ ...S.td, textAlign:'center' }}>
                            {ab && (
                              <button type="button" onClick={e=>{e.stopPropagation();handleAction(po,ab.action);}} disabled={actionLoading}
                                style={{ padding:'5px 14px', borderRadius:7, fontSize:12, fontWeight:600, border:`1px solid ${ab.color}40`, background:`${ab.color}14`, color:ab.color, cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s' }}>
                                {ab.label}
                              </button>
                            )}
                            {!ab && po.status==='received' && <span style={{ fontSize:12, color:'#34d399', fontWeight:600 }}>Complete</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* PO Detail Modal */}
      {selPo && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}
          onClick={()=>setDrawer(null)}>
          <div style={{ background:'#0d1117', border:'1px solid rgba(255,255,255,0.1)', borderRadius:22, width:'100%', maxWidth:700, maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 50px 120px rgba(0,0,0,0.85)' }}
            onClick={e=>e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ padding:'22px 28px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexShrink:0 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
                  <span style={{ fontSize:20, fontWeight:800, color:'#60a5fa', fontFamily:'monospace', letterSpacing:'0.03em' }}>{selPo.po_number}</span>
                  <StatusPill status={selPo.status}/>
                </div>
                <div style={{ fontSize:12, color:'#64748b' }}>Created {fmtDate(selPo.created_at)}</div>
              </div>
              <button type="button" onClick={()=>setDrawer(null)} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:9, padding:'7px 8px', color:'#64748b', cursor:'pointer', flexShrink:0 }}><X size={15}/></button>
            </div>

            <div style={{ overflowY:'auto', flex:1, padding:'24px 28px 28px' }}>

              {/* Progress tracker */}
              <div style={{ marginBottom:28, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:14, padding:'20px 24px' }}>
                <div style={{ display:'flex', alignItems:'center' }}>
                  {STEPS.map((s,i)=>{
                    const cfg=SC[s]; const idx=STEPS.indexOf(selPo.status); const done=idx>=i; const curr=idx===i;
                    return (
                      <div key={s} style={{ display:'flex', alignItems:'center', flex:1 }}>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
                          <div style={{ width:36, height:36, borderRadius:'50%', background:done?`linear-gradient(135deg,${cfg.dot},${cfg.dot}aa)`:'rgba(255,255,255,0.04)', border:`2px solid ${done?cfg.dot:'rgba(255,255,255,0.08)'}`, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.25s', boxShadow:curr?`0 0 20px ${cfg.dot}70`:done?`0 0 10px ${cfg.dot}40`:'none' }}>
                            {done && <CheckCircle2 size={15} style={{ color:'#fff' }}/>}
                          </div>
                          <div style={{ fontSize:10, fontWeight:done?700:400, color:done?cfg.color:'#64748b', marginTop:7, textAlign:'center', whiteSpace:'nowrap', letterSpacing:'0.03em' }}>{cfg.label}</div>
                        </div>
                        {i<STEPS.length-1 && <div style={{ height:2, flex:'0 0 40px', background:idx>i?`linear-gradient(90deg,${SC[STEPS[i]].dot},${SC[STEPS[i+1]].dot})`:'rgba(255,255,255,0.06)', marginBottom:24, transition:'background 0.3s', borderRadius:1 }}/>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Info grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
                {[{l:'Supplier',v:selPo.supplier_name||'—'},{l:'Expected Delivery',v:fmtDate(selPo.expected_date)}].map(f=>(
                  <div key={f.l} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'14px 16px' }}>
                    <div style={{ fontSize:10, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', marginBottom:6 }}>{f.l}</div>
                    <div style={{ fontSize:14, fontWeight:600, color:'#e2e8f0' }}>{f.v}</div>
                  </div>
                ))}
              </div>

              {selPo.notes && (
                <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'13px 16px', marginBottom:20 }}>
                  <div style={{ fontSize:10, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', marginBottom:6 }}>Notes</div>
                  <div style={{ fontSize:13, color:'#64748b', lineHeight:1.55 }}>{selPo.notes}</div>
                </div>
              )}

              {/* Line items */}
              <div style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>Line Items</div>
              <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, overflow:'hidden', marginBottom:24 }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr>
                    {['Product','Qty (kg)','Unit Price','Total'].map((h,i)=>(
                      <th key={h} style={{ ...S.th, textAlign:i>0?'right':'left', padding:'11px 16px' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {selPo.items.map((it,i)=>(
                      <tr key={i} style={{ background:i%2===0?'transparent':'rgba(255,255,255,0.015)' }}>
                        <td style={{ ...S.td, fontWeight:500, padding:'12px 16px' }}>{it.product_name}</td>
                        <td style={{ ...S.td, textAlign:'right', fontWeight:700, color:'#f1f5f9', padding:'12px 16px' }}>{parseFloat(it.quantity).toFixed(2)}</td>
                        <td style={{ ...S.td, textAlign:'right', color:'#64748b', padding:'12px 16px', fontSize:12 }}>{it.unit_price>0?`AED ${parseFloat(it.unit_price).toFixed(0)}`:'—'}</td>
                        <td style={{ ...S.td, textAlign:'right', fontWeight:600, color:'#cbd5e1', padding:'12px 16px' }}>{it.unit_price>0?fmtAED(parseFloat(it.quantity)*parseFloat(it.unit_price)):'—'}</td>
                      </tr>
                    ))}
                    <tr style={{ background:'rgba(59,130,246,0.05)', borderTop:'1px solid rgba(59,130,246,0.15)' }}>
                      <td colSpan={3} style={{ ...S.td, fontWeight:700, color:'#64748b', fontSize:11, textTransform:'uppercase', letterSpacing:'0.07em', padding:'13px 16px' }}>Total Value</td>
                      <td style={{ ...S.td, textAlign:'right', fontWeight:800, color:'#60a5fa', fontSize:16, padding:'13px 16px' }}>{fmtAED(totalValue(selPo.items))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Action */}
              {ACTION_BTN[selPo.status] && (
                <button type="button" onClick={()=>handleAction(selPo,ACTION_BTN[selPo.status].action)} disabled={actionLoading}
                  style={{ width:'100%', padding:'15px', borderRadius:12, background:`linear-gradient(135deg,${ACTION_BTN[selPo.status].color},${ACTION_BTN[selPo.status].color}cc)`, border:'none', color:'#fff', fontSize:14, fontWeight:700, cursor:actionLoading?'not-allowed':'pointer', opacity:actionLoading?0.6:1, boxShadow:`0 6px 24px ${ACTION_BTN[selPo.status].color}45`, letterSpacing:'0.01em' }}>
                  {actionLoading?'Processing…':ACTION_BTN[selPo.status].label}
                </button>
              )}
              {selPo.status==='received' && (
                <div style={{ textAlign:'center', padding:'15px', borderRadius:12, background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.18)', color:'#34d399', fontSize:14, fontWeight:700 }}>GRN Complete — Stock Received</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }} onClick={()=>setShowCreate(false)}>
          <div style={{ background:'#0d1117', border:'1px solid rgba(255,255,255,0.1)', borderRadius:22, padding:32, width:'100%', maxWidth:620, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 50px 120px rgba(0,0,0,0.8)' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28 }}>
              <div><h3 style={{ margin:0, fontSize:20, fontWeight:800, color:'#f1f5f9', letterSpacing:-0.3 }}>New Purchase Order</h3><p style={{ margin:'5px 0 0', fontSize:12, color:'#64748b' }}>Fill in details and add line items</p></div>
              <button type="button" onClick={()=>setShowCreate(false)} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'#64748b', cursor:'pointer', padding:'7px 8px', borderRadius:9 }}><X size={15}/></button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:22 }}>
              <label style={S.lbl}>Supplier<select value={form.supplier_id} onChange={e=>setForm(f=>({...f,supplier_id:e.target.value}))} style={{ ...S.inp, colorScheme:'dark' }}><option value="">— Select —</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
              <label style={S.lbl}>Expected Date<input type="date" value={form.expected_date} onChange={e=>setForm(f=>({...f,expected_date:e.target.value}))} style={{ ...S.inp, colorScheme:'dark' }}/></label>
              <label style={{ ...S.lbl, gridColumn:'1/-1' }}>Notes<input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional" style={S.inp}/></label>
            </div>
            <div style={{ fontSize:11, fontWeight:700, color:'#4b5563', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Line Items</div>
            {form.items.length===0 && <div style={{ textAlign:'center', padding:'20px 0', color:'#64748b', fontSize:13 }}>No items yet. Click Add Item below.</div>}
            {form.items.map((it,i)=>(
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 110px 110px 34px', gap:9, marginBottom:9, alignItems:'end' }}>
                <label style={S.lbl}>{i===0&&'Product'}<select value={it.product_id} onChange={e=>updItem(i,'product_id',e.target.value)} style={{ ...S.inp, colorScheme:'dark' }}><option value="">— Product —</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
                <label style={S.lbl}>{i===0&&'Qty (kg)'}<input type="number" value={it.quantity} onChange={e=>updItem(i,'quantity',e.target.value)} placeholder="0.00" style={S.inp}/></label>
                <label style={S.lbl}>{i===0&&'Price / kg'}<input type="number" value={it.unit_price} onChange={e=>updItem(i,'unit_price',e.target.value)} placeholder="0.00" style={S.inp}/></label>
                <button type="button" onClick={()=>removeItem(i)} style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:8, padding:'9px', color:'#f87171', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', alignSelf:'flex-end' }}><X size={13}/></button>
              </div>
            ))}
            <button type="button" onClick={addItem} style={{ width:'100%', padding:'10px 0', borderRadius:9, background:'rgba(255,255,255,0.03)', border:'1px dashed rgba(255,255,255,0.1)', color:'#4b5563', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, marginTop:4, marginBottom:22 }}><Plus size={13}/> Add Item</button>
            <div style={{ display:'flex', gap:10 }}>
              <button type="button" onClick={()=>setShowCreate(false)} style={{ flex:1, padding:'12px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'#6b7280', fontSize:13, cursor:'pointer' }}>Cancel</button>
              <button type="button" onClick={handleCreate} disabled={actionLoading} style={{ flex:2, padding:'12px', borderRadius:10, background:'linear-gradient(135deg,#3b82f6,#2563eb)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:actionLoading?'not-allowed':'pointer', opacity:actionLoading?0.7:1, boxShadow:'0 4px 16px rgba(59,130,246,0.35)' }}>
                {actionLoading?'Creating…':'Create Purchase Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRN Modal */}
      {showGRN && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }} onClick={()=>setShowGRN(null)}>
          <div style={{ background:'#0d1117', border:'1px solid rgba(16,185,129,0.25)', borderRadius:22, padding:32, width:'100%', maxWidth:520, boxShadow:'0 50px 120px rgba(0,0,0,0.8)' }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22 }}>
              <div><h3 style={{ margin:0, fontSize:18, fontWeight:800, color:'#f2f2f7' }}>Confirm GRN</h3><p style={{ margin:'4px 0 0', fontSize:12, color:'#4b5563' }}>Enter received quantities for {showGRN.po_number}</p></div>
              <button type="button" onClick={()=>setShowGRN(null)} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#6b7280', cursor:'pointer', padding:'7px 8px', borderRadius:9 }}><X size={15}/></button>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:18 }}>
              <thead><tr>
                <th style={S.th}>Product</th>
                <th style={{ ...S.th, textAlign:'right' }}>Expected</th>
                <th style={{ ...S.th, textAlign:'right' }}>Received Qty</th>
              </tr></thead>
              <tbody>
                {grnItems.map((it,i)=>(
                  <tr key={i}>
                    <td style={S.td}>{it.product_name}</td>
                    <td style={{ ...S.td, textAlign:'right', color:'#4b5563' }}>{parseFloat(it.quantity).toFixed(2)} kg</td>
                    <td style={{ ...S.td, textAlign:'right' }}>
                      <input type="number" value={it.received_qty} min={0} onChange={e=>setGrnItems(prev=>prev.map((g,idx)=>idx===i?{...g,received_qty:e.target.value}:g))} style={{ ...S.inp, width:110, textAlign:'right' }}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:10, padding:'11px 14px', marginBottom:20, fontSize:12, color:'#34d399', lineHeight:1.5 }}>
              Received quantities will be added to Available inventory. PO will be marked as Received.
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button type="button" onClick={()=>setShowGRN(null)} style={{ flex:1, padding:'12px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'#6b7280', fontSize:13, cursor:'pointer' }}>Cancel</button>
              <button type="button" onClick={handleGRN} disabled={actionLoading} style={{ flex:2, padding:'12px', borderRadius:10, background:'linear-gradient(135deg,#10b981,#059669)', border:'none', color:'#fff', fontSize:13, fontWeight:700, cursor:actionLoading?'not-allowed':'pointer', opacity:actionLoading?0.7:1, boxShadow:'0 4px 16px rgba(16,185,129,0.35)' }}>
                {actionLoading?'Confirming…':'Confirm GRN & Receive Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:'fixed', bottom:28, right:28, background:toast.type==='error'?'rgba(220,38,38,0.96)':'rgba(5,150,105,0.96)', color:'#fff', borderRadius:13, padding:'13px 22px', fontSize:13, fontWeight:600, boxShadow:'0 10px 40px rgba(0,0,0,0.45)', zIndex:2000, display:'flex', alignItems:'center', gap:10, backdropFilter:'blur(10px)', border:`1px solid ${toast.type==='error'?'rgba(239,68,68,0.4)':'rgba(16,185,129,0.4)'}` }}>
          {toast.type==='error'?<AlertCircle size={16}/>:<CheckCircle2 size={16}/>} {toast.msg}
        </div>
      )}
    </div>
  );
}
