import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { ArrowLeft, BookOpen, GraduationCap, Baby, Loader, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import { isRole, Role } from '../lib/api';

const GET_CLASS_QUERY = gql`
  query GetClass($id: ID!) {
    class(id: $id) {
      id
      name
      educators {
        id
        email
        status
        profile {
          firstName
          lastName
        }
      }
      kids {
        id
        firstName
        lastName
        gender
        dateOfBirth
      }
    }
  }
`;

const DELETE_CLASS_MUTATION = gql`
  mutation DeleteClass($classId: ID!) {
    deleteClass(classId: $classId)
  }
`;

const StatusBadge = ({ status }: { status: string }) => {
  const isPending = status === 'pending';
  return (
    <span style={{
      background: isPending ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
      color: isPending ? '#f59e0b' : '#10b981',
      padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500,
    }}>
      {status}
    </span>
  );
};

const SectionHeader = ({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
    <div style={{ color: 'var(--primary-color)' }}>{icon}</div>
    <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{title}</h2>
    <span style={{ background: 'rgba(79,70,229,0.1)', color: 'var(--primary-color)', borderRadius: '12px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 600 }}>
      {count}
    </span>
  </div>
);

const ClassDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isEducator = isRole(Role.Educator);

  const { data, loading, error } = useQuery(GET_CLASS_QUERY, { variables: { id }, skip: !id });

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [deleteClass] = useMutation(DELETE_CLASS_MUTATION);

  const cls = data?.class;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteClass({ variables: { classId: id } });
      navigate('/classes');
    } catch (e: any) {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '12px' }}>
          <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </Layout>
    );
  }

  if (error || !cls) {
    return (
      <Layout>
        <div className="glass-card" style={{ color: '#dc2626', textAlign: 'center' }}>
          ⚠️ {error?.message || t('classDetail.notFound')}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Delete confirmation modal */}
      {showDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ maxWidth: '420px', width: '90%', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
            <h2 style={{ marginBottom: '12px' }}>{t('classDetail.deleteTitle')}</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '28px' }}>{t('classDetail.deleteMsg')}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setShowDelete(false)} disabled={deleting}
                style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>
                {t('users.cancel')}
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {deleting ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('classDetail.deleting')}</> : t('classDetail.deleteConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back + header */}
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => navigate('/classes')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px', padding: 0 }}>
          <ArrowLeft size={16} /> {t('classDetail.back')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', borderRadius: '14px', padding: '16px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={24} />
            </div>
            <h1 style={{ margin: 0 }}>{cls.name}</h1>
          </div>
          {!isEducator && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => navigate(`/classes/${id}/edit`)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                <Pencil size={15} /> {t('classDetail.edit')}
              </button>
              <button onClick={() => setShowDelete(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', borderRadius: '8px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                <Trash2 size={15} /> {t('classDetail.delete')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Educators */}
      <div className="glass-card" style={{ marginBottom: '20px' }}>
        <SectionHeader icon={<GraduationCap size={20} />} title={t('classDetail.educators')} count={cls.educators.length} />
        {cls.educators.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '16px 0' }}>
            {t('classDetail.noEducators')}
          </div>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '10px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('users.name')}</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('users.email')}</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('users.status')}</th>
              </tr>
            </thead>
            <tbody>
              {cls.educators.map((edu: any) => (
                <tr key={edu.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                        {edu.profile?.firstName?.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 500 }}>{edu.profile?.firstName} {edu.profile?.lastName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{edu.email}</td>
                  <td style={{ padding: '12px 8px' }}><StatusBadge status={edu.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Kids */}
      <div className="glass-card">
        <SectionHeader icon={<Baby size={20} />} title={t('classDetail.kids')} count={cls.kids.length} />
        {cls.kids.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '16px 0' }}>
            {t('classDetail.noKids')}
          </div>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '10px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('kids.name')}</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('kids.dateOfBirth')}</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('kids.gender')}</th>
              </tr>
            </thead>
            <tbody>
              {cls.kids.map((kid: any) => (
                <tr key={kid.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: kid.gender === 'male' ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'linear-gradient(135deg, #EC4899, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                        {kid.firstName?.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 500 }}>{kid.firstName} {kid.lastName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {kid.dateOfBirth ? new Date(kid.dateOfBirth).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{ background: kid.gender === 'male' ? 'rgba(79,70,229,0.1)' : 'rgba(236,72,153,0.1)', color: kid.gender === 'male' ? 'var(--primary-color)' : '#EC4899', padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>
                      {kid.gender === 'male' ? t('registerKid.male') : t('registerKid.female')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
};

export default ClassDetail;
