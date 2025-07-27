import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DepreciationRequest {
  company_id?: string
  depreciation_date?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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
    )

    let company_id: string | undefined
    let depreciation_date: string | undefined

    // Handle both GET (scheduled) and POST (manual) requests
    if (req.method === 'GET') {
      const url = new URL(req.url)
      company_id = url.searchParams.get('company_id') || undefined
      depreciation_date = url.searchParams.get('depreciation_date') || undefined
    } else if (req.method === 'POST') {
      const body: DepreciationRequest = await req.json()
      company_id = body.company_id
      depreciation_date = body.depreciation_date
    }

    // Default to current date if not provided
    const targetDate = depreciation_date || new Date().toISOString().split('T')[0]

    console.log(`Processing depreciation for date: ${targetDate}`)

    if (company_id) {
      // Process depreciation for specific company
      console.log(`Processing depreciation for company: ${company_id}`)
      
      const { data, error } = await supabaseClient.rpc(
        'process_vehicle_depreciation_monthly',
        {
          company_id_param: company_id,
          depreciation_date_param: targetDate
        }
      )

      if (error) {
        console.error(`Error processing depreciation for company ${company_id}:`, error)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to process depreciation for company',
            details: error.message,
            company_id 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log(`Processed ${data} vehicles for company ${company_id}`)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed_vehicles: data,
          company_id,
          depreciation_date: targetDate
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      // Process depreciation for all companies
      console.log('Processing depreciation for all companies')
      
      // Get all active companies
      const { data: companies, error: companiesError } = await supabaseClient
        .from('companies')
        .select('id, name')
        .eq('subscription_status', 'active')

      if (companiesError) {
        console.error('Error fetching companies:', companiesError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to fetch companies',
            details: companiesError.message
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const results = []
      let totalProcessed = 0

      for (const company of companies || []) {
        try {
          console.log(`Processing depreciation for company: ${company.name} (${company.id})`)
          
          const { data, error } = await supabaseClient.rpc(
            'process_vehicle_depreciation_monthly',
            {
              company_id_param: company.id,
              depreciation_date_param: targetDate
            }
          )

          if (error) {
            console.error(`Error processing depreciation for company ${company.id}:`, error)
            results.push({
              company_id: company.id,
              company_name: company.name,
              success: false,
              error: error.message,
              processed_vehicles: 0
            })
          } else {
            console.log(`Processed ${data} vehicles for company ${company.name}`)
            totalProcessed += data || 0
            results.push({
              company_id: company.id,
              company_name: company.name,
              success: true,
              processed_vehicles: data || 0
            })
          }
        } catch (err) {
          console.error(`Unexpected error processing company ${company.id}:`, err)
          results.push({
            company_id: company.id,
            company_name: company.name,
            success: false,
            error: err.message,
            processed_vehicles: 0
          })
        }
      }

      console.log(`Depreciation processing completed. Total vehicles processed: ${totalProcessed}`)

      return new Response(
        JSON.stringify({ 
          success: true,
          total_companies: companies?.length || 0,
          total_processed_vehicles: totalProcessed,
          depreciation_date: targetDate,
          results
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
  } catch (error) {
    console.error('Unexpected error in depreciation processing:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})