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
}

const generateTemporaryPassword = (): string => {
  const charset = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
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
      notes
    }: CreateUserAccountRequest = await req.json();

    console.log('Creating user account for:', employee_email);

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

    // Assign roles to user
    if (roles && roles.length > 0) {
      const roleInserts = roles.map(role => ({
        user_id: userData.user?.id,
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
        employee_id,
        requested_roles: roles,
        notes,
        status: 'approved',
        direct_creation: true,
        temporary_password: temporaryPassword,
        password_expires_at: passwordExpiresAt.toISOString(),
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating request record:', requestError);
      throw new Error(`Failed to create request record: ${requestError.message}`);
    }

    console.log('Account creation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userData.user?.id,
        temporary_password: temporaryPassword,
        password_expires_at: passwordExpiresAt.toISOString(),
        request_id: requestData.id
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