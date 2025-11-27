# 🚀 Zapier Integration Plan: Outlook Traffic Fines → Fleetify

## 📋 Executive Summary

This plan outlines the complete integration between **Outlook Email** and **Fleetify** using **Zapier** to automatically process traffic fines received via email and create records in your fleet management system.

**User**: KHAMIS AL-JABOR  
**Date**: 2025-10-12  
**Status**: Ready for Implementation

---

## 🎯 Integration Objective

**Automate the entire traffic fine workflow:**
1. Receive traffic fine email in Outlook
2. Extract fine details using AI/OCR
3. Match vehicle and customer information
4. Create traffic violation record in Fleetify
5. Notify relevant stakeholders
6. Track payment status

---

## 🏗️ Architecture Overview

```
┌─────────────────┐
│  Outlook Email  │ ──→ Traffic Fine Notification
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│     Zapier      │ ──→ Email Parser + AI Extraction
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Supabase API   │ ──→ Webhook Endpoint (Edge Function)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Fleetify DB    │ ──→ Traffic Violations Table
└─────────────────┘
```

---

## 📝 Step-by-Step Implementation Plan

### **Phase 1: Supabase Webhook Setup** ⏱️ 2-3 hours

#### 1.1 Create Edge Function for Traffic Fines

**File**: `supabase/functions/process-traffic-fine/index.ts`

```typescript
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

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify webhook secret
    const webhookSecret = req.headers.get('x-webhook-secret');
    const expectedSecret = Deno.env.get('ZAPIER_WEBHOOK_SECRET');
    
    if (webhookSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const fineData: TrafficFineData = await req.json();
    
    console.log('📥 Received traffic fine data:', fineData);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate required fields
    if (!fineData.vehicle_plate || !fineData.violation_date || !fineData.amount) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: vehicle_plate, violation_date, amount' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Find matching vehicle
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, company_id, plate_number')
      .eq('company_id', fineData.company_id)
      .ilike('plate_number', `%${fineData.vehicle_plate}%`)
      .single();

    if (vehicleError || !vehicle) {
      console.warn('⚠️ Vehicle not found:', fineData.vehicle_plate);
      // Continue without vehicle match - we'll store the plate number
    }

    // 2. Find active contract for the vehicle (if vehicle found)
    let contractId = null;
    let customerId = null;

    if (vehicle) {
      const { data: contract } = await supabase
        .from('contracts')
        .select('id, customer_id')
        .eq('vehicle_id', vehicle.id)
        .eq('status', 'active')
        .single();

      if (contract) {
        contractId = contract.id;
        customerId = contract.customer_id;
      }
    }

    // 3. Generate penalty number if not provided
    const penaltyNumber = fineData.penalty_number || 
      `AUTO-${Date.now()}-${fineData.vehicle_plate.replace(/\s/g, '')}`;

    // 4. Create traffic violation record
    const { data: violation, error: insertError } = await supabase
      .from('penalties')
      .insert({
        company_id: fineData.company_id,
        penalty_number: penaltyNumber,
        penalty_date: fineData.violation_date,
        violation_type: fineData.violation_type,
        vehicle_plate: fineData.vehicle_plate,
        location: fineData.location,
        amount: fineData.amount,
        reason: fineData.reason,
        status: 'pending',
        payment_status: 'unpaid',
        customer_id: customerId,
        contract_id: contractId,
        notes: `Auto-imported from email: ${fineData.email_subject || 'N/A'}\n\nOriginal email body:\n${fineData.email_body || 'N/A'}`,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating violation:', insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: insertError.message,
          details: insertError 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Traffic violation created successfully:', violation.id);

    // 5. Log the import for audit trail
    await supabase
      .from('system_logs')
      .insert({
        company_id: fineData.company_id,
        action: 'traffic_fine_imported',
        description: `Traffic fine ${penaltyNumber} imported from Zapier`,
        metadata: {
          violation_id: violation.id,
          source: 'zapier',
          vehicle_plate: fineData.vehicle_plate,
          amount: fineData.amount,
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        violation_id: violation.id,
        penalty_number: penaltyNumber,
        message: 'Traffic fine processed successfully',
        matched_vehicle: !!vehicle,
        matched_customer: !!customerId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

#### 1.2 Deploy the Edge Function

```bash
# Navigate to your project
cd c:\Users\khamis\Desktop\fleetifyapp-3

# Create the function directory
mkdir -p supabase/functions/process-traffic-fine

# Create the function file (save the code above)
# Then deploy
npx supabase functions deploy process-traffic-fine

# Set the webhook secret
npx supabase secrets set ZAPIER_WEBHOOK_SECRET=your_secure_random_string_here
```

#### 1.3 Get the Webhook URL

After deployment, your webhook URL will be:
```
https://[your-project-ref].supabase.co/functions/v1/process-traffic-fine
```

---

### **Phase 2: Zapier Zap Configuration** ⏱️ 1-2 hours

#### 2.1 Create New Zap

1. **Go to Zapier**: https://zapier.com/app/zaps
2. **Click "Create Zap"**
3. **Name**: "Outlook Traffic Fines → Fleetify"

#### 2.2 Trigger Setup (Step 1)

**Trigger App**: Outlook  
**Event**: New Email Matching Search  
**Configuration**:
```
Account: your-outlook-account@example.com
Search String: subject:"traffic fine" OR subject:"مخالفة مرورية" OR subject:"penalty" OR from:trafficpolice@example.com
Folder: Inbox (or specific folder)
```

**Test**: Send a test email to verify trigger works

#### 2.3 Email Parser (Step 2)

**App**: Email Parser by Zapier (or OpenAI)  
**Action**: Parse Email Content  

**Option A - Using Email Parser by Zapier**:
```
Input: {{trigger.body_html}} or {{trigger.body_plain}}
Parser Rules:
  - Penalty Number: regex pattern for fine number
  - Date: date extraction
  - Amount: currency extraction
  - Vehicle Plate: license plate pattern
  - Location: text extraction
  - Violation Type: category matching
```

**Option B - Using OpenAI (Recommended for Arabic)**:
```
App: OpenAI
Action: Create Chat Completion
Model: gpt-4o-mini

Prompt Template:
---
Extract traffic fine information from this email:

Subject: {{trigger.subject}}
Body: {{trigger.body_plain}}

Extract the following in JSON format:
{
  "penalty_number": "fine reference number if available",
  "violation_date": "YYYY-MM-DD format",
  "violation_type": "type of violation in Arabic or English",
  "vehicle_plate": "license plate number",
  "location": "location of violation",
  "amount": number (just the number, no currency),
  "reason": "detailed reason for fine",
  "issuing_authority": "authority that issued the fine",
  "due_date": "payment due date in YYYY-MM-DD if mentioned"
}

Return ONLY valid JSON, nothing else.
---

Response Format: JSON
```

#### 2.4 Data Formatter (Step 3)

**App**: Formatter by Zapier  
**Action**: Text → Replace  

Clean up extracted data:
- Remove extra spaces from plate numbers
- Standardize date formats
- Extract numeric values from amounts

#### 2.5 Webhook POST (Step 4)

**App**: Webhooks by Zapier  
**Action**: POST  

**Configuration**:
```
URL: https://[your-project-ref].supabase.co/functions/v1/process-traffic-fine
Method: POST
Content-Type: application/json

Headers:
  x-webhook-secret: your_secure_random_string_here
  Content-Type: application/json

Data (JSON):
{
  "penalty_number": "{{step2.penalty_number}}",
  "violation_date": "{{step2.violation_date}}",
  "violation_type": "{{step2.violation_type}}",
  "vehicle_plate": "{{step3.cleaned_plate}}",
  "location": "{{step2.location}}",
  "amount": {{step2.amount}},
  "reason": "{{step2.reason}}",
  "issuing_authority": "{{step2.issuing_authority}}",
  "due_date": "{{step2.due_date}}",
  "email_subject": "{{trigger.subject}}",
  "email_body": "{{trigger.body_plain}}",
  "company_id": "your-company-id-from-fleetify"
}
```

#### 2.6 Success Notification (Step 5 - Optional)

**App**: Email by Zapier or Slack  
**Action**: Send Email / Send Channel Message  

**Template**:
```
Subject: ✅ Traffic Fine Imported: {{step2.vehicle_plate}}

A new traffic fine has been automatically imported to Fleetify:

📋 Fine Details:
- Penalty #: {{step2.penalty_number}}
- Vehicle: {{step2.vehicle_plate}}
- Amount: {{step2.amount}} KWD
- Date: {{step2.violation_date}}
- Location: {{step2.location}}
- Type: {{step2.violation_type}}

🔗 View in Fleetify:
https://fleetifyapp.vercel.app/fleet/traffic-violations

This fine was automatically processed from your Outlook email.
```

#### 2.7 Error Handling (Step 6 - Optional)

**Add Error Path**:
1. Click "+ Add step below" after webhook
2. Choose "Filter"
3. **Condition**: Webhook Status Code is not 200
4. **Action**: Send error notification to admin

---

### **Phase 3: Testing & Validation** ⏱️ 1 hour

#### 3.1 Test Email Template

Send this test email to your Outlook:

```
Subject: Traffic Fine Notification - Penalty #TF123456

Dear Customer,

This is to inform you of a traffic violation:

Penalty Number: TF123456
Date: 2025-10-12
Vehicle Plate: ABC-1234
Location: Kuwait City - Shuwaikh
Violation Type: Speeding
Fine Amount: 50.000 KWD
Reason: Exceeding speed limit by 20 km/h

Please pay before: 2025-11-12

Traffic Department
Kuwait
```

#### 3.2 Verification Checklist

- [ ] Email triggers Zap successfully
- [ ] Data extracted correctly (all fields)
- [ ] Webhook receives POST request
- [ ] Vehicle matched in database (if exists)
- [ ] Violation record created in Fleetify
- [ ] Notification sent (if configured)
- [ ] Error handling works (test with invalid data)

---

### **Phase 4: Advanced Features** ⏱️ 2-3 hours (Optional)

#### 4.1 Attachment Processing

If fines come with PDF attachments:

**Add Step**: Email Parser  
**Extract**: PDF attachment  
**Process**: Using OCR (Google Vision API or similar)

```javascript
// Zapier Code Step
const pdf = inputData.attachment;
// Send to OCR service
// Parse results
// Return structured data
```

#### 4.2 Duplicate Detection

**Add Filter Step**:
```
Check if penalty_number already exists in database
If exists: Skip or update
If new: Create record
```

**Implementation in Edge Function**:
```typescript
// Check for duplicates
const { data: existing } = await supabase
  .from('penalties')
  .select('id')
  .eq('penalty_number', penaltyNumber)
  .single();

if (existing) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: 'Duplicate penalty number',
      existing_id: existing.id 
    }),
    { status: 409, headers: corsHeaders }
  );
}
```

#### 4.3 Multi-Language Support

Enhance OpenAI prompt to handle both Arabic and English:

```
Detect the language of the email and extract information accordingly.
Support both Arabic and English traffic fine formats.
Standardize output to English field names.
```

#### 4.4 Automatic Payment Reminder

Add additional Zap:

**Trigger**: Schedule (Daily)  
**Action**: Query Fleetify for unpaid fines  
**Filter**: Due date approaching  
**Action**: Send reminder email

---

## 📊 Data Mapping Reference

### Email Fields → Fleetify Database

| Email Field | Extraction Method | Fleetify Column | Type | Required |
|-------------|-------------------|-----------------|------|----------|
| Penalty Number | Regex / AI | `penalty_number` | string | Yes |
| Violation Date | Date parser | `penalty_date` | date | Yes |
| Violation Type | AI classification | `violation_type` | string | Yes |
| Vehicle Plate | Regex / AI | `vehicle_plate` | string | Yes |
| Location | Text extraction | `location` | string | Yes |
| Fine Amount | Currency parser | `amount` | decimal | Yes |
| Reason | Full text | `reason` | text | Yes |
| Authority | Text extraction | `notes` | text | No |
| Due Date | Date parser | `notes` | text | No |

---

## 🔐 Security Considerations

### 1. Webhook Authentication

```typescript
// In Edge Function
const webhookSecret = req.headers.get('x-webhook-secret');
if (webhookSecret !== Deno.env.get('ZAPIER_WEBHOOK_SECRET')) {
  return new Response('Unauthorized', { status: 401 });
}
```

### 2. Input Validation

```typescript
// Validate all incoming data
const validateFineData = (data: any) => {
  const errors = [];
  
  if (!data.vehicle_plate || data.vehicle_plate.length < 3) {
    errors.push('Invalid vehicle plate');
  }
  
  if (!data.amount || data.amount <= 0) {
    errors.push('Invalid amount');
  }
  
  // Add more validations
  return errors;
};
```

### 3. Rate Limiting

Implement in Supabase Edge Function:

```typescript
// Basic rate limiting
const rateLimitKey = `ratelimit:${req.headers.get('x-forwarded-for')}`;
// Check Redis or in-memory cache
// Allow max 60 requests per minute
```

### 4. Secrets Management

**Never hardcode**:
- Company IDs
- API keys
- Webhook secrets

**Use Zapier Storage** or **Supabase Secrets**:
```bash
npx supabase secrets set ZAPIER_WEBHOOK_SECRET=xxx
npx supabase secrets set COMPANY_ID=xxx
```

---

## 📈 Monitoring & Analytics

### 1. Zapier Task History

Monitor in Zapier dashboard:
- Success rate
- Failed tasks
- Processing time
- Error patterns

### 2. Supabase Logs

```sql
-- Create monitoring view
CREATE VIEW traffic_fine_imports AS
SELECT 
  id,
  created_at,
  penalty_number,
  vehicle_plate,
  amount,
  status,
  payment_status
FROM penalties
WHERE notes LIKE '%Auto-imported from email%'
ORDER BY created_at DESC;
```

### 3. Alerts Setup

**Slack Integration**:
```
When: Import fails
Send to: #fleet-alerts channel
Message: "⚠️ Traffic fine import failed for {{vehicle_plate}}"
```

---

## 💰 Cost Estimation

### Zapier Plans

| Plan | Tasks/Month | Price | Suitable For |
|------|-------------|-------|--------------|
| Free | 100 | $0 | Testing only |
| Starter | 750 | $19.99 | Small fleet (< 20 vehicles) |
| Professional | 2,000 | $49 | Medium fleet (20-50 vehicles) |
| Team | 50,000 | $299 | Large fleet (50+ vehicles) |

**Recommendation**: Start with Starter plan, upgrade as needed

### Third-Party Services

- **OpenAI API**: ~$0.002 per email (GPT-4o-mini)
- **Google Vision OCR**: ~$1.50 per 1000 images
- **Email Parser**: Included in Zapier

**Estimated Monthly Cost** (50 fines/month):
- Zapier: $19.99
- OpenAI: ~$0.10
- **Total**: ~$20/month

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Edge function created and tested locally
- [ ] Webhook secret generated and stored
- [ ] Company ID identified
- [ ] Test emails prepared
- [ ] Zapier account active

### Deployment

- [ ] Deploy Edge function to Supabase
- [ ] Set environment variables
- [ ] Create Zapier Zap
- [ ] Configure trigger (Outlook)
- [ ] Configure AI parser (OpenAI)
- [ ] Configure webhook POST
- [ ] Add error handling
- [ ] Test with sample emails

### Post-Deployment

- [ ] Monitor for 24 hours
- [ ] Verify data accuracy
- [ ] Check vehicle matching rate
- [ ] Review error logs
- [ ] Train team on manual review process
- [ ] Document edge cases

---

## 🔄 Maintenance Plan

### Daily

- Check Zapier task history for errors
- Review unmatched vehicles
- Verify data accuracy

### Weekly

- Analyze import success rate
- Update AI parser prompts if needed
- Review duplicate detections

### Monthly

- Audit imported fines vs manual entries
- Optimize extraction patterns
- Update documentation
- Review costs

---

## 📚 Common Email Formats

### Format 1: Kuwait Traffic Department

```
Subject: Traffic Violation Notice - رقم المخالفة TF123456

المخالفة رقم: TF123456
التاريخ: 12/10/2025
رقم اللوحة: ABC-1234
الموقع: مدينة الكويت - الشويخ
نوع المخالفة: تجاوز السرعة
المبلغ: 50.000 د.ك
السبب: تجاوز السرعة المحددة بمقدار 20 كم/ساعة
```

### Format 2: English Format

```
Subject: Traffic Fine Notification

Penalty: TF123456
Date: October 12, 2025
Vehicle: ABC-1234
Location: Kuwait City, Shuwaikh
Type: Speeding
Amount: 50.000 KWD
Details: Speed limit exceeded by 20 km/h
```

### Format 3: PDF Attachment

```
Subject: Traffic Violation - See Attachment

Please find attached the traffic fine details for vehicle ABC-1234.

[PDF Attachment: fine_TF123456.pdf]
```

---

## 🆘 Troubleshooting Guide

### Issue 1: Email Not Triggering Zap

**Solution**:
- Check Outlook search string
- Verify email folder
- Test trigger manually in Zapier
- Check email format matches search criteria

### Issue 2: AI Extraction Incorrect

**Solution**:
- Review OpenAI prompt
- Add more examples to prompt
- Use regex fallbacks for critical fields
- Implement manual review queue

### Issue 3: Vehicle Not Matched

**Solution**:
- Check plate number format in database
- Implement fuzzy matching
- Create alert for unmatched vehicles
- Add manual matching interface

### Issue 4: Webhook Timeout

**Solution**:
- Optimize Edge function
- Add async processing queue
- Increase timeout settings
- Implement retry logic

### Issue 5: Duplicate Records

**Solution**:
- Add unique constraint on penalty_number
- Implement check in Edge function
- Add Zapier filter for duplicates
- Create cleanup script

---

## 📞 Support & Resources

### Zapier Resources
- Documentation: https://zapier.com/help
- Community: https://community.zapier.com
- Support: help@zapier.com

### Supabase Resources
- Edge Functions: https://supabase.com/docs/guides/functions
- Support: https://supabase.com/support

### OpenAI Resources
- API Docs: https://platform.openai.com/docs
- Playground: https://platform.openai.com/playground

---

## 🎯 Success Metrics

Track these KPIs:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Import Success Rate | > 95% | Successful imports / Total emails |
| Vehicle Match Rate | > 90% | Matched vehicles / Total imports |
| Processing Time | < 30 sec | Email received → Record created |
| Data Accuracy | > 98% | Correct data / Total fields |
| Manual Reviews | < 5% | Manual reviews / Total imports |

---

## 📝 Next Steps

1. **Immediate** (Today):
   - [ ] Create Edge function file
   - [ ] Deploy to Supabase
   - [ ] Get webhook URL

2. **Short-term** (This Week):
   - [ ] Create Zapier account (if not exists)
   - [ ] Build Zap following Phase 2
   - [ ] Test with sample emails
   - [ ] Deploy to production

3. **Medium-term** (This Month):
   - [ ] Monitor and optimize
   - [ ] Add advanced features
   - [ ] Train team
   - [ ] Document processes

4. **Long-term** (Ongoing):
   - [ ] Expand to other email types
   - [ ] Add more automation
   - [ ] Integrate with payment systems
   - [ ] Build analytics dashboard

---

## ✅ Acceptance Criteria

This integration is complete when:

- [x] Plan documented
- [ ] Edge function deployed
- [ ] Zapier Zap created and tested
- [ ] Traffic fines auto-imported from Outlook
- [ ] Vehicle matching works > 90% of time
- [ ] Error notifications configured
- [ ] Team trained on system
- [ ] Documentation complete

---

**Status**: 📋 Planning Complete - Ready for Implementation  
**Next**: Deploy Edge Function  
**Owner**: KHAMIS AL-JABOR  
**Priority**: High  

---

*This plan was created specifically for the Fleetify fleet management system based on the existing traffic violation infrastructure and Supabase backend.*
