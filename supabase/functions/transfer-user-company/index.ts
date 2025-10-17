import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TransferRequest {
  userId: string
  fromCompanyId: string
  toCompanyId: string
  newRoles: string[]
  transferReason?: string
  dataHandlingStrategy: {
    contracts: 'move' | 'keep' | 'copy'
    invoices: 'move' | 'keep' | 'copy'
    vehicles: 'move' | 'keep' | 'copy'
    other: 'move' | 'keep' | 'copy'
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const transferData: TransferRequest = await req.json()
    console.log('Transfer request received:', transferData)

    const { userId, fromCompanyId, toCompanyId, newRoles, transferReason, dataHandlingStrategy } = transferData

    if (!userId || !fromCompanyId || !toCompanyId || !newRoles || newRoles.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (fromCompanyId === toCompanyId) {
      return new Response(JSON.stringify({ success: false, error: 'Cannot transfer to same company' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log('Starting transfer for user ' + userId)

    const { error: profileError } = await supabaseAdmin.from('profiles').update({ company_id: toCompanyId }).eq('id', userId)
    if (profileError) throw new Error('Failed to update profile: ' + profileError.message)

    const { error: deleteRolesError } = await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
    if (deleteRolesError) {
      await supabaseAdmin.from('profiles').update({ company_id: fromCompanyId }).eq('id', userId)
      throw new Error('Failed to delete roles: ' + deleteRolesError.message)
    }

    const roleInserts = newRoles.map(role => ({ user_id: userId, role, company_id: toCompanyId }))
    const { error: insertRolesError } = await supabaseAdmin.from('user_roles').insert(roleInserts)
    if (insertRolesError) {
      await supabaseAdmin.from('profiles').update({ company_id: fromCompanyId }).eq('id', userId)
      throw new Error('Failed to insert roles: ' + insertRolesError.message)
    }

    const { data: logData, error: logError } = await supabaseAdmin.from('user_transfer_logs').insert({
      user_id: userId, from_company_id: fromCompanyId, to_company_id: toCompanyId,
      transferred_at: new Date().toISOString(), transfer_reason: transferReason || null,
      data_handling_strategy: dataHandlingStrategy, new_roles: newRoles
    }).select().single()

    if (logError) console.warn('Failed to create transfer log')

    return new Response(JSON.stringify({ success: true, message: 'User transferred successfully', transferLogId: logData?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Transfer error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message || 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

