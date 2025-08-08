import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TransferRequest {
  userId: string;
  fromCompanyId: string;
  toCompanyId: string;
  newRoles: string[];
  transferReason?: string;
  dataHandlingStrategy: {
    contracts: 'move' | 'keep' | 'copy';
    invoices: 'move' | 'keep' | 'copy';
    vehicles: 'move' | 'keep' | 'copy';
    other: 'move' | 'keep' | 'copy';
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Parse request
    const { 
      userId, 
      fromCompanyId, 
      toCompanyId, 
      newRoles, 
      transferReason,
      dataHandlingStrategy 
    }: TransferRequest = await req.json()

    console.log('Starting user transfer:', { userId, fromCompanyId, toCompanyId, newRoles })

    // Get current user (must be super admin)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Authentication failed')
    }

    // Verify current user is super admin
    const { data: userRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    const isSuperAdmin = userRoles?.some(ur => ur.role === 'super_admin')
    if (!isSuperAdmin) {
      throw new Error('Only super admins can transfer users')
    }

    // Validate transfer eligibility
    const { data: validationResult } = await supabaseClient
      .rpc('validate_user_transfer', {
        p_user_id: userId,
        p_from_company_id: fromCompanyId,
        p_to_company_id: toCompanyId
      })

    if (!validationResult?.valid) {
      throw new Error(`Transfer validation failed: ${validationResult?.errors?.join(', ')}`)
    }

    // Get current user data for rollback
    const { data: currentProfile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    const { data: currentEmployee } = await supabaseClient
      .from('employees')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', fromCompanyId)
      .single()

    const { data: currentRoles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)

    // Create transfer log
    const { data: transferLog, error: logError } = await supabaseClient
      .from('user_transfer_logs')
      .insert({
        user_id: userId,
        from_company_id: fromCompanyId,
        to_company_id: toCompanyId,
        transferred_by: user.id,
        transfer_reason: transferReason,
        data_handling_strategy: dataHandlingStrategy,
        old_roles: currentRoles?.map(r => r.role) || [],
        new_roles: newRoles,
        status: 'pending',
        rollback_data: {
          profile: currentProfile,
          employee: currentEmployee,
          roles: currentRoles
        }
      })
      .select()
      .single()

    if (logError) {
      console.error('Failed to create transfer log:', logError)
      throw new Error('Failed to create transfer log')
    }

    try {
      // Start transaction-like operations
      
      // 1. Update profile company
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ company_id: toCompanyId })
        .eq('user_id', userId)

      if (profileError) {
        throw new Error(`Failed to update profile: ${profileError.message}`)
      }

      // 2. Handle employee record
      if (currentEmployee) {
        // Mark old employee as inactive
        await supabaseClient
          .from('employees')
          .update({ is_active: false })
          .eq('id', currentEmployee.id)

        // Create new employee record in target company
        await supabaseClient
          .from('employees')
          .insert({
            user_id: userId,
            company_id: toCompanyId,
            employee_number: currentEmployee.employee_number,
            department: currentEmployee.department,
            position: currentEmployee.position,
            salary: currentEmployee.salary,
            hire_date: currentEmployee.hire_date,
            is_active: true
          })
      }

      // 3. Update user roles
      // Remove old roles
      await supabaseClient
        .from('user_roles')
        .delete()
        .eq('user_id', userId)

      // Add new roles
      if (newRoles.length > 0) {
        const roleInserts = newRoles.map(role => ({
          user_id: userId,
          role: role
        }))
        
        await supabaseClient
          .from('user_roles')
          .insert(roleInserts)
      }

      // 4. Handle associated data based on strategy
      if (dataHandlingStrategy.contracts === 'move') {
        await supabaseClient
          .from('contracts')
          .update({ company_id: toCompanyId })
          .eq('created_by', userId)
      }

      if (dataHandlingStrategy.invoices === 'move') {
        await supabaseClient
          .from('invoices')
          .update({ company_id: toCompanyId })
          .eq('created_by', userId)
      }

      if (dataHandlingStrategy.vehicles === 'move') {
        await supabaseClient
          .from('vehicles')
          .update({ company_id: toCompanyId })
          .eq('assigned_to', userId)
      }

      // Mark transfer as completed
      await supabaseClient
        .from('user_transfer_logs')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', transferLog.id)

      console.log('User transfer completed successfully:', transferLog.id)

      return new Response(
        JSON.stringify({ 
          success: true, 
          transferLogId: transferLog.id,
          message: 'User transferred successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )

    } catch (error) {
      console.error('Transfer failed, updating log:', error)
      
      // Mark transfer as failed
      await supabaseClient
        .from('user_transfer_logs')
        .update({ 
          status: 'failed',
          error_message: error.message
        })
        .eq('id', transferLog.id)

      throw error
    }

  } catch (error) {
    console.error('Error in transfer-user-company function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})