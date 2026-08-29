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
;
