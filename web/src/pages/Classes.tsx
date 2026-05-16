import React from 'react';

const Classes = () => {
  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1>Class Management</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Create classes and assign teachers and kids.
          </p>
        </div>
        <button className="btn-primary">
          + Create Class
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', borderStyle: 'dashed' }}>
          <span style={{ fontSize: '2rem', color: 'var(--text-secondary)' }}>+</span>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Create your first class</p>
        </div>
      </div>
    </div>
  );
};

export default Classes;
