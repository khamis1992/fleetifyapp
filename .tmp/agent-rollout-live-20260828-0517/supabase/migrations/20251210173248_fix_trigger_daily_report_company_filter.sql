-- تحديث دالة trigger_daily_report لإضافة فلترة الشركة
CREATE OR REPLACE FUNCTION trigger_daily_report()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_log_id UUID;
  v_company RECORD;
  v_recipient JSONB;
  v_message TEXT;
  v_response BIGINT;
  v_sent_count INTEGER := 0;
  v_fleet_total INTEGER;
  v_fleet_available INTEGER;
  v_fleet_rented INTEGER;
  v_fleet_maintenance INTEGER;
  v_fleet_reserved INTEGER;
  v_today_collected NUMERIC;
  v_total_outstanding NUMERIC;
  v_overdue_amount NUMERIC;
  v_new_contracts INTEGER;
  v_ended_contracts INTEGER;
  v_expiring_contracts INTEGER;
  v_utilization_rate NUMERIC;
  v_phone TEXT;
  v_arabic_date TEXT;
BEGIN
  -- Create log entry
  INSERT INTO scheduled_report_logs (report_type, status, started_at)
  VALUES ('daily', 'running', NOW())
  RETURNING id INTO v_log_id;

  BEGIN
    -- Loop through each company with daily report enabled
    FOR v_company IN 
      SELECT company_id, recipients
      FROM whatsapp_settings
      WHERE daily_report_enabled = true
    LOOP
      -- Get fleet statistics for THIS COMPANY
      SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'available'),
        COUNT(*) FILTER (WHERE status = 'rented'),
        COUNT(*) FILTER (WHERE status = 'maintenance'),
        COUNT(*) FILTER (WHERE status = 'reserved')
      INTO v_fleet_total, v_fleet_available, v_fleet_rented, v_fleet_maintenance, v_fleet_reserved
      FROM vehicles 
      WHERE is_active = true 
        AND company_id = v_company.company_id;  -- ✅ فلترة بالشركة

      v_utilization_rate := CASE WHEN v_fleet_total > 0 
        THEN ROUND((v_fleet_rented::NUMERIC / v_fleet_total) * 100, 1)
        ELSE 0 END;

      -- Get today's payments for THIS COMPANY
      SELECT COALESCE(SUM(amount), 0)
      INTO v_today_collected
      FROM payments 
      WHERE payment_date >= CURRENT_DATE
        AND company_id = v_company.company_id;  -- ✅ فلترة بالشركة

      -- Get outstanding and overdue invoices for THIS COMPANY
      SELECT 
        COALESCE(SUM(total_amount - COALESCE(amount_paid, 0)), 0),
        COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE THEN total_amount - COALESCE(amount_paid, 0) ELSE 0 END), 0)
      INTO v_total_outstanding, v_overdue_amount
      FROM invoices 
      WHERE status IN ('pending', 'partially_paid', 'overdue')
        AND company_id = v_company.company_id;  -- ✅ فلترة بالشركة

      -- Get new contracts today for THIS COMPANY
      SELECT COUNT(*)
      INTO v_new_contracts
      FROM contracts 
      WHERE created_at >= CURRENT_DATE
        AND company_id = v_company.company_id;  -- ✅ فلترة بالشركة

      -- Get ended contracts today for THIS COMPANY
      SELECT COUNT(*)
      INTO v_ended_contracts
      FROM contracts 
      WHERE end_date = CURRENT_DATE
        AND company_id = v_company.company_id;  -- ✅ فلترة بالشركة

      -- Get contracts expiring this week for THIS COMPANY
      SELECT COUNT(*)
      INTO v_expiring_contracts
      FROM contracts 
      WHERE status = 'active'
        AND end_date >= CURRENT_DATE
        AND end_date <= CURRENT_DATE + INTERVAL '7 days'
        AND company_id = v_company.company_id;  -- ✅ فلترة بالشركة

      -- Build Arabic date
      v_arabic_date := to_char(CURRENT_DATE, 'DD') || ' ' ||
        CASE EXTRACT(MONTH FROM CURRENT_DATE)
          WHEN 1 THEN 'يناير'
          WHEN 2 THEN 'فبراير'
          WHEN 3 THEN 'مارس'
          WHEN 4 THEN 'أبريل'
          WHEN 5 THEN 'مايو'
          WHEN 6 THEN 'يونيو'
          WHEN 7 THEN 'يوليو'
          WHEN 8 THEN 'أغسطس'
          WHEN 9 THEN 'سبتمبر'
          WHEN 10 THEN 'أكتوبر'
          WHEN 11 THEN 'نوفمبر'
          WHEN 12 THEN 'ديسمبر'
        END || ' ' || to_char(CURRENT_DATE, 'YYYY');

      -- Build the message with all fields
      v_message := '━━━━━━━━━━━━━━━━━━━
📊 تقرير الأسطول اليومي
📅 ' || v_arabic_date || '
━━━━━━━━━━━━━━━━━━━

🚗 حالة الأسطول:
├ إجمالي المركبات: ' || v_fleet_total || '
├ متاحة: ' || v_fleet_available || ' ✅
├ مؤجرة: ' || v_fleet_rented || ' 🔴
├ صيانة: ' || v_fleet_maintenance || ' 🔧
├ محجوزة: ' || v_fleet_reserved || ' 📌
└ نسبة الإشغال: ' || v_utilization_rate || '%

💰 المالية:
├ إيرادات اليوم: ' || to_char(v_today_collected, 'FM999,999,999') || ' ر.ق
├ المتحصل: ' || to_char(v_today_collected, 'FM999,999,999') || ' ر.ق
├ المستحق الكلي: ' || to_char(v_total_outstanding, 'FM999,999,999') || ' ر.ق
└ المتأخر: ' || to_char(v_overdue_amount, 'FM999,999,999') || ' ر.ق

📋 العقود:
├ عقود جديدة: ' || v_new_contracts || '
├ عقود منتهية: ' || v_ended_contracts || '
└ تنتهي هذا الأسبوع: ' || v_expiring_contracts || '

✅ لا توجد تنبيهات
━━━━━━━━━━━━━━━━━━━
🔗 للتفاصيل: افتح التطبيق';

      -- Send to all active recipients with daily reports enabled for THIS COMPANY
      IF v_company.recipients IS NOT NULL THEN
        FOR v_recipient IN SELECT * FROM jsonb_array_elements(v_company.recipients)
        LOOP
          IF (v_recipient->>'isActive')::boolean = true 
             AND v_recipient->'reportTypes' ? 'daily' THEN
            
            v_phone := regexp_replace(v_recipient->>'phone', '[^0-9]', '', 'g');
            
            -- Send via Ultramsg using pg_net
            SELECT net.http_post(
              'https://api.ultramsg.com/instance148672/messages/chat',
              jsonb_build_object(
                'token', 'rls3i8flwugsei1j',
                'to', v_phone,
                'body', v_message
              )
            ) INTO v_response;
            
            v_sent_count := v_sent_count + 1;

            -- Log the message
            INSERT INTO whatsapp_message_logs (
              company_id, recipient_id, message_type, status, 
              content, sent_at, created_at
            ) VALUES (
              v_company.company_id,
              (v_recipient->>'id')::TEXT,
              'daily',
              'sent',
              LEFT(v_message, 1000),
              NOW(),
              NOW()
            );
            
            -- Small delay between messages
            PERFORM pg_sleep(1.5);
          END IF;
        END LOOP;
      END IF;

    END LOOP;

    -- Update log with success
    UPDATE scheduled_report_logs
    SET 
      status = 'completed',
      completed_at = NOW(),
      sent_count = v_sent_count
    WHERE id = v_log_id;

  EXCEPTION WHEN OTHERS THEN
    -- Update log with error
    UPDATE scheduled_report_logs
    SET 
      status = 'failed',
      completed_at = NOW(),
      error_message = SQLERRM
    WHERE id = v_log_id;
    
    RAISE NOTICE 'Error in trigger_daily_report: %', SQLERRM;
  END;
END;
$$;;
