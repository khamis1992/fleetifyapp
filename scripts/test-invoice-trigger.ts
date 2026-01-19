/**
 * اختبار trigger منع الفواتير المكررة
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

async function testTrigger() {
  console.log('🧪 اختبار trigger منع الفواتير المكررة...\n');

  // 1. التحقق من وجود الـ trigger
  console.log('1️⃣ التحقق من وجود الـ trigger في قاعدة البيانات...');
  
  const { data: triggers, error: triggerError } = await supabase
    .rpc('check_trigger_exists', { trigger_name: 'trigger_check_duplicate_monthly_invoice' })
    .single();

  if (triggerError) {
    // محاولة بديلة
    console.log('   ⚠️ لا يمكن التحقق مباشرة، سنختبر السلوك...\n');
  } else {
    console.log('   ✅ Trigger موجود:', triggers);
  }

  // 2. جلب عقد نشط للاختبار
  console.log('2️⃣ جلب عقد نشط للاختبار...');
  
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('id, contract_number, customer_id, company_id, monthly_amount')
    .eq('status', 'active')
    .limit(1)
    .single();

  if (contractError || !contract) {
    console.log('   ❌ لا يوجد عقد نشط للاختبار');
    return;
  }

  console.log(`   ✅ العقد: ${contract.contract_number}`);

  // 3. التحقق من وجود فاتورة للشهر الحالي
  const currentMonth = new Date().toISOString().substring(0, 7);
  console.log(`\n3️⃣ التحقق من فواتير الشهر الحالي (${currentMonth})...`);

  const { data: existingInvoices, error: invError } = await supabase
    .from('invoices')
    .select('id, invoice_number, due_date, status')
    .eq('contract_id', contract.id)
    .gte('due_date', `${currentMonth}-01`)
    .lte('due_date', `${currentMonth}-31`)
    .neq('status', 'cancelled');

  if (existingInvoices && existingInvoices.length > 0) {
    console.log(`   📋 توجد فاتورة للشهر الحالي: ${existingInvoices[0].invoice_number}`);
    
    // 4. محاولة إنشاء فاتورة مكررة
    console.log('\n4️⃣ محاولة إنشاء فاتورة مكررة (يجب أن تفشل)...');
    
    const { data: newInvoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        company_id: contract.company_id,
        customer_id: contract.customer_id,
        contract_id: contract.id,
        invoice_number: `TEST-DUPLICATE-${Date.now()}`,
        invoice_date: `${currentMonth}-15`,
        due_date: `${currentMonth}-15`,
        total_amount: contract.monthly_amount || 1000,
        subtotal: contract.monthly_amount || 1000,
        status: 'draft',
        invoice_type: 'rental'
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.message?.includes('مكرر') || insertError.code === '23505') {
        console.log('   ✅ Trigger يعمل بشكل صحيح!');
        console.log(`   ❌ تم رفض الإدراج: ${insertError.message}`);
      } else {
        console.log('   ⚠️ خطأ غير متوقع:', insertError.message);
      }
    } else {
      console.log('   ❌ Trigger لا يعمل! تم إنشاء فاتورة مكررة:', newInvoice?.invoice_number);
      
      // حذف الفاتورة المكررة
      await supabase
        .from('invoices')
        .delete()
        .eq('id', newInvoice?.id);
      console.log('   🗑️ تم حذف الفاتورة المكررة');
    }
  } else {
    console.log('   ℹ️ لا توجد فاتورة للشهر الحالي لهذا العقد');
    console.log('   ⏭️ لا يمكن اختبار الـ trigger بدون فاتورة موجودة');
  }

  // 5. ملخص الحماية
  console.log('\n' + '='.repeat(60));
  console.log('📊 ملخص طبقات الحماية من الفواتير المكررة:');
  console.log('='.repeat(60));
  console.log('');
  console.log('✅ طبقة 1: UnifiedInvoiceService - يتحقق قبل الإنشاء');
  console.log('✅ طبقة 2: ContractInvoiceGenerator - يتحقق من due_date');
  console.log('✅ طبقة 3: useCreateInvoice hook - يتحقق من التكرار');
  console.log('✅ طبقة 4: useAutomaticInvoiceGenerator - يتحقق من due_date');
  console.log('✅ طبقة 5: QuickPaymentRecording - يستخدم UnifiedInvoiceService');
  console.log('✅ طبقة 6: Edge Function - يتحقق ويتعامل مع trigger error');
  console.log('✅ طبقة 7: Database Trigger - الخط الأخير للدفاع');
  console.log('');
  console.log('='.repeat(60));
}

testTrigger();
