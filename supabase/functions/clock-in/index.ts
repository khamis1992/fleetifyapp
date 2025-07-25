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
    const { employeeId, latitude, longitude } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get employee and company info
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('company_id')
      .eq('id', employeeId)
      .single();

    if (empError || !employee) {
      return new Response(JSON.stringify({ error: 'Employee not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify location first
    const locationResponse = await fetch(`${supabaseUrl}/functions/v1/verify-location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        companyId: employee.company_id,
        latitude,
        longitude,
      }),
    });

    const locationData = await locationResponse.json();
    
    if (!locationData.withinRange) {
      return new Response(JSON.stringify({ 
        error: 'You are outside the allowed work area',
        distance: locationData.distance,
        allowedRadius: locationData.allowedRadius
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Check if already clocked in today
    const { data: existingRecord } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('attendance_date', today)
      .single();

    if (existingRecord && existingRecord.check_in_time) {
      return new Response(JSON.stringify({ 
        error: 'Already clocked in today',
        record: existingRecord
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentTime = new Date().toTimeString().split(' ')[0];

    // Create or update attendance record
    const { data: record, error } = await supabase
      .from('attendance_records')
      .upsert({
        employee_id: employeeId,
        attendance_date: today,
        check_in_time: currentTime,
        check_in_latitude: latitude,
        check_in_longitude: longitude,
        location_verified: true,
        status: 'present',
      })
      .select()
      .single();

    if (error) {
      console.error('Clock-in error:', error);
      return new Response(JSON.stringify({ error: 'Failed to clock in' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      record,
      message: 'Successfully clocked in'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in clock-in function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});