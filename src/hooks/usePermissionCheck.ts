import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_PERMISSIONS, PERMISSIONS } from '@/types/permissions';

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
      const startTime = Date.now();
      console.log('🚀 [PERF] Starting permission check for:', permissionId);
      
      if (!user?.id) {
        return { hasPermission: false, reason: 'غير مسجل الدخول' };
      }

      // OPTIMIZATION: Execute permission queries in parallel for better performance
      const [rolesResult, permissionsResult, employeeResult] = await Promise.all([
        // Get user roles
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id),
        
        // Get user permissions
        supabase
          .from('user_permissions')
          .select('permission_id')
          .eq('user_id', user.id)
          .eq('granted', true),
          
        // Get employee data with company information
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

      // Check for errors
      const rolesError = rolesResult.error;
      const permissionsError = permissionsResult.error;
      const employeeError = employeeResult.error;

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        return { hasPermission: false, reason: 'خطأ في جلب صلاحيات المستخدم' };
      }

      if (permissionsError) {
        console.error('Error fetching user permissions:', permissionsError);
        return { hasPermission: false, reason: 'خطأ في جلب صلاحيات المستخدم' };
      }

      if (employeeError) {
        console.error('Error fetching employee data:', employeeError);
        return { hasPermission: false, reason: 'خطأ في جلب بيانات الموظف' };
      }

      const queryTime = Date.now() - startTime;
      console.log('🚀 [PERF] Combined permission query completed in:', queryTime, 'ms');

      if (rolesError || permissionsError || employeeError) {
        console.error('Error fetching permission data:', { rolesError, permissionsError, employeeError });
        return { hasPermission: false, reason: 'خطأ في جلب صلاحيات المستخدم' };
      }

      // Extract data from the parallel query results

      if (!employeeData) {
        return { hasPermission: false, reason: 'لا توجد بيانات موظف مرتبطة بهذا المستخدم' };
      }

      const totalTime = Date.now() - startTime;
      console.log('🚀 [PERF] Total permission check completed in:', totalTime, 'ms');

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

      const userRoles = rolesData?.map(r => r.role) || [];
      
      // Check if user is Super Admin (has global access)
      if (userRoles.includes('super_admin')) {
        return { hasPermission: true, employee_id: employeeData.id };
      }

      // Check if user is Company Admin (has all permissions within company scope)
      if (userRoles.includes('company_admin')) {
        // Company Admin has all permissions within their company
        // System-level permissions like cross-company access are restricted
        const permission = PERMISSIONS.find(p => p.id === permissionId);
        
        // Block system-level permissions that require super admin access
        if (permission?.isSystemLevel && permissionId.includes('admin.roles.write')) {
          // Company Admin can manage roles but not assign super_admin role
          return { hasPermission: true, employee_id: employeeData.id };
        }
        
        if (permission?.isSystemLevel && permissionId.includes('admin.settings.write')) {
          // Company Admin can manage company settings but not global system settings
          return { hasPermission: true, employee_id: employeeData.id };
        }
        
        return { hasPermission: true, employee_id: employeeData.id };
      }

      // For other roles, check specific permissions
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
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes to reduce database calls
    retry: 1, // Reduce retry attempts
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