import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { ArrowLeft, Loader, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';

const GET_STAFF_MEMBER_QUERY = gql`
  query GetStaffMember($id: ID!) {
    node(id: $id) {
      ... on User {
        id
        email
        role
        status
        profile {
          firstName
          lastName
        }
        classes {
          id
          name
          kids {
            id
          }
        }
      }
    }
  }
`;

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

const RoleBadge = ({ role }: { role: string }) => (
  <span style={{ background: 'rgba(79,70,229,0.1)', color: 'var(--primary-color)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>
    {role}
  </span>
);

const StaffDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data, loading, error } = useQuery<{ node: any }>(GET_STAFF_MEMBER_QUERY, { variables: { id }, skip: !id });

  const member = data?.node;

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '12px' }}>
          <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </Layout>
    );
  }

  if (error || !member) {
    return (
      <Layout>
        <div className="glass-card" style={{ color: '#dc2626', textAlign: 'center' }}>
          ⚠️ {error?.message || t('staffDetail.notFound')}
        </div>
      </Layout>
    );
  }

  const fullName = `${member.profile?.firstName ?? ''} ${member.profile?.lastName ?? ''}`.trim();
  const classes = member.classes ?? [];

  return (
    <Layout>
      {/* Back + header */}
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => navigate('/users')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px', padding: 0 }}>
          <ArrowLeft size={16} /> {t('staffDetail.back')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.4rem', flexShrink: 0 }}>
            {member.profile?.firstName?.charAt(0) ?? '?'}
          </div>
          <div>
            <h1 style={{ margin: 0, marginBottom: '6px' }}>{fullName}</h1>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <RoleBadge role={member.role} />
              <StatusBadge status={member.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="glass-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '2px' }}>{t('users.email')}</div>
            <div style={{ fontWeight: 500 }}>{member.email}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '2px' }}>{t('users.role')}</div>
            <div style={{ fontWeight: 500 }}>{member.role}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '2px' }}>{t('users.status')}</div>
            <div style={{ fontWeight: 500 }}>{member.status}</div>
          </div>
        </div>
      </div>

      {/* Classes */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ color: 'var(--primary-color)' }}><BookOpen size={20} /></div>
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{t('staffDetail.assignedClasses')}</h2>
          <span style={{ background: 'rgba(79,70,229,0.1)', color: 'var(--primary-color)', borderRadius: '12px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 600 }}>
            {classes.length}
          </span>
        </div>
        {classes.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '16px 0' }}>
            {t('staffDetail.noClasses')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {classes.map((cls: any) => (
              <div key={cls.id} onClick={() => navigate(`/classes/${cls.id}`)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.5)', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,70,229,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                    <BookOpen size={16} />
                  </div>
                  <span style={{ fontWeight: 500 }}>{cls.name}</span>
                </div>
                <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>
                  {t('classes.kidCount', { count: cls.kids?.length ?? 0 })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StaffDetail;
