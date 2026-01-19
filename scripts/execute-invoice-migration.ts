/**
 * تنفيذ migration تنظيف الفواتير المكررة وإضافة trigger
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

async function executeMigration() {
  console.log('🚀 بدء تنفيذ migration منع الفواتير المكررة...\n');

  try {
    // الخطوة 1: تنظيف الفواتير المكررة
    console.log('📋 Step 1: تحليل وتنظيف الفواتير المكررة...');
    
    const { data: duplicates, error: dupError } = await supabase
      .from('invoices')
      .select('id, contract_id, invoice_number, due_date, invoice_date, status, created_at')
      .not('contract_id', 'is', null)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true });

    if (dupError) {
      console.error('❌ خطأ في جلب الفواتير:', dupError.message);
    } else {
      // تجميع الفواتير حسب العقد والشهر
      const invoiceGroups = new Map<string, typeof duplicates>();
      
      for (const inv of duplicates || []) {
        const date = inv.due_date || inv.invoice_date;
        if (!date) continue;
        
        const month = date.substring(0, 7); // YYYY-MM
        const key = `${inv.contract_id}_${month}`;
        
        if (!invoiceGroups.has(key)) {
          invoiceGroups.set(key, []);
        }
        invoiceGroups.get(key)!.push(inv);
      }

      // معالجة المجموعات المكررة
      let duplicatesFound = 0;
      let invoicesCancelled = 0;

      for (const [key, invoices] of invoiceGroups) {
        if (invoices.length > 1) {
          duplicatesFound++;
          console.log(`\n📋 مجموعة مكررة: ${key}`);
          console.log(`   الفواتير: ${invoices.map(i => i.invoice_number).join(', ')}`);
          console.log(`   ✅ الاحتفاظ بـ: ${invoices[0].invoice_number}`);
          
          // إلغاء الفواتير المكررة (ما عدا الأولى)
          const duplicateIds = invoices.slice(1).map(i => i.id);
          
          for (const dupId of duplicateIds) {
            const { error: cancelError } = await supabase
              .from('invoices')
              .update({ 
                status: 'cancelled',
                notes: `ملغاة تلقائياً - مكررة مع ${invoices[0].invoice_number}`
              })
              .eq('id', dupId);

            if (cancelError) {
              console.error(`   ❌ فشل إلغاء: ${dupId}:`, cancelError.message);
            } else {
              invoicesCancelled++;
              console.log(`   ❌ تم إلغاء: ${invoices.find(i => i.id === dupId)?.invoice_number}`);
            }
          }
        }
      }

      console.log('\n' + '='.repeat(60));
      console.log('📊 نتائج التنظيف:');
      console.log(`   - مجموعات مكررة: ${duplicatesFound}`);
      console.log(`   - فواتير تم إلغاؤها: ${invoicesCancelled}`);
      console.log('='.repeat(60) + '\n');
    }

    // الخطوة 2: إنشاء الـ Trigger
    console.log('📋 Step 2: إنشاء Trigger منع التكرار...');
    console.log('⚠️ يجب تنفيذ الأمر التالي في Supabase Dashboard SQL Editor:\n');
    
    const triggerSQL = `
-- ================================================================
-- إنشاء دالة التحقق من تكرار الفواتير
-- ================================================================
CREATE OR REPLACE FUNCTION check_duplicate_monthly_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_existing_invoice_id UUID;
    v_existing_invoice_number VARCHAR(100);
    v_invoice_month DATE;
BEGIN
    IF NEW.contract_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.status = 'cancelled' THEN
        RETURN NEW;
    END IF;

    v_invoice_month := DATE_TRUNC('month', COALESCE(NEW.due_date, NEW.invoice_date))::DATE;

    SELECT id, invoice_number
    INTO v_existing_invoice_id, v_existing_invoice_number
    FROM invoices
    WHERE contract_id = NEW.contract_id
      AND DATE_TRUNC('month', COALESCE(due_date, invoice_date))::DATE = v_invoice_month
      AND status != 'cancelled'
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
    LIMIT 1;

    IF v_existing_invoice_id IS NOT NULL THEN
        RAISE EXCEPTION 'فاتورة مكررة: توجد فاتورة (%) لنفس العقد في شهر %', 
            v_existing_invoice_number, 
            TO_CHAR(v_invoice_month, 'YYYY-MM')
        USING ERRCODE = '23505';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_duplicate_monthly_invoice ON invoices;

CREATE TRIGGER trigger_check_duplicate_monthly_invoice
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION check_duplicate_monthly_invoice();
`;

    console.log(triggerSQL);
    console.log('\n' + '='.repeat(60));
    console.log('🔗 رابط: https://supabase.com/dashboard → SQL Editor');
    console.log('='.repeat(60));

    // التحقق من الفواتير المكررة المتبقية
    console.log('\n📋 Step 3: التحقق من الفواتير المكررة المتبقية...');
    
    const { data: remaining } = await supabase
      .from('invoices')
      .select('contract_id, due_date, invoice_date, invoice_number')
      .not('contract_id', 'is', null)
      .neq('status', 'cancelled');

    const remainingGroups = new Map<string, string[]>();
    for (const inv of remaining || []) {
      const date = inv.due_date || inv.invoice_date;
      if (!date) continue;
      const month = date.substring(0, 7);
      const key = `${inv.contract_id}_${month}`;
      if (!remainingGroups.has(key)) {
        remainingGroups.set(key, []);
      }
      remainingGroups.get(key)!.push(inv.invoice_number);
    }

    let remainingDuplicates = 0;
    for (const [, invoices] of remainingGroups) {
      if (invoices.length > 1) {
        remainingDuplicates++;
      }
    }

    console.log(`\n✅ الفواتير المكررة المتبقية: ${remainingDuplicates}`);
    if (remainingDuplicates === 0) {
      console.log('🎉 لا توجد فواتير مكررة - النظام نظيف!');
    }

  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

executeMigration();
