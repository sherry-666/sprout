import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Institutions from './pages/Institutions';
import NewInstitution from './pages/NewInstitution';
import Settings from './pages/Settings';
import ActivateAccount from './pages/ActivateAccount';
import Users from './pages/Users';
import Classes from './pages/Classes';
import ClassDetail from './pages/ClassDetail';
import StaffDetail from './pages/StaffDetail';
import InstitutionDetail from './pages/InstitutionDetail';
import Kids from './pages/Kids';
import RegisterKid from './pages/RegisterKid';
import MyKids from './pages/MyKids';
import CreateClass from './pages/CreateClass';
import EditClass from './pages/EditClass';
import { getToken } from './lib/api';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = () => navigate('/login', { replace: true });
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [navigate]);

  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/activate" element={<ActivateAccount />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/institutions" element={<PrivateRoute><Institutions /></PrivateRoute>} />
        <Route path="/institutions/new" element={<PrivateRoute><NewInstitution /></PrivateRoute>} />
        <Route path="/institutions/:id" element={<PrivateRoute><InstitutionDetail /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
        <Route path="/classes" element={<PrivateRoute><Classes /></PrivateRoute>} />
        <Route path="/classes/new" element={<PrivateRoute><CreateClass /></PrivateRoute>} />
        <Route path="/classes/:id" element={<PrivateRoute><ClassDetail /></PrivateRoute>} />
        <Route path="/classes/:id/edit" element={<PrivateRoute><EditClass /></PrivateRoute>} />
        <Route path="/users/:id" element={<PrivateRoute><StaffDetail /></PrivateRoute>} />
        <Route path="/kids" element={<PrivateRoute><Kids /></PrivateRoute>} />
        <Route path="/kids/register" element={<PrivateRoute><RegisterKid /></PrivateRoute>} />
        <Route path="/my-kids" element={<PrivateRoute><MyKids /></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
