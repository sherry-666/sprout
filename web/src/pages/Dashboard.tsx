import React from 'react';
import { Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getUser } from '../lib/api';
import SuperAdminDashboard from './SuperAdminDashboard';
import SchoolAdminDashboard from './SchoolAdminDashboard';

const Dashboard = () => {
  const user = getUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      {user.role === 'super_admin' ? <SuperAdminDashboard /> : <SchoolAdminDashboard />}
    </Layout>
  );
};

export default Dashboard;
