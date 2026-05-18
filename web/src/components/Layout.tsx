import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, School, Users, BookOpen, Settings, LogOut, Baby } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clearSession, getUser, Role } from '../lib/api';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = getUser();
  const isSuperAdmin = user?.role === Role.SuperAdmin;
  const isEducator = user?.role === Role.Educator;
  const isParent = user?.role === Role.Parent;
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const handleSignOut = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span style={{ fontSize: '24px' }}>🌱</span> Sprout
        </div>

        <nav className="nav-links">
          {!isParent && (
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <LayoutDashboard size={20} /> {t('nav.dashboard')}
            </NavLink>
          )}

          {isSuperAdmin ? (
            /* System Admin nav */
            <NavLink to="/institutions" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <School size={20} /> {t('nav.institutions')}
            </NavLink>
          ) : isParent ? (
            /* Parent nav */
            <NavLink to="/my-kids" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <Baby size={20} /> {t('nav.myKids')}
            </NavLink>
          ) : (
            /* Institution Admin + Educator nav */
            <>
              <NavLink to="/classes" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <BookOpen size={20} /> {t('nav.classes')}
              </NavLink>
              {!isEducator && (
                <NavLink to="/users" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  <Users size={20} /> {t('nav.users')}
                </NavLink>
              )}
              <NavLink to="/kids" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <Baby size={20} /> {t('nav.kids')}
              </NavLink>
            </>
          )}

          <NavLink to="/settings" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Settings size={20} /> {t('nav.settings')}
          </NavLink>
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <div style={{ padding: '12px 16px', marginBottom: '8px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              {user?.profile?.firstName} {user?.profile?.lastName}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {isSuperAdmin ? t('roles.systemAdmin') : isParent ? t('roles.parent') : isEducator ? t('roles.educator') : t('roles.institutionAdmin')}
            </div>
          </div>
          <button className="nav-link"
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}
            onClick={() => setConfirmSignOut(true)}>
            <LogOut size={20} /> {t('nav.signOut')}
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>

      {confirmSignOut && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ maxWidth: '380px', width: '90%', padding: '32px' }}>
            <h2 style={{ margin: '0 0 12px' }}>{t('nav.signOut')}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 24px' }}>
              {t('nav.signOutConfirm')}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmSignOut(false)}
                style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>
                {t('common.cancel')}
              </button>
              <button onClick={handleSignOut}
                style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>
                {t('nav.signOut')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
