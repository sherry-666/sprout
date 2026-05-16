import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiLogin, saveSession } from '../lib/api';

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      saveSession(data.access_token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-card auth-box">
        <h1>🌱 Sprout</h1>
        <p>{t('auth.subtitle')}</p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#dc2626', borderRadius: '8px', padding: '12px 16px',
            fontSize: '0.9rem', marginBottom: '8px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="login">{t('auth.usernameOrEmail')}</label>
            <input
              type="text" id="login" className="input-field"
              placeholder="sprout_admin"
              value={email} onChange={(e) => setEmail(e.target.value)} required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <input
              type="password" id="password" className="input-field"
              placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required
            />
          </div>
          <button type="submit" className="btn-primary" id="login-btn"
            style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
