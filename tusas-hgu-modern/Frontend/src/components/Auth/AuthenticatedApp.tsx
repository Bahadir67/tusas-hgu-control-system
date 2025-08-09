import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { opcApiService } from '../../services/opcApiService';
import AuthGuard from './AuthGuard';
import App from '../../App';

/**
 * Authenticated wrapper for the main App
 * Sets up authentication token in OPC service and handles auth events
 */
const AuthenticatedApp: React.FC = () => {
  const { token, logout, isAuthenticated } = useAuth();
  const [authEventHandlerSet, setAuthEventHandlerSet] = useState(false);

  // Set authentication token in OPC service when it changes
  useEffect(() => {
    if (isAuthenticated && token) {
      opcApiService.setAuthToken(token);
      console.log('✅ Authentication token set in OPC service');
    } else {
      opcApiService.setAuthToken(null);
      console.log('🔒 Authentication token cleared from OPC service');
    }
  }, [token, isAuthenticated]);

  // Set up event listener for auth-required events from OPC service
  useEffect(() => {
    if (!authEventHandlerSet) {
      const handleAuthRequired = (event: CustomEvent) => {
        console.warn('🔒 Authentication required event received:', event.detail);
        // Force logout to show login screen
        logout();
      };

      // Listen for auth-required events from OPC service
      window.addEventListener('auth-required', handleAuthRequired as EventListener);
      setAuthEventHandlerSet(true);

      // Cleanup
      return () => {
        window.removeEventListener('auth-required', handleAuthRequired as EventListener);
        setAuthEventHandlerSet(false);
      };
    }
  }, [logout, authEventHandlerSet]);

  return (
    <AuthGuard>
      <App />
    </AuthGuard>
  );
};

export default AuthenticatedApp;