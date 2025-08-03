import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuotationApprovalRequest {
  token: string;
  action: 'approve' | 'reject';
  comments?: string;
  customer_signature?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      // Get quotation details by token
      const url = new URL(req.url);
      const token = url.searchParams.get('token');
      
      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Missing approval token' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Get quotation by approval token with simpler approach
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .select('*')
        .eq('approval_token', token)
        .single();

      if (quotationError || !quotation) {
        console.error('Quotation fetch error:', quotationError);
        return new Response(
          JSON.stringify({ error: 'Invalid or expired approval token' }),
          { 
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Get related data separately to avoid relationship issues
      const [customerResult, vehicleResult, companyResult] = await Promise.all([
        supabase.from('customers').select('id, first_name, last_name, company_name, customer_type, phone, email').eq('id', quotation.customer_id).single(),
        quotation.vehicle_id ? supabase.from('vehicles').select('id, make, model, year, plate_number').eq('id', quotation.vehicle_id).single() : { data: null, error: null },
        supabase.from('companies').select('id, name, name_ar, logo_url, phone, email, address').eq('id', quotation.company_id).single()
      ]);

      // Combine the data
      const enrichedQuotation = {
        ...quotation,
        customers: customerResult.data,
        vehicles: vehicleResult.data,
        companies: companyResult.data
      };

      // Check if token is expired
      if (quotation.approval_expires_at && new Date(quotation.approval_expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Approval token has expired' }),
          { 
            status: 410,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Check if already processed
      if (quotation.approved_by_client !== null) {
        return new Response(
          JSON.stringify({ 
            error: 'This quotation has already been processed',
            quotation: enrichedQuotation 
          }),
          { 
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({ quotation: enrichedQuotation }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (req.method === 'POST') {
      // Process approval/rejection
      const requestData: QuotationApprovalRequest = await req.json();
      const { token, action, comments, customer_signature } = requestData;

      if (!token || !action) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Get quotation by approval token
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .select('*')
        .eq('approval_token', token)
        .single();

      if (quotationError || !quotation) {
        return new Response(
          JSON.stringify({ error: 'Invalid approval token' }),
          { 
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Check if token is expired
      if (quotation.approval_expires_at && new Date(quotation.approval_expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Approval token has expired' }),
          { 
            status: 410,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Check if already processed
      if (quotation.approved_by_client !== null) {
        return new Response(
          JSON.stringify({ error: 'This quotation has already been processed' }),
          { 
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Update quotation with approval/rejection
      const updateData = {
        approved_by_client: action === 'approve',
        approved_at: new Date().toISOString(),
        client_comments: comments || null,
        status: action === 'approve' ? 'approved' : 'rejected'
      };

      const { data: updatedQuotation, error: updateError } = await supabase
        .from('quotations')
        .update(updateData)
        .eq('id', quotation.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update quotation' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // If approved, create a contract (optional, based on business logic)
      if (action === 'approve') {
        // Here you could automatically create a contract or notify the company
        console.log(`Quotation ${quotation.quotation_number} approved by client`);
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: action === 'approve' ? 'Quotation approved successfully' : 'Quotation rejected',
          quotation: updatedQuotation
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});