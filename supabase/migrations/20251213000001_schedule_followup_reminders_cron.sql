-- جدولة وظيفة إرسال تذكيرات المتابعات المجدولة
-- Schedule Follow-up Reminders Cron Job

-- التأكد من تفعيل pg_cron extension (عادة تكون مفعلة افتراضياً)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- جدولة استدعاء الوظيفة يومياً في الساعة 8:00 صباحاً
-- Schedule the function to run daily at 8:00 AM
SELECT cron.schedule(
  'send-followup-reminders-daily',           -- اسم المهمة / Job name
  '0 8 * * *',                              -- Cron expression: كل يوم الساعة 8:00 صباحاً / Every day at 8:00 AM
  $$SELECT send_followup_reminders();$$      -- الأمر المراد تنفيذه / Command to execute
);

-- ملاحظة: يمكن تعديل وقت الجدولة حسب الحاجة:
-- Note: You can adjust the schedule time as needed:
-- '0 8 * * *'   = كل يوم الساعة 8:00 صباحاً / Every day at 8:00 AM
-- '0 9 * * *'   = كل يوم الساعة 9:00 صباحاً / Every day at 9:00 AM
-- '0 */6 * * *' = كل 6 ساعات / Every 6 hours
-- '0 8,14 * * *' = الساعة 8:00 صباحاً و 2:00 مساءً / At 8:00 AM and 2:00 PM

-- للتحقق من المهام المجدولة:
-- To check scheduled jobs:
-- SELECT * FROM cron.job WHERE jobname = 'send-followup-reminders-daily';

-- لإلغاء الجدولة:
-- To unschedule:
-- SELECT cron.unschedule('send-followup-reminders-daily');

-- للتحقق من سجل تنفيذ المهام:
-- To check job execution history:
-- SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-followup-reminders-daily') ORDER BY start_time DESC LIMIT 10;





