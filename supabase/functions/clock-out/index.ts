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
    const { employeeId, latitude, longitude, isAutoCheckout = false } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];
    
    // Get existing attendance record
    const { data: existingRecord, error: recordError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('attendance_date', today)
      .single();

    if (recordError || !existingRecord) {
      return new Response(JSON.stringify({ error: 'No clock-in record found for today' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingRecord.check_out_time) {
      return new Response(JSON.stringify({ 
        error: 'Already clocked out today',
        record: existingRecord
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If not auto checkout, verify location
    if (!isAutoCheckout) {
      const { data: employee } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', employeeId)
        .single();

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
    }

    const currentTime = new Date().toTimeString().split(' ')[0];
    
    // Calculate total hours
    const checkInTime = new Date(`1970-01-01T${existingRecord.check_in_time}`);
    const checkOutTime = new Date(`1970-01-01T${currentTime}`);
    let totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    
    // Handle overnight shifts
    if (totalHours < 0) {
      totalHours += 24;
    }

    // Update attendance record
    const { data: record, error } = await supabase
      .from('attendance_records')
      .update({
        check_out_time: currentTime,
        check_out_latitude: isAutoCheckout ? null : latitude,
        check_out_longitude: isAutoCheckout ? null : longitude,
        total_hours: Math.round(totalHours * 100) / 100,
        auto_checkout: isAutoCheckout,
      })
      .eq('id', existingRecord.id)
      .select()
      .single();

    if (error) {
      console.error('Clock-out error:', error);
      return new Response(JSON.stringify({ error: 'Failed to clock out' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      record,
      message: isAutoCheckout ? 'Automatically clocked out' : 'Successfully clocked out'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in clock-out function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});