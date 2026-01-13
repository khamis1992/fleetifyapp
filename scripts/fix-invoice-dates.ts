/**
 * تصحيح تواريخ الفواتير القديمة
 * 
 * يقوم بتحديث invoice_date و due_date لتكون أول يوم في الشهر
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixInvoiceDates() {
  console.log('📅 بدء تصحيح تواريخ الفواتير...\n');

  // جلب جميع الفواتير التي ليست في يوم 1
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, invoice_date, due_date, contract_id')
    .not('contract_id', 'is', null)
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true });

  if (error) {
    console.error('❌ خطأ في جلب الفواتير:', error.message);
    return;
  }

  console.log(`📋 إجمالي الفواتير: ${invoices?.length || 0}`);

  // فلترة الفواتير التي ليست في يوم 1
  const invoicesToFix = (invoices || []).filter(inv => {
    const date = inv.due_date || inv.invoice_date;
    if (!date) return false;
    const day = parseInt(date.split('-')[2] || '0');
    return day !== 1;
  });

  console.log(`🔧 فواتير تحتاج تصحيح: ${invoicesToFix.length}\n`);

  if (invoicesToFix.length === 0) {
    console.log('✅ جميع الفواتير بتاريخ صحيح (يوم 1)');
    return;
  }

  // تصحيح كل فاتورة
  let fixed = 0;
  let failed = 0;

  for (const inv of invoicesToFix) {
    const oldDate = inv.due_date || inv.invoice_date;
    const month = oldDate.substring(0, 7); // YYYY-MM
    const newDate = `${month}-01`; // أول يوم في الشهر

    console.log(`📝 ${inv.invoice_number}: ${oldDate} → ${newDate}`);

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        invoice_date: newDate,
        due_date: newDate
      })
      .eq('id', inv.id);

    if (updateError) {
      console.error(`   ❌ فشل: ${updateError.message}`);
      failed++;
    } else {
      fixed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 النتيجة:');
  console.log(`   ✅ تم تصحيح: ${fixed} فاتورة`);
  console.log(`   ❌ فشل: ${failed} فاتورة`);
  console.log('='.repeat(60));
}

fixInvoiceDates();
