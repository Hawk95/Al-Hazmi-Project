import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@alhazmi.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('Signing in...');
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setLoading(false);
      setStatus('');
      const message =
        err.response?.data?.detail ||
        (err?.message === 'timeout of 10000ms exceeded'
          ? 'Login request timed out. Backend may not be running.'
          : err.message) ||
        'Unable to login. Please check the backend server and refresh.';
      setError(message);
    }
  };

  return (
    <main className="login-page">
      <div className="login-shell">
        <aside className="login-panel login-branding">
          <div className="brand-surface">
            <div className="brand-icon">M</div>
            <h1 className="brand-title">Meat Distribution ERP</h1>
            <p className="brand-tagline">Smart Stock. Seamless Deliveries.</p>
            <ul className="feature-list">
              <li>Real-time inventory tracking</li>
              <li>Order & supplier management</li>
              <li>Live delivery monitoring</li>
            </ul>
          </div>
        </aside>

        <aside className="login-panel login-form-panel">
          <section className="login-card">
            <div className="top-pill">Meat ERP</div>
            <h2 className="login-heading">Welcome back</h2>
            <p className="login-subtitle">
              Sign in to manage stock, orders, suppliers, and shipments.
            </p>
            <form onSubmit={handleSubmit} className="login-form">
              <label className="input-label" htmlFor="email">
                Email address
              </label>
              <input
                type="email"
                id="email"
                className="input-field"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <label className="input-label" htmlFor="password">
                Password
              </label>
              <div className="password-field-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="input-field"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className={`password-toggle ${showPassword ? 'active' : ''}`}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  👁
                </button>
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input type="checkbox" className="checkbox-input" />
                  Remember me
                </label>
                <button type="button" className="forgot-link">
                  Forgot password?
                </button>
              </div>

              <button type="submit" className={`btn-signin${loading ? ' loading' : ''}`} disabled={loading}>
                <span className="button-text">{loading ? 'Signing in…' : 'Sign in'}</span>
                {loading && <span className="button-loader" aria-hidden="true" />}
              </button>
            </form>

            {status && <div className="status-message info">{status}</div>}
            {error && <div className="status-message error">{error}</div>}

            <p className="hint-text">
              Use <strong>admin@alhazmi.com</strong> / <strong>Admin@123</strong> as sample credentials.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
};

export default Login;
