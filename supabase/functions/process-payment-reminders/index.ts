import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Starting payment reminders and late fee processing...");

    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Calculate dates for reminders
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysDate = threeDaysFromNow.toISOString().split("T")[0];

    const results = {
      reminders_sent: 0,
      late_fees_applied: 0,
      overdue_notices_sent: 0,
      errors: [] as string[],
    };

    // 1. Send reminders for invoices due in 3 days
    const { data: upcomingInvoices } = await supabaseClient
      .from("invoices")
      .select(`
        *,
        customers (first_name, last_name, phone),
        contracts (contract_number)
      `)
      .eq("status", "unpaid")
      .eq("due_date", threeDaysDate);

    console.log(`Found ${upcomingInvoices?.length || 0} invoices due in 3 days`);

    for (const invoice of upcomingInvoices || []) {
      try {
        if (invoice.customers?.phone) {
          const message = `
تذكير بالدفع 📢

عزيزي ${invoice.customers.first_name} ${invoice.customers.last_name || ""}،

لديك فاتورة مستحقة خلال 3 أيام:
📄 رقم الفاتورة: ${invoice.invoice_number}
💰 المبلغ: ${invoice.total_amount} ريال
📅 تاريخ الاستحقاق: ${new Date(invoice.due_date).toLocaleDateString("ar-SA")}

يرجى السداد قبل التاريخ المحدد لتجنب غرامات التأخير.

شكراً لتعاونكم.
          `.trim();

          await supabaseClient.functions.invoke("send-whatsapp-reminders", {
            body: {
              phone: invoice.customers.phone,
              message: message,
            },
          });

          results.reminders_sent++;
        }
      } catch (error) {
        console.error(`Error sending reminder for invoice ${invoice.invoice_number}:`, error);
        results.errors.push(`Reminder ${invoice.invoice_number}: ${error.message}`);
      }
    }

    // 2. Process overdue invoices and apply late fees
    const { data: overdueInvoices } = await supabaseClient
      .from("invoices")
      .select(`
        *,
        customers (first_name, last_name, phone),
        contracts (contract_number, late_fine_amount)
      `)
      .eq("status", "unpaid")
      .lt("due_date", today);

    console.log(`Found ${overdueInvoices?.length || 0} overdue invoices`);

    for (const invoice of overdueInvoices || []) {
      try {
        // Calculate days overdue
        const dueDate = new Date(invoice.due_date);
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        // Get late fee rules
        const { data: lateFeeRules } = await supabaseClient
          .from("late_fee_rules")
          .select("*")
          .eq("company_id", invoice.company_id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        let lateFee = 0;

        if (lateFeeRules) {
          if (lateFeeRules.fee_type === "fixed") {
            lateFee = lateFeeRules.fee_amount;
          } else if (lateFeeRules.fee_type === "percentage") {
            lateFee = (invoice.total_amount * lateFeeRules.fee_amount) / 100;
          } else if (lateFeeRules.fee_type === "daily") {
            lateFee = lateFeeRules.fee_amount * daysOverdue;
          }

          // Apply maximum fee if set
          if (lateFeeRules.max_fee_amount && lateFee > lateFeeRules.max_fee_amount) {
            lateFee = lateFeeRules.max_fee_amount;
          }
        }

        // Check if late fee already applied
        const { data: existingLateFee } = await supabaseClient
          .from("late_fees")
          .select("id")
          .eq("invoice_id", invoice.id)
          .single();

        if (!existingLateFee && lateFee > 0) {
          // Create late fee record
          await supabaseClient.from("late_fees").insert({
            company_id: invoice.company_id,
            customer_id: invoice.customer_id,
            contract_id: invoice.contract_id,
            invoice_id: invoice.id,
            fee_amount: lateFee,
            days_overdue: daysOverdue,
            status: "pending",
            applied_date: today,
          });

          // Update invoice with late fee
          await supabaseClient
            .from("invoices")
            .update({
              total_amount: invoice.total_amount + lateFee,
            })
            .eq("id", invoice.id);

          // Update contract late fine amount
          await supabaseClient
            .from("contracts")
            .update({
              late_fine_amount: (invoice.contracts?.late_fine_amount || 0) + lateFee,
              days_overdue: daysOverdue,
            })
            .eq("id", invoice.contract_id);

          results.late_fees_applied++;

          // Send overdue notice
          if (invoice.customers?.phone) {
            const message = `
⚠️ تنبيه: فاتورة متأخرة

عزيزي ${invoice.customers.first_name} ${invoice.customers.last_name || ""}،

لديك فاتورة متأخرة عن السداد:
📄 رقم الفاتورة: ${invoice.invoice_number}
💰 المبلغ الأصلي: ${invoice.total_amount} ريال
⏰ عدد أيام التأخير: ${daysOverdue} يوم
💸 غرامة التأخير: ${lateFee.toFixed(2)} ريال
💵 المبلغ الإجمالي المستحق: ${(invoice.total_amount + lateFee).toFixed(2)} ريال

يرجى السداد فوراً لتجنب غرامات إضافية.

للاستفسار: اتصل بنا
            `.trim();

            await supabaseClient.functions.invoke("send-whatsapp-reminders", {
              body: {
                phone: invoice.customers.phone,
                message: message,
              },
            });

            results.overdue_notices_sent++;
          }
        }
      } catch (error) {
        console.error(`Error processing overdue invoice ${invoice.invoice_number}:`, error);
        results.errors.push(`Overdue ${invoice.invoice_number}: ${error.message}`);
      }
    }

    console.log("Payment reminders processing completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment reminders processed successfully",
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in process-payment-reminders:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
