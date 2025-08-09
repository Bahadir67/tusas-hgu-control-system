import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// API Base URL
const API_BASE = 'http://localhost:5000/api';

// Types
interface User {
  id: number;
  username: string;
  role: string;
  fullName?: string;
  email?: string;
  lastLoginAt?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');

        if (storedToken && storedUser) {
          // Validate token with backend
          const response = await fetch(`${API_BASE}/auth/validate`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${storedToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const userData = JSON.parse(storedUser);
            setAuthState({
              user: userData,
              token: storedToken,
              isAuthenticated: true,
              isLoading: false
            });
          } else {
            // Token is invalid, clear storage
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            localStorage.removeItem('auth_expires');
            setAuthState(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear potentially corrupted data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_expires');
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success && data.token && data.user) {
        // Store auth data
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        localStorage.setItem('auth_expires', data.expiresAt);

        // Update state
        setAuthState({
          user: data.user,
          token: data.token,
          isAuthenticated: true,
          isLoading: false
        });

        return { success: true, message: 'Login successful' };
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: false, message: 'Network error occurred' };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        // Notify backend about logout (optional)
        try {
          await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.warn('Logout notification failed:', error);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_expires');
      
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      });
    }
  };

  // Refresh auth function - Silent refresh without affecting loading state
  const refreshAuth = async (): Promise<void> => {
    try {
      const storedToken = localStorage.getItem('auth_token');
      if (!storedToken) {
        await logout();
        return;
      }

      // Silent validation - don't change loading state
      const response = await fetch(`${API_BASE}/auth/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Only logout if token is invalid, don't affect loading state
        await logout();
      }
    } catch (error) {
      console.error('Auth refresh error:', error);
      // Don't auto-logout on network errors during silent refresh
    }
  };

  // Auto-refresh token validation - Only when authenticated
  useEffect(() => {
    if (authState.isAuthenticated && authState.token) {
      const interval = setInterval(() => {
        // Don't affect loading state during refresh
        refreshAuth();
      }, 10 * 60 * 1000); // Every 10 minutes (less frequent)
      return () => clearInterval(interval);
    }
  }, [authState.isAuthenticated]);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    refreshAuth
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};