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

// Initialize MSAL FIRST, then render - this fixes state_not_found errors
pca.initialize().then(() => {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App msalInstance={pca} />
    </React.StrictMode>
  );
});
