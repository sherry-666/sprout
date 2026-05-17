import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { ArrowLeft, Loader, School, User, GraduationCap, Baby, Trash2, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authFetch } from '../lib/api';

const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, { bg: string; color: string }> = {
    active:  { bg: 'rgba(16,185,129,0.1)',  color: '#10b981' },
    pending: { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b' },
    inactive:{ bg: 'rgba(100,116,139,0.1)', color: '#64748b' },
  };
  const style = colors[status] ?? colors.inactive;
  return (
    <span style={{ background: style.bg, color: style.color, padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>
      {status}
    </span>
  );
};

const SectionHeader = ({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
    <div style={{ color: 'var(--primary-color)' }}>{icon}</div>
    <h2 style={{ fontSize: '1.1rem' }}>{title}</h2>
    {count !== undefined && (
      <span style={{ background: 'rgba(79,70,229,0.1)', color: 'var(--primary-color)', borderRadius: '12px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 600 }}>
        {count}
      </span>
    )}
  </div>
);

const InstitutionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [inst, setInst] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showDeletedModal, setShowDeletedModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    authFetch(`/api/institutions/${id}`)
      .then(setInst)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const openDeleteModal = () => {
    setDeleteConfirm('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!inst || deleteConfirm !== inst.name) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await authFetch(`/api/institutions/${id}`, { method: 'DELETE' });
      setShowDeleteModal(false);
      setShowDeletedModal(true);
    } catch (e: any) {
      setDeleteError(e.message || 'Failed to delete institution.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '12px' }}>
          <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ color: 'var(--text-secondary)' }}>{t('institutionDetail.loading')}</span>
        </div>
      </Layout>
    );
  }

  if (error || !inst) {
    return (
      <Layout>
        <div className="glass-card" style={{ color: '#dc2626', textAlign: 'center' }}>
          ⚠️ {error || t('institutionDetail.notFound')}
        </div>
      </Layout>
    );
  }

  const address = [inst.address, inst.city, inst.province].filter(Boolean).join(', ');

  return (
    <Layout>
      {/* Delete success modal */}
      {showDeletedModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ maxWidth: '420px', width: '90%', textAlign: 'center', padding: '40px 32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
            <h2 style={{ marginBottom: '12px' }}>{t('institutions.deleteTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '28px' }}>
              <strong>{inst?.name}</strong> {t('institutionDetail.deleteSuccessMsg')}
            </p>
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/institutions')}>
              {t('institutionDetail.done')}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ maxWidth: '460px', width: '90%', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: '10px', padding: '10px' }}>
                <Trash2 size={22} color="#dc2626" />
              </div>
              <h2 style={{ color: '#dc2626', margin: 0 }}>{t('institutions.deleteTitle')}</h2>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '14px 16px', marginBottom: '20px', color: '#dc2626', fontSize: '0.9rem', lineHeight: 1.6 }}>
              ⚠️ {t('institutions.deleteWarning')}
            </div>
            <p style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              {t('institutions.deleteConfirmLabel')}
            </p>
            <p style={{ fontWeight: 600, marginBottom: '12px' }}>{inst?.name}</p>
            <input
              type="text"
              className="input-field"
              placeholder={t('institutions.deleteConfirmPlaceholder')}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              style={{ marginBottom: '16px' }}
            />
            {deleteError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#dc2626', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', marginBottom: '16px' }}>
                {deleteError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}
              >
                {t('institutions.cancelDelete')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirm !== inst?.name || deleting}
                style={{
                  background: deleteConfirm === inst?.name ? '#dc2626' : 'rgba(239,68,68,0.3)',
                  color: 'white', border: 'none', borderRadius: '8px',
                  padding: '10px 20px', fontWeight: 600,
                  cursor: deleteConfirm === inst?.name ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s',
                }}
              >
                {deleting ? t('institutions.deleting') : t('institutions.deleteButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back + Header */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/institutions')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px', padding: 0 }}
        >
          <ArrowLeft size={16} /> {t('institutionDetail.back')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #4F46E5, #EC4899)',
              borderRadius: '14px', padding: '18px', color: 'white',
              fontSize: '1.6rem', fontWeight: 700, minWidth: '60px', textAlign: 'center',
            }}>
              {inst.name.charAt(0)}
            </div>
            <div>
              <h1 style={{ marginBottom: '4px' }}>{inst.name}</h1>
              {address && <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>📍 {address}</div>}
            </div>
          </div>
          <StatusBadge status={inst.status} />
        </div>
      </div>

      {/* Institution Info */}
      <div className="glass-card" style={{ marginBottom: '20px' }}>
        <SectionHeader icon={<School size={20} />} title={t('institutionDetail.details')} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {inst.email && <InfoItem label={t('institutions.email')} value={inst.email} />}
          {inst.phone && <InfoItem label={t('institutions.phone')} value={inst.phone} />}
          {inst.classCount !== undefined && <InfoItem label={t('institutionDetail.classes')} value={inst.classCount} />}
        </div>
      </div>

      {/* Admin */}
      <div className="glass-card" style={{ marginBottom: '20px' }}>
        <SectionHeader icon={<User size={20} />} title={t('institutionDetail.admin')} />
        {inst.adminInfo ? (
          <UserRow name={inst.adminInfo.name} email={inst.adminInfo.email} status={inst.adminInfo.status} />
        ) : (
          <EmptyNote text={t('institutionDetail.noAdmin')} />
        )}
      </div>

      {/* Educators */}
      <div className="glass-card" style={{ marginBottom: '20px' }}>
        <SectionHeader icon={<GraduationCap size={20} />} title={t('institutionDetail.educators')} count={inst.educators?.length ?? 0} />
        {inst.educators?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {inst.educators.map((e: any) => (
              <UserRow key={e.id} name={e.name} email={e.email} status={e.status} />
            ))}
          </div>
        ) : (
          <EmptyNote text={t('institutionDetail.noEducators')} />
        )}
      </div>

      {/* Kids */}
      <div className="glass-card" style={{ marginBottom: '20px' }}>
        <SectionHeader icon={<Baby size={20} />} title={t('institutionDetail.kids')} count={inst.kids?.length ?? 0} />
        {inst.kids?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {inst.kids.map((k: any) => (
              <div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.5)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #EC4899, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>
                    {k.firstName.charAt(0)}
                  </div>
                  <span style={{ fontWeight: 500 }}>{k.firstName} {k.lastName}</span>
                </div>
                {k.dateOfBirth && (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {new Date(k.dateOfBirth).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyNote text={t('institutionDetail.noKids')} />
        )}
      </div>

      {/* Manage */}
      <div className="glass-card" style={{ border: '1px solid rgba(239,68,68,0.25)' }}>
        <SectionHeader icon={<Settings size={20} />} title={t('institutionDetail.manage')} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(239,68,68,0.04)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div>
            <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>{t('institutions.deleteTitle')}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('institutionDetail.deleteHint')}</div>
          </div>
          <button
            onClick={openDeleteModal}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
          >
            <Trash2 size={16} /> {t('institutions.deleteButton')}
          </button>
        </div>
      </div>
    </Layout>
  );
};

const InfoItem = ({ label, value }: { label: string; value: any }) => (
  <div>
    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '2px' }}>{label}</div>
    <div style={{ fontWeight: 500 }}>{value}</div>
  </div>
);

const UserRow = ({ name, email, status }: { name: string; email: string; status: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.5)', borderRadius: '10px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>
        {name.charAt(0)}
      </div>
      <div>
        <div style={{ fontWeight: 500 }}>{name}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{email}</div>
      </div>
    </div>
    <StatusBadge status={status} />
  </div>
);

const EmptyNote = ({ text }: { text: string }) => (
  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '16px 0' }}>{text}</div>
);

export default InstitutionDetail;
