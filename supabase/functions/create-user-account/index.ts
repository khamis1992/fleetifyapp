import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserAccountRequest {
  employee_id: string;
  first_name: string;
  last_name: string;
  first_name_ar?: string;
  last_name_ar?: string;
  email: string;
  roles: string[];
  company_id: string;
  notes?: string;
  temporary_password?: string;
}

const generateTemporaryPassword = (): string => {
  // Return simple default password for easier onboarding
  return "123456";
};

const assignRolesAndCreateRecord = async (
  supabaseClient: any,
  userId: string | undefined,
  roles: string[],
  employeeId: string,
  companyId: string,
  requestedBy: string,
  notes?: string,
  temporaryPassword?: string,
  passwordExpiresAt?: string
) => {
  try {
    console.log('Assigning roles and creating record for user:', userId);
    
    // Clear existing roles for this user first
    const { error: deleteError } = await supabaseClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error clearing existing roles:', deleteError);
      // Don't fail here, user might not have existing roles
    }

    // Assign new roles to user
    if (roles && roles.length > 0 && userId) {
      const roleInserts = roles.map(role => ({
        user_id: userId,
        role: role
      }));

      console.log('Inserting roles:', roleInserts);
      const { error: rolesError } = await supabaseClient
        .from('user_roles')
        .insert(roleInserts);

      if (rolesError) {
        console.error('Error assigning roles:', rolesError);
        return { success: false, error: `Failed to assign roles: ${rolesError.message}` };
      }
      console.log('Roles assigned successfully');
    }

    // Create account creation request record
    const requestRecord = {
      employee_id: employeeId,
      company_id: companyId,
      requested_by: requestedBy,
      requested_roles: roles,
      notes: notes || 'Direct user creation',
      status: 'approved',
      direct_creation: true,
      temporary_password: temporaryPassword,
      password_expires_at: passwordExpiresAt,
      processed_at: new Date().toISOString(),
      processed_by: requestedBy
    };

    console.log('Creating account request record:', requestRecord);
    const { data: requestData, error: requestError } = await supabaseClient
      .from('account_creation_requests')
      .insert(requestRecord)
      .select()
      .single();

    if (requestError) {
      console.error('Error creating request record:', requestError);
      return { success: false, error: `Failed to create request record: ${requestError.message}` };
    }

    console.log('Account request record created successfully');
    return { success: true, data: requestData };
  } catch (error) {
    console.error('Error in assignRolesAndCreateRecord:', error);
    return { success: false, error: error.message };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      employee_id,
      first_name,
      last_name,
      first_name_ar,
      last_name_ar,
      email,
      roles,
      company_id,
      notes,
      temporary_password
    }: CreateUserAccountRequest = await req.json();

    console.log('Creating user account for:', email);
    console.log('Request data:', { employee_id, first_name, last_name, email, company_id, roles });

    // Validate required fields
    if (!employee_id || !company_id || !email || !first_name || !last_name) {
      throw new Error('Missing required fields: employee_id, company_id, email, first_name, and last_name are required');
    }

    if (!roles || roles.length === 0) {
      throw new Error('At least one role must be specified');
    }
    
    // Validate company_id format
    if (typeof company_id !== 'string' || company_id === 'undefined' || company_id === 'null') {
      throw new Error('Invalid company_id format');
    }
    
    // Validate employee_id format
    if (typeof employee_id !== 'string' || employee_id === 'undefined' || employee_id === 'null') {
      throw new Error('Invalid employee_id format');
    }

    // Verify the company exists
    const { data: companyData, error: companyError } = await supabaseClient
      .from('companies')
      .select('id')
      .eq('id', company_id)
      .single();

    if (companyError || !companyData) {
      throw new Error('Invalid company_id');
    }

    // Get current user's roles to verify permissions
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: tokenData, error: tokenError } = await supabaseClient.auth.getUser(token);
    
    if (tokenError || !tokenData.user) {
      throw new Error('Invalid authentication token');
    }
    
    const { data: currentUserRoles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', tokenData.user.id);
      
    if (rolesError) {
      throw new Error('Failed to check user permissions');
    }
    
    console.log('Current user roles:', currentUserRoles);
    
    if (!currentUserRoles || currentUserRoles.length === 0) {
      console.error('No roles found for user:', tokenData.user.id);
      throw new Error('Permission denied: User has no role assigned');
    }
    
    const isSuperAdmin = currentUserRoles?.some(r => r.role === 'super_admin');
    const isCompanyAdmin = currentUserRoles?.some(r => r.role === 'company_admin');
    const isManager = currentUserRoles?.some(r => r.role === 'manager');
    
    console.log('User permissions:', { isSuperAdmin, isCompanyAdmin, isManager });
    
    if (!isSuperAdmin && !isCompanyAdmin && !isManager) {
      throw new Error('Permission denied: Insufficient privileges to create user accounts');
    }
    
    // Check if employee already exists for this company
    const { data: employeeData, error: employeeCheckError } = await supabaseClient
      .from('employees')
      .select('user_id, has_system_access, company_id, email')
      .eq('id', employee_id)
      .single();

    if (employeeCheckError) {
      throw new Error(`Failed to check employee data: ${employeeCheckError.message}`);
    }

    // Enhanced Scenario 1: Check for incomplete accounts first
    if (employeeData.user_id && employeeData.has_system_access) {
      // Check if this is an incomplete account (user exists but missing roles/profile)
      const { data: userRoles, error: rolesCheckError } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', employeeData.user_id);

      const { data: userProfile, error: profileCheckError } = await supabaseClient
        .from('profiles')
        .select('company_id, is_active')
        .eq('user_id', employeeData.user_id)
        .maybeSingle();

      const hasRoles = userRoles && userRoles.length > 0;
      const hasValidProfile = userProfile && userProfile.company_id && userProfile.is_active;

      if (!hasRoles || !hasValidProfile) {
        console.log('Detected incomplete account, attempting to complete it');
        
        // Verify the auth user still exists
        const { data: authUser, error: authUserError } = await supabaseClient.auth.admin.getUserById(employeeData.user_id);
        
        if (authUserError || !authUser.user) {
          console.log('Auth user does not exist, cleaning up orphaned employee record');
          // Clean up the employee record by removing the user_id
          await supabaseClient
            .from('employees')
            .update({ user_id: null, has_system_access: false })
            .eq('id', employee_id);
          
          // Continue to create new user section
        } else {
          // Complete the incomplete account
          console.log('Auth user exists, completing profile setup');
          
          // Generate new temporary password for the completed account
          const tempPassword = temporary_password || generateTemporaryPassword();
          const passwordExpiresAt = new Date();
          passwordExpiresAt.setDate(passwordExpiresAt.getDate() + 7);

          // Update user's password and metadata
          const { error: passwordError } = await supabaseClient.auth.admin.updateUserById(
            employeeData.user_id,
            {
              password: tempPassword,
              user_metadata: {
                first_name,
                last_name,
                first_name_ar,
                last_name_ar,
                requires_password_change: true
              }
            }
          );

          if (passwordError) {
            console.error('Error updating password for completed account:', passwordError);
          }

          // Create or update profile if missing
          if (!hasValidProfile) {
            const { error: profileError } = await supabaseClient
              .from('profiles')
              .upsert({
                user_id: employeeData.user_id,
                first_name,
                last_name,
                first_name_ar,
                last_name_ar,
                email,
                company_id,
                is_active: true
              }, {
                onConflict: 'user_id'
              });

            if (profileError) {
              console.error('Error creating/updating profile:', profileError);
              throw new Error(`Failed to create profile: ${profileError.message}`);
            }
          }

          // Clear existing roles and assign new ones if missing
          if (!hasRoles) {
            await supabaseClient
              .from('user_roles')
              .delete()
              .eq('user_id', employeeData.user_id);

            if (roles && roles.length > 0) {
              const roleInserts = roles.map(role => ({
                user_id: employeeData.user_id,
                role: role
              }));

              const { error: rolesError } = await supabaseClient
                .from('user_roles')
                .insert(roleInserts);

              if (rolesError) {
                console.error('Error assigning roles:', rolesError);
                throw new Error(`Failed to assign roles: ${rolesError.message}`);
              }
            }
          }

          // Create account creation request record
          const roleResult = await assignRolesAndCreateRecord(
            supabaseClient, 
            employeeData.user_id, 
            roles, 
            employee_id, 
            company_id, 
            tokenData.user.id,
            notes || 'Account completion', 
            tempPassword, 
            passwordExpiresAt.toISOString()
          );

          return new Response(
            JSON.stringify({
              success: true,
              user_id: employeeData.user_id,
              message: 'Incomplete account completed successfully',
              account_completed: true,
              temporary_password: tempPassword,
              password_expires_at: passwordExpiresAt.toISOString()
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        }
      } else {
        // If account is complete and for the same company, it's truly a duplicate
        if (employeeData.company_id === company_id) {
          throw new Error('Employee already has a complete system account for this company');
        }
      }
    }

    // Check if a user with this email already exists in auth
    const { data: existingUsers, error: checkError } = await supabaseClient.auth.admin.listUsers();
    
    if (checkError) {
      console.error('Error checking existing users:', checkError);
      throw new Error(`Failed to check existing users: ${checkError.message}`);
    }

    const existingUser = existingUsers.users.find(u => u.email === email);

    // Scenario 2: User exists with this email but employee doesn't have system access yet
    if (existingUser) {
      console.log('User with email exists, linking to employee');
      
      // If employee has system access for a different company, verify super admin permissions
      if (employeeData.user_id && employeeData.has_system_access && employeeData.company_id !== company_id) {
        if (!isSuperAdmin) {
          throw new Error('Only super admins can reassign employees with existing system access to different companies');
        }
        console.log('Super admin reassigning employee with existing system access to new company');
      }

      // Generate temporary password for existing user
      const tempPassword = temporary_password || generateTemporaryPassword();
      const passwordExpiresAt = new Date();
      passwordExpiresAt.setDate(passwordExpiresAt.getDate() + 7);

      // Update existing user's password and metadata
      const { error: passwordError } = await supabaseClient.auth.admin.updateUserById(
        existingUser.id,
        {
          password: tempPassword,
          user_metadata: {
            ...existingUser.user_metadata,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            requires_password_change: true
          }
        }
      );

      if (passwordError) {
        console.error('Error updating user password:', passwordError);
        throw new Error(`Failed to update user password: ${passwordError.message}`);
      }

      // Link existing user to employee
      const { error: linkError } = await supabaseClient
        .from('employees')
        .update({
          user_id: existingUser.id,
          has_system_access: true,
          account_status: 'active'
        })
        .eq('id', employee_id);

      if (linkError) {
        throw new Error(`Failed to link existing user to employee: ${linkError.message}`);
      }

      // Update or create profile
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert({
          user_id: existingUser.id,
          first_name,
          last_name,
          first_name_ar,
          last_name_ar,
          email,
          company_id,
          is_active: true
        }, {
          onConflict: 'user_id'
        });

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw new Error(`Failed to update profile: ${profileError.message}`);
      }

      // Clear existing roles for this user and assign new ones
      await supabaseClient
        .from('user_roles')
        .delete()
        .eq('user_id', existingUser.id);

      const roleResult = await assignRolesAndCreateRecord(
        supabaseClient, 
        existingUser.id, 
        roles, 
        employee_id, 
        company_id, 
        tokenData.user.id, // requested_by
        notes, 
        tempPassword, 
        passwordExpiresAt.toISOString()
      );

      if (!roleResult.success) {
        throw new Error(roleResult.error);
      }

      return new Response(
        JSON.stringify({
          success: true,
          user_id: existingUser.id,
          message: 'Existing user linked to employee account',
          linked_existing_user: true,
          temporary_password: tempPassword,
          password_expires_at: passwordExpiresAt.toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Scenario 3: No user exists with this email - create completely new user
    console.log('Creating completely new user account');

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword();
    const passwordExpiresAt = new Date();
    passwordExpiresAt.setDate(passwordExpiresAt.getDate() + 7); // Expires in 7 days

    // Create user account using admin API
    const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
      email: email,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: first_name,
        last_name: last_name,
        first_name_ar: first_name_ar,
        last_name_ar: last_name_ar,
        requires_password_change: true
      }
    });

    if (userError) {
      console.error('Error creating user:', userError);
      throw new Error(`Failed to create user: ${userError.message}`);
    }

    console.log('User created successfully:', userData.user?.id);

    // Update employee record with user_id and system access
    const { error: employeeError } = await supabaseClient
      .from('employees')
      .update({
        user_id: userData.user?.id,
        has_system_access: true,
        account_status: 'active'
      })
      .eq('id', employee_id);

    if (employeeError) {
      console.error('Error updating employee:', employeeError);
      throw new Error(`Failed to update employee: ${employeeError.message}`);
    }

    // Create user profile - use upsert to handle duplicates
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert({
        user_id: userData.user?.id,
        first_name: first_name,
        last_name: last_name,
        first_name_ar: first_name_ar,
        last_name_ar: last_name_ar,
        email: email,
        company_id: company_id,
        is_active: true
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('Error creating/updating profile:', profileError);
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    // Assign roles and create request record
    const roleResult = await assignRolesAndCreateRecord(
      supabaseClient, 
      userData.user?.id, 
      roles, 
      employee_id, 
      company_id, 
      tokenData.user.id, // requested_by
      notes, 
      temporaryPassword, 
      passwordExpiresAt.toISOString()
    );

    if (!roleResult.success) {
      throw new Error(roleResult.error);
    }

    console.log('Account creation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userData.user?.id,
        temporary_password: temporaryPassword,
        password_expires_at: passwordExpiresAt.toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in create-user-account function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});