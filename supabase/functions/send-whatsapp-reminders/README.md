# WhatsApp Reminders Edge Function

## Overview
This Supabase Edge Function processes queued payment reminders and sends them via WhatsApp using the Ultramsg API.

## Prerequisites

1. **Ultramsg Account**
   - Sign up at: https://ultramsg.com
   - Create a new instance
   - Scan QR code with your phone
   - Get your Instance ID and Token

2. **Supabase Project**
   - Edge Functions enabled
   - pg_cron extension enabled
   - pg_net extension enabled

## Setup Instructions

### Step 1: Configure Environment Variables

In Supabase Dashboard → Project Settings → Edge Functions → Secrets, add:

```
ULTRAMSG_INSTANCE_ID=instance123456
ULTRAMSG_TOKEN=your_token_here
```

### Step 2: Deploy Edge Function

```bash
# From project root
npx supabase functions deploy send-whatsapp-reminders
```

### Step 3: Apply Database Migration

```bash
# This creates helper functions and cron job setup
npx supabase db push
```

### Step 4: Configure Cron Job

In Supabase SQL Editor, run:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the function to run every 5 minutes
SELECT cron.schedule(
  'process-whatsapp-reminders',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-whatsapp-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);
```

**Replace:**
- `YOUR_PROJECT_REF` with your actual project reference
- `YOUR_ANON_KEY` with your anon/public key

## Testing

### Test 1: Send a test message

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-whatsapp-reminders" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "test": true,
    "phone": "97412345678",
    "message": "رسالة تجريبية من نظام التنبيهات ✅"
  }'
```

### Test 2: Process queued reminders

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-whatsapp-reminders" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Test 3: Check database

```sql
-- View recent reminders
SELECT * FROM whatsapp_reminders_status LIMIT 20;

-- View statistics
SELECT get_whatsapp_stats();

-- Check queued reminders
SELECT COUNT(*) FROM reminder_schedules WHERE status = 'queued';
```

## Monitoring

### Check Logs

In Supabase Dashboard → Edge Functions → Logs, filter by `send-whatsapp-reminders`

### Check Statistics

```sql
SELECT get_whatsapp_stats();
```

Returns:
```json
{
  "total_queued": 5,
  "total_sent": 42,
  "total_failed": 2,
  "success_rate": 95.45,
  "avg_send_time": 2.3,
  "last_updated": "2025-11-03T10:30:00Z"
}
```

## Troubleshooting

### Issue: "Missing Ultramsg credentials"
**Solution:** Add ULTRAMSG_INSTANCE_ID and ULTRAMSG_TOKEN to Edge Function secrets

### Issue: "Instance not connected"
**Solution:** Re-scan QR code in Ultramsg dashboard

### Issue: "Invalid phone number"
**Solution:** Ensure phone numbers in database are in international format (e.g., 97412345678)

### Issue: "Rate limit exceeded"
**Solution:** Increase delay between messages (currently 1 second)

### Issue: Cron job not running
**Solution:** 
1. Check if pg_cron is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
2. Check cron jobs: `SELECT * FROM cron.job;`
3. Check cron run history: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

## Cost Estimation

### Ultramsg Pricing:
- **Basic Plan:** $5/month (unlimited messages)
- **Pro Plan:** $15/month (unlimited + advanced features)

### Expected Usage:
- 1000 reminders/month = $5
- 10,000 reminders/month = $5
- 100,000 reminders/month = $5

### Supabase Costs:
- Edge Function invocations: Free tier includes 2M requests/month
- Database operations: Included in plan

**Total Cost:** ~$5-15/month

## Performance

- **Processing Speed:** ~1-2 seconds per message
- **Batch Size:** 50 messages per invocation
- **Frequency:** Every 5 minutes
- **Max Throughput:** ~600 messages/hour

## Security

- Edge Function uses service role key (full access)
- RLS policies protect customer data
- API tokens stored as secrets
- Phone numbers are validated before sending
- Rate limiting prevents abuse

## Maintenance

### Weekly:
- Check success rate (should be > 95%)
- Review failed messages
- Monitor Ultramsg connection status

### Monthly:
- Review statistics
- Cleanup old reminders (runs automatically)
- Check Ultramsg usage/billing

## Support

For issues:
1. Check Edge Function logs
2. Check database logs: `SELECT * FROM whatsapp_reminders_status;`
3. Verify Ultramsg connection: https://ultramsg.com/dashboard
4. Contact Ultramsg support: support@ultramsg.com

