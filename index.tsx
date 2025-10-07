import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { SupabaseAuthProvider } from './hooks/useSupabaseAuth';
import { UserDataProvider } from './hooks/useUserData';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SupabaseAuthProvider>
      <UserDataProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </UserDataProvider>
    </SupabaseAuthProvider>
  </React.StrictMode>
);
