/**
 * سكريبت لإنشاء trigger لمنع الفواتير المكررة في قاعدة البيانات
 * 
 * ✅ هذا السكريبت يضيف طبقة حماية على مستوى قاعدة البيانات
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const triggerSQL = `
-- =====================================================
-- 1. دالة التحقق من الفواتير المكررة
-- =====================================================
CREATE OR REPLACE FUNCTION check_duplicate_monthly_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_month DATE;
    v_existing_invoice_id UUID;
    v_existing_invoice_number TEXT;
BEGIN
    -- تحديد الشهر من due_date أو invoice_date
    v_invoice_month := DATE_TRUNC('month', COALESCE(NEW.due_date, NEW.invoice_date));
    
    -- البحث عن فاتورة موجودة لنفس العقد في نفس الشهر
    SELECT id, invoice_number 
    INTO v_existing_invoice_id, v_existing_invoice_number
    FROM invoices 
    WHERE contract_id = NEW.contract_id 
      AND DATE_TRUNC('month', COALESCE(due_date, invoice_date)) = v_invoice_month
      AND status != 'cancelled'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 1;
    
    -- إذا وجدت فاتورة مكررة، نرفض الإدخال
    IF v_existing_invoice_id IS NOT NULL THEN
        RAISE EXCEPTION 'فاتورة مكررة: يوجد فاتورة (%) لهذا العقد في شهر %', 
            v_existing_invoice_number, 
            TO_CHAR(v_invoice_month, 'YYYY-MM');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. إنشاء الـ Trigger
-- =====================================================
DROP TRIGGER IF EXISTS trigger_check_duplicate_monthly_invoice ON invoices;

CREATE TRIGGER trigger_check_duplicate_monthly_invoice
    BEFORE INSERT ON invoices
    FOR EACH ROW
    WHEN (NEW.contract_id IS NOT NULL)
    EXECUTE FUNCTION check_duplicate_monthly_invoice();

-- =====================================================
-- 3. التحقق من نجاح الإنشاء
-- =====================================================
SELECT 'Trigger created successfully!' as result;
`;

async function applyTrigger() {
  console.log('🔧 Applying duplicate invoice prevention trigger...\n');

  try {
    // محاولة تنفيذ SQL عبر RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql: triggerSQL });

    if (error) {
      console.log('⚠️ exec_sql RPC not available, trying alternative...');
      console.log('   Error:', error.message);
      
      // عرض SQL للتنفيذ يدوياً
      console.log('\n' + '='.repeat(60));
      console.log('📋 يرجى تنفيذ الـ SQL التالي في Supabase Dashboard:');
      console.log('='.repeat(60) + '\n');
      console.log(triggerSQL);
      console.log('\n' + '='.repeat(60));
      console.log('🔗 رابط: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new');
      console.log('='.repeat(60));
    } else {
      console.log('✅ Trigger created successfully!');
      console.log('   Result:', data);
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

applyTrigger();
