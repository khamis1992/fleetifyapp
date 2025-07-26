import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_PERMISSIONS } from '@/types/permissions';

interface UserPermissionData {
  roles: string[];
  customPermissions: string[];
  employee_id?: string;
  account_status?: string;
}

export const usePermissionCheck = (permissionId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-permission-check', user?.id, permissionId],
    queryFn: async (): Promise<{ hasPermission: boolean; reason?: string; employee_id?: string }> => {
      if (!user?.id) {
        return { hasPermission: false, reason: 'غير مسجل الدخول' };
      }

      // Get user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        return { hasPermission: false, reason: 'خطأ في جلب صلاحيات المستخدم' };
      }

      // Get user permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('user_permissions')
        .select('permission_id')
        .eq('user_id', user.id)
        .eq('granted', true);

      if (permissionsError) {
        console.error('Error fetching user permissions:', permissionsError);
        return { hasPermission: false, reason: 'خطأ في جلب صلاحيات المستخدم' };
      }

      // Get employee data
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, account_status, has_system_access')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (employeeError) {
        console.error('Error fetching employee data:', employeeError);
        return { hasPermission: false, reason: 'خطأ في جلب بيانات الموظف' };
      }

      // Check if user has employee record
      if (!employeeData) {
        return { hasPermission: false, reason: 'لا توجد بيانات موظف مرتبطة بهذا المستخدم' };
      }

      // Check if employee has system access
      if (!employeeData.has_system_access) {
        return { hasPermission: false, reason: 'الموظف غير مخول للوصول للنظام', employee_id: employeeData.id };
      }

      // Check if account is active
      if (employeeData.account_status !== 'active') {
        return { hasPermission: false, reason: 'حساب الموظف غير نشط', employee_id: employeeData.id };
      }

      // Aggregate permissions from roles
      const userRoles = rolesData?.map(r => r.role) || [];
      const rolePermissions = userRoles.flatMap(role => 
        ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]?.permissions || []
      );

      // Get custom permissions
      const customPermissions = permissionsData?.map(p => p.permission_id) || [];

      // Check if user has the permission
      const allPermissions = [...rolePermissions, ...customPermissions];
      const hasPermission = allPermissions.includes(permissionId);

      if (!hasPermission) {
        return { hasPermission: false, reason: 'ليس لديك صلاحية لهذا الإجراء', employee_id: employeeData.id };
      }

      return { hasPermission: true, employee_id: employeeData.id };
    },
    enabled: !!user?.id,
  });
};

export const useEmployeeData = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['employee-data', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('employees')
        .select('id, company_id, account_status, has_system_access, first_name, last_name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};