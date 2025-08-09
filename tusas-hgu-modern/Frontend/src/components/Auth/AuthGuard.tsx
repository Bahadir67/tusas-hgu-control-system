import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginPage from './LoginPage';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Authentication Guard Component
 * Protects routes and components by requiring authentication
 * Shows login page if user is not authenticated
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #0a0f1c 0%, #1a1f2e 50%, #0a0f1c 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize: '16px'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(0, 120, 255, 0.3)',
            borderTop: '3px solid #0078ff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div>Loading TUSAŞ HGU Control System...</div>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return fallback || <LoginPage />;
  }

  // Show protected content if authenticated
  return <>{children}</>;
};

export default AuthGuard;