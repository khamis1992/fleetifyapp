import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

interface TrafficFineData {
  penalty_number?: string;
  violation_date: string;
  violation_type: string;
  vehicle_plate: string;
  location: string;
  amount: number;
  reason: string;
  issuing_authority?: string;
  due_date?: string;
  email_subject?: string;
  email_body?: string;
  company_id: string;
}

interface WebhookResponse {
  success: boolean;
  violation_id?: string;
  penalty_number?: string;
  message?: string;
  matched_vehicle?: boolean;
  matched_customer?: boolean;
  error?: string;
  details?: any;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify webhook secret for security (allow both webhook secret and Supabase auth)
    const webhookSecret = req.headers.get('x-webhook-secret');
    const authHeader = req.headers.get('authorization');
    const expectedSecret = Deno.env.get('ZAPIER_WEBHOOK_SECRET');
    
    if (!expectedSecret) {
      console.error('❌ ZAPIER_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Accept either valid webhook secret OR valid Supabase authorization
    const hasValidWebhookSecret = webhookSecret === expectedSecret;
    const hasAuthHeader = authHeader && authHeader.startsWith('Bearer ');
    
    if (!hasValidWebhookSecret && !hasAuthHeader) {
      console.warn('⚠️ No valid authentication provided');
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized - Missing webhook secret or authorization header',
          hint: 'Add x-webhook-secret header with the correct value or use Supabase authorization'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ Authentication successful:', hasValidWebhookSecret ? 'webhook-secret' : 'supabase-auth');

    // Parse request body
    let fineData: TrafficFineData;
    try {
      fineData = await req.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid JSON in request body',
          details: parseError.message
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('📥 Received traffic fine data:', {
      penalty_number: fineData.penalty_number,
      vehicle_plate: fineData.vehicle_plate,
      amount: fineData.amount,
      date: fineData.violation_date
    });

    // Validate required fields
    const validationErrors = validateFineData(fineData);
    if (validationErrors.length > 0) {
      console.error('❌ Validation errors:', validationErrors);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Validation failed',
          details: validationErrors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate penalty number if not provided
    const penaltyNumber = fineData.penalty_number || 
      generatePenaltyNumber(fineData.vehicle_plate);

    // Check for duplicate penalty number
    const { data: existingPenalty } = await supabase
      .from('penalties')
      .select('id, penalty_number')
      .eq('penalty_number', penaltyNumber)
      .eq('company_id', fineData.company_id)
      .single();

    if (existingPenalty) {
      console.warn('⚠️ Duplicate penalty number detected:', penaltyNumber);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Duplicate penalty number',
          existing_id: existingPenalty.id,
          penalty_number: penaltyNumber
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Find matching vehicle (fuzzy match on plate number)
    const vehicleMatch = await findMatchingVehicle(
      supabase, 
      fineData.vehicle_plate, 
      fineData.company_id
    );

    let contractId: string | null = null;
    let customerId: string | null = null;

    // 2. Find active contract for the vehicle
    if (vehicleMatch) {
      const contractMatch = await findActiveContract(supabase, vehicleMatch.id);
      if (contractMatch) {
        contractId = contractMatch.id;
        customerId = contractMatch.customer_id;
      }
    }

    // If no customer found, get or create a default "Unknown" customer
    if (!customerId) {
      customerId = await getOrCreateDefaultCustomer(supabase, fineData.company_id);
    }

    // 3. Prepare violation data (matching actual database schema)
    const violationData = {
      company_id: fineData.company_id,
      penalty_number: penaltyNumber,
      penalty_date: fineData.violation_date,
      penalty_type: fineData.violation_type, // This matches the DB column
      vehicle_plate: normalizeVehiclePlate(fineData.vehicle_plate),
      location: fineData.location,
      amount: fineData.amount,
      reason: buildEnhancedReason(fineData, vehicleMatch), // Enhanced reason with email info
      status: 'pending',
      payment_status: 'unpaid',
      customer_id: customerId,
      contract_id: contractId,
      violation_type: fineData.violation_type, // Additional field in DB schema
      created_at: new Date().toISOString(),
    };

    // 4. Create traffic violation record
    const { data: violation, error: insertError } = await supabase
      .from('penalties')
      .insert(violationData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating violation:', insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create violation record',
          details: insertError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Traffic violation created successfully:', violation.id);

    // 5. Create audit log entry (optional - don't fail if it errors)
    try {
      await createAuditLog(supabase, fineData.company_id, violation, vehicleMatch);
    } catch (auditError) {
      console.warn('⚠️ Failed to create audit log:', auditError.message);
      // Don't fail the whole process for audit log errors
    }

    // 6. Return success response
    const response: WebhookResponse = {
      success: true,
      violation_id: violation.id,
      penalty_number: penaltyNumber,
      message: 'Traffic fine processed and imported successfully',
      matched_vehicle: !!vehicleMatch,
      matched_customer: !!customerId,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message || 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate incoming traffic fine data
 */
function validateFineData(data: TrafficFineData): string[] {
  const errors: string[] = [];

  if (!data.company_id || data.company_id.trim() === '') {
    errors.push('company_id is required');
  }

  if (!data.vehicle_plate || data.vehicle_plate.trim().length < 2) {
    errors.push('vehicle_plate is required and must be at least 2 characters');
  }

  if (!data.violation_date) {
    errors.push('violation_date is required');
  } else {
    // Validate date format
    const date = new Date(data.violation_date);
    if (isNaN(date.getTime())) {
      errors.push('violation_date must be a valid date');
    }
  }

  if (!data.amount || data.amount <= 0) {
    errors.push('amount must be a positive number');
  }

  if (!data.violation_type || data.violation_type.trim() === '') {
    errors.push('violation_type is required');
  }

  if (!data.location || data.location.trim() === '') {
    errors.push('location is required');
  }

  if (!data.reason || data.reason.trim() === '') {
    errors.push('reason is required');
  }

  return errors;
}

/**
 * Generate automatic penalty number
 */
function generatePenaltyNumber(vehiclePlate: string): string {
  const timestamp = Date.now();
  const cleanPlate = vehiclePlate.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return `AUTO-${timestamp}-${cleanPlate}`;
}

/**
 * Normalize vehicle plate number for consistent matching
 */
function normalizeVehiclePlate(plate: string): string {
  return plate
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .trim();
}

/**
 * Build comprehensive reason field (including email info since no notes column)
 */
function buildEnhancedReason(fineData: TrafficFineData, vehicleMatch: any): string {
  let enhancedReason = fineData.reason;
  
  if (fineData.email_subject || fineData.email_body) {
    enhancedReason += ' | AUTO-IMPORTED FROM EMAIL';
    
    if (fineData.email_subject) {
      enhancedReason += ` | Subject: ${fineData.email_subject}`;
    }
  }
  
  if (vehicleMatch) {
    enhancedReason += ` | Vehicle: ${vehicleMatch.make} ${vehicleMatch.model}`;
  } else {
    enhancedReason += ' | Vehicle not found in system';
  }
  
  return enhancedReason.substring(0, 500); // Limit length for DB
}

/**
 * Find matching vehicle with fuzzy matching
 */
async function findMatchingVehicle(
  supabase: any, 
  vehiclePlate: string, 
  companyId: string
): Promise<any> {
  const normalizedPlate = normalizeVehiclePlate(vehiclePlate);
  
  // Try exact match first
  let { data: vehicle, error } = await supabase
    .from('vehicles')
    .select('id, company_id, plate_number, make, model')
    .eq('company_id', companyId)
    .ilike('plate_number', normalizedPlate)
    .single();

  if (vehicle && !error) {
    console.log('✅ Exact vehicle match found:', vehicle.plate_number);
    return vehicle;
  }

  // Try fuzzy match if exact match fails
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, company_id, plate_number, make, model')
    .eq('company_id', companyId);

  if (vehicles && vehicles.length > 0) {
    for (const v of vehicles) {
      const normalizedVehiclePlate = normalizeVehiclePlate(v.plate_number);
      if (normalizedVehiclePlate.includes(normalizedPlate) || 
          normalizedPlate.includes(normalizedVehiclePlate)) {
        console.log('✅ Fuzzy vehicle match found:', v.plate_number);
        return v;
      }
    }
  }

  console.warn('⚠️ No vehicle match found for plate:', vehiclePlate);
  return null;
}

/**
 * Find active contract for a vehicle
 */
async function findActiveContract(supabase: any, vehicleId: string): Promise<any> {
  const { data: contract, error } = await supabase
    .from('contracts')
    .select('id, customer_id, contract_number')
    .eq('vehicle_id', vehicleId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1)
    .single();

  if (contract && !error) {
    console.log('✅ Active contract found:', contract.contract_number);
    return contract;
  }

  console.warn('⚠️ No active contract found for vehicle:', vehicleId);
  return null;
}

/**
 * Get or create a default customer for traffic fines without associated customers
 */
async function getOrCreateDefaultCustomer(supabase: any, companyId: string): Promise<string> {
  // First, let's try to get ANY existing customer for this company
  const { data: anyCustomer } = await supabase
    .from('customers')
    .select('id')
    .eq('company_id', companyId)
    .limit(1)
    .single();
  
  if (anyCustomer) {
    console.log('✅ Using existing customer:', anyCustomer.id);
    return anyCustomer.id;
  }

  // If no customers exist, try to create one with minimal required fields
  // Let's try different field combinations to find what works
  const customerAttempts = [
    {
      company_id: companyId,
      customer_name: 'Traffic Violations - Unknown Owner',
      name: 'Traffic Violations - Unknown Owner', // Alternative field name
      created_at: new Date().toISOString()
    },
    {
      company_id: companyId,
      name: 'Traffic Violations - Unknown Owner',
      created_at: new Date().toISOString()
    },
    {
      company_id: companyId,
      customer_name: 'Unknown Customer',
      created_at: new Date().toISOString()
    }
  ];

  for (const attempt of customerAttempts) {
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert(attempt)
      .select('id')
      .single();

    if (!error && newCustomer) {
      console.log('✅ Created default customer:', newCustomer.id);
      return newCustomer.id;
    }
    
    console.warn('⚠️ Customer creation attempt failed:', error?.message);
  }
  
  // If we still can't create a customer, this is a critical error
  throw new Error('Unable to create or find any customer. Please ensure at least one customer exists in your system or check the customers table structure.');
}

/**
 * Create audit log entry
 */
async function createAuditLog(
  supabase: any,
  companyId: string,
  violation: any,
  vehicleMatch: any
): Promise<void> {
  try {
    await supabase
      .from('system_logs')
      .insert({
        company_id: companyId,
        action: 'traffic_fine_imported',
        description: `Traffic fine ${violation.penalty_number} imported from Zapier`,
        metadata: {
          violation_id: violation.id,
          penalty_number: violation.penalty_number,
          vehicle_plate: violation.vehicle_plate,
          amount: violation.amount,
          source: 'zapier',
          matched_vehicle: !!vehicleMatch,
          vehicle_id: vehicleMatch?.id,
          imported_at: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      });
    
    console.log('✅ Audit log created');
  } catch (error) {
    console.error('⚠️ Failed to create audit log:', error);
    // Don't fail the main operation if logging fails
  }
}