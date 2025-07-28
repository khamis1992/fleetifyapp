import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting stats cache refresh...');

    // Since materialized view is not available, we'll create a summary table update
    // This function can be called periodically to update performance metrics
    
    // Get all companies and update their stats
    const { data: companies } = await supabase
      .from('companies')
      .select('id')
      .limit(100); // Process in batches

    if (!companies) {
      throw new Error('No companies found');
    }

    let processedCount = 0;
    const results = [];

    for (const company of companies) {
      try {
        // Calculate real-time stats for each company
        const [
          vehiclesCount,
          contractsCount,
          customersCount,
          employeesCount,
          contractsRevenue
        ] = await Promise.all([
          supabase.from('vehicles').select('*', { count: 'exact', head: true })
            .eq('company_id', company.id).eq('is_active', true),
          
          supabase.from('contracts').select('*', { count: 'exact', head: true })
            .eq('company_id', company.id).eq('status', 'active'),
          
          supabase.from('customers').select('*', { count: 'exact', head: true })
            .eq('company_id', company.id).eq('is_active', true),
          
          supabase.from('employees').select('*', { count: 'exact', head: true })
            .eq('company_id', company.id).eq('is_active', true),
          
          supabase.from('contracts').select('monthly_amount, contract_amount')
            .eq('company_id', company.id).eq('status', 'active')
        ]);

        const monthlyRevenue = contractsRevenue.data?.reduce((sum, contract) => 
          sum + (contract.monthly_amount || 0), 0) || 0;

        // Store the calculated stats in a performance metrics table
        const { error: insertError } = await supabase
          .from('performance_metrics')
          .upsert({
            company_id: company.id,
            metric_type: 'dashboard_stats',
            metric_data: {
              total_vehicles: vehiclesCount.count || 0,
              active_contracts: contractsCount.count || 0,
              total_customers: customersCount.count || 0,
              total_employees: employeesCount.count || 0,
              monthly_revenue: monthlyRevenue,
              last_updated: new Date().toISOString()
            },
            created_at: new Date().toISOString()
          }, {
            onConflict: 'company_id,metric_type'
          });

        if (insertError) {
          console.error(`Error updating stats for company ${company.id}:`, insertError);
        } else {
          processedCount++;
        }

        results.push({
          company_id: company.id,
          success: !insertError,
          stats: {
            vehicles: vehiclesCount.count || 0,
            contracts: contractsCount.count || 0,
            customers: customersCount.count || 0,
            employees: employeesCount.count || 0,
            revenue: monthlyRevenue
          }
        });

      } catch (error) {
        console.error(`Error processing company ${company.id}:`, error);
        results.push({
          company_id: company.id,
          success: false,
          error: error.message
        });
      }
    }

    // Clean up old metrics (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    await supabase
      .from('performance_metrics')
      .delete()
      .eq('metric_type', 'dashboard_stats')
      .lt('created_at', sevenDaysAgo.toISOString());

    console.log(`Cache refresh completed. Processed ${processedCount}/${companies.length} companies.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully refreshed stats cache for ${processedCount}/${companies.length} companies`,
        processed_count: processedCount,
        total_companies: companies.length,
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in refresh-stats-cache function:', error);
    
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