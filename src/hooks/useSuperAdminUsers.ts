import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SuperAdminUser {
  id: string;
  email: string;
  created_at: string;
  profiles?: {
    id: string;
    first_name?: string;
    last_name?: string;
    first_name_ar?: string;
    last_name_ar?: string;
    company_id?: string;
    companies?: {
      id: string;
      name: string;
      name_ar?: string;
    };
  };
  user_roles?: Array<{
    id: string;
    role: string;
  }>;
}

export interface Company {
  id: string;
  name: string;
  name_ar?: string;
}

export interface CreateUserData {
  email: string;
  first_name: string;
  last_name: string;
  first_name_ar?: string;
  last_name_ar?: string;
  company_id: string;
  roles: string[];
  temporary_password?: string;
}

export const useSuperAdminUsers = () => {
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Fetch all users with their profiles and roles
  const fetchUsers = async () => {
    try {
      // Get auth users data first
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Error fetching auth users:', authError);
        throw authError;
      }

      // Get all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          companies (
            id,
            name,
            name_ar
          )
        `)
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Get all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        throw rolesError;
      }

      // Combine auth users with profiles and roles
      const combinedUsers: SuperAdminUser[] = authUsers.users.map(authUser => {
        const profile = profilesData?.find(p => p.user_id === authUser.id);
        const userRoles = rolesData?.filter(r => r.user_id === authUser.id) || [];
        
        return {
          id: authUser.id,
          email: authUser.email || '',
          created_at: authUser.created_at,
          profiles: profile || undefined,
          user_roles: userRoles.map(role => ({
            id: role.id,
            role: role.role
          }))
        };
      });

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل بيانات المستخدمين',
        variant: 'destructive',
      });
    }
  };

  // Fetch all companies
  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, name_ar')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل بيانات الشركات',
        variant: 'destructive',
      });
    }
  };

  // Create new user
  const createUser = async (userData: CreateUserData) => {
    setIsCreating(true);
    try {
      // Validate required fields
      if (!userData.company_id) {
        throw new Error('يجب تحديد الشركة');
      }
      
      if (!userData.email) {
        throw new Error('يجب تحديد البريد الإلكتروني');
      }
      
      if (!userData.first_name || !userData.last_name) {
        throw new Error('يجب تحديد الاسم الأول واسم العائلة');
      }
      
      if (!userData.roles || userData.roles.length === 0) {
        throw new Error('يجب تحديد دور واحد على الأقل');
      }
      // Find employee by email to link account
      const { data: employees, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', userData.email)
        .eq('company_id', userData.company_id)
        .single();

      if (employeeError && employeeError.code !== 'PGRST116') {
        throw new Error('خطأ في البحث عن الموظف');
      }

      let employeeId = employees?.id;

      // If no employee found, create one
      if (!employees) {
        const { data: newEmployee, error: createEmployeeError } = await supabase
          .from('employees')
          .insert({
            company_id: userData.company_id,
            first_name: userData.first_name,
            last_name: userData.last_name,
            first_name_ar: userData.first_name_ar,
            last_name_ar: userData.last_name_ar,
            email: userData.email,
            employee_number: `EMP-${Date.now()}`,
            hire_date: new Date().toISOString().split('T')[0],
            basic_salary: 0,
            is_active: true
          })
          .select()
          .single();

        if (createEmployeeError) throw createEmployeeError;
        employeeId = newEmployee.id;
      }

      // Call edge function to create user account
      const { data, error } = await supabase.functions.invoke('create-user-account', {
        body: {
          employee_id: employeeId,
          first_name: userData.first_name,
          last_name: userData.last_name,
          first_name_ar: userData.first_name_ar,
          last_name_ar: userData.last_name_ar,
          email: userData.email,
          company_id: userData.company_id,
          roles: userData.roles,
          temporary_password: userData.temporary_password || 'TempPassword123!'
        }
      });

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: `تم إنشاء حساب المستخدم بنجاح. كلمة المرور المؤقتة: ${data.temporary_password}`,
      });

      // Refresh users list
      await fetchUsers();
      
      return data;
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في إنشاء المستخدم',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  // Update user roles
  const updateUserRoles = async (userId: string, roles: string[]) => {
    setIsUpdating(true);
    try {
      // Delete existing roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new roles
      if (roles.length > 0) {
        const roleInserts = roles.map(role => ({ 
          user_id: userId, 
          role: role as 'super_admin' | 'company_admin' | 'manager' | 'accountant' | 'fleet_manager' | 'sales_agent' | 'employee'
        }));
        
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(roleInserts);

        if (insertError) throw insertError;
      }

      toast({
        title: 'تم بنجاح',
        description: 'تم تحديث أدوار المستخدم بنجاح',
      });

      // Refresh users list
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user roles:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث أدوار المستخدم',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    setIsDeleting(true);
    try {
      // Delete from auth (this will cascade to profiles and user_roles due to foreign keys)
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تم حذف المستخدم بنجاح',
      });

      // Refresh users list
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف المستخدم',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchUsers(), fetchCompanies()]);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  return {
    users,
    companies,
    loading,
    createUser,
    updateUserRoles,
    deleteUser,
    isCreating,
    isUpdating,
    isDeleting,
    refetch: () => Promise.all([fetchUsers(), fetchCompanies()])
  };
};