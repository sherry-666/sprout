import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { School, ChevronRight, UserCheck, MapPin, Loader, Trash2 } from 'lucide-react';
import { authFetch } from '../lib/api';

interface Institution {
  id: string;
  name: string;
  address?: string;
  city?: string;
  province?: string;
  status: string;
  kidCount?: number;
  classCount?: number;
  adminInfo?: { id: string; name: string; email: string; status: string } | null;
}

const SuperAdminDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Institution | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deletedName, setDeletedName] = useState('');

  useEffect(() => {
    authFetch('/api/institutions')
      .then(setInstitutions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const openDeleteModal = (e: React.MouseEvent, inst: Institution) => {
    e.stopPropagation();
    setDeleteTarget(inst);
    setDeleteConfirm('');
    setDeleteError('');
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteConfirm('');
    setDeleteError('');
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirm !== deleteTarget.name) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await authFetch(`/api/institutions/${deleteTarget.id}`, { method: 'DELETE' });
      setInstitutions((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeletedName(deleteTarget.name);
      closeDeleteModal();
    } catch (e: any) {
      setDeleteError(e.message || 'Failed to delete institution.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '12px' }}>
        <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'var(--text-secondary)' }}>{t('institutions.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ color: '#dc2626', textAlign: 'center' }}>
        ⚠️ {t('institutions.failedToLoad', { error })}
      </div>
    );
  }

  return (
    <div>
      {/* Delete success modal */}
      {deletedName && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="glass-card" style={{ maxWidth: '420px', width: '90%', textAlign: 'center', padding: '40px 32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
            <h2 style={{ marginBottom: '12px' }}>Institution Deleted</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '28px' }}>
              <strong>{deletedName}</strong> has been deleted. Users belonging to this institution will no longer be able to log in.
            </p>
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => setDeletedName('')}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="glass-card" style={{ maxWidth: '460px', width: '90%', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: '10px', padding: '10px' }}>
                <Trash2 size={22} color="#dc2626" />
              </div>
              <h2 style={{ color: '#dc2626', margin: 0 }}>{t('institutions.deleteTitle')}</h2>
            </div>

            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '8px', padding: '14px 16px', marginBottom: '20px',
              color: '#dc2626', fontSize: '0.9rem', lineHeight: 1.6,
            }}>
              ⚠️ {t('institutions.deleteWarning')}
            </div>

            <p style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              {t('institutions.deleteConfirmLabel')}
            </p>
            <p style={{ fontWeight: 600, marginBottom: '12px' }}>{deleteTarget.name}</p>
            <input
              type="text"
              className="input-field"
              placeholder={t('institutions.deleteConfirmPlaceholder')}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              style={{ marginBottom: '16px' }}
            />

            {deleteError && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                color: '#dc2626', borderRadius: '8px', padding: '10px 14px',
                fontSize: '0.85rem', marginBottom: '16px'
              }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={closeDeleteModal}
                disabled={deleting}
                style={{
                  background: 'transparent', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', borderRadius: '8px',
                  padding: '10px 20px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {t('institutions.cancelDelete')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteConfirm !== deleteTarget.name || deleting}
                style={{
                  background: deleteConfirm === deleteTarget.name ? '#dc2626' : 'rgba(239,68,68,0.3)',
                  color: 'white', border: 'none', borderRadius: '8px',
                  padding: '10px 20px', fontWeight: 600, cursor: deleteConfirm === deleteTarget.name ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s',
                }}
              >
                {deleting ? t('institutions.deleting') : t('institutions.deleteButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>{t('dashboard.systemOverview')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {t('dashboard.managingDayCares', { count: institutions.length })}
          </p>
        </div>
        <button className="btn-primary" id="add-daycare-btn" onClick={() => navigate('/institutions')}>
          + {t('institutions.addDayCare')}
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(79,70,229,0.1)', borderRadius: '12px', padding: '14px' }}>
            <School size={24} color="var(--primary-color)" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('dashboard.totalDayCares')}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{institutions.length}</div>
          </div>
        </div>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: '12px', padding: '14px' }}>
            <UserCheck size={24} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('dashboard.totalKidsEnrolled')}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>
              {institutions.reduce((sum, i) => sum + (i.kidCount || 0), 0)}
            </div>
          </div>
        </div>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: '12px', padding: '14px' }}>
            <MapPin size={24} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('dashboard.activeDayCares')}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>
              {institutions.filter((i) => i.status === 'active').length}
            </div>
          </div>
        </div>
      </div>

      {/* Institution List */}
      <h2 style={{ marginBottom: '16px' }}>{t('nav.dayCares')}</h2>

      {institutions.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px' }}>
          <School size={48} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
          <p style={{ color: 'var(--text-secondary)' }}>{t('institutions.noDayCaresAdded')}. {t('institutions.clickToAdd')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {institutions.map((inst) => (
            <div
              key={inst.id}
              className="glass-card"
              id={`institution-card-${inst.id}`}
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
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
                    <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
                      <span style={{ background: 'rgba(79,70,229,0.1)', color: 'var(--primary-color)', padding: '2px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>
                        👶 {inst.kidCount ?? 0} kids
                      </span>
                      <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>
                        🏫 {inst.classCount ?? 0} classes
                      </span>
                      <span style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '2px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>
                        ✅ {t(`institutions.${inst.status}`)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Institution Admin */}
                <div style={{ textAlign: 'right', marginRight: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{t('roles.institutionAdmin')}</div>
                  {inst.adminInfo ? (
                    <>
                      <div style={{ fontWeight: 600 }}>{inst.adminInfo.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{inst.adminInfo.email}</div>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#f59e0b' }}>Not assigned</div>
                  )}
                </div>

                <button
                  onClick={(e) => openDeleteModal(e, inst)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '8px', borderRadius: '8px', color: 'var(--text-secondary)',
                    transition: 'color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'none'; }}
                  title="Delete institution"
                >
                  <Trash2 size={18} />
                </button>

                <ChevronRight size={20} color="var(--text-secondary)" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
