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

// Secure password generation using database function
const generateSecurePassword = async (supabaseClient: any): Promise<string> => {
  const { data, error } = await supabaseClient.rpc('generate_secure_password');
  
  if (error) {
    console.error('Error generating secure password:', error);
    // Fallback to client-side generation if database function fails
    return generateClientSidePassword();
  }
  
  return data;
};

// Fallback client-side password generation
const generateClientSidePassword = (): string => {
  const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = upperChars + lowerChars + numberChars + specialChars;
  
  let password = '';
  
  // Ensure at least one character from each type
  password += upperChars[Math.floor(Math.random() * upperChars.length)];
  password += lowerChars[Math.floor(Math.random() * lowerChars.length)];
  password += numberChars[Math.floor(Math.random() * numberChars.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];
  
  // Add 8 more random characters
  for (let i = 0; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Input validation function
const validateInput = (input: string, maxLength: number = 255): boolean => {
  if (!input || input.trim().length === 0) return false;
  if (input.length > maxLength) return false;
  
  // Check for SQL injection patterns
  const sqlInjectionPattern = /(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|UNION|SELECT)[\s\(]/i;
  if (sqlInjectionPattern.test(input)) return false;
  
  // Check for XSS patterns
  const xssPattern = /<script|javascript:|data:|vbscript:|on\w+=/i;
  if (xssPattern.test(input)) return false;
  
  return true;
};

// Rate limiting check
const checkRateLimit = async (supabaseClient: any, operation: string): Promise<boolean> => {
  const { data, error } = await supabaseClient.rpc('check_rate_limit', {
    operation_type: operation,
    max_attempts: 5,
    window_minutes: 15
  });
  
  if (error) {
    console.error('Rate limit check failed:', error);
    return true; // Allow on error to avoid blocking legitimate requests
  }
  
  return data;
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
  // Validate roles
  const validRoles = ['super_admin', 'company_admin', 'manager', 'accountant', 'fleet_manager', 'sales_agent', 'employee'];
  const filteredRoles = roles.filter(role => validRoles.includes(role));
  
  // Assign roles to user
  if (filteredRoles && filteredRoles.length > 0 && userId) {
    const roleInserts = filteredRoles.map(role => ({
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
      requested_roles: filteredRoles,
      notes: notes?.substring(0, 500), // Limit notes length
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

    // Input validation
    if (!validateInput(employee_name) || !validateInput(employee_email) || !validateInput(requester_name)) {
      throw new Error('Invalid input data provided');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(employee_email)) {
      throw new Error('Invalid email format');
    }

    // Validate required fields
    if (!user_id || !company_id || !employee_id) {
      throw new Error('Missing required fields: user_id, company_id, and employee_id');
    }

    // Rate limiting check
    const rateLimitOk = await checkRateLimit(supabaseClient, 'account_creation');
    if (!rateLimitOk) {
      throw new Error('Rate limit exceeded. Please try again later.');
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

      // Generate secure temporary password for existing user linking
      const temporaryPassword = await generateSecurePassword(supabaseClient);
      const passwordExpiresAt = new Date();
      passwordExpiresAt.setDate(passwordExpiresAt.getDate() + 7); // Expires in 7 days

      // Update existing user's password
      const { error: passwordError } = await supabaseClient.auth.admin.updateUserById(
        existingUser.id,
        {
          password: temporaryPassword,
          user_metadata: {
            ...existingUser.user_metadata,
            requires_password_change: true,
            password_expires_at: passwordExpiresAt.toISOString()
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

      // Log security event
      await supabaseClient.rpc('log_security_event', {
        event_type: 'account_linked',
        resource_type: 'employee',
        resource_id: employee_id,
        details: { linked_user_id: existingUser.id, roles: roles }
      });

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

    // Generate secure temporary password
    const temporaryPassword = await generateSecurePassword(supabaseClient);
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
        requires_password_change: true,
        password_expires_at: passwordExpiresAt.toISOString()
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

    // Log security event
    await supabaseClient.rpc('log_security_event', {
      event_type: 'account_created',
      resource_type: 'employee',
      resource_id: employee_id,
      details: { new_user_id: userData.user?.id, roles: roles }
    });

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