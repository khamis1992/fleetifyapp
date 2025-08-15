import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DocumentAlert {
  alert_type: string;
  contract_id: string;
  customer_id: string;
  customer_name: string;
  document_type: string;
  expiry_date: string;
  days_until_expiry: number;
  contract_number: string;
  company_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Starting document expiry alerts sync...');

    // Call the database function to sync alerts
    const { data: syncResult, error: syncError } = await supabaseClient
      .rpc('sync_document_expiry_alerts');

    if (syncError) {
      console.error('Error syncing document alerts:', syncError);
      throw syncError;
    }

    console.log(`Sync completed. Created ${syncResult} new alerts.`);

    // Get current alert statistics for logging
    const { data: alertStats, error: statsError } = await supabaseClient
      .from('document_expiry_alerts')
      .select('alert_type, document_type, company_id', { count: 'exact' })
      .eq('is_acknowledged', false);

    if (statsError) {
      console.error('Error getting alert statistics:', statsError);
    } else {
      console.log('Current unacknowledged alerts:', alertStats?.length || 0);
    }

    // Get detailed alerts for debugging
    const { data: detailAlerts, error: detailError } = await supabaseClient
      .from('document_expiry_alerts')
      .select(`
        alert_type,
        document_type,
        customer_name,
        contract_number,
        expiry_date,
        days_until_expiry,
        is_acknowledged
      `)
      .eq('is_acknowledged', false)
      .order('expiry_date', { ascending: true })
      .limit(10);

    if (!detailError && detailAlerts) {
      console.log('Sample alerts:', detailAlerts);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Document expiry alerts sync completed successfully`,
        alerts_created: syncResult,
        total_unacknowledged: alertStats?.length || 0,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in sync-document-alerts function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});