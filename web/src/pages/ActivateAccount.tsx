import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';

const VALIDATE_TOKEN_QUERY = gql`
  query ValidateToken($token: String!) {
    validateToken(token: $token) {
      __typename
      ... on InvitationInfo {
        email
        firstName
        lastName
        role
        institutionName
      }
      ... on TokenNotFoundError {
        message
      }
      ... on TokenExpiredError {
        message
      }
      ... on TokenUsedError {
        message
      }
    }
  }
`;

const ACTIVATE_MUTATION = gql`
  mutation Activate($input: ActivateInput!) {
    activate(input: $input) {
      __typename
      ... on AuthPayload {
        accessToken
      }
      ... on TokenNotFoundError {
        message
      }
      ... on TokenExpiredError {
        message
      }
      ... on TokenUsedError {
        message
      }
    }
  }
`;

interface TokenInfo {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  institution_name: string;
}

const ActivateAccount = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activating, setActivating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: tokenData, loading: tokenLoading, error: tokenError } = useQuery<any>(
    VALIDATE_TOKEN_QUERY,
    {
      variables: { token },
      skip: !token,
    }
  );

  const [activateMutate] = useMutation<any>(ACTIVATE_MUTATION);

  useEffect(() => {
    if (!token) {
      setError(t('activate.invalidToken'));
      setLoading(false);
      return;
    }

    if (tokenError) {
      setError(tokenError.message);
      setLoading(false);
      return;
    }

    if (tokenData) {
      const res = tokenData.validateToken;
      if (res.__typename === 'InvitationInfo') {
        setTokenInfo({
          email: res.email,
          first_name: res.firstName,
          last_name: res.lastName,
          role: res.role,
          institution_name: res.institutionName,
        });
        setError('');
      } else {
        setError(res.message || t('activate.invalidToken'));
      }
      setLoading(false);
    } else if (!tokenLoading) {
      setLoading(false);
    }
  }, [token, tokenData, tokenLoading, tokenError, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t('activate.passwordMismatch'));
      return;
    }
    if (password.length < 6) {
      setError(t('activate.passwordTooShort'));
      return;
    }

    setActivating(true);
    setError('');

    try {
      const { data } = await activateMutate({
        variables: {
          input: {
            token,
            password,
          },
        },
      });

      const res = data?.activate;
      if (!res) {
        throw new Error(t('activate.failed'));
      }

      if (
        res.__typename === 'TokenNotFoundError' ||
        res.__typename === 'TokenExpiredError' ||
        res.__typename === 'TokenUsedError'
      ) {
        setError(res.message);
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div className="glass-card auth-box" style={{ textAlign: 'center' }}>
          <h1>🌱 Sprout</h1>
          <p>{t('activate.validating')}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="glass-card auth-box" style={{ textAlign: 'center' }}>
          <h1>🌱 Sprout</h1>
          <div style={{
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
            color: '#059669', borderRadius: '8px', padding: '16px', marginBottom: '16px'
          }}>
            ✅ {t('activate.success')}
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>{t('activate.redirecting')}</p>
        </div>
      </div>
    );
  }

  if (!tokenInfo) {
    return (
      <div className="auth-container">
        <div className="glass-card auth-box" style={{ textAlign: 'center' }}>
          <h1>🌱 Sprout</h1>
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#dc2626', borderRadius: '8px', padding: '16px', marginBottom: '16px'
          }}>
            {error || t('activate.invalidToken')}
          </div>
          <button className="btn-primary" onClick={() => navigate('/login')}>
            {t('activate.goToLogin')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="glass-card auth-box">
        <h1>🌱 Sprout</h1>
        <p style={{ marginBottom: '8px' }}>
          {t('activate.welcome', { name: tokenInfo.first_name })}
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
          {t('activate.invitedTo', { institution: tokenInfo.institution_name })}
        </p>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#dc2626', borderRadius: '8px', padding: '12px 16px',
            fontSize: '0.9rem', marginBottom: '8px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="activate-email">{t('activate.emailLabel')}</label>
            <input
              type="email" id="activate-email" className="input-field"
              value={tokenInfo.email} disabled
              style={{ opacity: 0.7 }}
            />
          </div>
          <div className="form-group">
            <label htmlFor="activate-password">{t('activate.newPassword')}</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'} id="activate-password" className="input-field"
                placeholder="••••••••" style={{ paddingRight: '44px' }}
                value={password} onChange={(e) => setPassword(e.target.value)} required
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px', display: 'flex' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="activate-confirm">{t('activate.confirmPassword')}</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'} id="activate-confirm" className="input-field"
                placeholder="••••••••" style={{ paddingRight: '44px' }}
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px', display: 'flex' }}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn-primary" id="activate-btn"
            style={{ width: '100%', marginTop: '8px' }} disabled={activating}>
            {activating ? t('activate.activating') : t('activate.activateButton')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ActivateAccount;
