import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.52.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserAccountRequest {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  roles: string[];
  requester_name: string;
  notes?: string;
  user_id: string;
  company_id: string;
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
      requested_by: requestedBy,
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
      employee_name,
      employee_email,
      roles,
      requester_name,
      notes,
      user_id,
      company_id
    }: CreateUserAccountRequest = await req.json();

    console.log('Creating user account for:', employee_email);

    // Validate required fields
    if (!user_id || !company_id) {
      throw new Error('Missing required fields: user_id and company_id');
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

    const existingUser = existingUsers.users.find(u => u.email === employee_email);
    
    if (existingUser) {
      // User already exists, check if they're linked to this employee
      const { data: employeeData, error: employeeCheckError } = await supabaseClient
        .from('employees')
        .select('user_id, has_system_access')
        .eq('id', employee_id)
        .single();

      if (employeeCheckError) {
        throw new Error(`Failed to check employee data: ${employeeCheckError.message}`);
      }

      if (employeeData.user_id && employeeData.has_system_access) {
        throw new Error('Employee already has a system account');
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
        user_id, 
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
      email: employee_email,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: employee_name.split(' ')[0],
        last_name: employee_name.split(' ').slice(1).join(' '),
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
        first_name: employee_name.split(' ')[0],
        last_name: employee_name.split(' ').slice(1).join(' '),
        email: employee_email
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Don't fail here, profile might already exist from trigger
    }

    // Assign roles and create request record
    await assignRolesAndCreateRecord(supabaseClient, userData.user?.id, roles, employee_id, company_id, user_id, notes, temporaryPassword, passwordExpiresAt.toISOString());

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