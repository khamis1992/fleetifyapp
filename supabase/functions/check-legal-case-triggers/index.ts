// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutoCreateTriggerConfig {
  id: string;
  company_id: string;
  enable_overdue_invoice_trigger: boolean;
  overdue_days_threshold: number;
  enable_overdue_amount_trigger: boolean;
  overdue_amount_threshold: number;
  enable_broken_promises_trigger: boolean;
  broken_promises_count: number;
  auto_case_priority: string;
  auto_case_type: string;
  notify_on_auto_create: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('Starting legal case triggers check...');

    // Get all active trigger configs
    const { data: configs, error: configError } = await supabaseClient
      .from('legal_case_auto_triggers')
      .select('*');

    if (configError) {
      throw configError;
    }

    if (!configs || configs.length === 0) {
      console.log('No trigger configs found');
      return new Response(
        JSON.stringify({ success: true, message: 'No configs to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${configs.length} trigger config(s)`);

    let totalCasesCreated = 0;

    for (const config of configs as AutoCreateTriggerConfig[]) {
      console.log(`Processing config for company: ${config.company_id}`);

      // Check Trigger 1: Overdue Invoices
      if (config.enable_overdue_invoice_trigger) {
        const casesCreated = await checkOverdueInvoices(supabaseClient, config);
        totalCasesCreated += casesCreated;
        console.log(`Created ${casesCreated} cases from overdue invoices`);
      }

      // Check Trigger 2: Overdue Amount
      if (config.enable_overdue_amount_trigger) {
        const casesCreated = await checkOverdueAmount(supabaseClient, config);
        totalCasesCreated += casesCreated;
        console.log(`Created ${casesCreated} cases from overdue amounts`);
      }

      // Check Trigger 3: Broken Promises
      if (config.enable_broken_promises_trigger) {
        const casesCreated = await checkBrokenPromises(supabaseClient, config);
        totalCasesCreated += casesCreated;
        console.log(`Created ${casesCreated} cases from broken promises`);
      }
    }

    console.log(`Total cases created: ${totalCasesCreated}`);

    return new Response(
      JSON.stringify({
        success: true,
        casesCreated: totalCasesCreated,
        configsProcessed: configs.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in check-legal-case-triggers:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function checkOverdueInvoices(supabaseClient: any, config: AutoCreateTriggerConfig): Promise<number> {
  try {
    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.overdue_days_threshold);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    // Find overdue invoices that don't have an associated legal case
    const { data: overdueInvoices, error } = await supabaseClient
      .from('invoices')
      .select(`
        id,
        customer_id,
        contract_id,
        total_amount,
        due_date,
        status,
        customers (
          id,
          name,
          phone
        )
      `)
      .eq('company_id', config.company_id)
      .eq('status', 'overdue')
      .lte('due_date', cutoffDateStr)
      .is('legal_case_id', null);

    if (error) throw error;

    if (!overdueInvoices || overdueInvoices.length === 0) {
      return 0;
    }

    let casesCreated = 0;

    for (const invoice of overdueInvoices) {
      // Create legal case
      const { data: newCase, error: caseError } = await supabaseClient
        .from('legal_cases')
        .insert({
          company_id: config.company_id,
          customer_id: invoice.customer_id,
          contract_id: invoice.contract_id,
          case_number: `AUTO-${Date.now()}-${invoice.id.substring(0, 8)}`,
          title: `تحصيل فاتورة متأخرة - ${invoice.customers?.name || 'عميل'}`,
          description: `تم إنشاء هذه القضية تلقائياً بسبب تأخر الفاتورة ${config.overdue_days_threshold}+ يوم`,
          case_type: config.auto_case_type,
          priority: config.auto_case_priority,
          status: 'active',
          total_cost: invoice.total_amount || 0,
          auto_created: true,
        })
        .select()
        .single();

      if (caseError) {
        console.error('Error creating case:', caseError);
        continue;
      }

      // Update invoice with legal_case_id
      await supabaseClient
        .from('invoices')
        .update({ legal_case_id: newCase.id })
        .eq('id', invoice.id);

      casesCreated++;

      // Send notification if enabled
      if (config.notify_on_auto_create) {
        await sendNotification(supabaseClient, config.company_id, newCase);
      }
    }

    return casesCreated;
  } catch (error) {
    console.error('Error in checkOverdueInvoices:', error);
    return 0;
  }
}

async function checkOverdueAmount(supabaseClient: any, config: AutoCreateTriggerConfig): Promise<number> {
  try {
    // Find customers with total overdue amount exceeding threshold
    const { data: customers, error } = await supabaseClient
      .rpc('get_customers_with_overdue_amount', {
        p_company_id: config.company_id,
        p_threshold: config.overdue_amount_threshold,
      });

    if (error) throw error;

    if (!customers || customers.length === 0) {
      return 0;
    }

    let casesCreated = 0;

    for (const customer of customers) {
      // Check if customer already has an active auto-created case for overdue amount
      const { data: existingCase } = await supabaseClient
        .from('legal_cases')
        .select('id')
        .eq('customer_id', customer.customer_id)
        .eq('company_id', config.company_id)
        .eq('auto_created', true)
        .eq('status', 'active')
        .contains('description', 'إجمالي المبلغ المتأخر')
        .maybeSingle();

      if (existingCase) {
        continue; // Skip if already has a case
      }

      // Create legal case
      const { data: newCase, error: caseError } = await supabaseClient
        .from('legal_cases')
        .insert({
          company_id: config.company_id,
          customer_id: customer.customer_id,
          case_number: `AUTO-${Date.now()}-${customer.customer_id.substring(0, 8)}`,
          title: `تحصيل مبالغ متأخرة - ${customer.customer_name || 'عميل'}`,
          description: `تم إنشاء هذه القضية تلقائياً بسبب تجاوز إجمالي المبلغ المتأخر ${config.overdue_amount_threshold.toLocaleString('ar-SA')} ر.س`,
          case_type: config.auto_case_type,
          priority: config.auto_case_priority,
          status: 'active',
          total_cost: customer.total_overdue || 0,
          auto_created: true,
        })
        .select()
        .single();

      if (caseError) {
        console.error('Error creating case:', caseError);
        continue;
      }

      casesCreated++;

      // Send notification if enabled
      if (config.notify_on_auto_create) {
        await sendNotification(supabaseClient, config.company_id, newCase);
      }
    }

    return casesCreated;
  } catch (error) {
    console.error('Error in checkOverdueAmount:', error);
    return 0;
  }
}

async function checkBrokenPromises(supabaseClient: any, config: AutoCreateTriggerConfig): Promise<number> {
  try {
    // Find customers with broken promises count exceeding threshold
    const { data: customers, error } = await supabaseClient
      .rpc('get_customers_with_broken_promises', {
        p_company_id: config.company_id,
        p_threshold: config.broken_promises_count,
      });

    if (error) throw error;

    if (!customers || customers.length === 0) {
      return 0;
    }

    let casesCreated = 0;

    for (const customer of customers) {
      // Check if customer already has an active auto-created case for broken promises
      const { data: existingCase } = await supabaseClient
        .from('legal_cases')
        .select('id')
        .eq('customer_id', customer.customer_id)
        .eq('company_id', config.company_id)
        .eq('auto_created', true)
        .eq('status', 'active')
        .contains('description', 'وعود الدفع المكسورة')
        .maybeSingle();

      if (existingCase) {
        continue; // Skip if already has a case
      }

      // Create legal case
      const { data: newCase, error: caseError } = await supabaseClient
        .from('legal_cases')
        .insert({
          company_id: config.company_id,
          customer_id: customer.customer_id,
          case_number: `AUTO-${Date.now()}-${customer.customer_id.substring(0, 8)}`,
          title: `وعود دفع مكسورة - ${customer.customer_name || 'عميل'}`,
          description: `تم إنشاء هذه القضية تلقائياً بسبب كسر ${customer.broken_promises_count} وعود دفع`,
          case_type: config.auto_case_type,
          priority: config.auto_case_priority,
          status: 'active',
          total_cost: 0,
          auto_created: true,
        })
        .select()
        .single();

      if (caseError) {
        console.error('Error creating case:', caseError);
        continue;
      }

      casesCreated++;

      // Send notification if enabled
      if (config.notify_on_auto_create) {
        await sendNotification(supabaseClient, config.company_id, newCase);
      }
    }

    return casesCreated;
  } catch (error) {
    console.error('Error in checkBrokenPromises:', error);
    return 0;
  }
}

async function sendNotification(supabaseClient: any, companyId: string, legalCase: any): Promise<void> {
  try {
    // Create notification record
    await supabaseClient
      .from('notifications')
      .insert({
        company_id: companyId,
        title: 'قضية قانونية جديدة تم إنشاؤها تلقائياً',
        message: `تم إنشاء القضية ${legalCase.case_number} تلقائياً: ${legalCase.title}`,
        type: 'legal_case_auto_created',
        reference_id: legalCase.id,
        priority: legalCase.priority,
      });

    console.log(`Notification sent for case: ${legalCase.case_number}`);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/check-legal-case-triggers' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json'

*/
