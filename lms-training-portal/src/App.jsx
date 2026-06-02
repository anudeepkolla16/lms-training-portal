import React from 'react';
import { MsalProvider, useMsal, useIsAuthenticated } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import HRDashboard from './components/HRDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import { getUserRole } from './services/sharePointAPI';
import './App.css';

const msalConfig = {
  auth: {
    clientId: 'f0ba86a7-a739-4977-b9ba-1f1c1269f219',
    authority: 'https://login.microsoftonline.com/06d5c541-26b2-4dc8-ac6f-eeba90783202',
    redirectUri: 'https://anudeepkolla16.github.io/lms-training-portal'
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  }
};

const pca = new PublicClientApplication(msalConfig);

const AppContent = () => {
  const isAuthenticated = useIsAuthenticated();
  const { instance, accounts } = useMsal();
  const [accessToken, setAccessToken] = React.useState(null);
  const [tokenError, setTokenError] = React.useState(null);
  const [userRole, setUserRole] = React.useState(null);
  const [roleLoading, setRoleLoading] = React.useState(false);

  React.useEffect(() => {
    if (isAuthenticated && accounts.length > 0) {
      const spScopes = ["https://sarasanalytics.sharepoint.com/AllSites.Read", "https://sarasanalytics.sharepoint.com/AllSites.Write"];
      instance.acquireTokenSilent({
        scopes: spScopes,
        account: accounts[0]
      }).then(response => {
        setAccessToken(response.accessToken);
      }).catch(() => {
        // Consent required - show popup
        instance.acquireTokenPopup({
          scopes: spScopes,
          account: accounts[0]
        }).then(response => {
          setAccessToken(response.accessToken);
        }).catch(popupErr => {
          console.error('Token acquisition failed:', popupErr);
          setTokenError(popupErr.errorCode);
        });
      });
    }
  }, [isAuthenticated, accounts, instance]);

  // Fetch user role once accessToken is available
  React.useEffect(() => {
    if (accessToken && accounts.length > 0) {
      const email = accounts[0].username || accounts[0].mail || accounts[0].idTokenClaims?.preferred_username || '';
      setRoleLoading(true);
      getUserRole(accessToken, email).then(role => {
        setUserRole(role);
        setRoleLoading(false);
      });
    }
  }, [accessToken, accounts]);

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'
      }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center', maxWidth: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
          <h1 style={{ color: '#0ea5e9', marginBottom: '20px', fontSize: '28px' }}>📚 Training Portal</h1>
          <p style={{ color: '#6b7280', marginBottom: '30px', lineHeight: '1.6' }}>
            Sign in to view your assigned training courses and track your progress.
          </p>
          <button
            onClick={() => instance.loginPopup({
              scopes: ["User.Read"]
            })}
            style={{
              background: '#0ea5e9',
              color: 'white',
              padding: '12px 32px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#0284c7'}
            onMouseLeave={(e) => e.target.style.background = '#0ea5e9'}
          >
            Sign In with Microsoft 365
          </button>
          {tokenError && (
            <p style={{ color: '#ef4444', marginTop: '20px', fontSize: '12px' }}>
              Error: {tokenError}. Make sure the app is registered in Azure AD.
            </p>
          )}
        </div>
      </div>
    );
  }

  const navColor = userRole === 'HR'
    ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
    : userRole === 'Manager'
      ? 'linear-gradient(135deg, #f59e0b 0%, #fb923c 100%)'
      : userRole === 'Admin'
        ? 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)'
        : 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)';

  const renderDashboard = () => {
    if (!accessToken) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          Loading your training dashboard...
        </div>
      );
    }
    if (roleLoading || userRole === null) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          Loading role configuration...
        </div>
      );
    }
    switch (userRole) {
      case 'Admin':
        return <AdminDashboard accessToken={accessToken} user={accounts[0]} />;
      case 'HR':
        return <HRDashboard accessToken={accessToken} user={accounts[0]} />;
      case 'Manager':
        return <ManagerDashboard accessToken={accessToken} user={accounts[0]} />;
      default:
        return <Dashboard accessToken={accessToken} user={accounts[0]} />;
    }
  };

  return (
    <div>
      <nav style={{
        background: navColor,
        color: 'white',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0' }}>📚 Training Portal</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {userRole && (
            <span style={{
              background: 'rgba(255,255,255,0.25)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '700',
              letterSpacing: '0.5px'
            }}>
              {userRole}
            </span>
          )}
          <span style={{ fontSize: '13px', opacity: 0.85 }}>
            {accounts[0]?.name || accounts[0]?.username}
          </span>
          <button
            onClick={() => instance.logout()}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
          >
            Sign Out
          </button>
        </div>
      </nav>
      {renderDashboard()}
    </div>
  );
};

function App() {
  return (
    <MsalProvider instance={pca}>
      <AppContent />
    </MsalProvider>
  );
}

export default App;
