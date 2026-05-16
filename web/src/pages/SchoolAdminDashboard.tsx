
import { Users, BookOpen, Baby } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getUser } from '../lib/api';

const SchoolAdminDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = getUser();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t('schoolAdmin.greeting', { name: user?.profile?.firstName })}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {t('schoolAdmin.subtitle')}
          </p>
        </div>
        <button className="btn-primary" id="create-class-btn" onClick={() => navigate('/classes')}>
          + {t('schoolAdmin.createClass')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <div className="glass-card" id="total-kids-card"
          style={{ cursor: 'pointer' }} onClick={() => navigate('/users')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(79,70,229,0.1)', borderRadius: '12px', padding: '14px' }}>
              <Baby size={24} color="var(--primary-color)" />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('schoolAdmin.totalKids')}</div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>0</div>
            </div>
          </div>
        </div>

        <div className="glass-card" id="active-classes-card"
          style={{ cursor: 'pointer' }} onClick={() => navigate('/classes')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: '12px', padding: '14px' }}>
              <BookOpen size={24} color="#10b981" />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('schoolAdmin.activeClasses')}</div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>0</div>
            </div>
          </div>
        </div>

        <div className="glass-card" id="teachers-card"
          style={{ cursor: 'pointer' }} onClick={() => navigate('/users')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: '12px', padding: '14px' }}>
              <Users size={24} color="#f59e0b" />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('schoolAdmin.teachers')}</div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>0</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolAdminDashboard;
