import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { isRole, Role } from '../lib/api';
import { ArrowLeft, BookOpen, GraduationCap, Baby, Loader, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { gql } from '@apollo/client';
import { useLazyQuery, useMutation } from '@apollo/client/react';

const SEARCH_STAFF_QUERY = gql`
  query SearchStaffCreate($search: String, $limit: Int) {
    users(search: $search, limit: $limit) {
      id
      email
      profile { firstName lastName }
    }
  }
`;

const SEARCH_KIDS_QUERY = gql`
  query SearchKidsCreate($search: String, $first: Int) {
    kids(first: $first, search: $search) {
      edges { node { id firstName lastName } }
    }
  }
`;

const CREATE_CLASS_MUTATION = gql`
  mutation CreateClassPage($input: CreateClassInput!) {
    createClass(input: $input) { id name }
  }
`;

const ASSIGN_CLASS_MUTATION = gql`
  mutation AssignClassCreate($input: AssignClassInput!) {
    assignClass(input: $input) { id }
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

const CreateClass = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (isRole(Role.Educator)) return <Navigate to="/classes" replace />;

  const [className, setClassName] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [kidSearch, setKidSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<Map<string, { id: string; name: string }>>(new Map());
  const [selectedKids, setSelectedKids] = useState<Map<string, { id: string; name: string }>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const debouncedStaff = useDebounce(staffSearch, 250);
  const debouncedKids = useDebounce(kidSearch, 250);

  const [searchStaff, { data: staffData, loading: staffLoading }] = useLazyQuery(SEARCH_STAFF_QUERY, { fetchPolicy: 'network-only' });
  const [searchKids, { data: kidsData, loading: kidsLoading }] = useLazyQuery(SEARCH_KIDS_QUERY, { fetchPolicy: 'network-only' });
  const [createClass] = useMutation(CREATE_CLASS_MUTATION);
  const [assignClass] = useMutation(ASSIGN_CLASS_MUTATION);

  const staffResults = staffData?.users ?? [];
  const kidResults = kidsData?.kids?.edges?.map((e: any) => e.node) ?? [];

  useEffect(() => {
    searchStaff({ variables: { search: debouncedStaff || null, limit: SEARCH_LIMIT } });
  }, [debouncedStaff]);

  useEffect(() => {
    searchKids({ variables: { search: debouncedKids || null, first: SEARCH_LIMIT } });
  }, [debouncedKids]);

  const toggleStaff = (person: { id: string; profile: { firstName: string; lastName: string }; email: string }) => {
    setSelectedStaff(prev => {
      const next = new Map(prev);
      if (next.has(person.id)) next.delete(person.id);
      else next.set(person.id, { id: person.id, name: `${person.profile.firstName} ${person.profile.lastName}` });
      return next;
    });
  };

  const toggleKid = (kid: { id: string; firstName: string; lastName: string }) => {
    setSelectedKids(prev => {
      const next = new Map(prev);
      if (next.has(kid.id)) next.delete(kid.id);
      else next.set(kid.id, { id: kid.id, name: `${kid.firstName} ${kid.lastName}` });
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!className.trim()) { setError(t('classes.nameRequired')); return; }
    setSubmitting(true);
    setError('');
    try {
      const { data } = await createClass({ variables: { input: { name: className.trim() } } });
      const newId = data.createClass.id;
      const educatorIds = [...selectedStaff.keys()];
      const kidIds = [...selectedKids.keys()];
      if (educatorIds.length > 0 || kidIds.length > 0) {
        await assignClass({ variables: { input: { classId: newId, ...(educatorIds.length > 0 && { educatorIds }), ...(kidIds.length > 0 && { kidIds }) } } });
      }
      navigate(`/classes/${newId}`);
    } catch (e: any) {
      setError(e.message || t('classes.createFailed'));
      setSubmitting(false);
    }
  };

  const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
      <div style={{ color: 'var(--primary-color)' }}>{icon}</div>
      <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{title}</h2>
    </div>
  );

  const SearchList = ({ loading, results, selected, onToggle, color = 'var(--primary-color)', gradientFrom = '#4F46E5', gradientTo = '#7C3AED', selectedBg = 'rgba(79,70,229,0.07)' }: {
    loading: boolean;
    results: any[];
    selected: Map<string, any>;
    onToggle: (item: any) => void;
    color?: string;
    gradientFrom?: string;
    gradientTo?: string;
    selectedBg?: string;
  }) => (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
      {loading ? (
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Loader size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-secondary)' }} />
        </div>
      ) : results.length === 0 ? (
        <div style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>{t('classes.noResults')}</div>
      ) : results.map((item: any) => {
        const isSelected = selected.has(item.id);
        const label = item.firstName ? `${item.firstName} ${item.lastName}` : `${item.profile?.firstName} ${item.profile?.lastName}`;
        const initial = (item.firstName ?? item.profile?.firstName ?? '?').charAt(0);
        return (
          <div key={item.id} onClick={() => onToggle(item)}
            style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', background: isSelected ? selectedBg : 'transparent', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
              {initial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{label}</div>
              {item.email && <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.email}</div>}
            </div>
            {isSelected && <span style={{ color, fontSize: '0.75rem', fontWeight: 700 }}>✓</span>}
          </div>
        );
      })}
    </div>
  );

  return (
    <Layout>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => navigate('/classes')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px', padding: 0 }}>
          <ArrowLeft size={16} /> {t('classDetail.back')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', borderRadius: '14px', padding: '16px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('classes.classNameLabel')}
            </label>
            <input
              className="input-field"
              placeholder={t('classes.classNamePlaceholder')}
              value={className}
              onChange={e => setClassName(e.target.value)}
              autoFocus
              style={{ fontSize: '1.4rem', fontWeight: 700, border: 'none', borderBottom: '2px solid var(--border-color)', borderRadius: 0, padding: '4px 0', background: 'transparent', outline: 'none', width: '100%' }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#dc2626', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Educators */}
      <div className="glass-card" style={{ marginBottom: '20px' }}>
        <SectionHeader icon={<GraduationCap size={20} />} title={t('classDetail.educators')} />

        {selectedStaff.size > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
            {[...selectedStaff.values()].map(s => (
              <span key={s.id} onClick={() => setSelectedStaff(prev => { const n = new Map(prev); n.delete(s.id); return n; })}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(79,70,229,0.12)', color: 'var(--primary-color)', borderRadius: '20px', padding: '4px 12px', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer' }}>
                {s.name} <X size={12} />
              </span>
            ))}
          </div>
        )}

        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t('classes.addStaff')}</div>
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input className="input-field" style={{ paddingLeft: '34px' }} placeholder={t('classes.searchStaff')}
            value={staffSearch} onChange={e => setStaffSearch(e.target.value)} />
        </div>
        <SearchList loading={staffLoading} results={staffResults} selected={selectedStaff} onToggle={toggleStaff} />
      </div>

      {/* Kids */}
      <div className="glass-card" style={{ marginBottom: '24px' }}>
        <SectionHeader icon={<Baby size={20} />} title={t('classDetail.kids')} />

        {selectedKids.size > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
            {[...selectedKids.values()].map(k => (
              <span key={k.id} onClick={() => setSelectedKids(prev => { const n = new Map(prev); n.delete(k.id); return n; })}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(236,72,153,0.12)', color: '#EC4899', borderRadius: '20px', padding: '4px 12px', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer' }}>
                {k.name} <X size={12} />
              </span>
            ))}
          </div>
        )}

        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t('classes.addKids')}</div>
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input className="input-field" style={{ paddingLeft: '34px' }} placeholder={t('classes.searchKids')}
            value={kidSearch} onChange={e => setKidSearch(e.target.value)} />
        </div>
        <SearchList loading={kidsLoading} results={kidResults} selected={selectedKids} onToggle={toggleKid}
          color="#EC4899" gradientFrom="#EC4899" gradientTo="#F59E0B" selectedBg="rgba(236,72,153,0.07)" />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button onClick={() => navigate('/classes')} disabled={submitting}
          style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '10px 24px', fontWeight: 600, cursor: 'pointer' }}>
          {t('classes.cancel')}
        </button>
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {submitting ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> {t('classes.creating')}</> : t('classes.create')}
        </button>
      </div>
    </Layout>
  );
};

export default CreateClass;
