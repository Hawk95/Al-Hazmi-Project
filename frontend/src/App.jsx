import { Routes, Route, Navigate } from 'react-router-dom';
import { Component } from 'react';
import Login from './pages/Login';
import Home from './pages/Home';
import ProfileSettings from './pages/ProfileSettings';
import { isAuthenticated } from './api/auth';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error: error.message };
  }
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
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <div className="app-shell">
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Home />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfileSettings />
              </RequireAuth>
            }
          />
          <Route
            path="/settings/profile"
            element={
              <RequireAuth>
                <ProfileSettings />
              </RequireAuth>
            }
          />
          <Route
            path="/"
            element={<Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />}
          />
          <Route path="/*" element={<Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
}

export default App;
