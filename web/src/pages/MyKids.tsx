import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Baby, School, BookOpen, GraduationCap, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../lib/api';

interface KidSummary {
  id: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  dateOfBirth: string | null;
  profilePhotoUrl: string | null;
  institution: { id: string; name: string } | null;
  class: { id: string; name: string } | null;
  educators: { id: string; name: string }[];
}

const MyKids = () => {
  const { t } = useTranslation();
  const [kids, setKids] = useState<KidSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    authFetch('/api/parent/kids')
      .then(setKids)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>{t('myKids.title')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{t('myKids.subtitle')}</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '12px' }}>
          <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : error ? (
        <div className="glass-card" style={{ color: '#dc2626', textAlign: 'center' }}>⚠️ {error}</div>
      ) : kids.length === 0 ? (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
          <Baby size={48} color="var(--text-secondary)" style={{ opacity: 0.4 }} />
          <p style={{ color: 'var(--text-secondary)' }}>{t('myKids.noKids')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {kids.map(kid => (
            <div key={kid.id} className="glass-card">
              {/* Kid header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                {kid.profilePhotoUrl ? (
                  <img src={kid.profilePhotoUrl} alt="" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.4rem', flexShrink: 0 }}>
                    {kid.firstName.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{kid.firstName} {kid.lastName}</h2>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                    {kid.gender && <span style={{ textTransform: 'capitalize' }}>{kid.gender === 'male' ? '♂' : '♀'} {t(`myKids.${kid.gender}`)}</span>}
                    {kid.gender && kid.dateOfBirth && <span> · </span>}
                    {kid.dateOfBirth && <span>{new Date(kid.dateOfBirth).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>

              {/* Info rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <InfoRow
                  icon={<School size={16} />}
                  label={t('myKids.institution')}
                  value={kid.institution?.name}
                  empty={t('myKids.notAssigned')}
                  color="#4F46E5"
                  bg="rgba(79,70,229,0.08)"
                />
                <InfoRow
                  icon={<BookOpen size={16} />}
                  label={t('myKids.class')}
                  value={kid.class?.name}
                  empty={t('myKids.notEnrolled')}
                  color="#10b981"
                  bg="rgba(16,185,129,0.08)"
                />
                <InfoRow
                  icon={<GraduationCap size={16} />}
                  label={t('myKids.educators')}
                  value={kid.educators.length > 0 ? kid.educators.map(e => e.name).join(', ') : undefined}
                  empty={t('myKids.noEducators')}
                  color="#f59e0b"
                  bg="rgba(245,158,11,0.08)"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
};

const InfoRow = ({ icon, label, value, empty, color, bg }: {
  icon: React.ReactNode; label: string; value?: string; empty: string; color: string; bg: string;
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: bg, borderRadius: '10px' }}>
    <div style={{ color, flexShrink: 0 }}>{icon}</div>
    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '80px' }}>{label}</div>
    <div style={{ fontWeight: 500, fontSize: '0.9rem', color: value ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
      {value ?? empty}
    </div>
  </div>
);

export default MyKids;
