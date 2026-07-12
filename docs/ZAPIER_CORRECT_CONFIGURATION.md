# ✅ ZAPIER CONFIGURATION - CORRECT KEYS

**Status**: Ready to Configure  
**User**: KHAMIS AL-JABOR  
**Date**: 2025-10-13

---

## 🔑 YOUR SUPABASE KEYS

### **Anon Key** (Use this in Zapier):
```
<your-supabase-anon-key>
```

### **Webhook Secret**:
```
<your-zapier-webhook-secret>
```

---

## 📋 EXACT ZAPIER WEBHOOK CONFIGURATION

### **Step: Webhooks by Zapier - POST**

**URL**:
```
https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/process-traffic-fine
```

**Method**: `POST`

**Headers** (Add these exactly):

| Header Name | Header Value |
|-------------|--------------|
| `Content-Type` | `application/json` |
| `apikey` | `<your-supabase-anon-key>` |
| `Authorization` | `Bearer <your-supabase-anon-key>` |
| `x-webhook-secret` | `<your-zapier-webhook-secret>` |

**Data** (JSON format):
```json
{
  "company_id": "YOUR_COMPANY_ID_HERE",
  "penalty_number": "{{2.penalty_number}}",
  "violation_date": "{{2.violation_date}}",
  "violation_type": "{{2.violation_type}}",
  "vehicle_plate": "{{2.vehicle_plate}}",
  "location": "{{2.location}}",
  "amount": {{2.amount}},
  "reason": "{{2.reason}}",
  "issuing_authority": "{{2.issuing_authority}}",
  "due_date": "{{2.due_date}}",
  "email_subject": "{{1.subject}}",
  "email_body": "{{1.body_plain}}"
}
```

---

## 🎯 How to Add Headers in Zapier

1. In the Webhook POST step, scroll down
2. Find "Headers" section
3. Click "Add a header" for each one
4. **Exactly copy-paste** the values from the table above

### **Screenshot Guide**:
```
┌─────────────────────────────────────────┐
│ Headers                                 │
├─────────────────────────────────────────┤
│ Content-Type    │ application/json      │
├─────────────────┼───────────────────────┤
│ apikey          │ eyJhbGci...           │
├─────────────────┼───────────────────────┤
│ Authorization   │ Bearer eyJhbGci...    │
├─────────────────┼───────────────────────┤
│ x-webhook-secret│ fleetify_zapier...    │
└─────────────────┴───────────────────────┘
```

---

## 🔍 Get Your Company ID

Run this in Supabase SQL Editor:
```sql
SELECT id, name FROM companies;
```

Copy the `id` and replace `YOUR_COMPANY_ID_HERE` in the webhook body.

---

## ✅ Testing Checklist

Before turning on your Zap:

- [ ] All 4 headers added to Zapier
- [ ] Anon key copied exactly (no extra spaces)
- [ ] Authorization header includes "Bearer " prefix
- [ ] Company ID added to webhook body
- [ ] All OpenAI fields mapped correctly
- [ ] Test step shows success (200 response)

---

## 🐛 Troubleshooting

### Error: "Invalid JWT"
**Cause**: Wrong anon key or missing "Bearer" prefix  
**Fix**: Copy the exact key from above, ensure Authorization header has "Bearer " prefix

### Error: "Missing authorization header"
**Cause**: Headers not added to Zapier  
**Fix**: Add all 4 headers exactly as shown

### Error: "Validation failed"
**Cause**: Missing required fields  
**Fix**: Ensure company_id and all required fields are in body

### Success Response:
```json
{
  "success": true,
  "violation_id": "uuid-here",
  "penalty_number": "TEST123",
  "message": "Traffic fine processed and imported successfully",
  "matched_vehicle": true,
  "matched_customer": true
}
```

---

## 🚀 Quick Start

1. **Copy anon key** from above
2. **Add 4 headers** to Zapier webhook step
3. **Get company ID** from Supabase
4. **Test** webhook step in Zapier
5. **Verify** success response
6. **Turn on** Zap

---

## 📞 Support

If still getting errors:
1. Check all headers are added
2. Verify no extra spaces in keys
3. Ensure "Bearer " prefix in Authorization
4. Confirm company_id is correct UUID
5. Check Supabase logs for details

---

**Status**: ✅ Keys Retrieved  
**Next**: Add to Zapier  
**Time**: 5 minutes

🎉 **You're ready to configure!**
