# 🎯 ZAPIER CONFIGURATION - FINAL SETUP

## 📋 Your Company Information
Based on your Supabase database:

| Company Name | Company ID | Use This For |
|-------------|------------|--------------|
| النور للمقاولات | `6dfd73fd-221b-4d93-aa98-41f80ce58db2` | **PRIMARY** |
| العراف لتاجير السيارات | `24bc0b21-4e2d-4413-9842-31719a3669f4` | Alternative |
| البشائر الخليجية | `1ddee958-dd87-4aeb-a7ae-7a46b72aa46f` | Alternative |

**Use the PRIMARY company ID unless you specifically need one of the others.**

---

## 🔧 STEP 1: Update OpenAI Step in Zapier

Replace your OpenAI prompt with this exact text:

```
Extract traffic fine information from this email and return ONLY valid JSON:

{
  "company_id": "6dfd73fd-221b-4d93-aa98-41f80ce58db2",
  "vehicle_plate": "extracted vehicle plate number",
  "violation_date": "YYYY-MM-DD format",
  "amount": numeric_value_only_no_currency,
  "violation_type": "type of traffic violation",
  "location": "location where violation occurred",
  "reason": "detailed reason for violation",
  "penalty_number": "penalty number if mentioned or null",
  "issuing_authority": "issuing authority name or null",
  "due_date": "YYYY-MM-DD format if mentioned or null",
  "email_subject": "original email subject",
  "email_body": "original email content"
}

CRITICAL RULES:
- company_id must ALWAYS be "6dfd73fd-221b-4d93-aa98-41f80ce58db2"
- amount must be a NUMBER (remove currency symbols: $, SAR, etc.)
- dates must be YYYY-MM-DD format (convert from any format)
- vehicle_plate should be exact as written in email
- if you cannot extract a required field, make a reasonable guess
- ALL text fields must be filled, use "Not specified" if unknown

Email to extract from:
```

---

## 🔧 STEP 2: Update Webhook Body in Zapier

In your "Webhooks by Zapier" step, set the request body to **exactly** this:

```json
{
  "company_id": "6dfd73fd-221b-4d93-aa98-41f80ce58db2",
  "vehicle_plate": "{{1. vehicle_plate}}",
  "violation_date": "{{1. violation_date}}",
  "amount": "{{1. amount}}",
  "violation_type": "{{1. violation_type}}",
  "location": "{{1. location}}",
  "reason": "{{1. reason}}",
  "penalty_number": "{{1. penalty_number}}",
  "issuing_authority": "{{1. issuing_authority}}",
  "due_date": "{{1. due_date}}",
  "email_subject": "{{1. email_subject}}",
  "email_body": "{{1. email_body}}"
}
```

**Replace the `{{1. fieldname}}` with the actual output variables from your OpenAI step.**

---

## 🔧 STEP 3: Webhook Headers

Ensure your webhook headers are set to:

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTMwODYsImV4cCI6MjA2ODk4OTA4Nn0.x5o6IpzWcYo7a6jRq2J8V0hKyNeRKZCEQIuXTPADQqs` |
| `x-webhook-secret` | `fleetify_zapier_webhook_khamis_2025_secure_traffic_fines_integration_v1` |

---

## 🧪 STEP 4: Test with Updated Configuration

Run the debug test script with your company ID:

```powershell
# Edit the test script and replace REPLACE_WITH_YOUR_COMPANY_ID with:
"6dfd73fd-221b-4d93-aa98-41f80ce58db2"

# Then run:
.\test-webhook-debug.ps1
```

---

## 🎯 STEP 5: Test Real Zapier Workflow

1. **Send a test email** to your Outlook with traffic fine information
2. **Check the OpenAI output** in Zapier - ensure it returns valid JSON
3. **Verify the webhook call** succeeds
4. **Check your Supabase database** for the new penalty record

---

## ✅ Expected Success Response

When everything works correctly, you should see:

```json
{
  "success": true,
  "violation_id": "uuid-here",
  "penalty_number": "AUTO-1673891234-ABC123",
  "message": "Traffic fine processed and imported successfully",
  "matched_vehicle": true,
  "matched_customer": false
}
```

---

## 🚨 Common Issues & Quick Fixes

| Error | Fix |
|-------|-----|
| `company_id is required` | Use `6dfd73fd-221b-4d93-aa98-41f80ce58db2` |
| `amount must be positive number` | Remove currency symbols from amount |
| `violation_date must be valid date` | Use YYYY-MM-DD format |
| `vehicle_plate is required` | Check OpenAI extracted the plate correctly |
| `violation_type is required` | Ensure OpenAI extracts violation type |
| `location is required` | Make sure location is extracted |
| `reason is required` | Verify reason/description is present |

---

## 📞 Testing Checklist

- [ ] Company ID is `6dfd73fd-221b-4d93-aa98-41f80ce58db2`
- [ ] OpenAI prompt updated with exact text above
- [ ] Webhook body maps all fields correctly
- [ ] All 4 headers are present
- [ ] Test script runs successfully
- [ ] Real email test in Zapier works

**Your webhook IS working - it just needs the correct data format!**