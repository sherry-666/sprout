import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Baby, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Kids = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>{t('kids.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {t('kids.subtitle')}
          </p>
        </div>
        <button className="btn-primary" id="register-kid-btn" onClick={() => navigate('/kids/register')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> {t('kids.addKid')}
          </span>
        </button>
      </div>

      <div className="glass-card" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '300px', gap: '16px'
      }}>
        <Baby size={48} color="var(--text-secondary)" style={{ opacity: 0.4 }} />
        <h3 style={{ color: 'var(--text-secondary)' }}>{t('kids.noKids')}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t('kids.clickToAdd')}</p>
      </div>
    </Layout>
  );
};

export default Kids;
