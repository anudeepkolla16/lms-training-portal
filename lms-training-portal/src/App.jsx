import React from 'react';
import { MsalProvider, useMsal, useIsAuthenticated } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import HRDashboard from './components/HRDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import SkillsModule from './components/SkillsModule';
import { getUserProfile, getAllUserProfiles } from './services/sharePointAPI';
import './App.css';

const SP_SCOPES = ["https://graph.microsoft.com/Sites.ReadWrite.All", "https://graph.microsoft.com/Mail.Send"];

const AppContent = () => {
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();
  const [accessToken, setAccessToken] = React.useState(null);
  const [userProfile, setUserProfile] = React.useState(null);
  const [roleLoading, setRoleLoading] = React.useState(false);
  const [managesReports, setManagesReports] = React.useState(false);
  const [view, setView] = React.useState(null);
  const userRole = userProfile?.role || null;

  // Get SharePoint token after login completes
  React.useEffect(() => {
    if (isAuthenticated && accounts.length > 0 && !accessToken) {
      instance.acquireTokenSilent({
        scopes: SP_SCOPES,
        account: accounts[0],
        forceRefresh: true
      }).then(res => {
        setAccessToken(res.accessToken);
      }).catch(err => {
        if (err instanceof InteractionRequiredAuthError) {
          instance.acquireTokenPopup({ scopes: SP_SCOPES, account: accounts[0] })
            .then(res => setAccessToken(res.accessToken))
            .catch(e => console.error('SP token error:', e));
        }
      });
    }
  }, [isAuthenticated, accounts, instance, accessToken]);

  // Keep the Graph token fresh for long sessions — MSAL caches/refreshes silently,
  // but the app must re-acquire so it isn't holding an expired token string.
  React.useEffect(() => {
    if (!isAuthenticated || accounts.length === 0) return undefined;
    const id = setInterval(() => {
      instance.acquireTokenSilent({ scopes: SP_SCOPES, account: accounts[0] })
        .then(res => setAccessToken(res.accessToken))
        .catch(() => { /* next call / interaction will recover */ });
    }, 20 * 60 * 1000); // every 20 minutes (tokens last ~60–75 min)
    return () => clearInterval(id);
  }, [isAuthenticated, accounts, instance]);

  // Get user profile (access-role + job-role/department/manager for training features)
  React.useEffect(() => {
    if (accessToken && accounts.length > 0 && userProfile === null) {
      const email = accounts[0].username || '';
      setRoleLoading(true);
      getUserProfile(accessToken, email).then(profile => {
        setUserProfile(profile);
        setRoleLoading(false);
      });
    }
  }, [accessToken, accounts, userProfile]);

  // Detect whether this user manages anyone (is listed as someone's ManagerEmail) → unlocks the Team view
  React.useEffect(() => {
    if (accessToken && accounts.length > 0) {
      const email = (accounts[0].username || '').toLowerCase();
      getAllUserProfiles(accessToken)
        .then(profiles => setManagesReports(profiles.some(p => (p.ManagerEmail || '').toLowerCase() === email)))
        .catch(() => {});
    }
  }, [accessToken, accounts]);

  // Not logged in
  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'
      }}>
        <div style={{
          background: 'white', padding: '48px', borderRadius: '16px',
          textAlign: 'center', maxWidth: '420px', width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
        }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>📚</div>
          <h1 style={{ color: '#0ea5e9', marginBottom: '8px', fontSize: '28px', fontWeight: 'bold' }}>
            Training Portal
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '8px', fontSize: '15px', fontWeight: '600' }}>
            Saras Analytics
          </p>
          <p style={{ color: '#9ca3af', marginBottom: '32px', fontSize: '14px' }}>
            Sign in to access your training dashboard
          </p>
          <button
            onClick={() => instance.loginPopup({ scopes: ["User.Read"] }).catch(console.error)}
            style={{
              background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
              color: 'white', padding: '14px 32px', borderRadius: '10px',
              border: 'none', fontSize: '16px', fontWeight: 'bold',
              cursor: 'pointer', width: '100%'
            }}
          >
            Sign In with Microsoft 365
          </button>
        </div>
      </div>
    );
  }

  // Loading dashboard data
  if (!accessToken || roleLoading || userProfile === null) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#f9fafb', flexDirection: 'column', gap: '16px'
      }}>
        <div style={{ fontSize: '48px' }}>📚</div>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading your dashboard...</p>
      </div>
    );
  }

  const VIEW_META = {
    training: { label: '📚 My Training', color: '#10b981', grad: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
    skills:   { label: '🎯 Skills',      color: '#0d9488', grad: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' },
    manager:  { label: '👥 My Team',     color: '#f59e0b', grad: 'linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)' },
    hod:      { label: '🏢 Department',  color: '#0d9488', grad: 'linear-gradient(135deg, #0d9488 0%, #0891b2 100%)' },
    hr:       { label: '📊 HR Analytics', color: '#8b5cf6', grad: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' },
    admin:    { label: '⚙️ Admin',       color: '#0ea5e9', grad: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)' },
  };

  // Views this user can access — a person may hold several (e.g. Admin who also manages reports).
  const availableViews = ['training', 'skills'];
  if (managesReports || userRole === 'Manager') availableViews.push('manager');
  if (userRole === 'HOD') availableViews.push('hod');
  if (userRole === 'HR') availableViews.push('hr');
  if (userRole === 'Admin') availableViews.push('admin');

  const primaryView = userRole === 'Admin' ? 'admin'
    : userRole === 'HR' ? 'hr'
    : userRole === 'HOD' ? 'hod'
    : userRole === 'Manager' ? 'manager'
    : 'training';
  const activeView = (view && availableViews.includes(view)) ? view : primaryView;

  const navColor = VIEW_META[activeView].grad;
  const roleAccentColor = VIEW_META[activeView].color;

  const renderDashboard = () => {
    switch (activeView) {
      case 'admin': return <AdminDashboard accessToken={accessToken} user={accounts[0]} userProfile={userProfile} />;
      case 'hr': return <HRDashboard accessToken={accessToken} user={accounts[0]} userProfile={userProfile} />;
      case 'manager': return <ManagerDashboard accessToken={accessToken} user={accounts[0]} userProfile={userProfile} scope="reports" />;
      case 'hod': return <ManagerDashboard accessToken={accessToken} user={accounts[0]} userProfile={userProfile} scope="department" />;
      case 'skills': return <SkillsModule accessToken={accessToken} user={accounts[0]} userProfile={userProfile} managesReports={managesReports} />;
      default: return <Dashboard accessToken={accessToken} user={accounts[0]} userProfile={userProfile} />;
    }
  };

  return (
    <div>
      <nav style={{
        background: navColor, color: 'white', padding: '16px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.15)'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>📚 Training Portal</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {availableViews.map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                background: activeView === v ? 'white' : 'rgba(255,255,255,0.18)',
                color: activeView === v ? roleAccentColor : 'white',
                padding: '8px 14px', borderRadius: '8px', border: 'none',
                cursor: 'pointer', fontWeight: '600', fontSize: '13px'
              }}
            >
              {VIEW_META[v].label}
            </button>
          ))}
          <span style={{ fontSize: '13px', opacity: 0.9, marginLeft: '4px' }}>
            {accounts[0]?.name || accounts[0]?.username}
          </span>
          <button
            onClick={() => instance.logoutRedirect()}
            style={{
              background: 'rgba(255,255,255,0.2)', color: 'white',
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontWeight: '600', fontSize: '13px'
            }}
          >
            Sign Out
          </button>
        </div>
      </nav>
      {renderDashboard()}
    </div>
  );
};

function App({ msalInstance }) {
  return (
    <MsalProvider instance={msalInstance}>
      <AppContent />
    </MsalProvider>
  );
}

export default App;
