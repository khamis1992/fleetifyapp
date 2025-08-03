import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApprovalRequest {
  token: string;
  action: 'approve' | 'reject';
  comments?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'GET') {
      // Get quotation details by token
      const url = new URL(req.url);
      const token = url.searchParams.get('token');

      if (!token) {
        return new Response(
          JSON.stringify({ error: 'Approval token is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const { data: quotation, error } = await supabase
        .from('quotations')
        .select(`
          *,
          customers (
            id,
            first_name_ar,
            last_name_ar,
            company_name_ar,
            customer_type,
            phone,
            email
          ),
          vehicles (
            id,
            make,
            model,
            year,
            plate_number
          ),
          companies (
            name,
            name_ar,
            phone,
            email,
            logo_url
          )
        `)
        .eq('approval_token', token)
        .single();

      if (error || !quotation) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired approval token' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Check if token has expired
      if (quotation.approval_expires_at && new Date(quotation.approval_expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Approval link has expired' }),
          { status: 410, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Check if already approved/rejected
      if (quotation.status === 'accepted' || quotation.status === 'rejected') {
        return new Response(
          JSON.stringify({ 
            quotation,
            alreadyProcessed: true,
            message: `This quotation has already been ${quotation.status}` 
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ quotation }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (req.method === 'POST') {
      // Process approval/rejection
      const { token, action, comments }: ApprovalRequest = await req.json();
      const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';

      if (!token || !action) {
        return new Response(
          JSON.stringify({ error: 'Token and action are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Get quotation
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .select('*')
        .eq('approval_token', token)
        .single();

      if (quotationError || !quotation) {
        return new Response(
          JSON.stringify({ error: 'Invalid approval token' }),
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Check if token has expired
      if (quotation.approval_expires_at && new Date(quotation.approval_expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Approval link has expired' }),
          { status: 410, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Check if already processed
      if (quotation.status === 'accepted' || quotation.status === 'rejected') {
        return new Response(
          JSON.stringify({ error: `Quotation already ${quotation.status}` }),
          { status: 409, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Update quotation status
      const newStatus = action === 'approve' ? 'accepted' : 'rejected';
      const { error: updateError } = await supabase
        .from('quotations')
        .update({
          status: newStatus,
          approved_by_client: action === 'approve',
          approved_at: action === 'approve' ? new Date().toISOString() : null,
          client_comments: comments || null
        })
        .eq('id', quotation.id);

      if (updateError) {
        console.error('Error updating quotation:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to process approval' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Log the approval action
      await supabase
        .from('quotation_approval_log')
        .insert({
          quotation_id: quotation.id,
          company_id: quotation.company_id,
          action: action === 'approve' ? 'approved' : 'rejected',
          client_ip: clientIP,
          client_user_agent: userAgent,
          comments: comments || null
        });

      // Create notification for company users
      const notificationTitle = action === 'approve' 
        ? 'Quotation Approved by Client' 
        : 'Quotation Rejected by Client';
      
      const notificationMessage = action === 'approve'
        ? `Quotation #${quotation.quotation_number} has been approved by the client.`
        : `Quotation #${quotation.quotation_number} has been rejected by the client.`;

      // Get company users to notify
      const { data: companyUsers } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('company_id', quotation.company_id);

      if (companyUsers) {
        const notifications = companyUsers.map(user => ({
          company_id: quotation.company_id,
          user_id: user.user_id,
          title: notificationTitle,
          message: notificationMessage,
          notification_type: action === 'approve' ? 'success' : 'info',
          related_id: quotation.id,
          related_type: 'quotation'
        }));

        await supabase
          .from('user_notifications')
          .insert(notifications);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Quotation ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
          action: newStatus
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Error in quotation-approval function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);