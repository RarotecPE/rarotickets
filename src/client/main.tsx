import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app';
import { AuthProvider } from '../modules/auth/client/state/auth-context';
import { ParticipantAuthProvider } from '../modules/participants/client/state/participant-auth-context';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ParticipantAuthProvider>
          <App />
        </ParticipantAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
