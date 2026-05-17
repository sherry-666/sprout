import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Users as UsersIcon, Mail, X, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';

const GET_USERS_QUERY = gql`
  query GetUsers {
    users {
      id
      email
      role
      status
      profile {
        firstName
        lastName
      }
    }
  }
`;

const INVITE_EDUCATOR_MUTATION = gql`
  mutation InviteEducator($input: InviteEducatorInput!) {
    inviteEducator(input: $input) {
      __typename
      ... on InvitationSent {
        email
        sent
      }
      ... on EmailAlreadyRegisteredError {
        message
      }
      ... on EmailNotWhitelistedError {
        message
      }
    }
  }
`;

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const isPending = status === 'pending';
  return (
    <span style={{
      background: isPending ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
      color: isPending ? '#f59e0b' : '#10b981',
      padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500,
    }}>
      {status}
    </span>
  );
};

const Users = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successEmail, setSuccessEmail] = useState('');

  const { data, loading, refetch } = useQuery<any>(GET_USERS_QUERY);
  const [inviteEducatorMutate] = useMutation<any>(INVITE_EDUCATOR_MUTATION);

  useEffect(() => {
    if (data?.users) {
      const mapped = data.users.map((u: any) => ({
        id: u.id,
        firstName: u.profile?.firstName || '',
        lastName: u.profile?.lastName || '',
        email: u.email,
        role: u.role,
        status: u.status,
      }));
      setUsers(mapped);
    }
  }, [data]);

  const openModal = () => {
    setFirstName(''); setLastName(''); setEmail('');
    setFormError(''); setShowModal(true);
  };

  const handleInvite = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setFormError(t('users.allFieldsRequired'));
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const { data: inviteRes } = await inviteEducatorMutate({
        variables: {
          input: {
            firstName: firstName,
            lastName: lastName,
            email: email,
          },
        },
      });

      const result = inviteRes?.inviteEducator;
      if (!result) {
        throw new Error(t('users.inviteFailed'));
      }

      if (result.__typename === 'EmailAlreadyRegisteredError' || result.__typename === 'EmailNotWhitelistedError') {
        setFormError(result.message);
        return;
      }

      setShowModal(false);
      setSuccessEmail(email);
      setShowSuccess(true);
      refetch();
    } catch (e: any) {
      setFormError(e.message || t('users.inviteFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      {/* Success modal */}
      {showSuccess && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ maxWidth: '420px', width: '90%', textAlign: 'center', padding: '40px 32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✉️</div>
            <h2 style={{ marginBottom: '12px' }}>{t('users.inviteSentTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '28px' }}>
              {t('users.inviteSentMsg', { email: successEmail })}
            </p>
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => setShowSuccess(false)}>
              {t('users.done')}
            </button>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ maxWidth: '460px', width: '90%', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ margin: 0 }}>{t('users.inviteUser')}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
              {t('users.inviteDesc')}
            </p>

            <div className="form-group">
              <label>{t('users.firstName')}</label>
              <input className="input-field" placeholder={t('users.firstNamePlaceholder')} value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('users.lastName')}</label>
              <input className="input-field" placeholder={t('users.lastNamePlaceholder')} value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>{t('users.email')}</label>
              <input className="input-field" type="email" placeholder={t('users.emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()} />
            </div>

            {formError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#dc2626', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', marginBottom: '16px' }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setShowModal(false)} disabled={submitting}
                style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>
                {t('users.cancel')}
              </button>
              <button className="btn-primary" onClick={handleInvite} disabled={submitting}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {submitting ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('users.sending')}</> : <><Mail size={16} /> {t('users.sendInvite')}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>{t('users.userManagement')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{t('users.manageEducators')}</p>
        </div>
        <button className="btn-primary" id="invite-user-btn" onClick={openModal}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={16} /> {t('users.inviteUser')}
          </span>
        </button>
      </div>

      <div className="glass-card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px', gap: '12px' }}>
            <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
            <UsersIcon size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
            <p>{t('users.noUsers')}. {t('users.clickToInvite')}</p>
          </div>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('users.name')}</th>
                <th style={{ padding: '12px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('users.email')}</th>
                <th style={{ padding: '12px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('users.role')}</th>
                <th style={{ padding: '12px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('users.status')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                        {u.firstName.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.firstName} {u.lastName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{u.email}</td>
                  <td style={{ padding: '14px 8px' }}>
                    <span style={{ background: 'rgba(79,70,229,0.1)', color: 'var(--primary-color)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '14px 8px' }}><StatusBadge status={u.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
};

export default Users;
