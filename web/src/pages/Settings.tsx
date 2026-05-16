
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';

const Settings = () => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>{t('settings.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {t('settings.subtitle')}
          </p>
        </div>
      </div>

      <div className="glass-card" style={{ maxWidth: '600px' }}>
        <h3 style={{ marginBottom: '8px' }}>{t('settings.language')}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
          {t('settings.languageDescription')}
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { code: 'en', label: 'English' },
            { code: 'zh', label: '中文 (Chinese)' },
            { code: 'fr', label: 'Français (French)' },
          ].map(({ code, label }) => {
            const active = i18n.resolvedLanguage === code;
            return (
              <button
                key={code}
                onClick={() => changeLanguage(code)}
                className={active ? 'btn-primary' : 'btn-secondary'}
                style={{ fontSize: '0.9rem', padding: '10px 20px' }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
