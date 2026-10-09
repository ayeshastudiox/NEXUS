import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin } from '../lib/api';

/** Seeded demo accounts — same three the previous UI exposed, restyled. */
const QUICK_ACCOUNTS = [
  { label: 'Administrator', email: 'admin@nexus.ai', password: 'admin123' },
  { label: 'Maersk Line', email: 'maersk@nexus.ai', password: 'maersk123' },
  { label: 'Emirates SkyCargo', email: 'emirates@nexus.ai', password: 'emirates123' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const attempt = async (em: string, pw: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await apiLogin(em, pw);
      login(res.access_token, res.user);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attempt(email, password);
  };

  const quickLogin = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
    attempt(em, pw);
  };

  return (
    <div className="nx-login">
      <div className="nx-login-card atl-rise">
        <div className="nx-login-brand">
          <div className="nx-login-logo">N</div>
          <div className="nx-login-title">NEXUS</div>
          <div className="nx-login-tagline">Autonomous Logistics Intelligence</div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="nx-field-error">{error}</div>}

          <div className="nx-field">
            <label className="nx-field-label" htmlFor="nexus-email">Email</label>
            <input
              id="nexus-email"
              className="nx-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="operator@nexus.ai"
              required
            />
          </div>

          <div className="nx-field">
            <label className="nx-field-label" htmlFor="nexus-password">Password</label>
            <input
              id="nexus-password"
              className="nx-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="nx-btn nx-btn-primary"
            style={{ width: '100%', height: 38, marginTop: 4 }}
            disabled={loading}
          >
            {loading ? 'Authenticating…' : 'Sign in'}
          </button>
        </form>

        <div className="nx-login-divider">Demo access</div>

        <div className="nx-login-quick">
          {QUICK_ACCOUNTS.map(acct => (
            <button
              key={acct.email}
              type="button"
              className="nx-btn nx-btn-ghost"
              style={{ width: '100%', justifyContent: 'space-between' }}
              onClick={() => quickLogin(acct.email, acct.password)}
              disabled={loading}
            >
              <span>{acct.label}</span>
              <span className="nx-mono" style={{ fontSize: 10, color: 'var(--nx-text-3)' }}>
                {acct.email}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
