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
  notes?: string,
  temporaryPassword?: string,
  passwordExpiresAt?: string
) => {
  // Assign roles to user
  if (roles && roles.length > 0 && userId) {
    const roleInserts = roles.map(role => ({
      user_id: userId,
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

  // Create account creation request record
  const { data: requestData, error: requestError } = await supabaseClient
    .from('account_creation_requests')
    .insert({
      employee_id: employeeId,
      company_id: companyId,
      requested_by: userId, // Use the created user ID as the requester for consistency
      requested_roles: roles,
      notes,
      status: 'approved',
      direct_creation: true,
      temporary_password: temporaryPassword,
      password_expires_at: passwordExpiresAt,
      processed_at: new Date().toISOString()
    })
    .select()
    .single();

  if (requestError) {
    console.error('Error creating request record:', requestError);
    throw new Error(`Failed to create request record: ${requestError.message}`);
  }

  return requestData;
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

    // Check if user already exists in auth
    const { data: existingUsers, error: checkError } = await supabaseClient.auth.admin.listUsers();
    
    if (checkError) {
      console.error('Error checking existing users:', checkError);
      throw new Error(`Failed to check existing users: ${checkError.message}`);
    }

    const existingUser = existingUsers.users.find(u => u.email === email);
    
    if (existingUser) {
      // User already exists, check if they're linked to this employee
      const { data: employeeData, error: employeeCheckError } = await supabaseClient
        .from('employees')
        .select('user_id, has_system_access, company_id')
        .eq('id', employee_id)
        .single();

      if (employeeCheckError) {
        throw new Error(`Failed to check employee data: ${employeeCheckError.message}`);
      }

      // Check if this employee already has system access for the SAME company
      if (employeeData.user_id && employeeData.has_system_access && employeeData.company_id === company_id) {
        throw new Error('Employee already has a system account for this company');
      }

      // If employee has system access for a different company, we need to check if this is a super admin request
      if (employeeData.user_id && employeeData.has_system_access && employeeData.company_id !== company_id) {
        // Get current user's roles to check if they're super admin
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
        
        const isSuperAdmin = currentUserRoles?.some(r => r.role === 'super_admin');
        
        if (!isSuperAdmin) {
          throw new Error('Only super admins can assign existing employees to different companies');
        }
        
        console.log('Super admin creating user for different company - this is allowed');
      }

      // Generate temporary password for existing user linking
      const temporaryPassword = generateTemporaryPassword();
      const passwordExpiresAt = new Date();
      passwordExpiresAt.setDate(passwordExpiresAt.getDate() + 7); // Expires in 7 days

      // Update existing user's password
      const { error: passwordError } = await supabaseClient.auth.admin.updateUserById(
        existingUser.id,
        {
          password: temporaryPassword,
          user_metadata: {
            ...existingUser.user_metadata,
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

      // Assign roles and create request record with password info
      await assignRolesAndCreateRecord(
        supabaseClient, 
        existingUser.id, 
        roles, 
        employee_id, 
        company_id, 
        notes, 
        temporaryPassword, 
        passwordExpiresAt.toISOString()
      );

      return new Response(
        JSON.stringify({
          success: true,
          user_id: existingUser.id,
          message: 'Existing user linked to employee account',
          linked_existing_user: true,
          temporary_password: temporaryPassword,
          password_expires_at: passwordExpiresAt.toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

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

    // Create user profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        user_id: userData.user?.id,
        first_name: first_name,
        last_name: last_name,
        first_name_ar: first_name_ar,
        last_name_ar: last_name_ar,
        email: email,
        company_id: company_id
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Don't fail here, profile might already exist from trigger
    }

    // Assign roles and create request record
    await assignRolesAndCreateRecord(supabaseClient, userData.user?.id, roles, employee_id, company_id, notes, temporaryPassword, passwordExpiresAt.toISOString());

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