import React from 'react';
import { Users, BookOpen, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span style={{ fontSize: '24px' }}>🌱</span> Sprout
        </div>
        
        <nav className="nav-links">
          <a href="#" className="nav-link active">
            <LayoutDashboard size={20} />
            Dashboard
          </a>
          <a href="#" className="nav-link">
            <BookOpen size={20} />
            Classes
          </a>
          <a href="#" className="nav-link">
            <Users size={20} />
            Users
          </a>
          <a href="#" className="nav-link">
            <Settings size={20} />
            Settings
          </a>
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <button 
            className="nav-link" 
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }}
            onClick={() => navigate('/login')}
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>Good morning, Admin!</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Here's what's happening at your school today.</p>
          </div>
          <button className="btn-primary">
            + Create Class
          </button>
        </div>

        {/* Dashboard Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          <div className="glass-card">
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Total Kids</h3>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>124</div>
          </div>
          <div className="glass-card">
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Active Classes</h3>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>8</div>
          </div>
          <div className="glass-card">
            <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>Teachers Present</h3>
            <div style={{ fontSize: '2rem', fontWeight: '700' }}>12</div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
