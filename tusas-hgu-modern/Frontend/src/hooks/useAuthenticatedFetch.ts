import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface AuthenticatedFetchOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Hook for making authenticated API requests
 * Automatically adds JWT token to requests and handles auth errors
 */
export const useAuthenticatedFetch = () => {
  const { token, logout, isAuthenticated } = useAuth();

  const authenticatedFetch = useCallback(async (
    url: string, 
    options: AuthenticatedFetchOptions = {}
  ): Promise<Response> => {
    const { skipAuth = false, headers = {}, ...restOptions } = options;

    // Prepare headers
    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Add authentication token if available and not skipped
    if (!skipAuth && isAuthenticated && token) {
      (requestHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...restOptions,
        headers: requestHeaders,
      });

      // Handle authentication errors
      if (response.status === 401) {
        console.warn('🔒 Authentication failed, logging out...');
        await logout();
        throw new Error('Authentication required');
      }

      return response;
    } catch (error) {
      console.error('❌ Authenticated fetch error:', error);
      throw error;
    }
  }, [token, logout, isAuthenticated]);

  return authenticatedFetch;
};

/**
 * Hook for making authenticated API requests with JSON response
 */
export const useAuthenticatedApi = () => {
  const authenticatedFetch = useAuthenticatedFetch();

  const apiCall = useCallback(async <T = any>(
    endpoint: string,
    options: AuthenticatedFetchOptions = {}
  ): Promise<T> => {
    const url = endpoint.startsWith('http') 
      ? endpoint 
      : `http://localhost:5000/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const response = await authenticatedFetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }, [authenticatedFetch]);

  return apiCall;
};