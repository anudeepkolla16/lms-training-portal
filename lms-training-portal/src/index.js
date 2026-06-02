import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication } from '@azure/msal-browser';
import App from './App';

const msalConfig = {
  auth: {
    clientId: 'f0ba86a7-a739-4977-b9ba-1f1c1269f219',
    authority: 'https://login.microsoftonline.com/06d5c541-26b2-4dc8-ac6f-eeba90783202',
    redirectUri: window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : 'https://lms-training-portal.vercel.app',
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true,
  }
};

const pca = new PublicClientApplication(msalConfig);

pca.initialize().then(() => {
  // Detect if this is MSAL's popup callback window
  // If yes: just process the auth code, don't render the full app
  // If no: render the full app normally
  const isPopupWindow = window.opener && window.opener !== window;
  const hasAuthCode = window.location.hash.includes('code=') || window.location.search.includes('code=');

  if (isPopupWindow && hasAuthCode) {
    // This is the MSAL popup callback - process auth and let MSAL close it
    pca.handleRedirectPromise().catch(err => console.error('Popup auth error:', err));
  } else {
    // Main window - render the full React app
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App msalInstance={pca} />);
  }
});
