// supabase/functions/check-legal-case-triggers/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return new Response(JSON.stringify({
    success: false,
    error: "Legacy automatic legal-case trigger retired",
    replacement: "legal-notice-agent + taqadi-filing-agent"
  }), {
    status: 410,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    console.log("Starting legal case triggers check...");
    const { data: configs, error: configError } = await supabaseClient.from("legal_case_auto_triggers").select("*");
    if (configError) {
      throw configError;
    }
    if (!configs || configs.length === 0) {
      console.log("No trigger configs found");
      return new Response(
        JSON.stringify({ success: true, message: "No configs to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log(`Found ${configs.length} trigger config(s)`);
    let totalCasesCreated = 0;
    for (const config of configs) {
      console.log(`Processing config for company: ${config.company_id}`);
      if (config.enable_overdue_invoice_trigger) {
        const casesCreated = await checkOverdueInvoices(supabaseClient, config);
        totalCasesCreated += casesCreated;
        console.log(`Created ${casesCreated} cases from overdue invoices`);
      }
      if (config.enable_overdue_amount_trigger) {
        const casesCreated = await checkOverdueAmount(supabaseClient, config);
        totalCasesCreated += casesCreated;
        console.log(`Created ${casesCreated} cases from overdue amounts`);
      }
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
        configsProcessed: configs.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-legal-case-triggers:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
async function checkOverdueInvoices(supabaseClient, config) {
  try {
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.overdue_days_threshold);
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];
    const { data: overdueInvoices, error } = await supabaseClient.from("invoices").select(`
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
      `).eq("company_id", config.company_id).eq("status", "overdue").lte("due_date", cutoffDateStr).is("legal_case_id", null);
    if (error) throw error;
    if (!overdueInvoices || overdueInvoices.length === 0) {
      return 0;
    }
    let casesCreated = 0;
    for (const invoice of overdueInvoices) {
      const { data: newCase, error: caseError } = await supabaseClient.from("legal_cases").insert({
        company_id: config.company_id,
        customer_id: invoice.customer_id,
        contract_id: invoice.contract_id,
        case_number: `AUTO-${Date.now()}-${invoice.id.substring(0, 8)}`,
        title: `\u062A\u062D\u0635\u064A\u0644 \u0641\u0627\u062A\u0648\u0631\u0629 \u0645\u062A\u0623\u062E\u0631\u0629 - ${invoice.customers?.name || "\u0639\u0645\u064A\u0644"}`,
        description: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0647\u0630\u0647 \u0627\u0644\u0642\u0636\u064A\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0628\u0633\u0628\u0628 \u062A\u0623\u062E\u0631 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629 ${config.overdue_days_threshold}+ \u064A\u0648\u0645`,
        case_type: config.auto_case_type,
        priority: config.auto_case_priority,
        status: "active",
        total_cost: invoice.total_amount || 0,
        auto_created: true
      }).select().single();
      if (caseError) {
        console.error("Error creating case:", caseError);
        continue;
      }
      await supabaseClient.from("invoices").update({ legal_case_id: newCase.id }).eq("id", invoice.id);
      casesCreated++;
      if (config.notify_on_auto_create) {
        await sendNotification(supabaseClient, config.company_id, newCase);
      }
    }
    return casesCreated;
  } catch (error) {
    console.error("Error in checkOverdueInvoices:", error);
    return 0;
  }
}
async function checkOverdueAmount(supabaseClient, config) {
  try {
    const { data: customers, error } = await supabaseClient.rpc("get_customers_with_overdue_amount", {
      p_company_id: config.company_id,
      p_threshold: config.overdue_amount_threshold
    });
    if (error) throw error;
    if (!customers || customers.length === 0) {
      return 0;
    }
    let casesCreated = 0;
    for (const customer of customers) {
      const { data: existingCase } = await supabaseClient.from("legal_cases").select("id").eq("customer_id", customer.customer_id).eq("company_id", config.company_id).eq("auto_created", true).eq("status", "active").contains("description", "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u062A\u0623\u062E\u0631").maybeSingle();
      if (existingCase) {
        continue;
      }
      const { data: newCase, error: caseError } = await supabaseClient.from("legal_cases").insert({
        company_id: config.company_id,
        customer_id: customer.customer_id,
        case_number: `AUTO-${Date.now()}-${customer.customer_id.substring(0, 8)}`,
        title: `\u062A\u062D\u0635\u064A\u0644 \u0645\u0628\u0627\u0644\u063A \u0645\u062A\u0623\u062E\u0631\u0629 - ${customer.customer_name || "\u0639\u0645\u064A\u0644"}`,
        description: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0647\u0630\u0647 \u0627\u0644\u0642\u0636\u064A\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0628\u0633\u0628\u0628 \u062A\u062C\u0627\u0648\u0632 \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0628\u0644\u063A \u0627\u0644\u0645\u062A\u0623\u062E\u0631 ${config.overdue_amount_threshold.toLocaleString("ar-SA")} \u0631.\u0633`,
        case_type: config.auto_case_type,
        priority: config.auto_case_priority,
        status: "active",
        total_cost: customer.total_overdue || 0,
        auto_created: true
      }).select().single();
      if (caseError) {
        console.error("Error creating case:", caseError);
        continue;
      }
      casesCreated++;
      if (config.notify_on_auto_create) {
        await sendNotification(supabaseClient, config.company_id, newCase);
      }
    }
    return casesCreated;
  } catch (error) {
    console.error("Error in checkOverdueAmount:", error);
    return 0;
  }
}
async function checkBrokenPromises(supabaseClient, config) {
  try {
    const { data: customers, error } = await supabaseClient.rpc("get_customers_with_broken_promises", {
      p_company_id: config.company_id,
      p_threshold: config.broken_promises_count
    });
    if (error) throw error;
    if (!customers || customers.length === 0) {
      return 0;
    }
    let casesCreated = 0;
    for (const customer of customers) {
      const { data: existingCase } = await supabaseClient.from("legal_cases").select("id").eq("customer_id", customer.customer_id).eq("company_id", config.company_id).eq("auto_created", true).eq("status", "active").contains("description", "\u0648\u0639\u0648\u062F \u0627\u0644\u062F\u0641\u0639 \u0627\u0644\u0645\u0643\u0633\u0648\u0631\u0629").maybeSingle();
      if (existingCase) {
        continue;
      }
      const { data: newCase, error: caseError } = await supabaseClient.from("legal_cases").insert({
        company_id: config.company_id,
        customer_id: customer.customer_id,
        case_number: `AUTO-${Date.now()}-${customer.customer_id.substring(0, 8)}`,
        title: `\u0648\u0639\u0648\u062F \u062F\u0641\u0639 \u0645\u0643\u0633\u0648\u0631\u0629 - ${customer.customer_name || "\u0639\u0645\u064A\u0644"}`,
        description: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0647\u0630\u0647 \u0627\u0644\u0642\u0636\u064A\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0628\u0633\u0628\u0628 \u0643\u0633\u0631 ${customer.broken_promises_count} \u0648\u0639\u0648\u062F \u062F\u0641\u0639`,
        case_type: config.auto_case_type,
        priority: config.auto_case_priority,
        status: "active",
        total_cost: 0,
        auto_created: true
      }).select().single();
      if (caseError) {
        console.error("Error creating case:", caseError);
        continue;
      }
      casesCreated++;
      if (config.notify_on_auto_create) {
        await sendNotification(supabaseClient, config.company_id, newCase);
      }
    }
    return casesCreated;
  } catch (error) {
    console.error("Error in checkBrokenPromises:", error);
    return 0;
  }
}
async function sendNotification(supabaseClient, companyId, legalCase) {
  try {
    await supabaseClient.from("notifications").insert({
      company_id: companyId,
      title: "\u0642\u0636\u064A\u0629 \u0642\u0627\u0646\u0648\u0646\u064A\u0629 \u062C\u062F\u064A\u062F\u0629 \u062A\u0645 \u0625\u0646\u0634\u0627\u0624\u0647\u0627 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B",
      message: `\u062A\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0642\u0636\u064A\u0629 ${legalCase.case_number} \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B: ${legalCase.title}`,
      type: "legal_case_auto_created",
      reference_id: legalCase.id,
      priority: legalCase.priority
    });
    console.log(`Notification sent for case: ${legalCase.case_number}`);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}
