import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/permissions';
import { useToast } from '@/hooks/use-toast';
import { createAuditLog } from '@/hooks/useAuditLog';

export interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  granted: boolean;
  granted_by?: string;
  granted_at?: string;
  revoked_at?: string;
}

export interface UserWithPermissions {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  roles: UserRole[];
  custom_permissions: UserPermission[];
}

// Hook to fetch user permissions
export const useUserPermissions = (userId?: string) => {
  return useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data as UserPermission[];
    },
    enabled: !!userId,
  });
};

// Hook to update user permissions
export const useUpdateUserPermissions = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      permissions 
    }: { 
      userId: string; 
      permissions: { permissionId: string; granted: boolean }[] 
    }) => {
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) throw new Error('Not authenticated');

      // Delete existing permissions for this user
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      // Insert new permissions (only granted ones)
      const permissionsToInsert = permissions
        .filter(p => p.granted)
        .map(p => ({
          user_id: userId,
          permission_id: p.permissionId,
          granted: true,
          granted_by: currentUser.data.user.id,
        }));

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from('user_permissions')
          .insert(permissionsToInsert);
        
        if (error) throw error;
      }
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['employees-with-access'] });
      
      // Log audit trail
      const grantedPermissions = variables.permissions.filter(p => p.granted).map(p => p.permissionId);
      await createAuditLog(
        'UPDATE',
        'user_permission',
        variables.userId,
        variables.userId,
        {
          new_values: {
            permissions: grantedPermissions,
            permission_count: grantedPermissions.length,
          },
          changes_summary: `Updated permissions for user ${variables.userId}`,
          metadata: {
            granted_count: grantedPermissions.length,
            revoked_count: variables.permissions.filter(p => !p.granted).length,
          },
          severity: 'critical',
        }
      );
      
      toast({
        title: "Success",
        description: "User permissions updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update permissions: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

// Hook to update user roles
export const useUpdateUserRoles = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      roles 
    }: { 
      userId: string; 
      roles: UserRole[] 
    }) => {
      console.log('Updating roles for user:', userId, 'New roles:', roles);
      
      // Get current user info for granted_by and company_id
      const currentUser = await supabase.auth.getUser();
      if (!currentUser.data.user) throw new Error('Not authenticated');
      
      // Get company_id for the target user
      const { data: targetProfile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', userId)
        .single();
      
      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw new Error('فشل في جلب بيانات المستخدم');
      }
      
      const companyId = targetProfile?.company_id;
      if (!companyId) {
        throw new Error('المستخدم غير مرتبط بشركة');
      }
      
      // Delete existing roles for this user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error deleting existing roles:', deleteError);
        throw deleteError;
      }

      // Insert new roles if any
      if (roles.length > 0) {
        const rolesToInsert = roles.map(role => ({
          user_id: userId,
          company_id: companyId,
          role,
          granted_by: currentUser.data.user.id,
        }));

        console.log('Inserting roles:', rolesToInsert);

        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(rolesToInsert);
        
        if (insertError) {
          console.error('Error inserting new roles:', insertError);
          throw insertError;
        }
      }

      console.log('Roles updated successfully');
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['employees-with-access'] });
      
      // Log audit trail
      await createAuditLog(
        'UPDATE',
        'user_role',
        variables.userId,
        variables.userId,
        {
          new_values: {
            roles: variables.roles,
            role_count: variables.roles.length,
          },
          changes_summary: `Updated roles for user ${variables.userId}`,
          metadata: {
            roles: variables.roles.join(', '),
            role_count: variables.roles.length,
          },
          severity: 'critical',
        }
      );
      
      toast({
        title: "Success",
        description: "User roles updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update roles: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};