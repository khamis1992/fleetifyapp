# 🚀 Zapier Integration - Quick Reference Card

**Status**: ✅ DEPLOYED & READY  
**Owner**: KHAMIS AL-JABOR

---

## 🔗 Essential URLs

**Webhook Endpoint**:
```
https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/process-traffic-fine
```

**Webhook Secret** (for Zapier):
```
fleetify_zapier_webhook_khamis_2025_secure_traffic_fines_integration_v1
```

**Supabase Dashboard**:
```
https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu/functions
```

**Zapier Create Zap**:
```
https://zapier.com/app/zaps
```

**Fleetify Traffic Violations**:
```
https://fleetifyapp.vercel.app/fleet/traffic-violations
```

---

## ⚡ Quick Setup (5 Steps)

### 1. Create Zapier Zap
- Go to https://zapier.com/app/zaps
- Click "Create Zap"
- Name: "Outlook Traffic Fines → Fleetify"

### 2. Add Outlook Trigger
- App: **Microsoft Outlook**
- Event: **New Email Matching Search**
- Search: `subject:"traffic fine" OR subject:"مخالفة"`

### 3. Add OpenAI Parser
- App: **OpenAI**
- Model: **gpt-4o-mini**
- Prompt: See full guide

### 4. Add Webhook
- App: **Webhooks by Zapier**
- URL: `https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/process-traffic-fine`
- Header: `x-webhook-secret: fleetify_zapier_webhook_khamis_2025_secure_traffic_fines_integration_v1`

### 5. Test & Publish
- Send test email
- Verify in Fleetify
- Turn on Zap

---

## 📋 Webhook POST Body Template

```json
{
  "penalty_number": "{{openai.penalty_number}}",
  "violation_date": "{{openai.violation_date}}",
  "violation_type": "{{openai.violation_type}}",
  "vehicle_plate": "{{openai.vehicle_plate}}",
  "location": "{{openai.location}}",
  "amount": {{openai.amount}},
  "reason": "{{openai.reason}}",
  "issuing_authority": "{{openai.issuing_authority}}",
  "due_date": "{{openai.due_date}}",
  "email_subject": "{{outlook.subject}}",
  "email_body": "{{outlook.body_plain}}",
  "company_id": "YOUR_COMPANY_ID"
}
```

**Get Company ID**: Run in Supabase SQL Editor:
```sql
SELECT id FROM companies;
```

---

## 🧪 Test Email

```
Subject: Traffic Fine Test

Penalty Number: TEST123
Date: 2025-10-12
Vehicle Plate: ABC-1234
Location: Kuwait City
Violation Type: Speeding
Amount: 50.000 KWD
Reason: Exceeding speed limit
```

---

## 🎯 OpenAI Prompt (Copy-Paste)

```
Extract traffic fine information from this email and return ONLY valid JSON:

EMAIL SUBJECT: {{outlook.subject}}
EMAIL BODY: {{outlook.body_plain}}

{
  "penalty_number": "string or null",
  "violation_date": "YYYY-MM-DD",
  "violation_type": "string",
  "vehicle_plate": "string",
  "location": "string",
  "amount": 50.000,
  "reason": "string",
  "issuing_authority": "string or null",
  "due_date": "YYYY-MM-DD or null"
}

Convert dates to YYYY-MM-DD. Extract only numeric amount. Return JSON only.
```

---

## ✅ Success Checklist

- [ ] Zapier Zap created
- [ ] Outlook trigger configured
- [ ] OpenAI parser added
- [ ] Webhook endpoint set
- [ ] Webhook secret added
- [ ] Company ID inserted
- [ ] Test email sent
- [ ] Record appears in Fleetify
- [ ] Zap turned ON

---

## 🐛 Troubleshooting

| Error | Fix |
|-------|-----|
| "Unauthorized" | Check webhook secret matches |
| "Validation failed" | Ensure all required fields extracted |
| "Duplicate" | Normal - prevents duplicates |
| Vehicle not matched | Will still create record |

---

## 📊 Monitoring

**Zapier History**: https://zapier.com/app/history  
**Supabase Logs**: https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu/logs  
**Fleetify Dashboard**: https://fleetifyapp.vercel.app/fleet/traffic-violations

---

## 💰 Cost

- Zapier Starter: $19.99/month
- OpenAI: ~$0.10/month (50 emails)
- **Total: ~$20/month**
- **Saves: ~$190/month in manual work**

---

## 📚 Full Documentation

1. `ZAPIER_IMPLEMENTATION_COMPLETE.md` - Complete setup guide
2. `ZAPIER_DEPLOYMENT_GUIDE.md` - Quick start
3. `ZAPIER_TRAFFIC_FINES_INTEGRATION_PLAN.md` - Full plan

---

**🎉 You're ready to automate! Go to Zapier and create your Zap now.**
