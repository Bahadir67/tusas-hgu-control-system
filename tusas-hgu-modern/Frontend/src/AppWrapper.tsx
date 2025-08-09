import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import AuthGuard from './components/Auth/AuthGuard';
import LoginPage from './components/Auth/LoginPage';
import App from './App';
import './styles/auth.css';

/**
 * Main application wrapper with authentication
 * Handles the authentication flow for the TUSAŞ HGU Control System
 */
function AppWrapper() {
  return (
    <AuthProvider>
      <AuthGuard fallback={<LoginPage />}>
        <App />
      </AuthGuard>
    </AuthProvider>
  );
}

export default AppWrapper;