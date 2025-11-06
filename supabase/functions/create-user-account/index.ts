import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const requestBody = await req.json()
    console.log('[create-user-account] Request body:', requestBody)

    const {
      employee_id,
      first_name,
      last_name,
      first_name_ar,
      last_name_ar,
      email,
      company_id,
      roles = [],
      temporary_password,
      requester_name,
      notes,
      user_id: requester_id
    } = requestBody

    // Validate required fields
    if (!employee_id || !email || !company_id) {
      throw new Error('Missing required fields: employee_id, email, or company_id')
    }

    if (!roles || roles.length === 0) {
      throw new Error('At least one role must be specified')
    }

    console.log('[create-user-account] Creating account for:', email)

    // Check if user already exists with this email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    let userId: string
    let password: string
    let linkedExistingUser = false

    if (existingUser) {
      console.log('[create-user-account] User already exists, linking to employee')
      userId = existingUser.id
      linkedExistingUser = true
      
      // Update password if provided
      if (temporary_password) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password: temporary_password }
        )
        if (updateError) {
          console.error('[create-user-account] Error updating password:', updateError)
          throw updateError
        }
        password = temporary_password
      } else {
        // Generate new random password
        password = generateRandomPassword()
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password }
        )
        if (updateError) {
          console.error('[create-user-account] Error updating password:', updateError)
          throw updateError
        }
      }
    } else {
      // Create new user
      password = temporary_password || generateRandomPassword()
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: first_name || first_name_ar,
          last_name: last_name || last_name_ar,
          full_name: `${first_name || first_name_ar || ''} ${last_name || last_name_ar || ''}`.trim()
        }
      })

      if (createError) {
        console.error('[create-user-account] Error creating user:', createError)
        throw createError
      }

      if (!newUser.user) {
        throw new Error('Failed to create user')
      }

      userId = newUser.user.id
      console.log('[create-user-account] New user created:', userId)
    }

    // Create or update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: userId,
        company_id,
        email,
        first_name: first_name || first_name_ar || '',
        last_name: last_name || last_name_ar || '',
        first_name_ar: first_name_ar || first_name || '',
        last_name_ar: last_name_ar || last_name || '',
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (profileError) {
      console.error('[create-user-account] Error creating/updating profile:', profileError)
      throw profileError
    }

    console.log('[create-user-account] Profile created/updated')

    // Link user to employee
    const { error: employeeError } = await supabaseAdmin
      .from('employees')
      .update({
        user_id: userId,
        has_system_access: true,
        account_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', employee_id)

    if (employeeError) {
      console.error('[create-user-account] Error linking employee:', employeeError)
      throw employeeError
    }

    console.log('[create-user-account] Employee linked to user')

    // Add roles
    const roleInserts = roles.map((role: string) => ({
      user_id: userId,
      role,
      company_id,
      granted_by: requester_id,
      granted_at: new Date().toISOString()
    }))

    const { error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .upsert(roleInserts, {
        onConflict: 'user_id,role,company_id',
        ignoreDuplicates: true
      })

    if (rolesError) {
      console.error('[create-user-account] Error adding roles:', rolesError)
      throw rolesError
    }

    console.log('[create-user-account] Roles added successfully')

    // Calculate password expiry (30 days from now)
    const passwordExpiresAt = new Date()
    passwordExpiresAt.setDate(passwordExpiresAt.getDate() + 30)

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        temporary_password: password,
        password_expires_at: passwordExpiresAt.toISOString(),
        linked_existing_user: linkedExistingUser,
        message: linkedExistingUser 
          ? 'تم ربط المستخدم الموجود بحساب الموظف وتحديث كلمة المرور'
          : 'تم إنشاء حساب المستخدم بنجاح'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('[create-user-account] Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'حدث خطأ أثناء إنشاء الحساب'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

function generateRandomPassword(): string {
  const length = 12
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  
  // Ensure at least one of each type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
  password += '0123456789'[Math.floor(Math.random() * 10)]
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]
  
  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

