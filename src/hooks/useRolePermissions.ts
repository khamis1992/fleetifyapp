/**
 * Hook للتحقق من الصلاحيات المبنية على الأدوار - FleetifyApp
 * 
 * يوفر هذا الـ Hook واجهة سهلة للتحقق من صلاحيات المستخدم الحالي
 * بناءً على نظام RBAC (Role-Based Access Control)
 * 
 * @module hooks/useRolePermissions
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import {
  UserRole,
  Permission,
  getRolePermissions,
  getRoleDisplayName,
  getRoleDescription,
} from '@/lib/permissions/roles';
import {
  UserPermissionContext,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  hasRole,
  hasAnyRole,
  isSuperAdmin,
  isCompanyManager,
  isManager,
  isEmployee,
  isAdmin,
  isAdminOrManager,
  isSameCompany,
  canAccessResource,
  canEditResource,
  canDeleteResource,
  canApproveResource,
} from '@/lib/permissions/permissions';

/**
 * Hook للحصول على صلاحيات المستخدم الحالي
 */
export function useRolePermissions() {
  const { companyId } = useUnifiedCompanyAccess();
  
  // جلب معلومات المستخدم الحالي
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });
  
  // جلب أدوار المستخدم من قاعدة البيانات (يمكن أن يكون لديه عدة أدوار)
  const { data: userRole, isLoading: loadingRole } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }
      
      if (!data || data.length === 0) {
        return UserRole.EMPLOYEE;
      }
      
      // ترتيب الأدوار حسب الأولوية (الأعلى صلاحية أولاً)
      const rolePriority: Record<string, number> = {
        'super_admin': 1,
        'company_admin': 2,
        'manager': 3,
        'fleet_manager': 4,
        'accountant': 5,
        'sales_agent': 6,
        'employee': 7,
      };
      
      const roles = data.map(r => r.role);
      const highestRole = roles.sort((a, b) => 
        (rolePriority[a] || 99) - (rolePriority[b] || 99)
      )[0];
      
      console.log('User roles:', roles, 'Highest role:', highestRole);
      
      return highestRole as UserRole || UserRole.EMPLOYEE;
    },
    enabled: !!user?.id,
  });
  
  // إنشاء سياق الصلاحيات
  const context: UserPermissionContext | null = useMemo(() => {
    if (!user?.id || !userRole) return null;
    
    return {
      userId: user.id,
      role: userRole,
      companyId: companyId || null,
    };
  }, [user?.id, userRole, companyId]);
  
  // دوال التحقق من الصلاحيات
  const permissions = useMemo(() => {
    if (!context) {
      return {
        // معلومات المستخدم
        userId: null,
        role: null,
        companyId: null,
        roleDisplayName: null,
        roleDescription: null,
        allPermissions: [],
        
        // حالة التحميل
        isLoading: loadingRole,
        
        // دوال التحقق (ترجع false عند عدم وجود context)
        hasPermission: () => false,
        hasAllPermissions: () => false,
        hasAnyPermission: () => false,
        hasRole: () => false,
        hasAnyRole: () => false,
        isSuperAdmin: () => false,
        isCompanyManager: () => false,
        isManager: () => false,
        isEmployee: () => false,
        isAdmin: () => false,
        isAdminOrManager: () => false,
        isSameCompany: () => false,
        canAccessResource: () => false,
        canEditResource: () => false,
        canDeleteResource: () => false,
        canApproveResource: () => false,
      };
    }
    
    return {
      // معلومات المستخدم
      userId: context.userId,
      role: context.role,
      companyId: context.companyId,
      roleDisplayName: getRoleDisplayName(context.role),
      roleDescription: getRoleDescription(context.role),
      allPermissions: getRolePermissions(context.role),
      
      // حالة التحميل
      isLoading: loadingRole,
      
      // دوال التحقق من الصلاحيات
      hasPermission: (permission: Permission) => hasPermission(context, permission),
      hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(context, permissions),
      hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(context, permissions),
      
      // دوال التحقق من الأدوار
      hasRole: (role: UserRole) => hasRole(context, role),
      hasAnyRole: (roles: UserRole[]) => hasAnyRole(context, roles),
      isSuperAdmin: () => isSuperAdmin(context),
      isCompanyManager: () => isCompanyManager(context),
      isManager: () => isManager(context),
      isEmployee: () => isEmployee(context),
      isAdmin: () => isAdmin(context),
      isAdminOrManager: () => isAdminOrManager(context),
      
      // دوال التحقق من الوصول
      isSameCompany: (targetCompanyId: string | null) => isSameCompany(context, targetCompanyId),
      canAccessResource: (resourceCompanyId: string | null, requiredPermission: Permission) =>
        canAccessResource(context, resourceCompanyId, requiredPermission),
      canEditResource: (resourceCompanyId: string | null, editPermission: Permission) =>
        canEditResource(context, resourceCompanyId, editPermission),
      canDeleteResource: (resourceCompanyId: string | null, deletePermission: Permission) =>
        canDeleteResource(context, resourceCompanyId, deletePermission),
      canApproveResource: (resourceCompanyId: string | null, approvePermission: Permission) =>
        canApproveResource(context, resourceCompanyId, approvePermission),
    };
  }, [context, loadingRole]);
  
  return permissions;
}

/**
 * Hook مبسط للتحقق من صلاحية واحدة
 */
export function useHasRolePermission(permission: Permission): boolean {
  const { hasPermission } = useRolePermissions();
  return hasPermission(permission);
}

/**
 * Hook مبسط للتحقق من عدة صلاحيات
 */
export function useHasAllRolePermissions(permissions: Permission[]): boolean {
  const { hasAllPermissions } = useRolePermissions();
  return hasAllPermissions(permissions);
}

/**
 * Hook مبسط للتحقق من أي صلاحية
 */
export function useHasAnyRolePermission(permissions: Permission[]): boolean {
  const { hasAnyPermission } = useRolePermissions();
  return hasAnyPermission(permissions);
}

/**
 * Hook مبسط للتحقق من دور
 */
export function useHasUserRole(role: UserRole): boolean {
  const { hasRole } = useRolePermissions();
  return hasRole(role);
}

/**
 * Hook مبسط للتحقق من Super Admin
 */
export function useIsSuperAdmin(): boolean {
  const { isSuperAdmin } = useRolePermissions();
  return isSuperAdmin();
}

/**
 * Hook مبسط للتحقق من Company Manager
 */
export function useIsCompanyManager(): boolean {
  const { isCompanyManager } = useRolePermissions();
  return isCompanyManager();
}

/**
 * Hook مبسط للتحقق من Manager
 */
export function useIsManager(): boolean {
  const { isManager } = useRolePermissions();
  return isManager();
}

/**
 * Hook مبسط للتحقق من Employee
 */
export function useIsEmployee(): boolean {
  const { isEmployee } = useRolePermissions();
  return isEmployee();
}

/**
 * Hook مبسط للتحقق من Admin (Super Admin أو Company Manager)
 */
export function useIsAdmin(): boolean {
  const { isAdmin } = useRolePermissions();
  return isAdmin();
}

/**
 * Hook مبسط للتحقق من Admin أو Manager
 */
export function useIsAdminOrManager(): boolean {
  const { isAdminOrManager } = useRolePermissions();
  return isAdminOrManager();
}
