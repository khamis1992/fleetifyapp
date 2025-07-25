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
    const { companyId, latitude, longitude } = await req.json();
    
    console.log(`Verifying location for company ${companyId} at coordinates (${latitude}, ${longitude})`);

    // Validate input parameters
    if (!companyId || typeof latitude !== 'number' || typeof longitude !== 'number') {
      console.error('Invalid input parameters:', { companyId, latitude, longitude });
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input parameters',
          withinRange: false,
          distance: null,
          allowedRadius: null
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get company location settings
    const { data: company, error } = await supabase
      .from('companies')
      .select('office_latitude, office_longitude, allowed_radius')
      .eq('id', companyId)
      .single();

    if (error) {
      console.error('Company fetch error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch company data',
          withinRange: false,
          distance: null,
          allowedRadius: null
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!company) {
      console.error('Company not found:', companyId);
      return new Response(
        JSON.stringify({ 
          error: 'Company not found',
          withinRange: false,
          distance: null,
          allowedRadius: null
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!company.office_latitude || !company.office_longitude) {
      console.error('Company location not configured for company:', companyId);
      return new Response(JSON.stringify({ 
        error: 'Company office location is not configured. Please contact your administrator to set up the office location.',
        withinRange: false,
        distance: null,
        allowedRadius: company.allowed_radius || 100,
        needsConfiguration: true
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate distance using Haversine formula
    const distance = calculateDistance(
      latitude,
      longitude,
      company.office_latitude,
      company.office_longitude
    );

    const allowedRadius = company.allowed_radius || 100;
    const withinRange = distance <= allowedRadius;

    console.log(`Distance: ${Math.round(distance)}m, Allowed: ${allowedRadius}m, Within range: ${withinRange}`);

    return new Response(JSON.stringify({ 
      withinRange,
      distance: Math.round(distance),
      allowedRadius,
      needsConfiguration: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in verify-location function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      withinRange: false,
      distance: null,
      allowedRadius: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}