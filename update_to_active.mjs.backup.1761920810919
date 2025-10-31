/**
 * تحديث عقود العراف من "قيد المراجعة" إلى "نشطة"
 * Update Al-Arraf contracts from "under_review" to "active"
 * 
 * Total: 101 contracts
 * Batch size: 50 contracts
 * Expected batches: 3 (50 + 50 + 1)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qwhunliohlkkahbspfiu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTMwODYsImV4cCI6MjA2ODk4OTA4Nn0.x5o6IpzWcYo7a6jRq2J8V0hKyNeRKZCEQIuXTPADQqs';

const AL_ARRAF_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const BATCH_SIZE = 50;
const DELAY_MS = 2000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function updateToActive() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   تحديث عقود العراف: قيد المراجعة → نشطة   ║');
    console.log('║  Update Contracts: under_review → active ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // التحقق من العدد الأولي
    console.log('📊 الخطوة 1: التحقق من عدد العقود...\n');
    
    const { count: initialCount, error: countError } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', AL_ARRAF_COMPANY_ID)
      .eq('status', 'under_review');

    if (countError) {
      console.error('❌ خطأ في العد:', countError);
      throw countError;
    }

    console.log(`✅ تم العثور على ${initialCount} عقد بحالة "قيد المراجعة"`);
    console.log(`📦 سيتم التحديث على ${Math.ceil(initialCount / BATCH_SIZE)} دفعة\n`);

    if (initialCount === 0) {
      console.log('ℹ️  لا توجد عقود تحتاج تحديث');
      return;
    }

    console.log('─────────────────────────────────────────────\n');
    console.log('🚀 بدء التحديث التدريجي...\n');

    let batchNumber = 1;
    let totalUpdated = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`📦 الدفعة ${batchNumber}:`);
      console.log('─────────────────────────────────────────');

      // جلب معرفات العقود للتحديث
      const { data: contractsToUpdate, error: fetchError } = await supabase
        .from('contracts')
        .select('id, contract_number')
        .eq('company_id', AL_ARRAF_COMPANY_ID)
        .eq('status', 'under_review')
        .limit(BATCH_SIZE);

      if (fetchError) {
        console.error('❌ خطأ في جلب البيانات:', fetchError);
        throw fetchError;
      }

      if (!contractsToUpdate || contractsToUpdate.length === 0) {
        console.log('✅ لا توجد عقود متبقية للتحديث');
        hasMore = false;
        break;
      }

      console.log(`📊 تم العثور على ${contractsToUpdate.length} عقد للتحديث...`);

      // استخراج المعرفات
      const ids = contractsToUpdate.map(c => c.id);

      // تنفيذ التحديث
      const { data: updated, error: updateError } = await supabase
        .from('contracts')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .in('id', ids)
        .select('id, contract_number');

      if (updateError) {
        console.error('❌ خطأ في التحديث:', updateError);
        throw updateError;
      }

      const updatedCount = updated?.length || 0;
      totalUpdated += updatedCount;

      console.log(`✅ تم تحديث ${updatedCount} عقد بنجاح`);
      console.log(`📈 الإجمالي المحدث حتى الآن: ${totalUpdated}`);

      // التحقق من المتبقي
      const { count: remaining } = await supabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', AL_ARRAF_COMPANY_ID)
        .eq('status', 'under_review');

      console.log(`📊 المتبقي: ${remaining || 0} عقد`);

      if (remaining === 0) {
        hasMore = false;
      } else {
        console.log(`⏳ انتظار ${DELAY_MS / 1000} ثانية قبل الدفعة التالية...`);
        await sleep(DELAY_MS);
        batchNumber++;
        console.log('');
      }
    }

    // الإحصائيات النهائية
    console.log('\n\n🎉 اكتمل التحديث بنجاح!');
    console.log('═════════════════════════════════════════');
    console.log(`✅ إجمالي العقود المحدثة: ${totalUpdated}`);
    console.log(`📦 عدد الدفعات المنفذة: ${batchNumber}`);

    console.log('\n📊 الإحصائيات النهائية للشركة:');
    const { data: stats } = await supabase
      .from('contracts')
      .select('status')
      .eq('company_id', AL_ARRAF_COMPANY_ID);

    const statusCounts = stats?.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {}) || {};

    const statusLabels = {
      'active': 'نشط (Active)',
      'cancelled': 'ملغي (Cancelled)',
      'under_review': 'قيد المراجعة (Under Review)',
      'draft': 'مسودة (Draft)',
      'suspended': 'معلق (Suspended)',
      'expired': 'منتهي (Expired)',
      'renewed': 'مجدد (Renewed)',
      'completed': 'مكتمل (Completed)'
    };

    console.log('─────────────────────────────────────────');
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        const label = statusLabels[status] || status;
        const percentage = ((count / stats.length) * 100).toFixed(1);
        const icon = status === 'active' ? '✅' : status === 'under_review' ? '⏳' : status === 'cancelled' ? '❌' : '📄';
        console.log(`${icon} ${label}: ${count} (${percentage}%)`);
      });
    console.log('─────────────────────────────────────────\n');

    // عرض التحديثات الحديثة
    const { data: recentUpdates } = await supabase
      .from('contracts')
      .select('contract_number, status, updated_at')
      .eq('company_id', AL_ARRAF_COMPANY_ID)
      .eq('status', 'active')
      .gte('updated_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('updated_at', { ascending: false })
      .limit(5);

    if (recentUpdates && recentUpdates.length > 0) {
      console.log('📝 آخر 5 عقود تم تحديثها:');
      console.log('─────────────────────────────────────────');
      recentUpdates.forEach((contract, idx) => {
        const time = new Date(contract.updated_at).toLocaleTimeString('ar-SA');
        console.log(`${idx + 1}. ${contract.contract_number} - ${time}`);
      });
      console.log('');
    }

    console.log('✨ تم الانتهاء بنجاح!\n');

  } catch (error) {
    console.error('\n❌ حدث خطأ:', error);
    console.log('\n💡 نصيحة:');
    console.log('  - جرب تقليل BATCH_SIZE إلى 25');
    console.log('  - أو زيادة DELAY_MS إلى 3000');
    console.log('  - أو استخدم Supabase Dashboard مباشرة\n');
    process.exit(1);
  }
}

// تشغيل السكريبت
updateToActive();
