
import Layout from '../components/Layout';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Classes = () => {
  const { t } = useTranslation();
  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>{t('classes.classManagement')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {t('classes.viewAndManage')}
          </p>
        </div>
        <button className="btn-primary" id="create-class-btn">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> {t('classes.addClass')}
          </span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '200px', border: '2px dashed var(--border-color)',
          cursor: 'pointer', transition: 'border-color 0.2s ease'
        }}>
          <Plus size={32} color="var(--text-secondary)" />
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 500 }}>
            {t('classes.clickToAdd')}
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Classes;
