// Company scope utilities for permission and data management

import { UserRole } from '@/types/permissions';
import { AuthUser } from '@/lib/auth';

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
  const userRoles = (user?.roles || []) as UserRole[];
  const companyId = user?.profile?.company_id;
  
  return {
    user,
    userRoles,
    companyId,
    isSystemLevel: userRoles.includes('super_admin'),
    isCompanyScoped: userRoles.includes('company_admin') && !userRoles.includes('super_admin')
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
export const getCompanyFilter = (context: CompanyScopeContext): { company_id?: string } => {
  if (context.isSystemLevel) {
    // Super admin can see all companies
    return {};
  }
  
  if (context.companyId) {
    // All other users are limited to their company
    return { company_id: context.companyId };
  }
  
  // Fallback: no access if no company association
  return { company_id: 'no-access' };
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
    super_admin: ['super_admin', 'company_admin', 'manager', 'sales_agent', 'employee'],
    company_admin: ['company_admin', 'manager', 'sales_agent', 'employee'],
    manager: ['sales_agent', 'employee'],
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
