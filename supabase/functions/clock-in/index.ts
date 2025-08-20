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
    const requestBody = await req.json();
    const { employeeId, latitude, longitude } = requestBody;
    
    console.log('Clock-in request received:', { 
      employeeId, 
      hasLocation: !!(latitude && longitude),
      timestamp: new Date().toISOString()
    });
    
    if (!employeeId) {
      console.error('Missing employeeId in request');
      return new Response(JSON.stringify({ 
        error: 'معرف الموظف مطلوب',
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!latitude || !longitude) {
      console.error('Missing location data in request');
      return new Response(JSON.stringify({ 
        error: 'بيانات الموقع مطلوبة لتسجيل الحضور',
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
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
      console.error('Employee lookup error:', empError);
      return new Response(JSON.stringify({ 
        error: 'لم يتم العثور على بيانات الموظف',
        success: false,
        details: empError?.message 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Employee found:', { 
      employeeId, 
      companyId: employee.company_id 
    });

    // Verify location first
    const locationResponse = await supabase.functions.invoke('verify-location', {
      body: {
        companyId: employee.company_id,
        latitude,
        longitude,
      },
    });

    if (locationResponse.error) {
      console.error('Location verification error:', locationResponse.error);
      return new Response(JSON.stringify({ 
        error: 'فشل في التحقق من الموقع. يرجى المحاولة مرة أخرى',
        success: false,
        details: locationResponse.error.message,
        errorCode: 'LOCATION_VERIFICATION_FAILED'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const locationData = locationResponse.data;
    
    console.log('Location verification result:', {
      withinRange: locationData.withinRange,
      distance: locationData.distance,
      allowedRadius: locationData.allowedRadius,
      needsConfiguration: locationData.needsConfiguration
    });

    if (!locationData.withinRange) {
      let errorMessage = 'أنت خارج منطقة العمل المسموحة';
      
      if (locationData.needsConfiguration) {
        errorMessage = 'لم يتم تكوين موقع المكتب. يرجى التواصل مع المسؤول لإعداد موقع المكتب.';
      } else if (locationData.distance && locationData.allowedRadius) {
        errorMessage = `أنت على بعد ${Math.round(locationData.distance)}م من المكتب. المسافة المسموحة هي ${locationData.allowedRadius}م.`;
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage,
        success: false,
        distance: Math.round(locationData.distance || 0),
        allowedRadius: locationData.allowedRadius,
        needsConfiguration: locationData.needsConfiguration,
        errorCode: 'LOCATION_OUT_OF_RANGE'
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
      console.log('Employee already clocked in today:', { 
        employeeId, 
        existingCheckIn: existingRecord.check_in_time 
      });
      return new Response(JSON.stringify({ 
        error: 'تم تسجيل الحضور مسبقاً اليوم',
        success: false,
        record: existingRecord,
        errorCode: 'ALREADY_CLOCKED_IN'
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
      console.error('Clock-in database error:', error);
      return new Response(JSON.stringify({ 
        error: 'فشل في تسجيل الحضور. يرجى المحاولة مرة أخرى',
        success: false,
        details: error.message,
        errorCode: 'DATABASE_ERROR'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Clock-in successful:', { 
      employeeId, 
      recordId: record.id,
      checkInTime: record.check_in_time
    });

    return new Response(JSON.stringify({ 
      success: true,
      record,
      message: 'تم تسجيل الحضور بنجاح'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error in clock-in function:', error);
    return new Response(JSON.stringify({ 
      error: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى',
      success: false,
      details: error.message,
      errorCode: 'UNEXPECTED_ERROR'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});