import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin } from '../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiLogin(email, password);
      login(res.access_token, res.user);
      navigate('/');
    } catch (err: any) { setError(err.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  const quickLogin = async (em: string, pw: string) => {
    setEmail(em); setPassword(pw); setError(''); setLoading(true);
    try {
      const res = await apiLogin(em, pw);
      login(res.access_token, res.user);
      navigate('/');
    } catch (err: any) { setError(err.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="ds-login">
      <div className="ds-login-card">
        <div className="ds-login-brand">
          <div className="ds-login-logo">N</div>
          <h1>NEXUS</h1>
          <p>Autonomous Logistics Intelligence</p>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="ds-form-error">{error}</div>}
          <div className="ds-form-group">
            <label className="ds-form-label">Email</label>
            <input className="ds-form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required />
          </div>
          <div className="ds-form-group">
            <label className="ds-form-label">Password</label>
            <input className="ds-form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
          </div>
          <button type="submit" className="ds-btn ds-btn-primary" style={{ width: '100%', height: 40, marginTop: 8 }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="ds-login-divider"><span>Quick Access</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="ds-btn ds-btn-white" style={{ width: '100%' }} onClick={() => quickLogin('admin@nexus.ai', 'admin123')}>Admin</button>
          <button className="ds-btn ds-btn-white" style={{ width: '100%' }} onClick={() => quickLogin('maersk@nexus.ai', 'maersk123')}>Maersk</button>
          <button className="ds-btn ds-btn-white" style={{ width: '100%' }} onClick={() => quickLogin('emirates@nexus.ai', 'emirates123')}>Emirates</button>
        </div>
      </div>
    </div>
  );
}
