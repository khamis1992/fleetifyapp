# 🚨 Zapier Validation Error Fix Guide

## The Issue
The webhook is returning **"Validation failed"** because required fields are missing from the OpenAI extraction step in Zapier.

## ✅ Required Fields Analysis

### REQUIRED Fields (Must be present and valid)
1. **`company_id`** - Your company identifier
2. **`vehicle_plate`** - Vehicle plate number (minimum 2 characters)
3. **`violation_date`** - Date of violation (valid date format)
4. **`amount`** - Fine amount (must be positive number)
5. **`violation_type`** - Type of violation (cannot be empty)
6. **`location`** - Location where violation occurred
7. **`reason`** - Reason for the violation

### OPTIONAL Fields (Can be null/empty)
- **`penalty_number`** - Auto-generated if not provided
- **`issuing_authority`** - Authority that issued the fine
- **`due_date`** - When the fine is due
- **`email_subject`** - Original email subject
- **`email_body`** - Original email content

## 🔧 How to Fix Your Zapier Workflow

### Step 1: Get Your Company ID
First, you need to find your company ID from the database:

```sql
-- Run this query in your Supabase SQL editor
SELECT id, name FROM companies WHERE name ILIKE '%your-company-name%';
```

### Step 2: Fix OpenAI Prompt in Zapier
Update your OpenAI step with this improved prompt:

```
Extract the following information from this traffic fine email and return ONLY a valid JSON object:

{
  "company_id": "24bc0b21-4e2d-4413-9842-31719a3669f4",
  "vehicle_plate": "extracted plate number",
  "violation_date": "YYYY-MM-DD format",
  "amount": numeric_value_only,
  "violation_type": "type of violation",
  "location": "location of violation", 
  "reason": "detailed reason",
  "penalty_number": "penalty number if found, otherwise null",
  "issuing_authority": "authority name if found",
  "due_date": "YYYY-MM-DD if found, otherwise null",
  "email_subject": "original email subject",
  "email_body": "original email content"
}

Rules:
- Amount must be a number (no currency symbols)
- Dates must be in YYYY-MM-DD format
- If any required field cannot be extracted, use reasonable defaults
- Extract exact plate number as written
- Be thorough in extracting violation details

Email content:
```

### Step 3: Update Webhook Body in Zapier
In your Webhooks by Zapier step, ensure the body contains ALL required fields:

```json
{
  "company_id": "YOUR_ACTUAL_COMPANY_ID",
  "vehicle_plate": "{{output from OpenAI step}}",
  "violation_date": "{{output from OpenAI step}}",
  "amount": "{{output from OpenAI step}}",
  "violation_type": "{{output from OpenAI step}}",
  "location": "{{output from OpenAI step}}",
  "reason": "{{output from OpenAI step}}",
  "penalty_number": "{{output from OpenAI step}}",
  "issuing_authority": "{{output from OpenAI step}}",
  "due_date": "{{output from OpenAI step}}",
  "email_subject": "{{original email subject}}",
  "email_body": "{{original email body}}"
}
```

## 🧪 Test Your Configuration

### Test JSON Payload Example
Use this sample data to test your webhook:

```json
{
  "company_id": "YOUR_COMPANY_ID_HERE",
  "vehicle_plate": "ABC-123",
  "violation_date": "2025-01-10",
  "amount": 150.00,
  "violation_type": "Speeding",
  "location": "Highway 101, Mile 25",
  "reason": "Exceeded speed limit by 15 km/h",
  "penalty_number": "TF-2025-001234",
  "issuing_authority": "Traffic Police",
  "due_date": "2025-02-10",
  "email_subject": "Traffic Fine Notification",
  "email_body": "You have received a traffic fine..."
}
```

## 📋 Troubleshooting Checklist

### ✅ Check Your OpenAI Output
1. Go to your Zapier dashboard
2. Find the OpenAI step in your workflow
3. Check the output to ensure it contains all required fields
4. Make sure the JSON is valid (no syntax errors)

### ✅ Check Field Mapping
1. In the Webhooks step, verify each field is mapped correctly
2. Ensure `company_id` is your actual company ID (not a variable)
3. Check that dates are in YYYY-MM-DD format
4. Verify amount is a number (not string with currency)

### ✅ Common Issues and Fixes

| Issue | Fix |
|-------|-----|
| `company_id is required` | Replace with your actual company ID |
| `vehicle_plate is required` | Check OpenAI extracted the plate correctly |
| `violation_date must be a valid date` | Ensure date format is YYYY-MM-DD |
| `amount must be a positive number` | Remove currency symbols, use numbers only |
| `violation_type is required` | Ensure OpenAI extracted violation type |
| `location is required` | Verify location was extracted from email |
| `reason is required` | Make sure reason/description is extracted |

## 🎯 Quick Fix Steps

1. **Find your company ID** from Supabase
2. **Replace** `YOUR_COMPANY_ID_HERE` in the webhook body
3. **Update** OpenAI prompt to be more specific
4. **Test** the workflow with a sample email
5. **Check** the webhook response for success

## 📞 If Still Having Issues

If you're still getting validation errors:

1. Check the webhook logs in Supabase (Functions > Logs)
2. Look for specific validation error messages
3. Use the test script to verify webhook functionality
4. Ensure all required fields are present and correctly formatted

The webhook IS working - it's just missing required data from the OpenAI extraction step!