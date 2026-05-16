
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

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => changeLanguage('en')}
            className={i18n.resolvedLanguage === 'en' ? 'btn-primary' : 'btn-secondary'}
          >
            English
          </button>
          <button
            onClick={() => changeLanguage('zh')}
            className={i18n.resolvedLanguage === 'zh' ? 'btn-primary' : 'btn-secondary'}
          >
            中文 (Chinese)
          </button>
          <button
            onClick={() => changeLanguage('fr')}
            className={i18n.resolvedLanguage === 'fr' ? 'btn-primary' : 'btn-secondary'}
          >
            Français (French)
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
