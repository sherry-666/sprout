import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

const CREATE_INSTITUTION_MUTATION = gql`
  mutation CreateInstitution($input: CreateInstitutionInput!) {
    createInstitution(input: $input) {
      id
      name
    }
  }
`;

const NewInstitution = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdAdminEmail, setCreatedAdminEmail] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    province: '',
    admin_first_name: '',
    admin_last_name: '',
    admin_email: '',
  });

  const [createInstitutionMutate] = useMutation<any>(CREATE_INSTITUTION_MUTATION);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await createInstitutionMutate({
        variables: {
          input: {
            name: formData.name,
            address: formData.address || null,
            city: formData.city || null,
            province: formData.province || null,
            adminFirstName: formData.admin_first_name || null,
            adminLastName: formData.admin_last_name || null,
            adminEmail: formData.admin_email || null,
          },
        },
      });
      setCreatedAdminEmail(formData.admin_email);
      setShowSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create day care.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {/* Success modal */}
      {showSuccess && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="glass-card" style={{ maxWidth: '440px', width: '90%', textAlign: 'center', padding: '40px 32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ marginBottom: '12px' }}>Day Care Created!</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '8px' }}>
              An activation email has been sent to
            </p>
            <p style={{ fontWeight: 600, marginBottom: '16px' }}>{createdAdminEmail}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '28px' }}>
              The admin will receive a link to set up their password. The link expires in 72 hours.
            </p>
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/institutions')}>
              Back to Institutions
            </button>
          </div>
        </div>
      )}

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

          {/* Admin Invitation Section */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
            <h3 style={{ marginBottom: '4px' }}>{t('institutions.adminSection')}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
              {t('institutions.adminSectionDesc')}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label htmlFor="admin_first_name">{t('institutions.adminFirstName')}</label>
                <input
                  type="text" id="admin_first_name" name="admin_first_name" className="input-field"
                  value={formData.admin_first_name} onChange={handleChange}
                  placeholder={t('institutions.adminFirstNamePlaceholder')}
                />
              </div>
              <div className="form-group">
                <label htmlFor="admin_last_name">{t('institutions.adminLastName')}</label>
                <input
                  type="text" id="admin_last_name" name="admin_last_name" className="input-field"
                  value={formData.admin_last_name} onChange={handleChange}
                  placeholder={t('institutions.adminLastNamePlaceholder')}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="admin_email">{t('institutions.adminEmail')}</label>
              <input
                type="email" id="admin_email" name="admin_email" className="input-field"
                value={formData.admin_email} onChange={handleChange}
                placeholder={t('institutions.adminEmailPlaceholder')}
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
