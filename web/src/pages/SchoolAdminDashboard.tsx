import React from 'react';
import { Users, BookOpen, Baby } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../lib/api';

const SchoolAdminDashboard = () => {
  const navigate = useNavigate();
  const user = getUser();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Good morning, {user?.profile?.firstName}!</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Here's what's happening at your school today.
          </p>
        </div>
        <button className="btn-primary" id="create-class-btn" onClick={() => navigate('/classes')}>
          + Create Class
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <div className="glass-card" id="total-kids-card"
          style={{ cursor: 'pointer' }} onClick={() => navigate('/users')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(79,70,229,0.1)', borderRadius: '12px', padding: '14px' }}>
              <Baby size={24} color="var(--primary-color)" />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Kids</div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>0</div>
            </div>
          </div>
        </div>

        <div className="glass-card" id="active-classes-card"
          style={{ cursor: 'pointer' }} onClick={() => navigate('/classes')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: '12px', padding: '14px' }}>
              <BookOpen size={24} color="#10b981" />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Active Classes</div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>0</div>
            </div>
          </div>
        </div>

        <div className="glass-card" id="teachers-card"
          style={{ cursor: 'pointer' }} onClick={() => navigate('/users')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: '12px', padding: '14px' }}>
              <Users size={24} color="#f59e0b" />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Teachers</div>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>0</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolAdminDashboard;
