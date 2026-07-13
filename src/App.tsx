import React, { useState, useEffect } from 'react';
import './App.css';
import { Login } from './components/Login';
import { DashboardOverview } from './components/DashboardOverview';
import { ClientManager } from './components/ClientManager';
import { PassManager } from './components/PassManager';
import { AuditLogs } from './components/AuditLogs';
import { Statistics } from './components/Statistics';

type ViewType = 'overview' | 'clients' | 'passes' | 'logs' | 'stats';

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('overview');

  // Load auth state from sessionStorage on startup
  useEffect(() => {
    const savedToken = window.sessionStorage.getItem('admin_token');
    const savedRole = window.sessionStorage.getItem('admin_role');
    const savedUsername = window.sessionStorage.getItem('admin_username');

    if (savedToken && savedRole === 'ADMINISTRATOR') {
      setToken(savedToken);
      setRole(savedRole);
      setUsername(savedUsername || 'Admin');
      setCurrentView('overview');
    } else {
      // Clear inconsistent state
      window.sessionStorage.removeItem('admin_token');
      window.sessionStorage.removeItem('admin_role');
      window.sessionStorage.removeItem('admin_username');
    }
  }, []);

  const handleLoginSuccess = (newToken: string, newRole: string, newUsername: string) => {
    window.sessionStorage.setItem('admin_token', newToken);
    window.sessionStorage.setItem('admin_role', newRole);
    window.sessionStorage.setItem('admin_username', newUsername);

    // Fallbacks for simulated X-User-Id / phone header injection
    window.sessionStorage.setItem('admin_user_id', '1');
    window.sessionStorage.setItem('admin_phone', '770000000');

    setToken(newToken);
    setRole(newRole);
    setUsername(newUsername);
    setCurrentView('overview');
  };

  const handleLogout = () => {
    window.sessionStorage.removeItem('admin_token');
    window.sessionStorage.removeItem('admin_role');
    window.sessionStorage.removeItem('admin_username');
    window.sessionStorage.removeItem('admin_user_id');
    window.sessionStorage.removeItem('admin_phone');

    setToken(null);
    setRole(null);
    setUsername(null);
  };

  // If not logged in, show login page
  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Active view helper
  const renderActiveView = () => {
    switch (currentView) {
      case 'overview':
        return <DashboardOverview onNavigate={(view) => setCurrentView(view as ViewType)} />;
      case 'clients':
        return <ClientManager />;
      case 'passes':
        return <PassManager />;
      case 'logs':
        return <AuditLogs />;
      case 'stats':
        return <Statistics />;
      default:
        return <DashboardOverview onNavigate={(view) => setCurrentView(view as ViewType)} />;
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'overview':
        return 'Tableau de bord';
      case 'clients':
        return 'Gestion des clients';
      case 'passes':
        return 'Catalogue de pass';
      case 'logs':
        return "Journaux d'audit";
      case 'stats':
        return 'Analyses & Statistiques';
      default:
        return 'Max It Admin';
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">
            <div className="logo-box">M</div>
            <div className="logo-text">
              MAX IT<span> admin</span>
            </div>
          </div>

          <ul className="sidebar-menu">
            <li
              className={`sidebar-item ${currentView === 'overview' ? 'active' : ''}`}
              onClick={() => setCurrentView('overview')}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
              </svg>
              <span>Vue d'ensemble</span>
            </li>

            <li
              className={`sidebar-item ${currentView === 'clients' ? 'active' : ''}`}
              onClick={() => setCurrentView('clients')}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Gestion Clients</span>
            </li>

            <li
              className={`sidebar-item ${currentView === 'passes' ? 'active' : ''}`}
              onClick={() => setCurrentView('passes')}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span>Catalogue Pass</span>
            </li>

            <li
              className={`sidebar-item ${currentView === 'logs' ? 'active' : ''}`}
              onClick={() => setCurrentView('logs')}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Evénements</span>
            </li>

            <li
              className={`sidebar-item ${currentView === 'stats' ? 'active' : ''}`}
              onClick={() => setCurrentView('stats')}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Analyses & Stats</span>
            </li>
          </ul>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">
              {username ? username.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="user-info">
              <span className="user-name">{username}</span>
              <span className="user-role">{role || 'Administrateur'}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Se déconnecter</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="header">
          <h1 className="header-title">{getViewTitle()}</h1>
          <div className="header-actions">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Session Admin Active
            </span>
          </div>
        </header>

        <section className="content-body">
          {renderActiveView()}
        </section>
      </main>
    </div>
  );
};

export default App;
