import { BookOpen, Baby } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { getUser } from '../lib/api';

const EDUCATOR_STATS_QUERY = gql`
  query EducatorStats {
    kids(first: 1) { totalCount }
    classes { id }
  }
`;

const EducatorDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = getUser();

  const { data } = useQuery<{ kids: { totalCount: number }; classes: { id: string }[] }>(EDUCATOR_STATS_QUERY, { errorPolicy: 'all' });
  const myKids = data?.kids?.totalCount ?? '—';
  const myClasses = data?.classes?.length ?? '—';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('schoolAdmin.greeting', { name: user?.profile?.firstName })}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {t('educatorDashboard.subtitle')}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
        <div className="glass-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/kids')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(79,70,229,0.1)', borderRadius: '12px', padding: '14px' }}>
              <Baby size={24} color="var(--primary-color)" />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('educatorDashboard.myKids')}</div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{myKids}</div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/classes')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: '12px', padding: '14px' }}>
              <BookOpen size={24} color="#10b981" />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('educatorDashboard.myClasses')}</div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{myClasses}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducatorDashboard;
