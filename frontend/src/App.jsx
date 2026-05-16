import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, Component } from 'react';
import Login from './pages/Login';
import Home from './pages/Home';
import ProfileSettings from './pages/ProfileSettings';
import AdminUsers from './pages/AdminUsers';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Suppliers from './pages/Suppliers';
import Deliveries from './pages/Deliveries';
import Reports from './pages/Reports';
import CreateOrder from './pages/CreateOrder';
import AddProduct from './pages/AddProduct';
import SalesDistribution from './pages/SalesDistribution';
import Forecast from './pages/Forecast';
import HR from './pages/HR';
import EmployeePortal from './pages/EmployeePortal';
import PurchaseOrders from './pages/PurchaseOrders';
import SaleOrders from './pages/SaleOrders';
import { isAuthenticated } from './api/auth';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error: error.message }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', color: '#FF453A', fontFamily: 'monospace', background: '#1C1C1E', minHeight: '100vh' }}>
          <h2>Render Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#F2F2F7' }}>{this.state.error}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function RequireAuth({ children }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return children;
}

const P = ({ children }) => <RequireAuth>{children}</RequireAuth>;

function App() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [showHR, setShowHR] = useState(false);
  const prevPath  = useRef('/dashboard');

  useEffect(() => {
    if (location.pathname === '/hr') {
      setShowHR(true);
      navigate(prevPath.current, { replace: true });
    } else {
      prevPath.current = location.pathname;
    }
  }, [location.pathname]);

  const closeHR = () => setShowHR(false);

  return (
    <div className="app-shell">
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard"      element={<P><Home /></P>} />
          <Route path="/inventory"      element={<P><Inventory /></P>} />
          <Route path="/orders"         element={<P><Orders /></P>} />
          <Route path="/suppliers"      element={<P><Suppliers /></P>} />
          <Route path="/deliveries"     element={<P><Deliveries /></P>} />
          <Route path="/reports"        element={<P><Reports /></P>} />
          <Route path="/profile"        element={<P><ProfileSettings /></P>} />
          <Route path="/settings/profile" element={<P><ProfileSettings /></P>} />
          <Route path="/admin/users"    element={<P><AdminUsers /></P>} />
          <Route path="/orders/create"  element={<P><CreateOrder /></P>} />
          <Route path="/products/add"   element={<P><AddProduct /></P>} />
          <Route path="/sales"             element={<P><SalesDistribution /></P>} />
          <Route path="/forecast"          element={<P><Forecast /></P>} />
          <Route path="/purchase-orders"   element={<P><PurchaseOrders /></P>} />
          <Route path="/sale-orders"       element={<P><SaleOrders /></P>} />
          <Route path="/portal"            element={<EmployeePortal />} />
          <Route path="/" element={<Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />} />
          <Route path="/*" element={<Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />} />
        </Routes>

        {showHR && isAuthenticated() && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#13131a', display: 'flex', flexDirection: 'column' }}>
            <HR isModal onClose={closeHR} />
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
}

export default App;
