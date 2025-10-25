// Company scope utilities for permission and data management

import { UserRole } from '@/types/permissions';
import { AuthUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

export interface CompanyScopeContext {
  user: AuthUser | null;
  userRoles: UserRole[];
  companyId?: string;
  isSystemLevel: boolean;
  isCompanyScoped: boolean;
}

/**
 * Get the company scope context for the current user
 */
export const getCompanyScopeContext = (user: AuthUser | null): CompanyScopeContext => {
  // Early return for null user (auth loading)
  if (!user) {
    return {
      user: null,
      userRoles: [],
      companyId: undefined,
      isSystemLevel: false,
      isCompanyScoped: false
    };
  }

  // Normalize roles: trim, lowercase, remove falsy and duplicates
  const rawRoles = Array.isArray((user as any)?.roles) ? (user as any).roles : [];
  const normalizedRoles = Array.from(
    new Set(
      rawRoles
        .map((r: any) => String(r || '').trim().toLowerCase())
        .filter((r: string) => !!r)
    )
  ) as UserRole[];

  // Extract company_id consistently with useUnifiedCompanyAccess
  const companyId = user?.company?.id || (user as any)?.company_id || user?.profile?.company_id;
  
  // Debug logging
  logger.debug('🔧 [getCompanyScopeContext] Processing user context:', {
    userId: user?.id,
    companyId,
    normalizedRoles,
    isSystemLevel: normalizedRoles.includes('super_admin')
  });
  
  return {
    user,
    userRoles: normalizedRoles,
    companyId,
    isSystemLevel: normalizedRoles.includes('super_admin'),
    isCompanyScoped: normalizedRoles.includes('company_admin') && !normalizedRoles.includes('super_admin')
  };
};

/**
 * Check if the user has permission to access data across companies
 */
export const hasGlobalAccess = (context: CompanyScopeContext): boolean => {
  return context.isSystemLevel;
};

/**
 * Check if the user has permission to access all data within their company
 */
export const hasCompanyAdminAccess = (context: CompanyScopeContext): boolean => {
  return context.isSystemLevel || context.isCompanyScoped;
};

/**
 * Check if a super admin is browsing as a company admin
 */
export const isBrowsingAsCompanyAdmin = (
  context: CompanyScopeContext,
  isBrowsingMode: boolean,
  originalUserRoles: string[]
): boolean => {
  return isBrowsingMode && 
         originalUserRoles.includes('super_admin') && 
         context.isCompanyScoped && 
         !context.isSystemLevel;
};

/**
 * Check if the user has full control over the current company
 * (either as company admin or super admin browsing as company admin)
 */
export const hasFullCompanyControl = (
  context: CompanyScopeContext,
  isBrowsingMode: boolean = false,
  originalUserRoles: string[] = []
): boolean => {
  return hasCompanyAdminAccess(context) || 
         isBrowsingAsCompanyAdmin(context, isBrowsingMode, originalUserRoles);
};

/**
 * Get the appropriate WHERE clause for filtering data by company
 */
export const getCompanyFilter = (context: CompanyScopeContext, forceOwnCompany: boolean = false, allowGlobalView: boolean = false): { company_id?: string } => {
  // Super admin with explicit global view permission
  if (context.isSystemLevel && !forceOwnCompany && allowGlobalView) {
    logger.debug('🌍 [getCompanyFilter] Super admin with global view enabled');
    return {};
  }
  
  // Normal case: filter by company_id
  if (context.companyId) {
    return { company_id: context.companyId };
  }
  
  // SECURITY FIX: During auth initialization, user might not have company loaded yet
  // Instead of blocking completely, log warning and return empty (which will show no data)
  // This prevents the app from being stuck in error state during auth load
  if (!context.user) {
    logger.warn('⚠️ [getCompanyFilter] No user context - auth may still be loading');
    return { company_id: '__loading__' }; // Will match nothing, but won't block UI
  }
  
  // Final security fallback: user exists but no company association
  logger.error('🚨 [getCompanyFilter] SECURITY: User has no company association - blocking access', {
    userId: context.user?.id,
    email: context.user?.email
  });
  return { company_id: 'no-access-security-block' };
};

/**
 * Check if a user can assign a specific role
 */
export const canAssignRole = (
  context: CompanyScopeContext, 
  targetRole: UserRole,
  targetUserCompanyId?: string
): boolean => {
  // Super admin can assign any role to any user
  if (context.isSystemLevel) {
    return true;
  }
  
  // Company admin can assign roles within their company (except super_admin)
  if (context.isCompanyScoped) {
    // Must be same company
    if (targetUserCompanyId && targetUserCompanyId !== context.companyId) {
      return false;
    }
    
    // Cannot assign super_admin role
    if (targetRole === 'super_admin') {
      return false;
    }
    
    return true;
  }
  
  // Other roles have limited assignment capabilities
  const assignableRoles: Record<UserRole, UserRole[]> = {
    super_admin: ['super_admin', 'company_admin', 'manager', 'accountant', 'fleet_manager', 'sales_agent', 'employee'],
    company_admin: ['company_admin', 'manager', 'accountant', 'fleet_manager', 'sales_agent', 'employee'],
    manager: ['sales_agent', 'employee'],
    accountant: [],
    fleet_manager: ['employee'],
    sales_agent: [],
    employee: []
  };
  
  for (const role of context.userRoles) {
    if (assignableRoles[role]?.includes(targetRole)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Check if a user can manage system settings
 */
export const canManageSystemSettings = (context: CompanyScopeContext): boolean => {
  return context.isSystemLevel;
};

/**
 * Check if a user can manage company settings
 */
export const canManageCompanySettings = (context: CompanyScopeContext): boolean => {
  return context.isSystemLevel || context.isCompanyScoped;
};

/**
 * Check if a user can manage company as admin (including super admin browsing mode)
 */
export const canManageCompanyAsAdmin = (
  context: CompanyScopeContext,
  isBrowsingMode: boolean = false,
  originalUserRoles: string[] = []
): boolean => {
  return hasFullCompanyControl(context, isBrowsingMode, originalUserRoles);
};

/**
 * Get the scope label for UI display
 */
export const getScopeLabel = (context: CompanyScopeContext): string => {
  if (context.isSystemLevel) {
    return 'نطاق النظام - جميع الشركات';
  }
  
  if (context.isCompanyScoped) {
    return 'نطاق الشركة - الشركة الحالية فقط';
  }
  
  return 'نطاق محدود';
};

/**
 * Get the maximum permission level a user can grant
 */
export const getMaxPermissionLevel = (context: CompanyScopeContext): 'read' | 'write' | 'admin' => {
  if (context.isSystemLevel) {
    return 'admin';
  }
  
  if (context.isCompanyScoped) {
    return 'admin'; // Company admin has admin level within their company
  }
  
  if (context.userRoles.includes('manager')) {
    return 'write';
  }
  
  return 'read';
};
