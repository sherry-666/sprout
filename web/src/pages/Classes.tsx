import React from 'react';
import Layout from '../components/Layout';
import { BookOpen, Plus } from 'lucide-react';

const Classes = () => {
  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Class Management</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Create classes and assign teachers and kids.
          </p>
        </div>
        <button className="btn-primary" id="create-class-btn">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> Create Class
          </span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '200px', border: '2px dashed var(--border-color)',
          cursor: 'pointer', transition: 'border-color 0.2s ease'
        }}>
          <Plus size={32} color="var(--text-secondary)" />
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 500 }}>
            Create your first class
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Classes;
