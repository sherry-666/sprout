import React from 'react';
import Layout from '../components/Layout';
import { Users as UsersIcon, Mail } from 'lucide-react';

const Users = () => {
  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Invite and manage teachers and parents.
          </p>
        </div>
        <button className="btn-primary" id="invite-user-btn">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={16} /> Invite User
          </span>
        </button>
      </div>

      <div className="glass-card">
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '12px 0' }}>Name</th>
              <th style={{ padding: '12px 0' }}>Role</th>
              <th style={{ padding: '12px 0' }}>Email</th>
              <th style={{ padding: '12px 0' }}>Status</th>
              <th style={{ padding: '12px 0' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <UsersIcon size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                No users yet. Invite a teacher or parent to get started.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Layout>
  );
};

export default Users;
