import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { saveSession } from '../lib/api';

const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      __typename
      ... on AuthPayload {
        accessToken
        user {
          id
          role
          email
          username
          status
          profile {
            firstName
            lastName
            fullName
            phone
            avatarUrl
          }
          institution {
            id
            name
          }
        }
      }
      ... on InvalidCredentialsError {
        message
      }
      ... on AccountPendingError {
        message
      }
    }
  }
`;

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [loginMutate] = useMutation<any>(LOGIN_MUTATION);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await loginMutate({
        variables: {
          input: {
            login: email,
            password: password,
          },
        },
      });

      const result = data?.login;
      if (!result) {
        throw new Error('No response from server');
      }

      if (result.__typename === 'InvalidCredentialsError' || result.__typename === 'AccountPendingError') {
        setError(result.message);
        return;
      }

      saveSession(result.accessToken, result.user);
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
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'} id="password" className="input-field"
                placeholder="••••••••" style={{ paddingRight: '44px' }}
                value={password} onChange={(e) => setPassword(e.target.value)} required
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px', display: 'flex' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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
