import React from 'react';
import { MsalProvider, useMsal, useIsAuthenticated } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import Dashboard from './components/Dashboard';
import './App.css';

const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_CLIENT_ID,
    authority: process.env.REACT_APP_AUTHORITY,
    redirectUri: window.location.origin
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

  React.useEffect(() => {
    if (isAuthenticated && accounts.length > 0) {
      instance.acquireTokenSilent({
        scopes: ["User.Read", "Sites.Read.All", "Sites.ReadWrite.All"],
        account: accounts[0]
      }).then(response => {
        setAccessToken(response.accessToken);
      }).catch(err => {
        console.error('Token acquisition failed:', err);
        setTokenError(err.errorCode);
      });
    }
  }, [isAuthenticated, accounts, instance]);

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
              scopes: ["User.Read", "Sites.Read.All", "Sites.ReadWrite.All"]
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

  return (
    <div>
      <nav style={{
        background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
        color: 'white',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0' }}>📚 Training Portal</h2>
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
      </nav>
      {accessToken ? (
        <Dashboard accessToken={accessToken} user={accounts[0]} />
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
          Loading your training dashboard...
        </div>
      )}
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
