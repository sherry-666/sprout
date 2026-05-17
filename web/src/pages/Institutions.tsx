import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { School, Plus, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../lib/api';

const Institutions = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    authFetch('/api/institutions')
      .then(setInstitutions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>{t('institutions.dayCareManagement')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {t('institutions.onboardSubtext')}
          </p>
        </div>
        <button className="btn-primary" id="add-school-btn" onClick={() => navigate('/institutions/new')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> {t('institutions.inviteInstitution')}
          </span>
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '12px' }}>
          <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--text-secondary)' }}>{t('institutions.loading')}</span>
        </div>
      ) : error ? (
        <div className="glass-card" style={{ color: '#dc2626', textAlign: 'center' }}>
          ⚠️ {t('institutions.failedToLoad', { error })}
        </div>
      ) : institutions.length === 0 ? (
        <div className="glass-card" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '300px', gap: '16px'
        }}>
          <School size={48} color="var(--text-secondary)" />
          <h3 style={{ color: 'var(--text-secondary)' }}>{t('institutions.noDayCaresAdded')}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {t('institutions.clickToAdd')}
          </p>
          <button className="btn-primary" onClick={() => navigate('/institutions/new')}>+ {t('institutions.addDayCare')}</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {institutions.map((inst: any) => (
            <div
              key={inst.id}
              className="glass-card"
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
              onClick={() => navigate(`/institutions/${inst.id}`)}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #4F46E5, #EC4899)',
                    borderRadius: '12px', padding: '16px', color: 'white',
                    fontSize: '1.4rem', fontWeight: 700, minWidth: '56px', textAlign: 'center'
                  }}>
                    {inst.name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ marginBottom: '4px' }}>{inst.name}</h3>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      📍 {[inst.address, inst.city, inst.province].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginRight: '8px' }}>
                  <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 500 }}>
                    {t(`institutions.${inst.status}`)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
};

export default Institutions;
