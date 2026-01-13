/**
 * تنظيف الفواتير المكررة القديمة
 * 
 * القاعدة: إذا وجدت فاتورتين في نفس الشهر لنفس العقد:
 * - الاحتفاظ بفاتورة يوم 1 (الصحيحة حسب التعليمات)
 * - إلغاء فاتورة يوم 28
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

interface Invoice {
  id: string;
  invoice_number: string;
  contract_id: string;
  due_date: string;
  invoice_date: string;
  status: string;
  total_amount: number;
  payment_status: string;
}

async function cleanupDuplicateInvoices() {
  console.log('🧹 بدء تنظيف الفواتير المكررة القديمة...\n');

  // 1. جلب جميع الفواتير للعقد LTO2024261
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, contract_id, due_date, invoice_date, status, total_amount, payment_status')
    .not('contract_id', 'is', null)
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true }) as { data: Invoice[] | null; error: any };

  if (error) {
    console.error('❌ خطأ في جلب الفواتير:', error.message);
    return;
  }

  console.log(`📋 إجمالي الفواتير: ${invoices?.length || 0}`);

  // 2. تجميع الفواتير حسب العقد والشهر
  const groupedByContractMonth = new Map<string, Invoice[]>();

  for (const inv of invoices || []) {
    const date = inv.due_date || inv.invoice_date;
    if (!date) continue;

    const month = date.substring(0, 7); // YYYY-MM
    const key = `${inv.contract_id}_${month}`;

    if (!groupedByContractMonth.has(key)) {
      groupedByContractMonth.set(key, []);
    }
    groupedByContractMonth.get(key)!.push(inv);
  }

  // 3. معالجة المجموعات المكررة
  let duplicateGroups = 0;
  let invoicesToCancel: Invoice[] = [];

  for (const [key, groupInvoices] of groupedByContractMonth) {
    if (groupInvoices.length > 1) {
      duplicateGroups++;
      
      // ترتيب حسب اليوم في الشهر
      groupInvoices.sort((a, b) => {
        const dayA = parseInt((a.due_date || a.invoice_date).split('-')[2] || '0');
        const dayB = parseInt((b.due_date || b.invoice_date).split('-')[2] || '0');
        return dayA - dayB;
      });

      // الفاتورة الأولى (الأقرب لـ 1) هي الصحيحة
      const keepInvoice = groupInvoices[0];
      const duplicates = groupInvoices.slice(1);

      console.log(`\n📋 مجموعة مكررة (${key.split('_')[1]}):`);
      console.log(`   ✅ الاحتفاظ: ${keepInvoice.invoice_number} (${keepInvoice.due_date || keepInvoice.invoice_date})`);
      
      for (const dup of duplicates) {
        console.log(`   ❌ للإلغاء: ${dup.invoice_number} (${dup.due_date || dup.invoice_date})`);
        invoicesToCancel.push(dup);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 الملخص:`);
  console.log(`   - مجموعات مكررة: ${duplicateGroups}`);
  console.log(`   - فواتير للإلغاء: ${invoicesToCancel.length}`);
  console.log('='.repeat(60));

  if (invoicesToCancel.length === 0) {
    console.log('\n✅ لا توجد فواتير مكررة للتنظيف');
    return;
  }

  // 4. إلغاء الفواتير المكررة
  console.log('\n🔄 جاري إلغاء الفواتير المكررة...');

  let cancelled = 0;
  let failed = 0;

  for (const inv of invoicesToCancel) {
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'cancelled',
        notes: `ملغاة تلقائياً - فاتورة مكررة (يوم 28 بدلاً من يوم 1)`
      })
      .eq('id', inv.id);

    if (updateError) {
      console.error(`   ❌ فشل إلغاء ${inv.invoice_number}:`, updateError.message);
      failed++;
    } else {
      console.log(`   ✅ تم إلغاء: ${inv.invoice_number}`);
      cancelled++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 النتيجة النهائية:');
  console.log(`   ✅ تم إلغاء: ${cancelled} فاتورة`);
  console.log(`   ❌ فشل: ${failed} فاتورة`);
  console.log('='.repeat(60));
}

cleanupDuplicateInvoices();
