import { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { isRole, Role } from '../lib/api';
import Layout from '../components/Layout';
import { ArrowLeft, BookOpen, GraduationCap, Baby, Loader, Search, X, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { gql } from '@apollo/client';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client/react';

const GET_CLASS_QUERY = gql`
  query GetClassEdit($id: ID!) {
    class(id: $id) {
      id
      name
      educators {
        id
        email
        status
        profile { firstName lastName }
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

const SEARCH_STAFF_QUERY = gql`
  query SearchStaffEdit($search: String, $limit: Int) {
    users(search: $search, limit: $limit) {
      id
      email
      profile { firstName lastName }
    }
  }
`;

const SEARCH_KIDS_QUERY = gql`
  query SearchKidsEdit($search: String, $first: Int) {
    kids(first: $first, search: $search) {
      edges { node { id firstName lastName } }
    }
  }
`;

const ASSIGN_CLASS_MUTATION = gql`
  mutation AssignClassEdit($input: AssignClassInput!) {
    assignClass(input: $input) {
      id
      name
      educators { id email status profile { firstName lastName } }
      kids { id firstName lastName gender dateOfBirth }
    }
  }
`;

const SEARCH_LIMIT = 10;

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const SectionHeader = ({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
    <div style={{ color: 'var(--primary-color)' }}>{icon}</div>
    <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{title}</h2>
    <span style={{ background: 'rgba(79,70,229,0.1)', color: 'var(--primary-color)', borderRadius: '12px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 600 }}>
      {count}
    </span>
  </div>
);

const EditClass = () => {
  if (isRole(Role.Educator)) return <Navigate to="/classes" replace />;

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data, loading: pageLoading, error: pageError } = useQuery<{ class: { id: string; name: string; educators: any[]; kids: any[] } | null }>(GET_CLASS_QUERY, { variables: { id }, skip: !id });

  const [name, setName] = useState('');
  const [educators, setEducators] = useState<{ id: string; name: string; email: string; status: string }[]>([]);
  const [kids, setKids] = useState<{ id: string; firstName: string; lastName: string; gender: string; dateOfBirth: string }[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [kidSearch, setKidSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const debouncedStaff = useDebounce(staffSearch, 250);
  const debouncedKids = useDebounce(kidSearch, 250);

  const [searchStaff, { data: staffData, loading: staffLoading }] = useLazyQuery<{ users: any[] }>(SEARCH_STAFF_QUERY, { fetchPolicy: 'network-only' });
  const [searchKids, { data: kidsData, loading: kidsLoading }] = useLazyQuery<{ kids: { edges: { node: any }[] } }>(SEARCH_KIDS_QUERY, { fetchPolicy: 'network-only' });
  const [assignClass] = useMutation(ASSIGN_CLASS_MUTATION);

  const staffResults: any[] = (staffData?.users ?? []).filter((s: any) => !educators.some(e => e.id === s.id));
  const kidResults: any[] = (kidsData?.kids?.edges?.map((e: any) => e.node) ?? []).filter((k: any) => !kids.some(c => c.id === k.id));

  // Populate state once data loads
  useEffect(() => {
    if (!data?.class) return;
    const cls = data.class;
    setName(cls.name);
    setEducators(cls.educators.map((e: any) => ({
      id: e.id,
      name: `${e.profile?.firstName ?? ''} ${e.profile?.lastName ?? ''}`.trim(),
      email: e.email,
      status: e.status,
    })));
    setKids(cls.kids.map((k: any) => ({ id: k.id, firstName: k.firstName, lastName: k.lastName, gender: k.gender, dateOfBirth: k.dateOfBirth })));
  }, [data]);

  useEffect(() => {
    searchStaff({ variables: { search: debouncedStaff || null, limit: SEARCH_LIMIT } });
  }, [debouncedStaff]);

  useEffect(() => {
    searchKids({ variables: { search: debouncedKids || null, first: SEARCH_LIMIT } });
  }, [debouncedKids]);

  const addEducator = (person: any) => {
    if (educators.some(e => e.id === person.id)) return;
    setEducators(prev => [...prev, {
      id: person.id,
      name: `${person.profile?.firstName ?? ''} ${person.profile?.lastName ?? ''}`.trim(),
      email: person.email,
      status: 'active',
    }]);
    setStaffSearch('');
  };

  const removeEducator = (eduId: string) => setEducators(prev => prev.filter(e => e.id !== eduId));

  const addKid = (kid: any) => {
    if (kids.some(k => k.id === kid.id)) return;
    setKids(prev => [...prev, { id: kid.id, firstName: kid.firstName, lastName: kid.lastName, gender: kid.gender ?? '', dateOfBirth: kid.dateOfBirth ?? '' }]);
    setKidSearch('');
  };

  const removeKid = (kidId: string) => setKids(prev => prev.filter(k => k.id !== kidId));

  const handleSave = async () => {
    if (!name.trim()) { setError(t('classes.nameRequired')); return; }
    setSaving(true);
    setError('');
    try {
      await assignClass({
        variables: {
          input: {
            classId: id,
            name: name.trim(),
            educatorIds: educators.map(e => e.id),
            kidIds: kids.map(k => k.id),
          },
        },
      });
      navigate(`/classes/${id}`);
    } catch (e: any) {
      setError(e.message || 'Save failed.');
      setSaving(false);
    }
  };

  if (pageLoading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      </Layout>
    );
  }

  if (pageError || !data?.class) {
    return (
      <Layout>
        <div className="glass-card" style={{ color: '#dc2626', textAlign: 'center' }}>
          ⚠️ {pageError?.message || t('classDetail.notFound')}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => navigate(`/classes/${id}`)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px', padding: 0 }}>
          <ArrowLeft size={16} /> {t('classDetail.back')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
            <div style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', borderRadius: '14px', padding: '16px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BookOpen size={24} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('classes.classNameLabel')}
              </label>
              <input
                className="input-field"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ fontSize: '1.4rem', fontWeight: 700, border: 'none', borderBottom: '2px solid var(--border-color)', borderRadius: 0, padding: '4px 0', background: 'transparent', outline: 'none', width: '100%' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
            <button onClick={() => navigate(`/classes/${id}`)} disabled={saving}
              style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '8px 20px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
              {t('classes.cancel')}
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {saving ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> {t('classDetail.saving')}</> : t('classDetail.save')}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#dc2626', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Educators section */}
      <div className="glass-card" style={{ marginBottom: '20px' }}>
        <SectionHeader icon={<GraduationCap size={20} />} title={t('classDetail.educators')} count={educators.length} />

        {educators.length > 0 && (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '10px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('users.name')}</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('users.email')}</th>
                <th style={{ padding: '10px 8px', width: '48px' }} />
              </tr>
            </thead>
            <tbody>
              {educators.map(edu => (
                <tr key={edu.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                        {edu.name.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 500 }}>{edu.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{edu.email}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <button onClick={() => removeEducator(edu.id)}
                      style={{ background: 'rgba(220,38,38,0.07)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t('classes.addStaff')}</div>
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input className="input-field" style={{ paddingLeft: '34px' }} placeholder={t('classes.searchStaff')}
            value={staffSearch} onChange={e => setStaffSearch(e.target.value)} />
        </div>
        {staffSearch && (
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
            {staffLoading ? (
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-secondary)' }} />
              </div>
            ) : staffResults.length === 0 ? (
              <div style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>{t('classes.noResults')}</div>
            ) : staffResults.map((s: any) => (
              <div key={s.id} onClick={() => addEducator(s)}
                style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-color)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,70,229,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                  {s.profile?.firstName?.charAt(0) ?? '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{s.profile?.firstName} {s.profile?.lastName}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email}</div>
                </div>
                <X size={14} style={{ transform: 'rotate(45deg)', color: 'var(--primary-color)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kids section */}
      <div className="glass-card">
        <SectionHeader icon={<Baby size={20} />} title={t('classDetail.kids')} count={kids.length} />

        {kids.length > 0 && (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '10px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('kids.name')}</th>
                <th style={{ padding: '10px 8px', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('kids.dateOfBirth')}</th>
                <th style={{ padding: '10px 8px', width: '48px' }} />
              </tr>
            </thead>
            <tbody>
              {kids.map(kid => (
                <tr key={kid.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: kid.gender === 'male' ? 'linear-gradient(135deg, #4F46E5, #7C3AED)' : 'linear-gradient(135deg, #EC4899, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                        {kid.firstName.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 500 }}>{kid.firstName} {kid.lastName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {kid.dateOfBirth ? new Date(kid.dateOfBirth).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <button onClick={() => removeKid(kid.id)}
                      style={{ background: 'rgba(220,38,38,0.07)', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t('classes.addKids')}</div>
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input className="input-field" style={{ paddingLeft: '34px' }} placeholder={t('classes.searchKids')}
            value={kidSearch} onChange={e => setKidSearch(e.target.value)} />
        </div>
        {kidSearch && (
          <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
            {kidsLoading ? (
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-secondary)' }} />
              </div>
            ) : kidResults.length === 0 ? (
              <div style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>{t('classes.noResults')}</div>
            ) : kidResults.map((k: any) => (
              <div key={k.id} onClick={() => addKid(k)}
                style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-color)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(236,72,153,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #EC4899, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                  {k.firstName?.charAt(0) ?? '?'}
                </div>
                <span style={{ fontWeight: 500, fontSize: '0.9rem', flex: 1 }}>{k.firstName} {k.lastName}</span>
                <X size={14} style={{ transform: 'rotate(45deg)', color: '#EC4899', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EditClass;
