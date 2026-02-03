import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_PERMISSIONS, PERMISSIONS } from '@/types/permissions';

interface BatchPermissionResult {
  permissionId: string;
  hasPermission: boolean;
  reason?: string;
}

/**
 * Hook to check multiple permissions at once (avoids calling hooks in loops)
 */
export const usePermissionsCheck = (permissionIds: string[]) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-permissions-check', user?.id, permissionIds],
    queryFn: async (): Promise<BatchPermissionResult[]> => {
      if (!user?.id) {
        return permissionIds.map(id => ({
          permissionId: id,
          hasPermission: false,
          reason: 'غير مسجل الدخول'
        }));
      }

      // Get all permission data in parallel
      const [rolesResult, permissionsResult, employeeResult] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id),
        supabase
          .from('user_permissions')
          .select('permission_id')
          .eq('user_id', user.id)
          .eq('granted', true),
        supabase
          .from('employees')
          .select('id, company_id, account_status, has_system_access')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()
      ]);

      const rolesData = rolesResult.data || [];
      const permissionsData = permissionsResult.data || [];
      const employeeData = employeeResult.data;

      // Check for critical errors
      if (rolesResult.error || permissionsResult.error) {
        return permissionIds.map(id => ({
          permissionId: id,
          hasPermission: false,
          reason: 'خطأ في جلب صلاحيات المستخدم'
        }));
      }

      if (employeeResult.error) {
        return permissionIds.map(id => ({
          permissionId: id,
          hasPermission: false,
          reason: 'خطأ في جلب بيانات الموظف'
        }));
      }

      if (!employeeData) {
        return permissionIds.map(id => ({
          permissionId: id,
          hasPermission: false,
          reason: 'لا توجد بيانات موظف مرتبطة بهذا المستخدم'
        }));
      }

      if (!employeeData.has_system_access) {
        return permissionIds.map(id => ({
          permissionId: id,
          hasPermission: false,
          reason: 'الموظف غير مخول للوصول للنظام'
        }));
      }

      if (employeeData.account_status !== 'active') {
        return permissionIds.map(id => ({
          permissionId: id,
          hasPermission: false,
          reason: 'حساب الموظف غير نشط'
        }));
      }

      const userRoles = rolesData.map(r => r.role);

      // Super admin has all permissions
      if (userRoles.includes('super_admin')) {
        return permissionIds.map(id => ({
          permissionId: id,
          hasPermission: true
        }));
      }

      // Company admin has most permissions
      const isCompanyAdmin = userRoles.includes('company_admin');

      // Get role-based permissions
      const rolePermissions = userRoles.flatMap(role =>
        ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]?.permissions || []
      );

      // Get custom permissions
      const customPermissions = permissionsData.map(p => p.permission_id);

      const allPermissions = [...new Set([...rolePermissions, ...customPermissions])];

      // Check each requested permission
      return permissionIds.map(permissionId => {
        const permission = PERMISSIONS.find(p => p.id === permissionId);

        // Company admin check for system-level permissions
        if (isCompanyAdmin) {
          if (permission?.isSystemLevel && permissionId.includes('super_admin')) {
            return {
              permissionId,
              hasPermission: false,
              reason: 'يتطلب صلاحية مدير النظام'
            };
          }
          return { permissionId, hasPermission: true };
        }

        // Regular permission check
        const hasPermission = allPermissions.includes(permissionId);

        return {
          permissionId,
          hasPermission,
          reason: hasPermission ? undefined : 'ليس لديك صلاحية لهذا الإجراء'
        };
      });
    },
    enabled: !!user?.id && permissionIds.length > 0,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

/**
 * Hook to check a single permission (kept for backward compatibility)
 */
export const usePermissionCheck = (permissionId: string) => {
  const { data, isLoading, error } = usePermissionsCheck([permissionId]);

  return {
    data: data?.[0] || { hasPermission: false, reason: 'جاري التحميل...' },
    isLoading,
    error
  };
};
