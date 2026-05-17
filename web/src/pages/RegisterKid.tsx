import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { ArrowLeft, Plus, Trash2, User, Users, Baby, Loader, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

const REGISTER_KID_MUTATION = gql`
  mutation RegisterKid($input: RegisterKidInput!) {
    registerKid(input: $input) {
      __typename
      ... on KidRegistered {
        kid {
          id
          firstName
          lastName
        }
        emailsInvited
      }
      ... on ValidationError {
        field
        message
      }
    }
  }
`;

interface ParentForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const emptyParent = (): ParentForm => ({ firstName: '', lastName: '', email: '', phone: '' });

const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
    <div style={{ background: 'rgba(79,70,229,0.1)', borderRadius: '10px', padding: '8px', color: 'var(--primary-color)' }}>{icon}</div>
    <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{title}</h2>
  </div>
);

const RegisterKid = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Kid fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Parents
  const [parents, setParents] = useState<ParentForm[]>([emptyParent()]);

  // UI state
  const [errors, setErrors] = useState<string[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);

  const [registerKidMutate] = useMutation<any>(REGISTER_KID_MUTATION);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const updateParent = (i: number, field: keyof ParentForm, value: string) => {
    setParents(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  };

  const addParent = () => setParents(prev => [...prev, emptyParent()]);

  const removeParent = (i: number) => setParents(prev => prev.filter((_, idx) => idx !== i));

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!firstName.trim()) errs.push(t('registerKid.errorFirstName'));
    if (!lastName.trim()) errs.push(t('registerKid.errorLastName'));
    if (!gender) errs.push(t('registerKid.errorGender'));
    if (!dateOfBirth) errs.push(t('registerKid.errorDob'));
    else if (new Date(dateOfBirth) > new Date()) errs.push(t('registerKid.errorDobFuture'));
    if (parents.length === 0) errs.push(t('registerKid.errorNoParents'));
    parents.forEach((p, i) => {
      if (!p.firstName.trim() || !p.lastName.trim()) errs.push(t('registerKid.errorParentName', { n: i + 1 }));
      if (!p.email.trim()) errs.push(t('registerKid.errorParentEmail', { n: i + 1 }));
    });
    setErrors(errs);
    return errs.length === 0;
  };

  const handleReview = () => { if (validate()) setShowReview(true); };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data } = await registerKidMutate({
        variables: {
          input: {
            firstName,
            lastName,
            gender,
            dateOfBirth,
            profilePhotoUrl: null,
            parents: parents.map(p => ({
              firstName: p.firstName,
              lastName: p.lastName,
              email: p.email,
              phone: p.phone || null,
            })),
          },
        },
      });

      const res = data?.registerKid;
      if (!res) {
        throw new Error(t('registerKid.submitFailed'));
      }

      if (res.__typename === 'ValidationError') {
        setShowReview(false);
        setErrors([`${res.field}: ${res.message}`]);
        return;
      }

      setInvitedEmails(res.emailsInvited || []);
      setShowReview(false);
      setShowSuccess(true);
    } catch (e: any) {
      setShowReview(false);
      setErrors([e.message || t('registerKid.submitFailed')]);
    } finally {
      setSubmitting(false);
    }
  };

  const genderBtn = (value: 'male' | 'female', label: string, emoji: string) => (
    <button
      type="button"
      onClick={() => setGender(value)}
      style={{
        flex: 1, padding: '12px', borderRadius: '8px', fontWeight: 600, fontSize: '0.95rem',
        border: `2px solid ${gender === value ? 'var(--primary-color)' : 'var(--border-color)'}`,
        background: gender === value ? 'rgba(79,70,229,0.08)' : 'transparent',
        color: gender === value ? 'var(--primary-color)' : 'var(--text-secondary)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      {emoji} {label}
    </button>
  );

  return (
    <Layout>
      {/* Review Modal */}
      {showReview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '520px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ margin: 0 }}>{t('registerKid.reviewTitle')}</h2>
              <button onClick={() => setShowReview(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>

            {/* Kid summary */}
            <div style={{ background: 'rgba(79,70,229,0.05)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>{t('registerKid.kidInfo')}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {photoPreview ? (
                  <img src={photoPreview} alt="" style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.2rem' }}>
                    {firstName.charAt(0)}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{firstName} {lastName}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {gender === 'male' ? '♂ Male' : '♀ Female'} · {dateOfBirth}
                  </div>
                </div>
              </div>
            </div>

            {/* Parents summary */}
            <div style={{ background: 'rgba(16,185,129,0.05)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>{t('registerKid.parents')} ({parents.length})</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {parents.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.firstName} {p.lastName}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{p.email}{p.phone ? ` · ${p.phone}` : ''}</div>
                    </div>
                    <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {t('registerKid.parent')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px', lineHeight: 1.6 }}>
              {t('registerKid.reviewNote')}
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowReview(false)} disabled={submitting}
                style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '12px', fontWeight: 600, cursor: 'pointer' }}>
                {t('registerKid.edit')}
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {submitting ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('registerKid.registering')}</> : t('registerKid.confirmRegister')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '460px', width: '100%', textAlign: 'center', padding: '40px 32px' }}>
            <div style={{ fontSize: '52px', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ marginBottom: '12px' }}>{t('registerKid.successTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '8px' }}>
              <strong>{firstName} {lastName}</strong> {t('registerKid.successMsg')}
            </p>
            {invitedEmails.length > 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '28px' }}>
                {t('registerKid.emailsSent')} {invitedEmails.join(', ')}.
              </p>
            )}
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/kids')}>
              {t('registerKid.done')}
            </button>
          </div>
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <button onClick={() => navigate('/kids')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px', padding: 0 }}>
          <ArrowLeft size={16} /> {t('registerKid.back')}
        </button>
        <h1>{t('registerKid.title')}</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{t('registerKid.subtitle')}</p>
      </div>

      {/* Error banner */}
      {errors.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px' }}>
          {errors.map((e, i) => <div key={i} style={{ color: '#dc2626', fontSize: '0.9rem', lineHeight: 1.6 }}>• {e}</div>)}
        </div>
      )}

      {/* Kid Info */}
      <div className="glass-card" style={{ marginBottom: '20px' }}>
        <SectionTitle icon={<Baby size={18} />} title={t('registerKid.kidInfo')} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>{t('registerKid.firstName')} *</label>
            <input className="input-field" placeholder={t('registerKid.firstNamePlaceholder')} value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>{t('registerKid.lastName')} *</label>
            <input className="input-field" placeholder={t('registerKid.lastNamePlaceholder')} value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label>{t('registerKid.gender')} *</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            {genderBtn('male', t('registerKid.male'), '♂')}
            {genderBtn('female', t('registerKid.female'), '♀')}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>{t('registerKid.dateOfBirth')} *</label>
            <input className="input-field" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} max={new Date().toISOString().split('T')[0]} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>{t('registerKid.photo')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {photoPreview ? (
                <img src={photoPreview} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={20} color="var(--text-secondary)" />
                </div>
              )}
              <button type="button" onClick={() => photoInputRef.current?.click()}
                style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                {photoPreview ? t('registerKid.changePhoto') : t('registerKid.uploadPhoto')}
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </div>
          </div>
        </div>
      </div>

      {/* Parents */}
      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <SectionTitle icon={<Users size={18} />} title={t('registerKid.parents')} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', marginTop: '-8px' }}>
          {t('registerKid.parentsDesc')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {parents.map((p, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.5)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-color)', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary-color)' }}>
                  {t('registerKid.parent')} {i + 1}
                </span>
                {parents.length > 1 && (
                  <button onClick={() => removeParent(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>{t('registerKid.firstName')} *</label>
                  <input className="input-field" placeholder={t('registerKid.firstNamePlaceholder')} value={p.firstName} onChange={e => updateParent(i, 'firstName', e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>{t('registerKid.lastName')} *</label>
                  <input className="input-field" placeholder={t('registerKid.lastNamePlaceholder')} value={p.lastName} onChange={e => updateParent(i, 'lastName', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>{t('registerKid.parentEmail')} *</label>
                  <input className="input-field" type="email" placeholder="e.g. parent@example.com" value={p.email} onChange={e => updateParent(i, 'email', e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>{t('registerKid.parentPhone')}</label>
                  <input className="input-field" placeholder="e.g. 416-555-1234" value={p.phone} onChange={e => updateParent(i, 'phone', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addParent} style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 500, width: '100%', justifyContent: 'center', transition: 'border-color 0.15s, color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.color = 'var(--primary-color)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
          <Plus size={16} /> {t('registerKid.addParent')}
        </button>
      </div>

      {/* Submit */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button onClick={() => navigate('/kids')} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '12px 24px', fontWeight: 600, cursor: 'pointer' }}>
          {t('registerKid.cancel')}
        </button>
        <button onClick={handleReview} className="btn-primary">
          {t('registerKid.reviewAndRegister')}
        </button>
      </div>
    </Layout>
  );
};

export default RegisterKid;
