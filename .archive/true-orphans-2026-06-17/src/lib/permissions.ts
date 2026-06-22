/**
 * Permissions and Authorization Middleware
 * Centralized permission checking for all operations
 */

import { supabase } from '@/integrations/supabase/client';
import * as Sentry from '@sentry/react';

export type UserRole = 'admin' | 'manager' | 'accountant' | 'driver' | 'user';

export type Permission = 
  | 'contracts:create'
  | 'contracts:read'
  | 'contracts:update'
  | 'contracts:delete'
  | 'payments:create'
  | 'payments:read'
  | 'payments:update'
  | 'payments:delete'
  | 'invoices:create'
  | 'invoices:read'
  | 'invoices:update'
  | 'invoices:delete'
  | 'vehicles:create'
  | 'vehicles:read'
  | 'vehicles:update'
  | 'vehicles:delete'
  | 'customers:create'
  | 'customers:read'
  | 'customers:update'
  | 'customers:delete'
  | 'finance:read'
  | 'finance:write'
  | 'reports:read'
  | 'settings:read'
  | 'settings:write'
  | 'users:manage';

/**
 * Role-based permissions mapping
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'contracts:create', 'contracts:read', 'contracts:update', 'contracts:delete',
    'payments:create', 'payments:read', 'payments:update', 'payments:delete',
    'invoices:create', 'invoices:read', 'invoices:update', 'invoices:delete',
    'vehicles:create', 'vehicles:read', 'vehicles:update', 'vehicles:delete',
    'customers:create', 'customers:read', 'customers:update', 'customers:delete',
    'finance:read', 'finance:write',
    'reports:read',
    'settings:read', 'settings:write',
    'users:manage',
  ],
  manager: [
    'contracts:create', 'contracts:read', 'contracts:update',
    'payments:create', 'payments:read', 'payments:update',
    'invoices:create', 'invoices:read', 'invoices:update',
    'vehicles:create', 'vehicles:read', 'vehicles:update',
    'customers:create', 'customers:read', 'customers:update',
    'finance:read',
    'reports:read',
    'settings:read',
  ],
  accountant: [
    'contracts:read',
    'payments:create', 'payments:read', 'payments:update',
    'invoices:create', 'invoices:read', 'invoices:update',
    'customers:read',
    'finance:read', 'finance:write',
    'reports:read',
  ],
  driver: [
    'contracts:read',
    'vehicles:read',
    'customers:read',
  ],
  user: [
    'contracts:read',
    'payments:read',
    'invoices:read',
    'vehicles:read',
    'customers:read',
    'reports:read',
  ],
};

/**
 * Get current user with roles and company
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get user profile with company and roles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        company:companies(*),
        user_roles(role)
      `)
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error('Failed to fetch user profile');
    }

    // Extract roles
    const roles = profile?.user_roles?.map((ur: any) => ur.role) || [];
    
    return {
      id: user.id,
      email: user.email,
      companyId: profile?.company_id,
      company: profile?.company,
      roles: roles as UserRole[],
      profile,
    };
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(userRoles: UserRole[], permission: Permission): boolean {
  return userRoles.some(role => {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    return rolePermissions.includes(permission);
  });
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(userRoles: UserRole[], permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRoles, permission));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(userRoles: UserRole[], permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRoles, permission));
}

/**
 * Require permission - throws error if user doesn't have permission
 */
export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();
  
  if (!hasPermission(user.roles, permission)) {
    const error = new Error(`Permission denied: ${permission}`);
    Sentry.captureException(error, {
      tags: {
        permission,
        userId: user.id,
        companyId: user.companyId,
      },
    });
    throw error;
  }
  
  return user;
}

/**
 * Require company access - validates user belongs to the specified company
 */
export async function requireCompanyAccess(companyId: string) {
  const user = await getCurrentUser();
  
  if (user.companyId !== companyId) {
    const error = new Error('Access denied: Invalid company');
    Sentry.captureException(error, {
      tags: {
        userId: user.id,
        userCompanyId: user.companyId,
        requestedCompanyId: companyId,
      },
    });
    throw error;
  }
  
  return user;
}

/**
 * Require permission and company access
 */
export async function requirePermissionAndCompany(permission: Permission, companyId: string) {
  const user = await requireCompanyAccess(companyId);
  
  if (!hasPermission(user.roles, permission)) {
    const error = new Error(`Permission denied: ${permission}`);
    Sentry.captureException(error, {
      tags: {
        permission,
        userId: user.id,
        companyId: user.companyId,
      },
    });
    throw error;
  }
  
  return user;
}

/**
 * Check if user is admin
 */
export function isAdmin(userRoles: UserRole[]): boolean {
  return userRoles.includes('admin');
}

/**
 * Check if user is manager or above
 */
export function isManagerOrAbove(userRoles: UserRole[]): boolean {
  return userRoles.some(role => ['admin', 'manager'].includes(role));
}

/**
 * Get all permissions for user roles
 */
export function getUserPermissions(userRoles: UserRole[]): Permission[] {
  const permissions = new Set<Permission>();
  
  userRoles.forEach(role => {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    rolePermissions.forEach(permission => permissions.add(permission));
  });
  
  return Array.from(permissions);
}
