import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { company_id } = await req.json()

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'Company ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📄 [INITIALIZE_SETTINGS] Starting for company:', company_id)

    // Get current company settings
    const { data: company, error: fetchError } = await supabaseClient
      .from('companies')
      .select('settings')
      .eq('id', company_id)
      .single()

    if (fetchError) {
      console.error('Failed to fetch company:', fetchError)
      throw fetchError
    }

    const currentSettings = (company?.settings as any) || {}

    // Default document saving settings
    const defaultDocumentSettings = {
      auto_save_unsigned_contracts: true,
      auto_save_signed_contracts: true,
      auto_save_condition_reports: true,
      auto_save_signatures: false,
      pdf_generation_priority: 'immediate',
      error_handling_mode: 'lenient',
      notification_preferences: {
        success: true,
        warnings: true,
        errors: true
      }
    }

    // Default customer account settings
    const defaultCustomerAccountSettings = {
      account_prefix: 'CUST-',
      account_group_by: 'customer_type',
      auto_create_account: true,
      account_naming_pattern: 'customer_name',
      enable_account_selection: true,
      default_receivables_account_id: null
    }

    // Only update if document_saving settings don't exist or are empty
    let needsUpdate = false
    const updatedSettings = { ...currentSettings }

    if (!currentSettings.document_saving) {
      console.log('📄 [INITIALIZE_SETTINGS] Adding document saving settings')
      updatedSettings.document_saving = defaultDocumentSettings
      needsUpdate = true
    }

    if (!currentSettings.customer_account_settings) {
      console.log('📄 [INITIALIZE_SETTINGS] Adding customer account settings')
      updatedSettings.customer_account_settings = defaultCustomerAccountSettings
      needsUpdate = true
    }

    if (needsUpdate) {
      const { error: updateError } = await supabaseClient
        .from('companies')
        .update({ settings: updatedSettings })
        .eq('id', company_id)

      if (updateError) {
        console.error('Failed to update company settings:', updateError)
        throw updateError
      }

      console.log('📄 [INITIALIZE_SETTINGS] Successfully updated settings for company:', company_id)
    } else {
      console.log('📄 [INITIALIZE_SETTINGS] Settings already exist, no update needed')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        settings_updated: needsUpdate,
        settings: updatedSettings
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in initialize-company-settings:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})