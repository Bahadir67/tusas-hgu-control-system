import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '../contexts/AuthContext';

/**
 * Hook to access authentication context
 * Provides authentication state and actions for TUSAŞ HGU Control System
 * 
 * @returns AuthContextType with authentication state and methods
 * @throws Error if used outside of AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Make sure your component is wrapped with AuthProvider.'
    );
  }
  
  return context;
};

/**
 * Hook to check if user has specific permission
 * @param permission Permission to check
 * @returns boolean indicating if user has permission
 */
export const usePermission = (permission: string): boolean => {
  const { user } = useAuth();
  
  if (!user) {
    return false;
  }

  // Get user permissions based on role
  const getUserPermissions = (role: string): string[] => {
    switch (role.toLowerCase()) {
      case 'admin':
        return [
          'opc.read', 'opc.write', 'system.admin',
          'user.manage', 'audit.view', 'system.configure'
        ];
      case 'developer':
        return [
          'opc.read', 'opc.write', 'system.admin',
          'audit.view', 'system.configure'
        ];
      case 'operator':
        return [
          'opc.read', 'opc.write', 'system.operate'
        ];
      case 'viewer':
        return [
          'opc.read', 'system.view'
        ];
      default:
        return ['system.view'];
    }
  };

  const userPermissions = getUserPermissions(user.role);
  return userPermissions.includes(permission);
};

/**
 * Hook to check if user has any of the specified roles
 * @param roles Array of roles to check
 * @returns boolean indicating if user has any of the roles
 */
export const useRole = (...roles: string[]): boolean => {
  const { user } = useAuth();
  
  if (!user) {
    return false;
  }

  return roles.some(role => user.role.toLowerCase() === role.toLowerCase());
};

/**
 * Hook to get user's full permissions list
 * @returns Array of permission strings
 */
export const useUserPermissions = (): string[] => {
  const { user } = useAuth();
  
  if (!user) {
    return [];
  }

  switch (user.role.toLowerCase()) {
    case 'admin':
      return [
        'opc.read', 'opc.write', 'system.admin',
        'user.manage', 'audit.view', 'system.configure'
      ];
    case 'developer':
      return [
        'opc.read', 'opc.write', 'system.admin',
        'audit.view', 'system.configure'
      ];
    case 'operator':
      return [
        'opc.read', 'opc.write', 'system.operate'
      ];
    case 'viewer':
      return [
        'opc.read', 'system.view'
      ];
    default:
      return ['system.view'];
  }
};