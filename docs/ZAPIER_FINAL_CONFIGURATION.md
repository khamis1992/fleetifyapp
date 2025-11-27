# 🔧 Zapier Configuration - FINAL SOLUTION

**Issue**: Supabase Edge Functions require authorization header  
**Solution**: Use Supabase anon key in Zapier webhook configuration  
**Status**: Ready to configure

---

## 🔍 The Real Issue

Supabase Edge Functions **ALWAYS** require authentication headers, even when using `--no-verify-jwt`. The function code can accept custom webhook secrets, but Supabase's API Gateway requires either:

1. **Anon Key** (public API key)
2. **Service Role Key** (admin key)

---

## ✅ SOLUTION: Use Anon Key in Zapier

### **For Zapier Webhook Configuration**

When configuring the Webhooks by Zapier step, use these headers:

```json
{
  "Content-Type": "application/json",
  "apikey": "YOUR_SUPABASE_ANON_KEY",
  "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY",
  "x-webhook-secret": "fleetify_zapier_webhook_khamis_2025_secure_traffic_fines_integration_v1"
}
```

---

## 🔑 Get Your Supabase Anon Key

### **Method 1: From Supabase Dashboard**

1. Go to: https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu/settings/api
2. Find "Project API keys"
3. Copy the **anon** / **public** key (starts with `eyJ...`)

### **Method 2: From Environment Variables**

The anon key is already stored in your secrets:
```bash
npx supabase secrets list --project-ref qwhunliohlkkahbspfiu
```

Look for `SUPABASE_ANON_KEY`

---

## 📋 Complete Zapier Webhook Configuration

### **Webhook POST Step**

**URL**:
```
https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/process-traffic-fine
```

**Method**: POST

**Headers** (click "Show advanced options"):
```
Content-Type: application/json
apikey: <YOUR_SUPABASE_ANON_KEY>
Authorization: Bearer <YOUR_SUPABASE_ANON_KEY>
x-webhook-secret: fleetify_zapier_webhook_khamis_2025_secure_traffic_fines_integration_v1
```

**Data (JSON format)**:
```json
{
  "company_id": "YOUR_COMPANY_ID",
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

## 🔐 Security Explanation

### **Multi-Layer Security**:

1. **Supabase API Gateway**: Validates anon key (public, safe to use in Zapier)
2. **Custom Webhook Secret**: Additional validation in our function code
3. **Input Validation**: All data validated before processing
4. **RLS Policies**: Database-level security (company isolation)

The anon key is **safe to use in Zapier** because:
- It's public by design (used in frontend apps)
- RLS policies protect data access
- Our function adds webhook secret validation
- Input validation prevents injection attacks

---

## 🧪 How to Test

### **Step 1: Get Your Keys**

```bash
# Get anon key
npx supabase secrets list --project-ref qwhunliohlkkahbspfiu | grep SUPABASE_ANON_KEY

# Or from dashboard
# https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu/settings/api
```

### **Step 2: Test with PowerShell**

Update `test-webhook.ps1` with your anon key, then run:

```powershell
powershell -ExecutionPolicy Bypass -File test-webhook.ps1
```

### **Step 3: Expected Success Response**

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

## 📝 Complete Zapier Zap Setup

### **Step 1: Trigger - Outlook**
- **App**: Microsoft Outlook
- **Event**: New Email Matching Search
- **Search**: `subject:"traffic fine" OR subject:"مخالفة"`

### **Step 2: Parser - OpenAI**
- **App**: OpenAI
- **Model**: gpt-4o-mini
- **Prompt**: See ZAPIER_IMPLEMENTATION_COMPLETE.md

### **Step 3: Webhook - POST**
- **App**: Webhooks by Zapier
- **URL**: `https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/process-traffic-fine`
- **Headers**: See configuration above (with anon key)
- **Body**: JSON with all fields

### **Step 4: Notification** (Optional)
- **App**: Email by Zapier
- **Send**: Success notification

---

## ⚠️ Important Notes

### **DO Use**:
- ✅ Supabase anon key (public, safe)
- ✅ Custom webhook secret (extra security)
- ✅ HTTPS only (encrypted)
- ✅ Input validation (built-in)

### **DON'T Use**:
- ❌ Service role key (admin key - dangerous)
- ❌ Database credentials (never needed)
- ❌ Personal access tokens (wrong type)

---

## 🎯 Quick Reference

**Webhook URL**:
```
https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/process-traffic-fine
```

**Required Headers**:
1. `Content-Type: application/json`
2. `apikey: <SUPABASE_ANON_KEY>`
3. `Authorization: Bearer <SUPABASE_ANON_KEY>`
4. `x-webhook-secret: fleetify_zapier_webhook_khamis_2025_secure_traffic_fines_integration_v1`

**Get Anon Key**: https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu/settings/api

---

## ✅ Final Checklist

### Before Zapier Setup:
- [ ] Get Supabase anon key from dashboard
- [ ] Get company_id from database
- [ ] Verify Edge Function is deployed
- [ ] Test endpoint with correct headers

### During Zapier Setup:
- [ ] Create Outlook trigger
- [ ] Add OpenAI parser
- [ ] Configure webhook with ALL 4 headers
- [ ] Add company_id to webhook body
- [ ] Test each step

### After Setup:
- [ ] Send test email
- [ ] Verify record created in Fleetify
- [ ] Check vehicle matching
- [ ] Turn on Zap
- [ ] Monitor for 24 hours

---

## 🚀 You're Ready!

The backend is fully functional. You just need to:

1. **Get your anon key** from Supabase dashboard
2. **Add it to Zapier** webhook headers
3. **Test** with sample email
4. **Go live!**

---

**Status**: ✅ Backend Ready  
**Issue**: ✅ Understood  
**Solution**: ✅ Documented  
**Next**: Configure Zapier with anon key

🎉 **Start automating your traffic fines!**
