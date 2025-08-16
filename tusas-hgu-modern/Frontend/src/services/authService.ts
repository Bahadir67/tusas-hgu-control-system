import { LoginRequest, LoginResponse, User } from '../types/auth';

/**
 * Authentication Service for TUSAŞ HGU Control System
 * Handles all authentication-related API calls
 */
class AuthService {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor() {
    this.baseUrl = 'http://localhost:5000/api/auth';
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Authenticate user with credentials
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Store authentication data
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      if (data.refreshToken) {
        localStorage.setItem('auth_refresh_token', data.refreshToken);
      }
      if (data.user) {
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      }
      if (data.expiresAt) {
        localStorage.setItem('auth_expires_at', data.expiresAt);
      }

      return {
        success: true,
        token: data.token,
        refreshToken: data.refreshToken,
        user: data.user,
        expiresAt: data.expiresAt,
        message: data.message,
        timestamp: data.timestamp || new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Login request timed out. Please try again.');
        }
        throw new Error(error.message || 'Login failed');
      }
      throw new Error('An unexpected error occurred during login');
    }
  }


  /**
   * Check authentication status
   */
  async checkAuthStatus(token: string): Promise<{ isAuthenticated: boolean; user?: User }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/check`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return {
          isAuthenticated: data.authenticated === true,
          user: data.user,
        };
      }

      return { isAuthenticated: false };
    } catch (error) {
      console.warn('Auth status check failed:', error);
      return { isAuthenticated: false };
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(token: string): Promise<User | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return data;
      }

      return null;
    } catch (error) {
      console.warn('Get user profile failed:', error);
      return null;
    }
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<any> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/system-info`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch (error) {
      console.warn('Get system info failed:', error);
      return null;
    }
  }

  /**
   * Check server health
   */
  async checkServerHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check

      const response = await fetch('http://localhost:5000/health', {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate JWT token format (basic client-side validation)
   */
  validateTokenFormat(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }

      // Check if payload can be decoded
      const payload = JSON.parse(atob(parts[1]));
      
      // Check if token has expiration
      if (!payload.exp) {
        return false;
      }

      // Check if token is expired
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return new Date(payload.exp * 1000);
    } catch {
      return null;
    }
  }

  /**
   * Check if token expires soon (within 5 minutes)
   */
  isTokenExpiringSoon(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) {
      return true;
    }

    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return expiration < fiveMinutesFromNow;
  }

  /**
   * Get stored token from localStorage
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Get stored user from localStorage
   */
  getUser(): User | null {
    const userData = localStorage.getItem('auth_user');
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    return !this.isTokenExpiringSoon(token);
  }

  /**
   * Logout user and clear stored data
   */
  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('auth_expires_at');
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;