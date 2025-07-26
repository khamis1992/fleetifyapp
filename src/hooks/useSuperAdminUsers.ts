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
  employee_id?: string;
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
      // Get all profiles with companies and user roles in a single query
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          user_id,
          email,
          created_at,
          first_name,
          last_name,
          first_name_ar,
          last_name_ar,
          company_id,
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

      // Combine profiles with roles
      const combinedUsers: SuperAdminUser[] = (profilesData || []).map(profile => {
        const userRoles = rolesData?.filter(r => r.user_id === profile.user_id) || [];
        
        return {
          id: profile.user_id,
          email: profile.email || '',
          created_at: profile.created_at,
          profiles: {
            id: profile.user_id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            first_name_ar: profile.first_name_ar,
            last_name_ar: profile.last_name_ar,
            company_id: profile.company_id,
            companies: profile.companies
          },
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
        description: 'فشل في تحميل بيانات المستخدمين. يرجى التحقق من صلاحياتك والمحاولة مرة أخرى.',
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
      console.log('=== FRONTEND: Creating user with data ===', userData);
      
      // Validate input data before sending to edge function
      if (!userData.first_name || !userData.last_name || !userData.email || !userData.company_id || !userData.roles?.length) {
        throw new Error('Missing required fields. Please fill in all required information.');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        throw new Error('Please enter a valid email address.');
      }

      // Find employee by email to link account or use provided employee_id
      let employeeId = userData.employee_id;
      
      if (!employeeId) {
        console.log('No employee_id provided, searching by email...');
        const { data: employees, error: employeeError } = await supabase
          .from('employees')
          .select('*')
          .eq('email', userData.email)
          .eq('company_id', userData.company_id)
          .single();

        if (employeeError && employeeError.code !== 'PGRST116') {
          throw new Error('Error searching for employee. Please try again.');
        }

        if (!employees) {
          // Create new employee if none found
          console.log('Creating new employee...');
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

          if (createEmployeeError) {
            console.error('Error creating employee:', createEmployeeError);
            throw new Error('Failed to create employee record. Please try again.');
          }
          employeeId = newEmployee.id;
          console.log('New employee created:', newEmployee);
        } else {
          employeeId = employees.id;
          console.log('Found existing employee:', employees);
          
          // Check if employee already has system access
          if (employees.has_system_access && employees.user_id) {
            throw new Error('This employee already has a system account. Please select a different employee.');
          }
        }
      }

      // Call the edge function with proper error handling
      console.log('Calling create-user-account edge function...');
      const { data: result, error: functionError } = await supabase.functions.invoke('create-user-account', {
        body: {
          employee_id: employeeId,
          first_name: userData.first_name,
          last_name: userData.last_name,
          first_name_ar: userData.first_name_ar,
          last_name_ar: userData.last_name_ar,
          email: userData.email,
          company_id: userData.company_id,
          roles: userData.roles,
          temporary_password: userData.temporary_password
        }
      });

      console.log('Edge function response:', { result, functionError });

      // Handle edge function errors
      if (functionError) {
        console.error('Edge function error:', functionError);
        
        // Check if it's a network/connection error
        if (functionError.message?.includes('fetch')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        }
        
        // Check if it's an authentication error
        if (functionError.message?.includes('auth') || functionError.message?.includes('401')) {
          throw new Error('Authentication error. Please refresh the page and try again.');
        }
        
        throw new Error(functionError.message || 'Failed to create user account due to a server error.');
      }

      // Handle business logic errors from the edge function
      if (!result?.success) {
        console.error('Edge function returned error:', result);
        
        const errorMessage = result?.error || 'Unknown error occurred while creating the user.';
        
        // Provide more user-friendly error messages
        if (errorMessage.includes('already has a complete system account')) {
          throw new Error('This employee already has a complete system account for this company.');
        }
        
        if (errorMessage.includes('already has a system account')) {
          throw new Error('This employee has an incomplete account. The system will attempt to complete it automatically.');
        }
        
        if (errorMessage.includes('email is already linked')) {
          throw new Error('This email address is already linked to another employee in this company.');
        }
        
        if (errorMessage.includes('company not found')) {
          throw new Error('The selected company was not found. Please refresh the page and try again.');
        }
        
        if (errorMessage.includes('employee not found')) {
          throw new Error('The selected employee was not found. Please refresh the page and try again.');
        }
        
        if (errorMessage.includes('permissions')) {
          throw new Error('You do not have sufficient permissions to create users for this company.');
        }
        
        throw new Error(errorMessage);
      }

      console.log('User created successfully:', result);
      
      // Refresh the users list to show the new user
      await fetchUsers();
      
      // Show success message with appropriate details based on operation type
      let successMessage = 'User account processed successfully.';
      
      if (result.account_completed) {
        successMessage = `Incomplete account completed successfully. Temporary password: ${result.temporary_password}`;
      } else if (result.linked_existing_user) {
        successMessage = `Existing user linked to employee. Temporary password: ${result.temporary_password}`;
      } else if (result.temporary_password) {
        successMessage = `New user account created successfully. Temporary password: ${result.temporary_password}`;
      }
      
      toast({
        title: "Success",
        description: successMessage,
      });
      
      return result;
      
    } catch (error: any) {
      console.error('=== FRONTEND ERROR CREATING USER ===');
      console.error('Error details:', error);
      
      // Show user-friendly error message
      const errorMessage = error.message || "An unexpected error occurred while creating the user. Please try again.";
      
      toast({
        title: "Error Creating User",
        description: errorMessage,
        variant: "destructive",
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
      // Delete user profile (this will cascade to related data)
      // Note: We can't delete from auth.users directly without admin privileges
      // So we'll just delete the profile and roles, which effectively removes user access
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Delete user roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (rolesError) throw rolesError;

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