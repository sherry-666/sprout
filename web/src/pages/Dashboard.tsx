
import { Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { getUser, Role } from '../lib/api';
import SuperAdminDashboard from './SuperAdminDashboard';
import SchoolAdminDashboard from './SchoolAdminDashboard';
import EducatorDashboard from './EducatorDashboard';

const Dashboard = () => {
  const user = getUser();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === Role.Parent) return <Navigate to="/my-kids" replace />;

  const inner =
    user.role === Role.SuperAdmin ? <SuperAdminDashboard /> :
    user.role === Role.Educator  ? <EducatorDashboard /> :
                                   <SchoolAdminDashboard />;

  return <Layout>{inner}</Layout>;
};

export default Dashboard;
