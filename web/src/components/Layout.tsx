import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, School, Users, BookOpen, Settings, LogOut, Baby } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clearSession, getUser } from '../lib/api';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = getUser();
  const isSuperAdmin = user?.role === 'super_admin';
  const isEducator = user?.role === 'educator';
  const isParent = user?.role === 'parent';

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
              {user?.role === 'super_admin' ? t('roles.systemAdmin') : isParent ? t('roles.parent') : isEducator ? t('roles.educator') : t('roles.institutionAdmin')}
            </div>
          </div>
          <button className="nav-link"
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}
            onClick={handleSignOut}>
            <LogOut size={20} /> {t('nav.signOut')}
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
