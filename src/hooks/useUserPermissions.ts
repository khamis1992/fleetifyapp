import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/permissions';
import { useToast } from '@/hooks/use-toast';
import { SecurityValidator } from '@/lib/security';

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

      // Validate userId format
      if (!userId || !SecurityValidator.validateInput(userId, 'User ID', 36).isValid) {
        throw new Error('Invalid user ID format');
      }

      // Check rate limiting for permission updates
      const { data: rateLimitOk, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
        operation_type: 'permission_update',
        max_attempts: 10,
        window_minutes: 5
      });

      if (rateLimitError || !rateLimitOk) {
        throw new Error('Rate limit exceeded for permission updates');
      }

      // Validate permissions array
      if (!Array.isArray(permissions) || permissions.length > 50) {
        throw new Error('Invalid permissions data');
      }

      // Log security event for permission changes
      await supabase.rpc('log_security_event', {
        event_type: 'permissions_updated',
        resource_type: 'user_permissions',
        resource_id: userId,
        details: {
          permissions_count: permissions.length,
          granted_count: permissions.filter(p => p.granted).length
        }
      });

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['employees-with-access'] });
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
      
      // Validate userId format
      if (!userId || !SecurityValidator.validateInput(userId, 'User ID', 36).isValid) {
        throw new Error('Invalid user ID format');
      }

      // Validate roles array
      const validRoles: UserRole[] = ['super_admin', 'company_admin', 'manager', 'sales_agent', 'employee'];
      const invalidRoles = roles.filter(role => !validRoles.includes(role));
      if (invalidRoles.length > 0) {
        throw new Error(`Invalid roles: ${invalidRoles.join(', ')}`);
      }

      // Check rate limiting for role updates
      const { data: rateLimitOk, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
        operation_type: 'role_update',
        max_attempts: 5,
        window_minutes: 5
      });

      if (rateLimitError || !rateLimitOk) {
        throw new Error('Rate limit exceeded for role updates');
      }

      // Log security event for role changes
      await supabase.rpc('log_security_event', {
        event_type: 'roles_updated',
        resource_type: 'user_roles',
        resource_id: userId,
        details: {
          new_roles: roles,
          roles_count: roles.length
        }
      });
      
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
          role,
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['employees-with-access'] });
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