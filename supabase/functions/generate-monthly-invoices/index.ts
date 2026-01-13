import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Contract {
  id: string;
  company_id: string;
  customer_id: string;
  contract_number: string;
  monthly_amount: number;
  start_date: string;
  end_date: string;
  status: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Starting monthly invoice generation...");

    // Get current date
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Calculate due date (15 days from now)
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 15);

    // Get all active contracts
    const { data: contracts, error: contractsError } = await supabaseClient
      .from("contracts")
      .select("*")
      .eq("status", "active")
      .gte("end_date", now.toISOString().split("T")[0]);

    if (contractsError) {
      throw new Error(`Error fetching contracts: ${contractsError.message}`);
    }

    console.log(`Found ${contracts?.length || 0} active contracts`);

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const contract of contracts || []) {
      try {
        // ✅ استخدام الدالة الموحدة للبحث عن فاتورة موجودة أو إنشاء واحدة جديدة
        const invoiceMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
        
        // Check if invoice already exists for this month using due_date
        const { data: existingInvoice } = await supabaseClient
          .from("invoices")
          .select("id, invoice_number")
          .eq("contract_id", contract.id)
          .gte("due_date", invoiceMonth)
          .lt("due_date", `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`)
          .neq("status", "cancelled")
          .limit(1);

        if (existingInvoice && existingInvoice.length > 0) {
          console.log(`Invoice already exists for contract ${contract.contract_number}: ${existingInvoice[0].invoice_number}`);
          results.skipped++;
          continue;
        }

        // Generate unique invoice number with sequence
        const { data: lastInvoice } = await supabaseClient
          .from("invoices")
          .select("invoice_number")
          .eq("company_id", contract.company_id)
          .like("invoice_number", `INV-${currentYear}${String(currentMonth).padStart(2, "0")}%`)
          .order("invoice_number", { ascending: false })
          .limit(1);

        let sequence = 1;
        if (lastInvoice && lastInvoice.length > 0) {
          const match = lastInvoice[0].invoice_number.match(/-(\d+)$/);
          if (match) {
            sequence = parseInt(match[1], 10) + 1;
          }
        }

        const invoiceNumber = `INV-${currentYear}${String(currentMonth).padStart(2, "0")}-${String(sequence).padStart(5, "0")}`;

        // Create invoice with first day of month as invoice_date and due_date
        const { error: invoiceError } = await supabaseClient
          .from("invoices")
          .insert({
            company_id: contract.company_id,
            customer_id: contract.customer_id,
            contract_id: contract.id,
            invoice_number: invoiceNumber,
            invoice_date: invoiceMonth, // أول يوم في الشهر
            due_date: invoiceMonth, // أول يوم في الشهر
            total_amount: contract.monthly_amount,
            subtotal: contract.monthly_amount,
            balance_due: contract.monthly_amount,
            paid_amount: 0,
            status: "sent",
            payment_status: "unpaid",
            invoice_type: "rental",
            currency: "QAR",
            notes: `فاتورة إيجار شهرية - ${currentYear}/${currentMonth} - عقد #${contract.contract_number}`,
          });

        if (invoiceError) {
          // Check if it's a duplicate error from the trigger
          if (invoiceError.message?.includes('فاتورة مكررة') || invoiceError.code === '23505') {
            console.log(`Invoice already exists (caught by trigger) for contract ${contract.contract_number}`);
            results.skipped++;
            continue;
          }
          throw new Error(`Error creating invoice: ${invoiceError.message}`);
        }

        console.log(`Created invoice ${invoiceNumber} for contract ${contract.contract_number}`);

        // Get customer details for notification
        const { data: customer } = await supabaseClient
          .from("customers")
          .select("first_name, last_name, phone")
          .eq("id", contract.customer_id)
          .single();

        // Send invoice notification via WhatsApp (if phone exists)
        if (customer?.phone) {
          const message = `
مرحباً ${customer.first_name} ${customer.last_name || ""}،

تم إصدار فاتورة الإيجار الشهرية:
📄 رقم الفاتورة: ${invoiceNumber}
💰 المبلغ: ${contract.monthly_amount} ريال
📅 تاريخ الاستحقاق: ${dueDate.toLocaleDateString("ar-SA")}

يرجى السداد قبل تاريخ الاستحقاق لتجنب غرامات التأخير.

شكراً لتعاملكم معنا.
          `.trim();

          // Call WhatsApp reminder function
          await supabaseClient.functions.invoke("send-whatsapp-reminders", {
            body: {
              phone: customer.phone,
              message: message,
            },
          });
        }

        results.success++;
      } catch (error) {
        console.error(`Error processing contract ${contract.contract_number}:`, error);
        results.failed++;
        results.errors.push(`${contract.contract_number}: ${error.message}`);
      }
    }

    console.log("Invoice generation completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Monthly invoices generated successfully",
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in generate-monthly-invoices:", error);
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
