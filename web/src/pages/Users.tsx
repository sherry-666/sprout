import React from 'react';

const Users = () => {
  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Invite and manage teachers, parents, and administrators.
          </p>
        </div>
        <button className="btn-primary">
          + Invite User
        </button>
      </div>

      <div className="glass-card">
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '12px 0' }}>Name</th>
              <th style={{ padding: '12px 0' }}>Role</th>
              <th style={{ padding: '12px 0' }}>Status</th>
              <th style={{ padding: '12px 0' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No users found. Invite someone to get started.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
