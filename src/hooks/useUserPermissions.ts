import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/permissions';
import { useToast } from '@/hooks/use-toast';

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
      // Delete existing roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Insert new roles
      if (roles.length > 0) {
        const rolesToInsert = roles.map(role => ({
          user_id: userId,
          role,
        }));

        const { error } = await supabase
          .from('user_roles')
          .insert(rolesToInsert);
        
        if (error) throw error;
      }
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