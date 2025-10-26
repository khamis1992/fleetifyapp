/**
 * Batch Update - Update Al-Arraf contracts in small batches
 * تحديث تدريجي - تحديث عقود العراف على دفعات صغيرة
 * 
 * This script updates 50 contracts at a time with delays to avoid timeouts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qwhunliohlkkahbspfiu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTMwODYsImV4cCI6MjA2ODk4OTA4Nn0.x5o6IpzWcYo7a6jRq2J8V0hKyNeRKZCEQIuXTPADQqs';

const AL_ARRAF_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const BATCH_SIZE = 50; // Update 50 contracts at a time
const DELAY_MS = 2000; // Wait 2 seconds between batches

// Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function updateContractsInBatches() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    console.log('🚀 بدء التحديث التدريجي...\n');
    console.log(`📦 حجم الدفعة: ${BATCH_SIZE} عقد`);
    console.log(`⏱️  الانتظار بين الدفعات: ${DELAY_MS / 1000} ثانية\n`);

    let batchNumber = 1;
    let totalUpdated = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`\n📦 الدفعة ${batchNumber}:`);
      console.log('─────────────────────────────────────');

      // Get IDs of contracts to update
      const { data: contractsToUpdate, error: fetchError } = await supabase
        .from('contracts')
        .select('id')
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

      // Extract IDs
      const ids = contractsToUpdate.map(c => c.id);

      // Update the batch
      const { data: updated, error: updateError } = await supabase
        .from('contracts')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .in('id', ids)
        .select('id');

      if (updateError) {
        console.error('❌ خطأ في التحديث:', updateError);
        throw updateError;
      }

      const updatedCount = updated?.length || 0;
      totalUpdated += updatedCount;

      console.log(`✅ تم تحديث ${updatedCount} عقد بنجاح`);
      console.log(`📈 الإجمالي المحدث: ${totalUpdated}`);

      // Check if there are more contracts
      const { count: remaining } = await supabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', AL_ARRAF_COMPANY_ID)
        .eq('status', 'under_review');

      console.log(`📊 المتبقي: ${remaining || 0} عقد`);

      if (remaining === 0) {
        hasMore = false;
      } else {
        // Wait before next batch
        console.log(`⏳ انتظر ${DELAY_MS / 1000} ثانية قبل الدفعة التالية...`);
        await sleep(DELAY_MS);
        batchNumber++;
      }
    }

    console.log('\n\n🎉 اكتمل التحديث بنجاح!');
    console.log('═════════════════════════════════════');
    console.log(`✅ إجمالي العقود المحدثة: ${totalUpdated}`);
    console.log(`📦 عدد الدفعات المنفذة: ${batchNumber}`);

    // Final statistics
    console.log('\n📊 الإحصائيات النهائية:');
    const { data: stats } = await supabase
      .from('contracts')
      .select('status')
      .eq('company_id', AL_ARRAF_COMPANY_ID);

    const statusCounts = stats?.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {}) || {};

    console.log('─────────────────────────────────────');
    console.log(`نشط: ${statusCounts['active'] || 0}`);
    console.log(`ملغي: ${statusCounts['cancelled'] || 0}`);
    console.log(`قيد المراجعة: ${statusCounts['under_review'] || 0}`);
    console.log('─────────────────────────────────────\n');

  } catch (error) {
    console.error('\n❌ حدث خطأ:', error);
    console.log('\n💡 نصيحة: حاول تقليل BATCH_SIZE أو زيادة DELAY_MS');
    process.exit(1);
  }
}

// Run the script
console.log('╔════════════════════════════════════════╗');
console.log('║  تحديث عقود العراف - نسخة متقدمة      ║');
console.log('║  Batch Update - Al-Arraf Contracts   ║');
console.log('╚════════════════════════════════════════╝\n');

updateContractsInBatches();
