/**
 * useCompanyPermissions Hook
 * 
 * Manages company-level permissions and access control.
 * Replaces: permission logic from useUnifiedCompanyAccess
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyContext } from '@/contexts/CompanyContext';
import {
  hasGlobalAccess,
  hasCompanyAdminAccess,
  hasFullCompanyControl,
  isBrowsingAsCompanyAdmin,
  canManageCompanyAsAdmin,
  getCompanyScopeContext
} from '@/lib/companyScope';

interface CompanyPermissions {
  hasGlobalAccess: boolean;
  hasCompanyAdminAccess: boolean;
  hasFullCompanyControl: boolean;
  isBrowsingAsCompanyAdmin: boolean;
  canManageCompanyAsAdmin: boolean;
  isSystemLevel: boolean;
  isCompanyScoped: boolean;
  userRoles: string[];
  canAccessCompany: (targetCompanyId?: string) => boolean;
  canAccessMultipleCompanies: () => boolean;
  validateCompanyAccess: (targetCompanyId: string) => void;
}

/**
 * Hook لإدارة صلاحيات الشركة
 */
export function useCompanyPermissions(): CompanyPermissions {
  const { user } = useAuth();
  const { isBrowsingMode } = useCompanyContext();

  const permissions = useMemo(() => {
    if (!user) {
      return {
        hasGlobalAccess: false,
        hasCompanyAdminAccess: false,
        hasFullCompanyControl: false,
        isBrowsingAsCompanyAdmin: false,
        canManageCompanyAsAdmin: false,
        isSystemLevel: false,
        isCompanyScoped: false,
        userRoles: [],
        canAccessCompany: () => false,
        canAccessMultipleCompanies: () => false,
        validateCompanyAccess: () => {
          throw new Error('Access denied: User not authenticated');
        }
      };
    }

    const context = getCompanyScopeContext(user);
    
    // Extract and normalize roles
    const rawRoles = Array.isArray((user as any)?.roles) ? (user as any).roles : [];
    const userRoles = Array.from(
      new Set(rawRoles.map((r: any) => String(r || '').trim().toLowerCase()).filter(Boolean))
    ) as string[];

    return {
      hasGlobalAccess: hasGlobalAccess(context),
      hasCompanyAdminAccess: hasCompanyAdminAccess(context),
      hasFullCompanyControl: hasFullCompanyControl(context, isBrowsingMode, userRoles),
      isBrowsingAsCompanyAdmin: isBrowsingAsCompanyAdmin(context, isBrowsingMode, userRoles),
      canManageCompanyAsAdmin: canManageCompanyAsAdmin(context, isBrowsingMode, userRoles),
      isSystemLevel: context.isSystemLevel,
      isCompanyScoped: context.isCompanyScoped,
      userRoles,
      
      canAccessCompany: (targetCompanyId?: string) => {
        if (!targetCompanyId) return false;
        if (context.isSystemLevel) return true;
        return context.companyId === targetCompanyId;
      },
      
      canAccessMultipleCompanies: () => context.isSystemLevel,
      
      validateCompanyAccess: (targetCompanyId: string) => {
        if (!targetCompanyId) {
          throw new Error('Company ID is required');
        }
        if (!context.isSystemLevel && context.companyId !== targetCompanyId) {
          throw new Error('Access denied: Cannot access data from different company');
        }
      }
    };
  }, [user?.id, (user as any)?.roles, isBrowsingMode]);

  return permissions;
}

/**
 * Simplified hooks for specific permission checks
 */

export function useHasAdminAccess(): boolean {
  const { hasFullCompanyControl } = useCompanyPermissions();
  return hasFullCompanyControl;
}

export function useHasGlobalAccess(): boolean {
  const { hasGlobalAccess } = useCompanyPermissions();
  return hasGlobalAccess;
}

export function useIsSystemLevel(): boolean {
  const { isSystemLevel } = useCompanyPermissions();
  return isSystemLevel;
}

export function useUserRoles(): string[] {
  const { userRoles } = useCompanyPermissions();
  return userRoles;
}

