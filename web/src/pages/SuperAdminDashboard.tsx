import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, ChevronRight, UserCheck, MapPin, Loader } from 'lucide-react';
import { authFetch } from '../lib/api';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    authFetch('/api/institutions')
      .then(setSchools)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', gap: '12px' }}>
        <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ color: 'var(--text-secondary)' }}>Loading day cares...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ color: '#dc2626', textAlign: 'center' }}>
        ⚠️ Failed to load day cares: {error}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>System Overview</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Managing {schools.length} day care{schools.length !== 1 ? 's' : ''} on the Sprout platform.
          </p>
        </div>
        <button className="btn-primary" id="add-daycare-btn" onClick={() => navigate('/institutions')}>
          + Add Day Care
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(79,70,229,0.1)', borderRadius: '12px', padding: '14px' }}>
            <School size={24} color="var(--primary-color)" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Day Cares</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{schools.length}</div>
          </div>
        </div>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: '12px', padding: '14px' }}>
            <UserCheck size={24} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Kids Enrolled</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>
              {schools.reduce((sum: number, s: any) => sum + (s.kidCount || 0), 0)}
            </div>
          </div>
        </div>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: '12px', padding: '14px' }}>
            <MapPin size={24} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Active Day Cares</div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>
              {schools.filter((s: any) => s.status === 'active').length}
            </div>
          </div>
        </div>
      </div>

      {/* School List */}
      <h2 style={{ marginBottom: '16px' }}>Day Cares</h2>

      {schools.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px' }}>
          <School size={48} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
          <p style={{ color: 'var(--text-secondary)' }}>No day cares yet. Click "+ Add Day Care" to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {schools.map((school: any) => (
            <div
              key={school.id}
              className="glass-card"
              id={`school-card-${school.id}`}
              style={{ cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
              onClick={() => navigate(`/institutions/${school.id}`)}
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
                    {school.name.charAt(0)}
                  </div>

                  <div>
                    <h3 style={{ marginBottom: '4px' }}>{school.name}</h3>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      📍 {[school.address, school.city, school.province].filter(Boolean).join(', ')}
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
                      <span style={{ background: 'rgba(79,70,229,0.1)', color: 'var(--primary-color)', padding: '2px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>
                        👶 {school.kidCount ?? 0} kids
                      </span>
                      <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>
                        🏫 {school.classCount ?? 0} classes
                      </span>
                      <span style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '2px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}>
                        ✅ {school.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* School Admin */}
                <div style={{ textAlign: 'right', marginRight: '8px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>School Admin</div>
                  {school.adminInfo ? (
                    <>
                      <div style={{ fontWeight: 600 }}>{school.adminInfo.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{school.adminInfo.email}</div>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#f59e0b' }}>Not assigned</div>
                  )}
                </div>

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
