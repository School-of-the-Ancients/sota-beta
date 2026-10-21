import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SupabaseAuthProvider } from './hooks/useSupabaseAuth';
import { UserDataProvider } from './hooks/useUserData';
import './index.css';
import { appBasePath } from './src/lib/deployment';
import { initializeSupabase } from './supabaseClient';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
rootElement.textContent = 'Connecting to SOTA…';
void initializeSupabase().then(() => {
root.render(
  <React.StrictMode>
    <BrowserRouter basename={appBasePath()}>
      <SupabaseAuthProvider>
        <UserDataProvider>
          <App />
        </UserDataProvider>
      </SupabaseAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
}).catch(() => {
  rootElement.textContent = 'SOTA could not connect to its backend. Please reload or contact the owner.';
});
