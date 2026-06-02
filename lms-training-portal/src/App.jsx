import React from 'react';
import { MsalProvider, useMsal, useIsAuthenticated } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { SpeedInsights } from '@vercel/speed-insights/react';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import HRDashboard from './components/HRDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import { getUserRole } from './services/sharePointAPI';
import './App.css';

const SP_SCOPES = ["https://sarasanalytics.sharepoint.com/AllSites.Read", "https://sarasanalytics.sharepoint.com/AllSites.Write"];

const AppContent = () => {
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();
  const [accessToken, setAccessToken] = React.useState(null);
  const [userRole, setUserRole] = React.useState(null);
  const [roleLoading, setRoleLoading] = React.useState(false);

  // Get SharePoint token after login completes
  React.useEffect(() => {
    if (isAuthenticated && accounts.length > 0 && !accessToken) {
      instance.acquireTokenSilent({
        scopes: SP_SCOPES,
        account: accounts[0],
        forceRefresh: true
      }).then(res => {
        console.log('Graph token acquired, audience:', res.accessToken.split('.').map((p,i)=>i===1?JSON.parse(atob(p)):null).find(Boolean)?.aud);
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

  // Get user role
  React.useEffect(() => {
    if (accessToken && accounts.length > 0 && userRole === null) {
      const email = accounts[0].username || '';
      setRoleLoading(true);
      getUserRole(accessToken, email).then(role => {
        setUserRole(role);
        setRoleLoading(false);
      });
    }
  }, [accessToken, accounts, userRole]);

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
  if (!accessToken || roleLoading || userRole === null) {
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

  const navColor = userRole === 'HR'
    ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
    : userRole === 'Manager'
      ? 'linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)'
      : userRole === 'Admin'
        ? 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'
        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)';

  const renderDashboard = () => {
    switch (userRole) {
      case 'Admin': return <AdminDashboard accessToken={accessToken} user={accounts[0]} />;
      case 'HR': return <HRDashboard accessToken={accessToken} user={accounts[0]} />;
      case 'Manager': return <ManagerDashboard accessToken={accessToken} user={accounts[0]} />;
      default: return <Dashboard accessToken={accessToken} user={accounts[0]} />;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            background: 'rgba(255,255,255,0.25)', padding: '4px 14px',
            borderRadius: '20px', fontSize: '13px', fontWeight: '700'
          }}>
            {userRole}
          </span>
          <span style={{ fontSize: '13px', opacity: 0.9 }}>
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
      <SpeedInsights />
    </MsalProvider>
  );
}

export default App;
