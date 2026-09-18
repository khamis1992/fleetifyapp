// supabase/functions/send-daily-report/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
var ULTRAMSG_INSTANCE_ID = Deno.env.get("ULTRAMSG_INSTANCE_ID") || "";
var ULTRAMSG_TOKEN = Deno.env.get("ULTRAMSG_TOKEN") || "";
var SUPABASE_URL = Deno.env.get("SUPABASE_URL");
var SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
var formatNumber = (num) => {
  return num.toLocaleString("en-US");
};
var formatCurrency = (amount, currency = "\u0631.\u0642") => {
  return `${formatNumber(Math.round(amount))} ${currency}`;
};
var formatPercent = (value) => {
  return `${value.toFixed(1)}%`;
};
function formatPhone(phone) {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.substring(2);
  }
  if (!cleaned.startsWith("974") && cleaned.length === 8) {
    cleaned = "974" + cleaned;
  }
  return cleaned;
}
function generateDailyReport(data) {
  const date = new Date(data.date).toLocaleDateString("ar-QA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const hasAlerts = data.alerts.maintenanceNeeded + data.alerts.licensesExpiring + data.alerts.insurancesExpiring + data.alerts.overduePayments > 0;
  let alertsSection = "\u2705 *\u0644\u0627 \u062A\u0648\u062C\u062F \u062A\u0646\u0628\u064A\u0647\u0627\u062A*";
  if (hasAlerts) {
    const alertLines = [];
    if (data.alerts.maintenanceNeeded > 0) alertLines.push(`\u251C \u0635\u064A\u0627\u0646\u0629 \u0645\u0637\u0644\u0648\u0628\u0629: ${data.alerts.maintenanceNeeded} \u0645\u0631\u0643\u0628\u0629`);
    if (data.alerts.licensesExpiring > 0) alertLines.push(`\u251C \u0631\u062E\u0635 \u062A\u0646\u062A\u0647\u064A \u0642\u0631\u064A\u0628\u0627\u064B: ${data.alerts.licensesExpiring}`);
    if (data.alerts.insurancesExpiring > 0) alertLines.push(`\u251C \u062A\u0623\u0645\u064A\u0646 \u064A\u0646\u062A\u0647\u064A \u0642\u0631\u064A\u0628\u0627\u064B: ${data.alerts.insurancesExpiring}`);
    if (data.alerts.overduePayments > 0) alertLines.push(`\u2514 \u0645\u062F\u0641\u0648\u0639\u0627\u062A \u0645\u062A\u0623\u062E\u0631\u0629: ${data.alerts.overduePayments}`);
    alertsSection = `\u26A0\uFE0F *\u062A\u0646\u0628\u064A\u0647\u0627\u062A:*
${alertLines.join("\n")}`;
  }
  return `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4CA} *\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0623\u0633\u0637\u0648\u0644 \u0627\u0644\u064A\u0648\u0645\u064A*
\u{1F4C5} ${date}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

\u{1F697} *\u062D\u0627\u0644\u0629 \u0627\u0644\u0623\u0633\u0637\u0648\u0644:*
\u251C \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0631\u0643\u0628\u0627\u062A: ${formatNumber(data.fleet.total)}
\u251C \u0645\u062A\u0627\u062D\u0629: ${formatNumber(data.fleet.available)} \u2705
\u251C \u0645\u0624\u062C\u0631\u0629: ${formatNumber(data.fleet.rented)} \u{1F534}
\u251C \u0635\u064A\u0627\u0646\u0629: ${formatNumber(data.fleet.maintenance)} \u{1F527}
\u251C \u0645\u062D\u062C\u0648\u0632\u0629: ${formatNumber(data.fleet.reserved)} \u{1F4CC}
\u2514 \u0646\u0633\u0628\u0629 \u0627\u0644\u0625\u0634\u063A\u0627\u0644: ${formatPercent(data.fleet.utilizationRate)}

\u{1F4B0} *\u0627\u0644\u0645\u0627\u0644\u064A\u0629:*
\u251C \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u064A\u0648\u0645: ${formatCurrency(data.financial.todayRevenue)}
\u251C \u0627\u0644\u0645\u062A\u062D\u0635\u0644: ${formatCurrency(data.financial.todayCollected)}
\u251C \u0627\u0644\u0645\u0633\u062A\u062D\u0642 \u0627\u0644\u0643\u0644\u064A: ${formatCurrency(data.financial.totalOutstanding)}
\u2514 \u0627\u0644\u0645\u062A\u0623\u062E\u0631: ${formatCurrency(data.financial.overdueAmount)}

\u{1F4CB} *\u0627\u0644\u0639\u0642\u0648\u062F:*
\u251C \u0639\u0642\u0648\u062F \u062C\u062F\u064A\u062F\u0629: ${data.contracts.newToday}
\u251C \u0639\u0642\u0648\u062F \u0645\u0646\u062A\u0647\u064A\u0629: ${data.contracts.endedToday}
\u2514 \u062A\u0646\u062A\u0647\u064A \u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639: ${data.contracts.expiringThisWeek}

${alertsSection}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F517} \u0644\u0644\u062A\u0641\u0627\u0635\u064A\u0644: \u0627\u0641\u062A\u062D \u0627\u0644\u062A\u0637\u0628\u064A\u0642`;
}
async function sendWhatsAppMessage(phone, message) {
  try {
    const formattedPhone = formatPhone(phone);
    console.log(`\u{1F4DE} Sending to: ${formattedPhone}`);
    const response = await fetch(
      `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          token: ULTRAMSG_TOKEN,
          to: formattedPhone,
          body: message
        })
      }
    );
    const data = await response.json();
    console.log("\u{1F4E5} Ultramsg Response:", JSON.stringify(data));
    if (data.sent === "true" || data.sent === true || data.id) {
      return { success: true, messageId: data.id };
    } else {
      return { success: false, error: data.error || data.message || "Unknown error" };
    }
  } catch (error) {
    console.error("\u274C Error sending message:", error);
    return { success: false, error: error.message };
  }
}
async function fetchDailyReportData(supabase, companyId) {
  try {
    const { data: vehicles } = await supabase.from("vehicles").select("status").eq("company_id", companyId).eq("is_active", true);
    const fleetStatus = {
      total: vehicles?.length || 0,
      available: vehicles?.filter((v) => v.status === "available").length || 0,
      rented: vehicles?.filter((v) => v.status === "rented").length || 0,
      maintenance: vehicles?.filter((v) => v.status === "maintenance").length || 0,
      reserved: vehicles?.filter((v) => v.status === "reserved").length || 0,
      utilizationRate: 0
    };
    fleetStatus.utilizationRate = fleetStatus.total > 0 ? fleetStatus.rented / fleetStatus.total * 100 : 0;
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const { data: todayPayments } = await supabase.from("payments").select("amount").eq("company_id", companyId).gte("payment_date", today);
    const todayCollected = todayPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const { data: invoices } = await supabase.from("invoices").select("total_amount, amount_paid, status, due_date").eq("company_id", companyId).in("status", ["pending", "partially_paid", "overdue"]);
    const totalOutstanding = invoices?.reduce((sum, i) => sum + ((i.total_amount || 0) - (i.amount_paid || 0)), 0) || 0;
    const overdueAmount = invoices?.filter((i) => new Date(i.due_date) < /* @__PURE__ */ new Date()).reduce((sum, i) => sum + ((i.total_amount || 0) - (i.amount_paid || 0)), 0) || 0;
    const { data: newContracts } = await supabase.from("contracts").select("id").eq("company_id", companyId).gte("created_at", today);
    const { data: endedContracts } = await supabase.from("contracts").select("id").eq("company_id", companyId).eq("end_date", today);
    const weekEnd = /* @__PURE__ */ new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const { data: expiringContracts } = await supabase.from("contracts").select("id").eq("company_id", companyId).eq("status", "active").lte("end_date", weekEnd.toISOString().split("T")[0]).gte("end_date", today);
    const { data: maintenanceAlerts } = await supabase.from("maintenance").select("id").eq("company_id", companyId).eq("status", "pending");
    return {
      date: today,
      fleet: fleetStatus,
      financial: {
        todayRevenue: todayCollected,
        todayCollected,
        totalOutstanding,
        overdueAmount
      },
      contracts: {
        newToday: newContracts?.length || 0,
        endedToday: endedContracts?.length || 0,
        expiringThisWeek: expiringContracts?.length || 0
      },
      alerts: {
        maintenanceNeeded: maintenanceAlerts?.length || 0,
        licensesExpiring: 0,
        insurancesExpiring: 0,
        overduePayments: invoices?.filter((i) => i.status === "overdue").length || 0
      }
    };
  } catch (error) {
    console.error("Error fetching daily report data:", error);
    return null;
  }
}
serve(async (req) => {
  const startTime = Date.now();
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
        }
      });
    }
    return new Response(JSON.stringify({
      success: false,
      error: "Legacy daily WhatsApp report agent retired"
    }), {
      status: 410,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
    const body = await req.json().catch(() => ({}));
    console.log("\u{1F4CA} Starting Daily Report Generation...");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const companyId = body.companyId || body.company_id;
    if (!companyId) {
      const { data: companies } = await supabase.from("whatsapp_settings").select("company_id, recipients, daily_report_enabled").eq("daily_report_enabled", true);
      if (!companies || companies.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: "No companies with daily report enabled",
          sent: 0
        }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
      let totalSent = 0;
      let totalFailed = 0;
      const results = [];
      for (const company of companies) {
        console.log(`
\u{1F4CB} Processing company: ${company.company_id}`);
        const reportData = await fetchDailyReportData(supabase, company.company_id);
        if (!reportData) {
          console.log(`\u274C Failed to fetch report data for ${company.company_id}`);
          continue;
        }
        const message = generateDailyReport(reportData);
        const recipients = (company.recipients || []).filter(
          (r) => r.isActive && (r.reportTypes?.includes("daily") || body.force)
        );
        for (const recipient of recipients) {
          if (!recipient.phone) continue;
          const result = await sendWhatsAppMessage(recipient.phone, message);
          if (result.success) {
            totalSent++;
            console.log(`\u2705 Sent to ${recipient.name}`);
            results.push({ company: company.company_id, recipient: recipient.name, status: "sent" });
          } else {
            totalFailed++;
            console.log(`\u274C Failed: ${recipient.name} - ${result.error}`);
            results.push({ company: company.company_id, recipient: recipient.name, status: "failed", error: result.error });
          }
          await supabase.from("whatsapp_message_logs").insert({
            company_id: company.company_id,
            recipient_id: recipient.id,
            message_type: "daily",
            status: result.success ? "sent" : "failed",
            content: message.substring(0, 1e3),
            error_message: result.error || null,
            sent_at: result.success ? (/* @__PURE__ */ new Date()).toISOString() : null,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          }).catch((e) => console.error("Failed to log:", e));
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
      const duration = Date.now() - startTime;
      return new Response(JSON.stringify({
        success: true,
        reportType: "daily",
        sent: totalSent,
        failed: totalFailed,
        duration,
        results
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } else {
      const reportData = await fetchDailyReportData(supabase, companyId);
      if (!reportData) {
        return new Response(JSON.stringify({
          success: false,
          error: "Failed to fetch report data"
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
      const message = generateDailyReport(reportData);
      const { data: settings } = await supabase.from("whatsapp_settings").select("recipients").eq("company_id", companyId).single();
      const recipients = (settings?.recipients || []).filter(
        (r) => r.isActive && (r.reportTypes?.includes("daily") || body.force)
      );
      let sentCount = 0;
      let failedCount = 0;
      const results = [];
      for (const recipient of recipients) {
        if (!recipient.phone) continue;
        const result = await sendWhatsAppMessage(recipient.phone, message);
        if (result.success) {
          sentCount++;
          results.push({ recipient: recipient.name, status: "sent" });
        } else {
          failedCount++;
          results.push({ recipient: recipient.name, status: "failed", error: result.error });
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      const duration = Date.now() - startTime;
      return new Response(JSON.stringify({
        success: sentCount > 0,
        reportType: "daily",
        sent: sentCount,
        failed: failedCount,
        duration,
        results
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  } catch (error) {
    console.error("\u{1F4A5} Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
});
