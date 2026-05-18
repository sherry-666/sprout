import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { ArrowLeft, Pencil, User, Users, Trash2, Plus, Loader, X, Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';

const GET_KID_QUERY = gql`
  query GetKidDetail($id: ID!) {
    kid(id: $id) {
      id firstName lastName gender dateOfBirth profilePhotoUrl
      class { id name }
      parents {
        id email status
        profile { firstName lastName phone }
      }
    }
  }
`;

const UPDATE_KID = gql`
  mutation UpdateKid($kidId: ID!, $input: UpdateKidInput!) {
    updateKid(kidId: $kidId, input: $input) {
      id firstName lastName gender dateOfBirth profilePhotoUrl
    }
  }
`;

const ADD_KID_PARENT = gql`
  mutation AddKidParent($kidId: ID!, $parent: ParentInput!) {
    addKidParent(kidId: $kidId, parent: $parent) {
      id
      parents { id email status profile { firstName lastName phone } }
    }
  }
`;

const REMOVE_KID_PARENT = gql`
  mutation RemoveKidParent($kidId: ID!, $parentUserId: ID!) {
    removeKidParent(kidId: $kidId, parentUserId: $parentUserId) {
      id
      parents { id email status profile { firstName lastName phone } }
    }
  }
`;

const PRESIGN_KID_PHOTO = gql`
  mutation PresignKidPhotoUploadDetail($kidId: ID!, $contentType: String!) {
    presignKidPhotoUpload(kidId: $kidId, contentType: $contentType) {
      uploadUrl objectKey
    }
  }
`;

const CONFIRM_KID_PHOTO = gql`
  mutation ConfirmKidPhotoUploadDetail($kidId: ID!, $objectKey: String!) {
    confirmKidPhotoUpload(kidId: $kidId, objectKey: $objectKey) {
      id profilePhotoUrl
    }
  }
`;

const StatusBadge = ({ status }: { status: string }) => {
  const isPending = status === 'PENDING' || status === 'pending';
  return (
    <span style={{
      background: isPending ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
      color: isPending ? '#f59e0b' : '#10b981',
      padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
    }}>
      {isPending ? 'Pending' : 'Active'}
    </span>
  );
};

const genderGradient = (gender: string) =>
  gender === 'male'
    ? 'linear-gradient(135deg, #4F46E5, #7C3AED)'
    : 'linear-gradient(135deg, #EC4899, #F59E0B)';

const KidDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data, loading, error, refetch } = useQuery<{ kid: any }>(
    GET_KID_QUERY,
    { variables: { id }, skip: !id, fetchPolicy: 'network-only' },
  );

  // ── Edit kid modal state ─────────────────────────────────────────
  const [showEdit, setShowEdit] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female' | ''>('');
  const [editDob, setEditDob] = useState('');
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Add parent modal state ───────────────────────────────────────
  const [showAddParent, setShowAddParent] = useState(false);
  const [pFirstName, setPFirstName] = useState('');
  const [pLastName, setPLastName] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [addingParent, setAddingParent] = useState(false);
  const [addParentError, setAddParentError] = useState('');

  // ── Remove parent confirm state ──────────────────────────────────
  const [removeParentId, setRemoveParentId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const [updateKidMutate] = useMutation(UPDATE_KID);
  const [addParentMutate] = useMutation(ADD_KID_PARENT);
  const [removeParentMutate] = useMutation(REMOVE_KID_PARENT);
  const [presignPhotoMutate] = useMutation<any>(PRESIGN_KID_PHOTO);
  const [confirmPhotoMutate] = useMutation<any>(CONFIRM_KID_PHOTO);

  const kid = data?.kid;

  const openEdit = () => {
    if (!kid) return;
    setEditFirstName(kid.firstName);
    setEditLastName(kid.lastName);
    setEditGender(kid.gender || '');
    setEditDob(kid.dateOfBirth ? kid.dateOfBirth.split('T')[0] : '');
    setEditPhotoFile(null);
    setEditPhotoPreview(null);
    setShowEdit(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setEditPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveKid = async () => {
    setSaving(true);
    try {
      await updateKidMutate({
        variables: {
          kidId: id,
          input: {
            firstName: editFirstName || undefined,
            lastName: editLastName || undefined,
            gender: editGender || undefined,
            dateOfBirth: editDob || undefined,
          },
        },
      });

      if (editPhotoFile) {
        const contentType = editPhotoFile.type || 'image/jpeg';
        const { data: presignData } = await presignPhotoMutate({ variables: { kidId: id, contentType } });
        const { uploadUrl, objectKey } = presignData.presignKidPhotoUpload;
        await fetch(uploadUrl, { method: 'PUT', body: editPhotoFile, headers: { 'Content-Type': contentType } });
        await confirmPhotoMutate({ variables: { kidId: id, objectKey } });
      }

      await refetch();
      setShowEdit(false);
    } catch (e: any) {
      alert(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddParent = async () => {
    if (!pFirstName.trim() || !pLastName.trim() || !pEmail.trim()) {
      setAddParentError('First name, last name, and email are required.');
      return;
    }
    setAddingParent(true);
    setAddParentError('');
    try {
      await addParentMutate({
        variables: {
          kidId: id,
          parent: { firstName: pFirstName, lastName: pLastName, email: pEmail, phone: pPhone || null },
        },
      });
      await refetch();
      setShowAddParent(false);
      setPFirstName(''); setPLastName(''); setPEmail(''); setPPhone('');
    } catch (e: any) {
      setAddParentError(e.message || 'Failed to add parent.');
    } finally {
      setAddingParent(false);
    }
  };

  const handleRemoveParent = async () => {
    if (!removeParentId) return;
    setRemoving(true);
    try {
      await removeParentMutate({ variables: { kidId: id, parentUserId: removeParentId } });
      await refetch();
      setRemoveParentId(null);
    } finally {
      setRemoving(false);
    }
  };

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    </Layout>
  );

  if (error || !kid) return (
    <Layout>
      <div className="glass-card" style={{ color: '#dc2626', textAlign: 'center' }}>
        ⚠️ {error?.message || 'Kid not found'}
      </div>
    </Layout>
  );

  const currentPhotoUrl = kid.profilePhotoUrl;

  return (
    <Layout>
      {/* ── Edit kid modal ──────────────────────────────────────────── */}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ margin: 0 }}>Edit Kid Info</h2>
              <button onClick={() => setShowEdit(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>

            {/* Photo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => photoInputRef.current?.click()}>
                {editPhotoPreview || currentPhotoUrl ? (
                  <img src={editPhotoPreview || currentPhotoUrl} alt="" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: genderGradient(kid.gender || 'male'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.4rem' }}>
                    {kid.firstName?.charAt(0)}
                  </div>
                )}
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={16} color="white" />
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Click to change photo<br />
                <span style={{ fontSize: '0.75rem' }}>JPEG, PNG or WebP</span>
              </div>
              <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhotoChange} />
            </div>

            {/* Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>First Name</label>
                <input className="input-field" value={editFirstName} onChange={e => setEditFirstName(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Last Name</label>
                <input className="input-field" value={editLastName} onChange={e => setEditLastName(e.target.value)} />
              </div>
            </div>

            {/* Gender */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label>Gender</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['male', 'female'] as const).map(g => (
                  <button key={g} type="button" onClick={() => setEditGender(g)} style={{
                    flex: 1, padding: '10px', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem',
                    border: `2px solid ${editGender === g ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    background: editGender === g ? 'rgba(79,70,229,0.08)' : 'transparent',
                    color: editGender === g ? 'var(--primary-color)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}>
                    {g === 'male' ? '♂ Male' : '♀ Female'}
                  </button>
                ))}
              </div>
            </div>

            {/* Date of birth */}
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label>Date of Birth</label>
              <input className="input-field" type="date" value={editDob} onChange={e => setEditDob(e.target.value)} max={new Date().toISOString().split('T')[0]} />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowEdit(false)} disabled={saving}
                style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '11px', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSaveKid} disabled={saving} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {saving ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add parent modal ────────────────────────────────────────── */}
      {showAddParent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '460px', width: '100%', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ margin: 0 }}>Add Parent</h2>
              <button onClick={() => { setShowAddParent(false); setAddParentError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px', marginTop: '-8px', lineHeight: 1.6 }}>
              If this email is already in the system the parent will be linked. Otherwise an invitation email will be sent.
            </p>

            {addParentError && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', color: '#dc2626', fontSize: '0.85rem' }}>
                {addParentError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>First Name *</label>
                <input className="input-field" value={pFirstName} onChange={e => setPFirstName(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Last Name *</label>
                <input className="input-field" value={pLastName} onChange={e => setPLastName(e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label>Email *</label>
              <input className="input-field" type="email" value={pEmail} onChange={e => setPEmail(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label>Phone</label>
              <input className="input-field" value={pPhone} onChange={e => setPPhone(e.target.value)} placeholder="optional" />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowAddParent(false); setAddParentError(''); }} disabled={addingParent}
                style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '11px', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleAddParent} disabled={addingParent} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {addingParent ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Adding…</> : 'Add Parent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove parent confirm ───────────────────────────────────── */}
      {removeParentId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '44px', marginBottom: '12px' }}>👤</div>
            <h2 style={{ marginBottom: '10px' }}>Remove Parent?</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px', fontSize: '0.9rem' }}>
              This removes the parent's access to {kid.firstName}'s updates. The parent account is not deleted.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setRemoveParentId(null)} disabled={removing}
                style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '10px', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleRemoveParent} disabled={removing}
                style={{ flex: 1, background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {removing ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Removing…</> : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => navigate('/kids')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px', padding: 0 }}>
          <ArrowLeft size={16} /> Back to Kids
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {currentPhotoUrl ? (
              <img src={currentPhotoUrl} alt="" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: genderGradient(kid.gender || 'male'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.4rem', flexShrink: 0 }}>
                {kid.firstName?.charAt(0)}
              </div>
            )}
            <div>
              <h1 style={{ margin: 0 }}>{kid.firstName} {kid.lastName}</h1>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                {kid.gender && <span style={{ textTransform: 'capitalize' }}>{kid.gender === 'male' ? '♂ Male' : '♀ Female'}</span>}
                {kid.gender && kid.dateOfBirth && ' · '}
                {kid.dateOfBirth && new Date(kid.dateOfBirth).toLocaleDateString()}
                {kid.class && <span> · <span style={{ color: '#10b981', fontWeight: 500 }}>{kid.class.name}</span></span>}
              </div>
            </div>
          </div>
          <button onClick={openEdit}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
            <Pencil size={15} /> Edit Info
          </button>
        </div>
      </div>

      {/* ── Kid info card ────────────────────────────────────────────── */}
      <div className="glass-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <div style={{ color: 'var(--primary-color)' }}><User size={20} /></div>
          <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Kid Information</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          {[
            { label: 'First Name', value: kid.firstName },
            { label: 'Last Name', value: kid.lastName },
            { label: 'Gender', value: kid.gender ? (kid.gender === 'male' ? '♂ Male' : '♀ Female') : '—' },
            { label: 'Date of Birth', value: kid.dateOfBirth ? new Date(kid.dateOfBirth).toLocaleDateString() : '—' },
            { label: 'Class', value: kid.class?.name ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '12px 16px', background: 'rgba(79,70,229,0.04)', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{label}</div>
              <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Parents card ─────────────────────────────────────────────── */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ color: 'var(--primary-color)' }}><Users size={20} /></div>
            <h2 style={{ fontSize: '1.05rem', margin: 0 }}>Parents & Contacts</h2>
            <span style={{ background: 'rgba(79,70,229,0.1)', color: 'var(--primary-color)', borderRadius: '12px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 600 }}>
              {kid.parents?.length ?? 0}
            </span>
          </div>
          <button onClick={() => { setShowAddParent(true); setAddParentError(''); setPFirstName(''); setPLastName(''); setPEmail(''); setPPhone(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '7px 14px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
            <Plus size={14} /> Add Parent
          </button>
        </div>

        {!kid.parents?.length ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>
            No parents linked yet.
          </div>
        ) : (
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Name', 'Email', 'Phone', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 8px', fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kid.parents.map((parent: any) => (
                <tr key={parent.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '13px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #4F46E5, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                        {parent.profile?.firstName?.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 500 }}>{parent.profile?.firstName} {parent.profile?.lastName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{parent.email}</td>
                  <td style={{ padding: '13px 8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{parent.profile?.phone || '—'}</td>
                  <td style={{ padding: '13px 8px' }}><StatusBadge status={parent.status} /></td>
                  <td style={{ padding: '13px 8px', textAlign: 'right' }}>
                    <button onClick={() => setRemoveParentId(parent.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', borderRadius: '6px' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                      <Trash2 size={16} />
                    </button>
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

export default KidDetail;
