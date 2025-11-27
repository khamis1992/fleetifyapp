# 🚀 Zapier Integration - Quick Deployment Guide

## ✅ What's Been Created

1. **`ZAPIER_TRAFFIC_FINES_INTEGRATION_PLAN.md`** - Complete integration plan (875 lines)
2. **`supabase/functions/process-traffic-fine/index.ts`** - Webhook endpoint (418 lines)
3. **This guide** - Step-by-step deployment instructions

---

## 📋 Prerequisites

- [x] Supabase project set up
- [x] Supabase CLI installed (`npm install -g supabase`)
- [x] Zapier account (Free or Paid)
- [x] Outlook email account with traffic fine emails
- [ ] OpenAI API key (optional, for AI extraction)

---

## 🚀 Quick Start (5 Steps)

### Step 1: Deploy Edge Function (5 minutes)

```bash
# 1. Login to Supabase
npx supabase login

# 2. Link your project
npx supabase link --project-ref YOUR_PROJECT_REF

# 3. Deploy the function
npx supabase functions deploy process-traffic-fine

# 4. Set the webhook secret (generate a random string)
npx supabase secrets set ZAPIER_WEBHOOK_SECRET="your_secure_random_string_here_minimum_32_chars"

# 5. Get your webhook URL
echo "Your webhook URL:"
echo "https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-traffic-fine"
```

**Important**: Save your webhook URL and secret - you'll need them for Zapier!

### Step 2: Get Your Company ID (2 minutes)

```sql
-- Run this in Supabase SQL Editor
SELECT id, name FROM companies;
```

Copy your company ID - you'll use it in Zapier configuration.

### Step 3: Create Zapier Zap (15 minutes)

Go to https://zapier.com/app/zaps and follow the plan in `ZAPIER_TRAFFIC_FINES_INTEGRATION_PLAN.md` Section "Phase 2".

**Quick Configuration**:

1. **Trigger**: Outlook → New Email Matching Search
   - Search: `subject:traffic fine OR subject:مخالفة`
   
2. **Action**: OpenAI → Create Chat Completion
   - Model: `gpt-4o-mini`
   - Prompt: See plan document
   
3. **Action**: Webhooks → POST
   - URL: Your webhook URL from Step 1
   - Headers: `x-webhook-secret: YOUR_SECRET`
   - Body: JSON (see plan)

### Step 4: Test (5 minutes)

Send a test email to your Outlook:

```
Subject: Traffic Fine - Test

Penalty Number: TEST123
Date: 2025-10-12
Vehicle Plate: ABC-1234
Location: Kuwait City
Violation Type: Speeding
Amount: 50.000
Reason: Exceeding speed limit
```

Check:
- [ ] Zapier triggered
- [ ] Webhook received data
- [ ] Record created in Fleetify

### Step 5: Monitor (Ongoing)

- **Zapier Dashboard**: https://zapier.com/app/history
- **Supabase Logs**: https://supabase.com/dashboard/project/_/logs
- **Fleetify**: https://fleetifyapp.vercel.app/fleet/traffic-violations

---

## 🔧 Configuration Options

### Option 1: Basic (No AI)

If you don't want to use OpenAI:

**Zapier Steps**:
1. Outlook Trigger
2. Email Parser (manual pattern matching)
3. Webhook POST

**Pros**: Free, simple  
**Cons**: Less accurate, requires consistent email format

### Option 2: With AI (Recommended)

**Zapier Steps**:
1. Outlook Trigger
2. OpenAI GPT-4o-mini
3. Webhook POST

**Pros**: Accurate, handles variations  
**Cons**: ~$0.002 per email

### Option 3: With PDF Processing

**Zapier Steps**:
1. Outlook Trigger
2. Extract PDF Attachment
3. Google Vision OCR
4. OpenAI for structuring
5. Webhook POST

**Pros**: Handles PDF fines  
**Cons**: More expensive, complex

---

## 🎯 Sample Zapier Configuration

### OpenAI Prompt Template

```
You are a data extraction AI. Extract traffic fine information from the following email.

EMAIL SUBJECT: {{trigger.subject}}
EMAIL BODY: {{trigger.body_plain}}

Extract and return ONLY valid JSON in this exact format:
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

Rules:
- If penalty_number not found, set to null
- Convert all dates to YYYY-MM-DD format
- Extract only the numeric amount (e.g., "50.000 KWD" becomes 50.000)
- Preserve Arabic or English text as-is
- Return ONLY the JSON, no explanation
```

### Webhook POST Body

```json
{
  "penalty_number": "{{step2.penalty_number}}",
  "violation_date": "{{step2.violation_date}}",
  "violation_type": "{{step2.violation_type}}",
  "vehicle_plate": "{{step2.vehicle_plate}}",
  "location": "{{step2.location}}",
  "amount": {{step2.amount}},
  "reason": "{{step2.reason}}",
  "issuing_authority": "{{step2.issuing_authority}}",
  "due_date": "{{step2.due_date}}",
  "email_subject": "{{trigger.subject}}",
  "email_body": "{{trigger.body_plain}}",
  "company_id": "YOUR_COMPANY_ID_HERE"
}
```

**Replace `YOUR_COMPANY_ID_HERE` with your actual company ID from Step 2!**

---

## 🐛 Troubleshooting

### Error: "Unauthorized - Invalid webhook secret"

**Fix**: Check that:
1. You set the secret: `npx supabase secrets set ZAPIER_WEBHOOK_SECRET="..."`
2. Zapier header matches: `x-webhook-secret: same_value`

### Error: "Missing required fields"

**Fix**: Check your OpenAI extraction or email parser is providing all required fields.

### Error: "Duplicate penalty number"

**Fix**: This is normal - the system prevents duplicates. Check if the fine already exists.

### Vehicle Not Matched

**Fix**: 
1. Check vehicle plate format in database
2. Verify company_id is correct
3. Manually match vehicle in Fleetify UI

---

## 📊 Monitoring Dashboard

Check these regularly:

1. **Zapier Task History**:
   - https://zapier.com/app/history
   - Look for failed tasks
   - Review extracted data

2. **Supabase Logs**:
   - https://supabase.com/dashboard/project/_/logs
   - Filter by "process-traffic-fine"
   - Check for errors

3. **Fleetify Traffic Violations**:
   - https://fleetifyapp.vercel.app/fleet/traffic-violations
   - Review imported fines
   - Check vehicle matching rate

---

## 💡 Tips for Success

### Tip 1: Start Simple

Begin with manual testing:
1. Send test email
2. Manually extract data
3. Test webhook with Postman
4. Then automate with Zapier

### Tip 2: Monitor First Week Closely

- Review all imports daily
- Adjust AI prompts as needed
- Document edge cases
- Fine-tune matching logic

### Tip 3: Create Manual Review Process

For unmatched vehicles:
1. Daily review of imports
2. Manual vehicle assignment
3. Update plate number format
4. Retrain AI if needed

---

## 🔐 Security Checklist

- [ ] Webhook secret is strong (32+ random characters)
- [ ] Webhook secret stored in Supabase Secrets (not hardcoded)
- [ ] Company ID validated in Edge Function
- [ ] HTTPS only (enforced by Supabase)
- [ ] Rate limiting considered (see plan)
- [ ] Audit logs enabled

---

## 📈 Success Metrics

After 1 week, measure:

| Metric | Target | How to Check |
|--------|--------|--------------|
| Import Success Rate | >95% | Zapier history |
| Vehicle Match Rate | >90% | Supabase logs |
| Data Accuracy | >98% | Manual review |
| Processing Time | <30s | Zapier task time |

---

## 🆘 Need Help?

1. **Check the full plan**: `ZAPIER_TRAFFIC_FINES_INTEGRATION_PLAN.md`
2. **Zapier Support**: https://zapier.com/help
3. **Supabase Support**: https://supabase.com/support
4. **Edge Function Logs**: Check Supabase dashboard

---

## 📝 Next Steps After Deployment

1. [ ] Test with real traffic fine emails
2. [ ] Monitor for 1 week
3. [ ] Adjust AI prompts based on accuracy
4. [ ] Document common email formats
5. [ ] Train team on manual review process
6. [ ] Set up error notifications (Slack/Email)
7. [ ] Create weekly review routine

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Edge function created
- [ ] Webhook secret generated
- [ ] Company ID identified
- [ ] Zapier account ready

### Deployment
- [ ] Edge function deployed to Supabase
- [ ] Secrets configured
- [ ] Zapier Zap created
- [ ] Trigger tested
- [ ] OpenAI configured
- [ ] Webhook tested

### Post-Deployment
- [ ] Test email sent
- [ ] Record created in Fleetify
- [ ] Vehicle matched correctly
- [ ] Error handling works
- [ ] Team notified
- [ ] Monitoring active

---

**Status**: Ready for deployment  
**Estimated Time**: 30 minutes total  
**Difficulty**: Intermediate  

Good luck with your integration! 🚀
