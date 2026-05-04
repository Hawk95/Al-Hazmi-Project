import { Routes, Route, Navigate } from 'react-router-dom';
import { Component } from 'react';
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
          <Route path="/sales"          element={<P><SalesDistribution /></P>} />
          <Route path="/" element={<Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />} />
          <Route path="/*" element={<Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
}

export default App;
