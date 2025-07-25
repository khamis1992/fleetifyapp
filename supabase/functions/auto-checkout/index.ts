import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];
    
    // Find companies with auto checkout enabled
    const { data: companies } = await supabase
      .from('companies')
      .select('id, work_end_time, auto_checkout_enabled')
      .eq('auto_checkout_enabled', true);

    if (!companies?.length) {
      return new Response(JSON.stringify({ message: 'No companies with auto checkout enabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processedCount = 0;

    for (const company of companies) {
      const workEndTime = company.work_end_time || '17:00:00';
      
      // Check if current time is past work end time
      if (currentTime > workEndTime) {
        // Find employees who haven't clocked out
        const { data: attendanceRecords } = await supabase
          .from('attendance_records')
          .select(`
            id,
            employee_id,
            check_in_time,
            check_out_time,
            employees!inner(company_id)
          `)
          .eq('attendance_date', today)
          .eq('employees.company_id', company.id)
          .is('check_out_time', null);

        if (attendanceRecords?.length) {
          for (const record of attendanceRecords) {
            try {
              // Call clock-out function for auto checkout
              const clockOutResponse = await fetch(`${supabaseUrl}/functions/v1/clock-out`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  employeeId: record.employee_id,
                  latitude: null,
                  longitude: null,
                  isAutoCheckout: true,
                }),
              });

              if (clockOutResponse.ok) {
                processedCount++;
                console.log(`Auto checkout completed for employee ${record.employee_id}`);
              }
            } catch (error) {
              console.error(`Failed to auto checkout employee ${record.employee_id}:`, error);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      processedCount,
      message: `Auto checkout completed for ${processedCount} employees`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in auto-checkout function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});