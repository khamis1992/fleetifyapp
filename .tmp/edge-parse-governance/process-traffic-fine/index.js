// supabase/functions/process-traffic-fine/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret"
};
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({
      success: false,
      error: "LEGACY_TRAFFIC_FINE_WEBHOOK_RETIRED",
      message: "\u0627\u0633\u062A\u062E\u062F\u0645 ingest-traffic-mail \u0623\u0648 violation-inbox-processor\u061B \u0647\u0630\u0627 \u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0642\u062F\u064A\u0645 \u0643\u0627\u0646 \u064A\u0633\u0645\u062D \u0628\u0631\u0628\u0637 \u0636\u0628\u0627\u0628\u064A \u0648\u0625\u0646\u0634\u0627\u0621 \u0639\u0645\u064A\u0644 \u0627\u0641\u062A\u0631\u0627\u0636\u064A."
    }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
  try {
    const webhookSecret = req.headers.get("x-webhook-secret");
    const authHeader = req.headers.get("authorization");
    const expectedSecret = Deno.env.get("ZAPIER_WEBHOOK_SECRET");
    if (!expectedSecret) {
      console.error("\u274C ZAPIER_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const hasValidWebhookSecret = webhookSecret === expectedSecret;
    const hasAuthHeader = authHeader && authHeader.startsWith("Bearer ");
    if (!hasValidWebhookSecret && !hasAuthHeader) {
      console.warn("\u26A0\uFE0F No valid authentication provided");
      return new Response(
        JSON.stringify({
          error: "Unauthorized - Missing webhook secret or authorization header",
          hint: "Add x-webhook-secret header with the correct value or use Supabase authorization"
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("\u2705 Authentication successful:", hasValidWebhookSecret ? "webhook-secret" : "supabase-auth");
    let fineData;
    try {
      fineData = await req.json();
    } catch (parseError) {
      console.error("\u274C Failed to parse request body:", parseError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid JSON in request body",
          details: parseError.message
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("\u{1F4E5} Received traffic fine data:", {
      penalty_number: fineData.penalty_number,
      vehicle_plate: fineData.vehicle_plate,
      amount: fineData.amount,
      date: fineData.violation_date
    });
    const validationErrors = validateFineData(fineData);
    if (validationErrors.length > 0) {
      console.error("\u274C Validation errors:", validationErrors);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Validation failed",
          details: validationErrors
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const penaltyNumber = fineData.penalty_number || generatePenaltyNumber(fineData.vehicle_plate);
    const { data: existingPenalty } = await supabase.from("penalties").select("id, penalty_number").eq("penalty_number", penaltyNumber).eq("company_id", fineData.company_id).single();
    if (existingPenalty) {
      console.warn("\u26A0\uFE0F Duplicate penalty number detected:", penaltyNumber);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Duplicate penalty number",
          existing_id: existingPenalty.id,
          penalty_number: penaltyNumber
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const vehicleMatch = await findMatchingVehicle(
      supabase,
      fineData.vehicle_plate,
      fineData.company_id
    );
    let contractId = null;
    let customerId = null;
    if (vehicleMatch) {
      const contractMatch = await findActiveContract(supabase, vehicleMatch.id);
      if (contractMatch) {
        contractId = contractMatch.id;
        customerId = contractMatch.customer_id;
      }
    }
    if (!customerId) {
      customerId = await getOrCreateDefaultCustomer(supabase, fineData.company_id);
    }
    const violationData = {
      company_id: fineData.company_id,
      penalty_number: penaltyNumber,
      penalty_date: fineData.violation_date,
      penalty_type: fineData.violation_type,
      // This matches the DB column
      vehicle_plate: normalizeVehiclePlate(fineData.vehicle_plate),
      location: fineData.location,
      amount: fineData.amount,
      reason: buildEnhancedReason(fineData, vehicleMatch),
      // Enhanced reason with email info
      status: "pending",
      payment_status: "unpaid",
      customer_id: customerId,
      contract_id: contractId,
      violation_type: fineData.violation_type,
      // Additional field in DB schema
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const { data: violation, error: insertError } = await supabase.from("penalties").insert(violationData).select().single();
    if (insertError) {
      console.error("\u274C Error creating violation:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create violation record",
          details: insertError.message
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("\u2705 Traffic violation created successfully:", violation.id);
    try {
      await createAuditLog(supabase, fineData.company_id, violation, vehicleMatch);
    } catch (auditError) {
      console.warn("\u26A0\uFE0F Failed to create audit log:", auditError.message);
    }
    const response = {
      success: true,
      violation_id: violation.id,
      penalty_number: penaltyNumber,
      message: "Traffic fine processed and imported successfully",
      matched_vehicle: !!vehicleMatch,
      matched_customer: !!customerId
    };
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("\u274C Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error.message || "Unknown error occurred"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
function validateFineData(data) {
  const errors = [];
  if (!data.company_id || data.company_id.trim() === "") {
    errors.push("company_id is required");
  }
  if (!data.vehicle_plate || data.vehicle_plate.trim().length < 2) {
    errors.push("vehicle_plate is required and must be at least 2 characters");
  }
  if (!data.violation_date) {
    errors.push("violation_date is required");
  } else {
    const date = new Date(data.violation_date);
    if (isNaN(date.getTime())) {
      errors.push("violation_date must be a valid date");
    }
  }
  if (!data.amount || data.amount <= 0) {
    errors.push("amount must be a positive number");
  }
  if (!data.violation_type || data.violation_type.trim() === "") {
    errors.push("violation_type is required");
  }
  if (!data.location || data.location.trim() === "") {
    errors.push("location is required");
  }
  if (!data.reason || data.reason.trim() === "") {
    errors.push("reason is required");
  }
  return errors;
}
function generatePenaltyNumber(vehiclePlate) {
  const timestamp = Date.now();
  const cleanPlate = vehiclePlate.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  return `AUTO-${timestamp}-${cleanPlate}`;
}
function normalizeVehiclePlate(plate) {
  return plate.toUpperCase().replace(/\s+/g, "-").replace(/[^A-Z0-9-]/g, "").trim();
}
function buildEnhancedReason(fineData, vehicleMatch) {
  let enhancedReason = fineData.reason;
  if (fineData.email_subject || fineData.email_body) {
    enhancedReason += " | AUTO-IMPORTED FROM EMAIL";
    if (fineData.email_subject) {
      enhancedReason += ` | Subject: ${fineData.email_subject}`;
    }
  }
  if (vehicleMatch) {
    enhancedReason += ` | Vehicle: ${vehicleMatch.make} ${vehicleMatch.model}`;
  } else {
    enhancedReason += " | Vehicle not found in system";
  }
  return enhancedReason.substring(0, 500);
}
async function findMatchingVehicle(supabase, vehiclePlate, companyId) {
  const normalizedPlate = normalizeVehiclePlate(vehiclePlate);
  let { data: vehicle, error } = await supabase.from("vehicles").select("id, company_id, plate_number, make, model").eq("company_id", companyId).ilike("plate_number", normalizedPlate).single();
  if (vehicle && !error) {
    console.log("\u2705 Exact vehicle match found:", vehicle.plate_number);
    return vehicle;
  }
  const { data: vehicles } = await supabase.from("vehicles").select("id, company_id, plate_number, make, model").eq("company_id", companyId);
  if (vehicles && vehicles.length > 0) {
    for (const v of vehicles) {
      const normalizedVehiclePlate = normalizeVehiclePlate(v.plate_number);
      if (normalizedVehiclePlate.includes(normalizedPlate) || normalizedPlate.includes(normalizedVehiclePlate)) {
        console.log("\u2705 Fuzzy vehicle match found:", v.plate_number);
        return v;
      }
    }
  }
  console.warn("\u26A0\uFE0F No vehicle match found for plate:", vehiclePlate);
  return null;
}
async function findActiveContract(supabase, vehicleId) {
  const { data: contract, error } = await supabase.from("contracts").select("id, customer_id, contract_number").eq("vehicle_id", vehicleId).eq("status", "active").order("start_date", { ascending: false }).limit(1).single();
  if (contract && !error) {
    console.log("\u2705 Active contract found:", contract.contract_number);
    return contract;
  }
  console.warn("\u26A0\uFE0F No active contract found for vehicle:", vehicleId);
  return null;
}
async function getOrCreateDefaultCustomer(supabase, companyId) {
  const { data: anyCustomer } = await supabase.from("customers").select("id").eq("company_id", companyId).limit(1).single();
  if (anyCustomer) {
    console.log("\u2705 Using existing customer:", anyCustomer.id);
    return anyCustomer.id;
  }
  const customerAttempts = [
    {
      company_id: companyId,
      customer_name: "Traffic Violations - Unknown Owner",
      name: "Traffic Violations - Unknown Owner",
      // Alternative field name
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      company_id: companyId,
      name: "Traffic Violations - Unknown Owner",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      company_id: companyId,
      customer_name: "Unknown Customer",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    }
  ];
  for (const attempt of customerAttempts) {
    const { data: newCustomer, error } = await supabase.from("customers").insert(attempt).select("id").single();
    if (!error && newCustomer) {
      console.log("\u2705 Created default customer:", newCustomer.id);
      return newCustomer.id;
    }
    console.warn("\u26A0\uFE0F Customer creation attempt failed:", error?.message);
  }
  throw new Error("Unable to create or find any customer. Please ensure at least one customer exists in your system or check the customers table structure.");
}
async function createAuditLog(supabase, companyId, violation, vehicleMatch) {
  try {
    await supabase.from("system_logs").insert({
      company_id: companyId,
      action: "traffic_fine_imported",
      description: `Traffic fine ${violation.penalty_number} imported from Zapier`,
      metadata: {
        violation_id: violation.id,
        penalty_number: violation.penalty_number,
        vehicle_plate: violation.vehicle_plate,
        amount: violation.amount,
        source: "zapier",
        matched_vehicle: !!vehicleMatch,
        vehicle_id: vehicleMatch?.id,
        imported_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    console.log("\u2705 Audit log created");
  } catch (error) {
    console.error("\u26A0\uFE0F Failed to create audit log:", error);
  }
}
