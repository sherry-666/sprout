import React from 'react';

const Schools = () => {
  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1>Schools Management</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            System Admin access only. Manage onboarded schools.
          </p>
        </div>
        <button className="btn-primary">
          + Add New School
        </button>
      </div>

      <div className="glass-card">
        <h3>Onboarded Schools</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '12px' }}>
          No schools have been onboarded yet.
        </p>
      </div>
    </div>
  );
};

export default Schools;
