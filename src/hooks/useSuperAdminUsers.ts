import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fixOrphanedUsers } from '@/utils/fix-orphaned-users';

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
  orphaned_employee?: {
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

export interface ResetPasswordData {
  user_id: string;
  new_password: string;
}

export const useSuperAdminUsers = () => {
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isFixingOrphans, setIsFixingOrphans] = useState(false);
  const { toast } = useToast();

  // Fetch all users with their profiles and roles, including orphaned users
  const fetchUsers = async () => {
    try {
      // First, get all users from auth.users through employees table (for orphaned users)
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select(`
          user_id,
          email,
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
        .not('user_id', 'is', null);

      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
      }

      // Get all profiles with companies
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
          is_active,
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

      // Combine all users - start with profiles, then add orphaned users
      const userMap = new Map<string, SuperAdminUser>();

      // Add users with profiles
      (profilesData || []).forEach(profile => {
        const userRoles = rolesData?.filter(r => r.user_id === profile.user_id) || [];
        
        userMap.set(profile.user_id, {
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
        });
      });

      // Add orphaned users (employees with user_id but no profile)
      (employeesData || []).forEach(employee => {
        if (!userMap.has(employee.user_id)) {
          const userRoles = rolesData?.filter(r => r.user_id === employee.user_id) || [];
          
          userMap.set(employee.user_id, {
            id: employee.user_id,
            email: employee.email || '',
            created_at: new Date().toISOString(), // Default for orphaned users
            profiles: undefined, // No profile exists
            user_roles: userRoles.map(role => ({
              id: role.id,
              role: role.role
            })),
            // Add orphaned user info
            orphaned_employee: {
              first_name: employee.first_name,
              last_name: employee.last_name,
              first_name_ar: employee.first_name_ar,
              last_name_ar: employee.last_name_ar,
              company_id: employee.company_id,
              companies: employee.companies
            }
          });
        }
      });

      const combinedUsers = Array.from(userMap.values());
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

      // Enhanced employee checking with proper completion logic
      let employeeId = userData.employee_id;
      
      if (!employeeId) {
        console.log('No employee_id provided, searching by email...');
        
        // First, check for complete employees (with profiles)
        const { data: completeEmployee, error: completeCheckError } = await supabase
          .from('employees')
          .select(`
            id,
            user_id,
            email,
            first_name,
            last_name,
            has_system_access
          `)
          .eq('email', userData.email)
          .eq('company_id', userData.company_id)
          .not('user_id', 'is', null)
          .maybeSingle();

        if (completeCheckError && completeCheckError.code !== 'PGRST116') {
          console.error('Error checking for complete employee:', completeCheckError);
          throw new Error('Error checking for existing employee. Please try again.');
        }

        // If employee with user_id exists, check if they have a complete profile
        if (completeEmployee && completeEmployee.user_id) {
          const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, is_active')
            .eq('user_id', completeEmployee.user_id)
            .maybeSingle();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error checking profile:', profileError);
            throw new Error('Error verifying user account status. Please try again.');
          }

          if (existingProfile) {
            throw new Error('An active user with this email already exists in this company.');
          }
        }

        // Check for incomplete employees (have user_id but no profile)
        const { data: incompleteEmployee, error: incompleteCheckError } = await supabase
          .from('employees')
          .select(`
            id, 
            user_id, 
            email, 
            first_name, 
            last_name,
            has_system_access
          `)
          .eq('email', userData.email)
          .eq('company_id', userData.company_id)
          .not('user_id', 'is', null)
          .maybeSingle();

        if (incompleteCheckError && incompleteCheckError.code !== 'PGRST116') {
          console.error('Error checking for incomplete employee:', incompleteCheckError);
        }

        // If incomplete employee exists, we'll complete their setup via edge function
        if (incompleteEmployee) {
          console.log('Found incomplete employee record, will complete setup...', incompleteEmployee);
          employeeId = incompleteEmployee.id;
        } else {
          // Check for any employee with this email (could be without user_id)
          const { data: anyEmployee, error: anyEmployeeError } = await supabase
            .from('employees')
            .select('id, user_id, email, first_name, last_name, has_system_access')
            .eq('email', userData.email)
            .eq('company_id', userData.company_id)
            .maybeSingle();

          if (anyEmployeeError && anyEmployeeError.code !== 'PGRST116') {
            throw new Error('Error searching for employee. Please try again.');
          }

          if (anyEmployee) {
            if (anyEmployee.has_system_access && anyEmployee.user_id) {
              throw new Error('This employee already has a system account. Please select a different employee.');
            }
            employeeId = anyEmployee.id;
            console.log('Found existing employee without complete system access:', anyEmployee);
          } else {
            // Create new employee if none found
            console.log('Creating new employee...');
            
            // Generate a unique employee number using UUID suffix for better uniqueness
            const uniqueSuffix = Math.random().toString(36).substr(2, 8).toUpperCase();
            const employeeNumber = `EMP-${new Date().getFullYear()}-${uniqueSuffix}`;
            
            console.log('Generated employee number:', employeeNumber);
            console.log('Employee data to insert:', {
              company_id: userData.company_id,
              first_name: userData.first_name,
              last_name: userData.last_name,
              first_name_ar: userData.first_name_ar,
              last_name_ar: userData.last_name_ar,
              email: userData.email,
              employee_number: employeeNumber
            });

            const { data: newEmployee, error: createEmployeeError } = await supabase
              .from('employees')
              .insert({
                company_id: userData.company_id,
                first_name: userData.first_name,
                last_name: userData.last_name,
                first_name_ar: userData.first_name_ar,
                last_name_ar: userData.last_name_ar,
                email: userData.email,
                employee_number: employeeNumber,
                hire_date: new Date().toISOString().split('T')[0],
                basic_salary: 0,
                is_active: true
              })
              .select()
              .single();

            if (createEmployeeError) {
              console.error('Error creating employee:', createEmployeeError);
              console.error('Error code:', createEmployeeError.code);
              console.error('Error details:', createEmployeeError.details);
              console.error('Error hint:', createEmployeeError.hint);
              
              // Enhanced error handling for specific database errors
              if (createEmployeeError.code === '23505') {
                if (createEmployeeError.message?.includes('employees_email_unique')) {
                  throw new Error('An employee with this email already exists in this company. Please use a different email address.');
                } else if (createEmployeeError.message?.includes('employee_number')) {
                  // Retry with a different employee number
                  console.log('Employee number conflict, retrying with new number...');
                  const retryEmployeeNumber = `EMP-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 10).toUpperCase()}`;
                  
                  const { data: retryEmployee, error: retryError } = await supabase
                    .from('employees')
                    .insert({
                      company_id: userData.company_id,
                      first_name: userData.first_name,
                      last_name: userData.last_name,
                      first_name_ar: userData.first_name_ar,
                      last_name_ar: userData.last_name_ar,
                      email: userData.email,
                      employee_number: retryEmployeeNumber,
                      hire_date: new Date().toISOString().split('T')[0],
                      basic_salary: 0,
                      is_active: true
                    })
                    .select()
                    .single();

                  if (retryError) {
                    console.error('Retry also failed:', retryError);
                    throw new Error('Failed to create employee record due to data conflicts. Please try again.');
                  }
                  
                  employeeId = retryEmployee.id;
                  console.log('Employee created on retry:', retryEmployee);
                } else {
                  throw new Error('An employee with similar details already exists. Please check the data and try again.');
                }
              } else if (createEmployeeError.code === '23503') {
                throw new Error('Invalid company selected. Please refresh the page and try again.');
              } else if (createEmployeeError.code === '42501') {
                throw new Error('You do not have permission to create employees for this company.');
              } else {
                throw new Error(`Failed to create employee record: ${createEmployeeError.message || 'Unknown database error'}`);
              }
            } else {
              employeeId = newEmployee.id;
              console.log('New employee created:', newEmployee);
            }
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

  // Reset user password
  const resetUserPassword = async (userData: ResetPasswordData) => {
    setIsResettingPassword(true);
    try {
      console.log('Resetting password for user:', userData.user_id);
      
      const { data: result, error: functionError } = await supabase.functions.invoke('reset-user-password', {
        body: userData
      });

      if (functionError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Edge function error:', functionError);
        }
        throw new Error(functionError.message || 'Failed to reset password');
      }

      if (!result?.success) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Password reset failed:', result);
        }
        throw new Error(result?.error || 'Failed to reset password');
      }

      toast({
        title: 'تم بنجاح',
        description: 'تم تغيير كلمة المرور بنجاح',
      });

      return result;
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error resetting password:', error);
      }
      
      let errorMessage = 'فشل في تغيير كلمة المرور';
      if (error.message?.includes('6 characters')) {
        errorMessage = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
      } else if (error.message?.includes('permissions')) {
        errorMessage = 'ليس لديك صلاحية لتغيير كلمة المرور';
      } else if (error.message?.includes('not found')) {
        errorMessage = 'المستخدم غير موجود';
      }
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsResettingPassword(false);
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

  // Fix orphaned users utility function
  const fixOrphanedUsersForCompany = async (companyId: string) => {
    setIsFixingOrphans(true);
    try {
      const result = await fixOrphanedUsers(companyId);
      
      if (result.fixed > 0) {
        toast({
          title: 'تم إصلاح السجلات',
          description: `تم إصلاح ${result.fixed} من سجلات المستخدمين المتضررة`,
        });
        
        // Refresh data after fixing
        await Promise.all([fetchUsers(), fetchCompanies()]);
      } else {
        toast({
          title: 'لا توجد سجلات متضررة',
          description: 'جميع سجلات المستخدمين سليمة',
        });
      }
      
      if (result.errors.length > 0) {
        console.error('Fix errors:', result.errors);
        toast({
          title: 'تحذير',
          description: `تم إصلاح ${result.fixed} سجل مع ${result.errors.length} أخطاء`,
          variant: 'destructive',
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error fixing orphaned users:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إصلاح السجلات المتضررة',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsFixingOrphans(false);
    }
  };

  return {
    users,
    companies,
    loading,
    createUser,
    updateUserRoles,
    deleteUser,
    resetUserPassword,
    isCreating,
    isUpdating,
    isDeleting,
    isResettingPassword,
    isFixingOrphans,
    refetch: () => Promise.all([fetchUsers(), fetchCompanies()]),
    fixOrphanedUsers: fixOrphanedUsersForCompany,
  };
};