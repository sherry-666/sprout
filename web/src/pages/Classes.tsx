import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Plus, BookOpen, Baby, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { isRole, Role } from '../lib/api';

const GET_CLASSES_QUERY = gql`
  query GetClasses {
    classes {
      id
      name
      educators {
        id
        profile { firstName lastName }
      }
      kids { id }
    }
  }
`;

interface ClassDoc {
  id: string;
  name: string;
  educators: { id: string; profile: { firstName: string; lastName: string } }[];
  kids: { id: string }[];
}

const Classes = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isEducator = isRole(Role.Educator);

  const { data: classesData, loading: classesLoading } = useQuery(GET_CLASSES_QUERY);
  const classes: ClassDoc[] = classesData?.classes ?? [];

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>{t('classes.classManagement')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{t('classes.viewAndManage')}</p>
        </div>
        {!isEducator && (
          <button className="btn-primary" onClick={() => navigate('/classes/new')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} /> {t('classes.addClass')}
            </span>
          </button>
        )}
      </div>

      <div className="glass-card">
        {classesLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px', gap: '12px' }}>
            <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : classes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-secondary)' }}>
            <BookOpen size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
            <p>{t('classes.noClasses')}. {t('classes.clickToAdd')}</p>
          </div>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('classes.classNameLabel')}</th>
                <th style={{ padding: '12px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('classes.educators')}</th>
                <th style={{ padding: '12px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('classes.kids')}</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls) => (
                <tr key={cls.id} onClick={() => navigate(`/classes/${cls.id}`)}
                  style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,70,229,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '14px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                        <BookOpen size={16} />
                      </div>
                      <span style={{ fontWeight: 500 }}>{cls.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 8px' }}>
                    {cls.educators.length === 0 ? (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>—</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {cls.educators.map((edu) => (
                          <span key={edu.id} style={{ background: 'rgba(79,70,229,0.08)', color: 'var(--primary-color)', borderRadius: '20px', padding: '3px 10px', fontSize: '0.8rem', fontWeight: 500 }}>
                            {edu.profile?.firstName} {edu.profile?.lastName}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 8px' }}>
                    <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>
                      {t('classes.kidCount', { count: cls.kids.length })}
                    </span>
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

export default Classes;
