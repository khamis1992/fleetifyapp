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
  
  // No user context - auth still loading
  if (!context.user) {
    logger.debug('⏳ [getCompanyFilter] No user context - auth still loading');
    return { company_id: '__loading__' }; // Will match nothing, but won't block UI
  }
  
  // RACE CONDITION FIX: User exists but company_id not yet loaded
  // This happens during early auth initialization when session is found but profile
  // fetch is still in progress. Check if user looks like it's still initializing
  // (has id but missing company data that should be loaded from profile)
  const userHasBasicAuthOnly = context.user?.id && 
    !context.user?.company?.id && 
    !(context.user as any)?.company_id &&
    !context.user?.profile?.company_id;
  
  if (userHasBasicAuthOnly) {
    // User session exists but profile/company not loaded yet - this is an intermediate state
    logger.debug('⏳ [getCompanyFilter] User authenticated but company data still loading', {
      userId: context.user?.id
    });
    return { company_id: '__loading__' }; // Will match nothing, but won't block UI - queries will refetch when company loads
  }
  
  // Final security fallback: user fully loaded but genuinely has no company association
  // This is a real issue that should be logged
  logger.warn('⚠️ [getCompanyFilter] User has no company association after full load', {
    userId: context.user?.id,
    email: context.user?.email
  });
  return { company_id: '__no_company__' }; // Return placeholder that matches nothing
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
