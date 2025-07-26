import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResetPasswordRequest {
  user_id: string;
  new_password: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== RESET PASSWORD FUNCTION START ===');
    
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extract JWT token
    const jwt = authHeader.replace('Bearer ', '');
    console.log('JWT token length:', jwt.length);

    // Get current user using admin client with JWT
    const { data: { user: currentUser }, error: userError } = await supabaseAdmin.auth.getUser(jwt);
    
    if (userError || !currentUser) {
      console.error('Error getting current user with admin client:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Current user authenticated:', currentUser.id);

    // Check if user has admin privileges using admin client
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id);

    if (rolesError) {
      console.error('Error checking user roles:', rolesError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error checking permissions' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const hasAdminRole = userRoles?.some(role => 
      role.role === 'super_admin' || role.role === 'company_admin'
    );

    if (!hasAdminRole) {
      console.error('User does not have admin privileges');
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const body: ResetPasswordRequest = await req.json();
    console.log('Request body:', { user_id: body.user_id, has_password: !!body.new_password });

    if (!body.user_id || !body.new_password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate password length
    if (body.new_password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 6 characters long' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if target user exists using admin client
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email, company_id')
      .eq('user_id', body.user_id)
      .single();

    if (targetUserError || !targetUser) {
      console.error('Target user not found:', targetUserError);
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Target user found:', targetUser.email);

    // For company admins, ensure they can only reset passwords in their own company
    const { data: currentUserProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('user_id', currentUser.id)
      .single();

    if (profileError) {
      console.error('Error getting current user profile:', profileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error checking permissions' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check company restrictions for company admins
    const isCompanyAdmin = userRoles?.some(role => role.role === 'company_admin');
    const isSuperAdmin = userRoles?.some(role => role.role === 'super_admin');

    if (isCompanyAdmin && !isSuperAdmin) {
      if (currentUserProfile.company_id !== targetUser.company_id) {
        console.error('Company admin trying to reset password for user in different company');
        return new Response(
          JSON.stringify({ success: false, error: 'You can only reset passwords for users in your company' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Reset password using admin client
    console.log('Resetting password for user:', body.user_id);
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
      body.user_id,
      { password: body.new_password }
    );

    if (resetError) {
      console.error('Error resetting password:', resetError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to reset password: ${resetError.message}` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Password reset successful for user:', body.user_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password reset successfully',
        user_id: body.user_id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('=== RESET PASSWORD FUNCTION ERROR ===');
    console.error('Error details:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});