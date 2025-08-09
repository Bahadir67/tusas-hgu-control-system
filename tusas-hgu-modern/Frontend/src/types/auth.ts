/**
 * Authentication types for TUSAŞ HGU Control System
 * Industrial SCADA authentication with JWT tokens
 */

export interface User {
  id: number;
  username: string;
  role: string;
  fullName?: string;
  email?: string;
  lastLoginAt?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
  user?: User;
  message?: string;
  timestamp: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export interface AuthContextType {
  // State
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  checkAuthStatus: () => Promise<boolean>;
}

export interface AuthConfig {
  apiBaseUrl: string;
  tokenKey: string;
  refreshTokenKey: string;
  autoLogoutMinutes: number;
  checkStatusIntervalMs: number;
}

export const AUTH_STORAGE_KEYS = {
  TOKEN: 'tusas_hgu_token',
  REFRESH_TOKEN: 'tusas_hgu_refresh_token',
  USER: 'tusas_hgu_user',
  REMEMBER_ME: 'tusas_hgu_remember_me'
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  DEVELOPER: 'developer', 
  OPERATOR: 'operator'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];