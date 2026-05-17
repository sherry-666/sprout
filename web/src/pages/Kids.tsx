import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Baby, Plus, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { isRole, Role } from '../lib/api';

const GET_KIDS_QUERY = gql`
  query GetKids {
    kids(first: 200) {
      edges {
        node {
          id
          firstName
          lastName
          gender
          dateOfBirth
          class {
            id
            name
          }
        }
      }
      totalCount
    }
  }
`;

const genderColor = (gender: string) =>
  gender === 'male'
    ? 'linear-gradient(135deg, #4F46E5, #7C3AED)'
    : 'linear-gradient(135deg, #EC4899, #F59E0B)';

const Kids = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isEducator = isRole(Role.Educator);

  const { data, loading, error } = useQuery<{ kids: { edges: { node: any }[]; totalCount: number } }>(GET_KIDS_QUERY);
  const kids = data?.kids?.edges?.map((e: any) => e.node) ?? [];

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>{t('kids.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {t('kids.subtitle')}
          </p>
        </div>
        {!isEducator && (
          <button className="btn-primary" id="register-kid-btn" onClick={() => navigate('/kids/register')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} /> {t('kids.addKid')}
            </span>
          </button>
        )}
      </div>

      <div className="glass-card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px', gap: '12px' }}>
            <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : error ? (
          <div style={{ color: '#dc2626', textAlign: 'center', padding: '48px 0' }}>
            ⚠️ {error.message}
          </div>
        ) : kids.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
            <Baby size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
            <p>{t('kids.noKids')}. {t('kids.clickToAdd')}</p>
          </div>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('kids.name')}</th>
                <th style={{ padding: '12px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('kids.dateOfBirth')}</th>
                <th style={{ padding: '12px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('kids.gender')}</th>
                <th style={{ padding: '12px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('kids.class')}</th>
              </tr>
            </thead>
            <tbody>
              {kids.map((kid: any) => (
                <tr key={kid.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: genderColor(kid.gender), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                        {kid.firstName?.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 500 }}>{kid.firstName} {kid.lastName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {kid.dateOfBirth ? new Date(kid.dateOfBirth).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '14px 8px' }}>
                    <span style={{ background: kid.gender === 'male' ? 'rgba(79,70,229,0.1)' : 'rgba(236,72,153,0.1)', color: kid.gender === 'male' ? 'var(--primary-color)' : '#EC4899', padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>
                      {kid.gender === 'male' ? t('registerKid.male') : t('registerKid.female')}
                    </span>
                  </td>
                  <td style={{ padding: '14px 8px' }}>
                    {kid.class ? (
                      <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>
                        {kid.class.name}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
};

export default Kids;
