-- وظيفة لإنشاء إشعارات للمتابعات القادمة
CREATE OR REPLACE FUNCTION send_followup_reminders()
RETURNS void AS $$
DECLARE
  followup_record RECORD;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- المتابعات المجدولة لليوم والتي لم يتم إرسال تذكير لها
  FOR followup_record IN
    SELECT 
      sf.*,
      c.first_name_ar,
      c.last_name_ar,
      c.first_name,
      c.last_name,
      c.phone
    FROM scheduled_followups sf
    LEFT JOIN customers c ON c.id = sf.customer_id
    WHERE sf.status = 'pending'
      AND sf.scheduled_date = CURRENT_DATE
      AND sf.reminder_sent = FALSE
  LOOP
    -- بناء عنوان الإشعار
    notification_title := '⏰ تذكير: ' || followup_record.title;
    
    -- بناء رسالة الإشعار
    notification_message := 'لديك متابعة مجدولة اليوم:' || E'\n' ||
      'العميل: ' || COALESCE(followup_record.first_name_ar, followup_record.first_name, '') || ' ' || 
      COALESCE(followup_record.last_name_ar, followup_record.last_name, '') || E'\n' ||
      'الهاتف: ' || COALESCE(followup_record.phone, 'غير محدد') || E'\n' ||
      'الموعد: ' || COALESCE(followup_record.scheduled_time::TEXT, 'غير محدد');
    
    -- إنشاء إشعار للمستخدم المسؤول (أو منشئ المتابعة)
    INSERT INTO user_notifications (
      company_id,
      user_id,
      notification_type,
      title,
      message,
      related_type,
      related_id,
      is_read
    ) VALUES (
      followup_record.company_id,
      COALESCE(followup_record.assigned_to, followup_record.created_by),
      'followup_reminder',
      notification_title,
      notification_message,
      'scheduled_followup',
      followup_record.id,
      FALSE
    );
    
    -- تحديث حالة التذكير
    UPDATE scheduled_followups
    SET 
      reminder_sent = TRUE,
      reminder_sent_at = NOW()
    WHERE id = followup_record.id;
    
  END LOOP;
  
  -- أيضاً إنشاء إشعارات للمتابعات المتأخرة (التي تجاوزت موعدها)
  FOR followup_record IN
    SELECT 
      sf.*,
      c.first_name_ar,
      c.last_name_ar,
      c.first_name,
      c.last_name
    FROM scheduled_followups sf
    LEFT JOIN customers c ON c.id = sf.customer_id
    WHERE sf.status = 'pending'
      AND sf.scheduled_date < CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM user_notifications un
        WHERE un.related_id = sf.id
          AND un.notification_type = 'overdue_followup'
          AND un.created_at > sf.scheduled_date::TIMESTAMPTZ
      )
  LOOP
    -- إنشاء إشعار متابعة متأخرة
    INSERT INTO user_notifications (
      company_id,
      user_id,
      notification_type,
      title,
      message,
      related_type,
      related_id,
      is_read
    ) VALUES (
      followup_record.company_id,
      COALESCE(followup_record.assigned_to, followup_record.created_by),
      'overdue_followup',
      '⚠️ متابعة متأخرة: ' || COALESCE(followup_record.first_name_ar, followup_record.first_name, 'عميل'),
      'لديك متابعة متأخرة منذ ' || (CURRENT_DATE - followup_record.scheduled_date) || ' يوم',
      'scheduled_followup',
      followup_record.id,
      FALSE
    );
    
  END LOOP;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء تعليق للوظيفة
COMMENT ON FUNCTION send_followup_reminders IS 'وظيفة لإرسال تذكيرات المتابعات المجدولة - يتم استدعاؤها بواسطة cron job';;
