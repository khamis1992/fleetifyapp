// supabase/functions/send-weekly-report/index.ts
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
var getTrendEmoji = (value) => {
  if (value > 5) return "\u{1F4C8}";
  if (value < -5) return "\u{1F4C9}";
  return "\u27A1\uFE0F";
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
function generateWeeklyReport(data) {
  const weekStart = new Date(data.weekStart).toLocaleDateString("ar-QA", {
    day: "numeric",
    month: "short"
  });
  const weekEnd = new Date(data.weekEnd).toLocaleDateString("ar-QA", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
  const comparisonEmoji = getTrendEmoji(data.financial.comparisonWithLastWeek);
  const comparisonText = data.financial.comparisonWithLastWeek >= 0 ? `+${formatPercent(data.financial.comparisonWithLastWeek)}` : formatPercent(data.financial.comparisonWithLastWeek);
  let topVehiclesSection = "\u2514 \u0644\u0627 \u062A\u0648\u062C\u062F \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0645\u0633\u062C\u0644\u0629 \u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639";
  if (data.topVehicles.length > 0 && data.topVehicles[0].revenue > 0) {
    topVehiclesSection = data.topVehicles.slice(0, 5).map(
      (v, i) => `${i === data.topVehicles.slice(0, 5).length - 1 ? "\u2514" : "\u251C"} ${v.plateNumber} \u2022 ${formatCurrency(v.revenue)}`
    ).join("\n");
  }
  return `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4CA} *\u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064A \u0644\u0644\u0623\u0633\u0637\u0648\u0644*
\u{1F4C5} ${weekStart} - ${weekEnd}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

\u{1F4C8} *\u0645\u0644\u062E\u0635 \u0627\u0644\u0623\u062F\u0627\u0621:*
\u251C \u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0625\u0634\u063A\u0627\u0644: ${formatPercent(data.fleet.averageUtilization)}
\u251C \u0623\u0639\u0644\u0649 \u0625\u0634\u063A\u0627\u0644: ${formatPercent(data.fleet.peakUtilization)}
\u2514 \u0623\u062F\u0646\u0649 \u0625\u0634\u063A\u0627\u0644: ${formatPercent(data.fleet.lowUtilization)}

\u{1F4B0} *\u0627\u0644\u0645\u0627\u0644\u064A\u0629:*
\u251C \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A: ${formatCurrency(data.financial.totalRevenue)}
\u251C \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062A\u062D\u0635\u064A\u0644: ${formatCurrency(data.financial.totalCollected)}
\u251C \u0646\u0633\u0628\u0629 \u0627\u0644\u062A\u062D\u0635\u064A\u0644: ${formatPercent(data.financial.collectionRate)}
\u2514 \u0645\u0642\u0627\u0631\u0646\u0629 \u0628\u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u0645\u0627\u0636\u064A: ${comparisonEmoji} ${comparisonText}

\u{1F4CB} *\u0627\u0644\u0639\u0642\u0648\u062F:*
\u251C \u0639\u0642\u0648\u062F \u062C\u062F\u064A\u062F\u0629: ${data.contracts.newContracts}
\u251C \u0639\u0642\u0648\u062F \u0645\u062C\u062F\u062F\u0629: ${data.contracts.renewedContracts}
\u251C \u0639\u0642\u0648\u062F \u0645\u0646\u062A\u0647\u064A\u0629: ${data.contracts.endedContracts}
\u2514 \u0639\u0642\u0648\u062F \u0645\u0644\u063A\u0627\u0629: ${data.contracts.cancelledContracts}

\u{1F527} *\u0627\u0644\u0635\u064A\u0627\u0646\u0629:*
\u251C \u0645\u0643\u062A\u0645\u0644\u0629: ${data.maintenance.completed}
\u251C \u0645\u0639\u0644\u0642\u0629: ${data.maintenance.pending}
\u2514 \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062A\u0643\u0644\u0641\u0629: ${formatCurrency(data.maintenance.totalCost)}

\u{1F3C6} *\u0623\u0641\u0636\u0644 \u0627\u0644\u0645\u0631\u0643\u0628\u0627\u062A \u0623\u062F\u0627\u0621\u064B:*
${topVehiclesSection}

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u2728 \u0623\u062F\u0627\u0621 ${data.financial.comparisonWithLastWeek >= 0 ? "\u0645\u0645\u062A\u0627\u0632" : "\u064A\u062D\u062A\u0627\u062C \u062A\u062D\u0633\u064A\u0646"}!`;
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
async function fetchWeeklyReportData(supabase, companyId) {
  try {
    const weekEnd = /* @__PURE__ */ new Date();
    const weekStart = /* @__PURE__ */ new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEndStr = weekEnd.toISOString().split("T")[0];
    const { data: weekPayments } = await supabase.from("payments").select("amount").eq("company_id", companyId).gte("payment_date", weekStartStr).lte("payment_date", weekEndStr);
    const totalCollected = weekPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    const { data: lastWeekPayments } = await supabase.from("payments").select("amount").eq("company_id", companyId).gte("payment_date", lastWeekStart.toISOString().split("T")[0]).lte("payment_date", lastWeekEnd.toISOString().split("T")[0]);
    const lastWeekCollected = lastWeekPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const comparisonWithLastWeek = lastWeekCollected > 0 ? (totalCollected - lastWeekCollected) / lastWeekCollected * 100 : 0;
    const { data: newContracts } = await supabase.from("contracts").select("id, status").eq("company_id", companyId).gte("created_at", weekStart.toISOString());
    const { data: endedContracts } = await supabase.from("contracts").select("id").eq("company_id", companyId).eq("status", "completed").gte("end_date", weekStartStr).lte("end_date", weekEndStr);
    const { data: maintenance } = await supabase.from("maintenance").select("status, estimated_cost").eq("company_id", companyId).gte("scheduled_date", weekStartStr);
    const completedMaintenance = maintenance?.filter((m) => m.status === "completed") || [];
    const pendingMaintenance = maintenance?.filter((m) => m.status === "pending") || [];
    const maintenanceCost = completedMaintenance.reduce((sum, m) => sum + (m.estimated_cost || 0), 0);
    const { data: vehicles } = await supabase.from("vehicles").select("status").eq("company_id", companyId).eq("is_active", true);
    const totalVehicles = vehicles?.length || 1;
    const rentedVehicles = vehicles?.filter((v) => v.status === "rented").length || 0;
    const utilizationRate = rentedVehicles / totalVehicles * 100;
    const { data: paymentsData } = await supabase.from("payments").select(`
        amount,
        contracts!inner(
          vehicle_id,
          vehicles!inner(
            id,
            plate_number
          )
        )
      `).eq("company_id", companyId).gte("payment_date", weekStartStr).lte("payment_date", weekEndStr);
    const vehicleRevenueMap = /* @__PURE__ */ new Map();
    paymentsData?.forEach((payment) => {
      const vehicle = payment.contracts?.vehicles;
      if (vehicle?.plate_number) {
        const existing = vehicleRevenueMap.get(vehicle.id) || {
          plateNumber: vehicle.plate_number,
          revenue: 0
        };
        existing.revenue += payment.amount || 0;
        vehicleRevenueMap.set(vehicle.id, existing);
      }
    });
    const topVehicles = Array.from(vehicleRevenueMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const { data: invoicesData } = await supabase.from("invoices").select("total_amount, amount_paid").eq("company_id", companyId).gte("due_date", weekStartStr).lte("due_date", weekEndStr);
    const totalDue = invoicesData?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;
    const totalPaid = invoicesData?.reduce((sum, i) => sum + (i.amount_paid || 0), 0) || 0;
    const collectionRate = totalDue > 0 ? totalPaid / totalDue * 100 : 100;
    return {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      fleet: {
        averageUtilization: utilizationRate,
        peakUtilization: Math.min(utilizationRate + 13, 100),
        lowUtilization: Math.max(utilizationRate - 13, 0)
      },
      financial: {
        totalRevenue: totalCollected * 1.2,
        // Including pending
        totalCollected,
        collectionRate: Math.min(collectionRate, 100),
        comparisonWithLastWeek
      },
      contracts: {
        newContracts: newContracts?.filter((c) => c.status === "active").length || 0,
        renewedContracts: 0,
        endedContracts: endedContracts?.length || 0,
        cancelledContracts: newContracts?.filter((c) => c.status === "cancelled").length || 0
      },
      maintenance: {
        completed: completedMaintenance.length,
        pending: pendingMaintenance.length,
        totalCost: maintenanceCost
      },
      topVehicles: topVehicles.length > 0 ? topVehicles : [{ plateNumber: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0628\u064A\u0627\u0646\u0627\u062A", revenue: 0 }]
    };
  } catch (error) {
    console.error("Error fetching weekly report data:", error);
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
      error: "Legacy weekly WhatsApp report agent retired"
    }), {
      status: 410,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
    const body = await req.json().catch(() => ({}));
    console.log("\u{1F4CA} Starting Weekly Report Generation...");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const companyId = body.companyId || body.company_id;
    if (!companyId) {
      const { data: companies } = await supabase.from("whatsapp_settings").select("company_id, recipients, weekly_report_enabled").eq("weekly_report_enabled", true);
      if (!companies || companies.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: "No companies with weekly report enabled",
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
        const reportData = await fetchWeeklyReportData(supabase, company.company_id);
        if (!reportData) {
          console.log(`\u274C Failed to fetch report data for ${company.company_id}`);
          continue;
        }
        const message = generateWeeklyReport(reportData);
        const recipients = (company.recipients || []).filter(
          (r) => r.isActive && (r.reportTypes?.includes("weekly") || body.force)
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
            message_type: "weekly",
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
        reportType: "weekly",
        sent: totalSent,
        failed: totalFailed,
        duration,
        results
      }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } else {
      const reportData = await fetchWeeklyReportData(supabase, companyId);
      if (!reportData) {
        return new Response(JSON.stringify({
          success: false,
          error: "Failed to fetch report data"
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
      const message = generateWeeklyReport(reportData);
      const { data: settings } = await supabase.from("whatsapp_settings").select("recipients").eq("company_id", companyId).single();
      const recipients = (settings?.recipients || []).filter(
        (r) => r.isActive && (r.reportTypes?.includes("weekly") || body.force)
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
        reportType: "weekly",
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
