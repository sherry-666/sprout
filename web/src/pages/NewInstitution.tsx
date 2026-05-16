import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { authFetch } from '../lib/api';

const NewInstitution = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    province: '',
    phone: '',
    email: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authFetch('/api/institutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'active',
        }),
      });
      navigate('/institutions');
    } catch (err: any) {
      setError(err.message || 'Failed to create day care.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>{t('institutions.addTitle')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {t('institutions.addSubtitle')}
          </p>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/institutions')}>
          {t('institutions.cancel')}
        </button>
      </div>

      <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#dc2626', borderRadius: '8px', padding: '12px 16px',
            fontSize: '0.9rem', marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label htmlFor="name">{t('institutions.name')}</label>
            <input
              type="text" id="name" name="name" className="input-field" required
              value={formData.name} onChange={handleChange}
              placeholder={t('institutions.namePlaceholder')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">{t('institutions.email')}</label>
            <input
              type="email" id="email" name="email" className="input-field"
              value={formData.email} onChange={handleChange}
              placeholder={t('institutions.emailPlaceholder')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">{t('institutions.phone')}</label>
            <input
              type="text" id="phone" name="phone" className="input-field"
              value={formData.phone} onChange={handleChange}
              placeholder={t('institutions.phonePlaceholder')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">{t('institutions.address')}</label>
            <input
              type="text" id="address" name="address" className="input-field"
              value={formData.address} onChange={handleChange}
              placeholder={t('institutions.addressPlaceholder')}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="city">{t('institutions.city')}</label>
              <input
                type="text" id="city" name="city" className="input-field"
                value={formData.city} onChange={handleChange}
                placeholder={t('institutions.cityPlaceholder')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="province">{t('institutions.province')}</label>
              <input
                type="text" id="province" name="province" className="input-field"
                value={formData.province} onChange={handleChange}
                placeholder={t('institutions.provincePlaceholder')}
              />
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? t('institutions.creating') : t('institutions.createDayCare')}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default NewInstitution;
