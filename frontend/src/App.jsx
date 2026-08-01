import { Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './api/auth';

import Login            from './pages/Login';
import Home             from './pages/Home';
import ProfileSettings  from './pages/ProfileSettings';
import Inventory        from './pages/Inventory';
import AddProduct       from './pages/AddProduct';
import Orders           from './pages/Orders';
import Suppliers        from './pages/Suppliers';
import Deliveries       from './pages/Deliveries';
import Reports          from './pages/Reports';
import PurchaseOrders   from './pages/PurchaseOrders';
import SaleOrders       from './pages/SaleOrders';
import Invoices         from './pages/Invoices';
import AccountsPayable  from './pages/AccountsPayable';
import Customers        from './pages/Customers';
import HR               from './pages/HR';
import EmployeePortal   from './pages/EmployeePortal';
import SalesDistribution from './pages/SalesDistribution';
import Forecast         from './pages/Forecast';
import VATReturn        from './pages/VATReturn';
import ProfitLoss       from './pages/ProfitLoss';
import AdminUsers       from './pages/AdminUsers';
import { lazy, Suspense } from 'react';
const TruckTracking = lazy(() => import('./pages/TruckTracking'));
const TruckPortal   = lazy(() => import('./pages/TruckPortal'));

function RequireAuth({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Auth(children) {
  return <RequireAuth>{children}</RequireAuth>;
}

function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/"                element={<Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />} />
        <Route path="/dashboard"       element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/profile"         element={<RequireAuth><ProfileSettings /></RequireAuth>} />
        <Route path="/settings/profile" element={<RequireAuth><ProfileSettings /></RequireAuth>} />

        <Route path="/inventory"       element={<RequireAuth><Inventory /></RequireAuth>} />
        <Route path="/products/add"    element={<RequireAuth><AddProduct /></RequireAuth>} />
        <Route path="/orders"          element={<RequireAuth><Orders /></RequireAuth>} />
        <Route path="/suppliers"       element={<RequireAuth><Suppliers /></RequireAuth>} />
        <Route path="/deliveries"      element={<RequireAuth><Deliveries /></RequireAuth>} />
        <Route path="/reports"         element={<RequireAuth><Reports /></RequireAuth>} />
        <Route path="/purchase-orders" element={<RequireAuth><PurchaseOrders /></RequireAuth>} />
        <Route path="/sale-orders"     element={<RequireAuth><SaleOrders /></RequireAuth>} />
        <Route path="/invoices"        element={<RequireAuth><Invoices /></RequireAuth>} />
        <Route path="/accounts-payable" element={<RequireAuth><AccountsPayable /></RequireAuth>} />
        <Route path="/customers"       element={<RequireAuth><Customers /></RequireAuth>} />
        <Route path="/hr"              element={<RequireAuth><HR /></RequireAuth>} />
        <Route path="/employee-portal" element={<EmployeePortal />} />
        <Route path="/sales"           element={<RequireAuth><SalesDistribution /></RequireAuth>} />
        <Route path="/forecast"        element={<RequireAuth><Forecast /></RequireAuth>} />
        <Route path="/vat-return"      element={<RequireAuth><VATReturn /></RequireAuth>} />
        <Route path="/pnl"             element={<RequireAuth><ProfitLoss /></RequireAuth>} />
        <Route path="/admin/users"     element={<RequireAuth><AdminUsers /></RequireAuth>} />
        <Route path="/truck-tracking"  element={<RequireAuth><Suspense fallback={<div style={{color:'#fff',padding:40}}>Loading map…</div>}><TruckTracking /></Suspense></RequireAuth>} />
        <Route path="/truck-portal"    element={<Suspense fallback={<div style={{background:'#080c14',minHeight:'100vh'}}/>}><TruckPortal /></Suspense>} />

        <Route path="/*" element={<Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </div>
  );
}

export default App;
