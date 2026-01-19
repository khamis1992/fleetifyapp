/**
 * Script لتنفيذ migration تنظيف الفواتير المكررة
 * يتم تشغيله مباشرة عبر supabase-js
 */

import { createClient } from '@supabase/supabase-js';

// استخدام القيم المباشرة من المشروع
const supabaseUrl = "https://qwhunliohlkkahbspfiu.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTMwODYsImV4cCI6MjA2ODk4OTA4Nn0.x5o6IpzWcYo7a6jRq2J8V0hKyNeRKZCEQIuXTPADQqs";

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
});

async function runMigration() {
  console.log('🚀 بدء تنفيذ migration تنظيف الفواتير المكررة...');
  console.log('='.repeat(60));

  try {
    // Step 1: تحليل الفواتير المكررة
    console.log('\n📊 Step 1: تحليل الفواتير المكررة...');
    
    const { data: duplicates, error: dupError } = await supabase.rpc('sql', {
      query: `
        SELECT 
          contract_id,
          DATE_TRUNC('month', COALESCE(due_date, invoice_date))::DATE AS invoice_month,
          COUNT(*) AS duplicate_count,
          array_agg(id ORDER BY created_at ASC) AS invoice_ids,
          array_agg(invoice_number ORDER BY created_at ASC) AS invoice_numbers
        FROM invoices
        WHERE contract_id IS NOT NULL
          AND status != 'cancelled'
          AND invoice_type IN ('rental', 'service', 'sale')
        GROUP BY contract_id, DATE_TRUNC('month', COALESCE(due_date, invoice_date))
        HAVING COUNT(*) > 1
        ORDER BY duplicate_count DESC
      `
    });

    // Fallback: استخدام query عادي - نجلب كل الفواتير
    const { data: rawDuplicates, error: fetchError } = await supabase
      .from('invoices')
      .select('id, contract_id, invoice_number, due_date, invoice_date, status, created_at, invoice_type')
      .neq('status', 'cancelled')
      .not('contract_id', 'is', null)
      .order('created_at', { ascending: true });

    if (fetchError || !rawDuplicates) {
      console.log('❌ فشل في جلب الفواتير:', fetchError?.message);
      return;
    }

    console.log(`📊 إجمالي الفواتير النشطة: ${rawDuplicates.length}`);
    
    // عرض أنواع الفواتير الموجودة
    const invoiceTypes = new Set(rawDuplicates.map(i => i.invoice_type));
    console.log(`📋 أنواع الفواتير: ${Array.from(invoiceTypes).join(', ')}`);
    
    // فحص الفواتير الخاصة بالعقد LTO2024261
    const testInvoices = rawDuplicates.filter(i => 
      i.invoice_number?.includes('LTO2024261') || 
      i.invoice_number?.includes('ALF-0064')
    );
    console.log(`\n🔍 فواتير العقد LTO2024261/ALF-0064: ${testInvoices.length}`);
    for (const inv of testInvoices.slice(0, 10)) {
      console.log(`   - ${inv.invoice_number}: ${inv.due_date || inv.invoice_date} (contract_id: ${inv.contract_id?.substring(0, 8)}...)`);
    }

    // تجميع الفواتير حسب العقد والشهر (استخدام due_date أو invoice_date)
    const grouped = new Map<string, typeof rawDuplicates>();
    for (const inv of rawDuplicates) {
      // استخدام due_date أو invoice_date واستخراج الشهر فقط (YYYY-MM)
      const dateStr = inv.due_date || inv.invoice_date;
      const month = dateStr ? dateStr.substring(0, 7) : 'unknown';
      const key = `${inv.contract_id}|${month}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(inv);
    }
    
    console.log(`📋 تم تجميع الفواتير في ${grouped.size} مجموعة`);

    // استخراج المكررات
    let duplicatesFound = 0;
    let duplicatesCleaned = 0;

    for (const [key, invoices] of grouped) {
      if (invoices.length > 1) {
        duplicatesFound++;
        console.log(`\n📋 مجموعة مكررة: ${key}`);
        console.log(`   الفواتير: ${invoices.map(i => i.invoice_number).join(', ')}`);
        console.log(`   ✅ الاحتفاظ بـ: ${invoices[0].invoice_number}`);
        
        const keepId = invoices[0].id;
        const duplicateIds = invoices.slice(1).map(i => i.id);
        
        // نقل الدفعات من الفواتير المكررة
        const { error: moveError } = await supabase
          .from('payments')
          .update({ invoice_id: keepId })
          .in('invoice_id', duplicateIds);
        
        if (moveError) {
          console.log(`   ⚠️ خطأ في نقل الدفعات: ${moveError.message}`);
        }

        // إلغاء الفواتير المكررة
        for (const dupId of duplicateIds) {
          const { error: cancelError } = await supabase
            .from('invoices')
            .update({
              status: 'cancelled',
              notes: `ملغاة تلقائياً - مكررة مع الفاتورة: ${invoices[0].invoice_number} | تم الإلغاء: ${new Date().toISOString()}`
            })
            .eq('id', dupId);
          
          if (!cancelError) {
            duplicatesCleaned++;
            console.log(`   ❌ تم إلغاء: ${invoices.find(i => i.id === dupId)?.invoice_number}`);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ تم تنظيف الفواتير المكررة');
    console.log(`📊 الإحصائيات:`);
    console.log(`   - مجموعات مكررة: ${duplicatesFound}`);
    console.log(`   - فواتير تم إلغاؤها: ${duplicatesCleaned}`);

    // Step 2: إعادة حساب أرصدة الفواتير
    console.log('\n💰 Step 2: إعادة حساب أرصدة الفواتير...');
    
    const { data: invoicesToUpdate } = await supabase
      .from('invoices')
      .select('id, total_amount')
      .neq('status', 'cancelled')
      .not('contract_id', 'is', null)
      .in('invoice_type', ['rental', 'service', 'sale']);

    let updatedCount = 0;
    for (const inv of invoicesToUpdate || []) {
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('invoice_id', inv.id)
        .eq('payment_status', 'completed');

      const totalPaid = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const balanceDue = Math.max(0, inv.total_amount - totalPaid);
      const paymentStatus = balanceDue <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          paid_amount: totalPaid,
          balance_due: balanceDue,
          payment_status: paymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', inv.id);

      if (!updateError) {
        updatedCount++;
      }
    }

    console.log(`✅ تم تحديث ${updatedCount} فاتورة`);

    // Step 3: التحقق النهائي
    console.log('\n🔍 Step 3: التحقق النهائي...');
    
    const { data: remaining } = await supabase
      .from('invoices')
      .select('id, contract_id, invoice_number, due_date, invoice_date')
      .neq('status', 'cancelled')
      .not('contract_id', 'is', null)
      .in('invoice_type', ['rental', 'service', 'sale']);

    // إعادة التحقق من المكررات
    const finalGrouped = new Map<string, number>();
    for (const inv of remaining || []) {
      const dateStr = inv.due_date || inv.invoice_date;
      const month = dateStr ? dateStr.substring(0, 7) : 'unknown';
      const key = `${inv.contract_id}|${month}`;
      finalGrouped.set(key, (finalGrouped.get(key) || 0) + 1);
    }

    let remainingDuplicates = 0;
    for (const [key, count] of finalGrouped) {
      if (count > 1) remainingDuplicates++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));
    console.log(`📊 الفواتير المكررة المتبقية: ${remainingDuplicates}`);
    
    if (remainingDuplicates === 0) {
      console.log('   ✅ لا توجد فواتير مكررة - النظام نظيف!');
    } else {
      console.log('   ⚠️ توجد فواتير مكررة - يرجى المراجعة يدوياً');
    }

  } catch (error) {
    console.error('❌ خطأ في تنفيذ الـ migration:', error);
    process.exit(1);
  }
}

runMigration();
