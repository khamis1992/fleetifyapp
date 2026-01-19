/**
 * تحديث حالة العقود من "قيد المراجعة" إلى "ملغية" في شركة العراف
 * Update contract status from "under_review" to "cancelled" in Al-Arraf company
 * 
 * Usage: node update_alaraf_contracts.mjs
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
if (!SUPABASE_URL) {
  console.error('❌ Error: VITE_SUPABASE_URL environment variable is not set.');
  console.error('Please set it in your .env file.');
  process.exit(1);
};
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
if (!SUPABASE_ANON_KEY) {
  console.error('❌ Error: VITE_SUPABASE_ANON_KEY environment variable is not set.');
  console.error('Please set it in your .env file.');
  process.exit(1);
};

// معرف شركة العراف
const AL_ARRAF_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';

async function updateContracts() {
  console.log('🚀 بدء تحديث العقود...\n');

  // إنشاء عميل Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    // الخطوة 1: عد العقود التي سيتم تحديثها
    console.log('📊 الخطوة 1: عد العقود التي حالتها "قيد المراجعة"...');
    const { count: beforeCount, error: countError } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', AL_ARRAF_COMPANY_ID)
      .eq('status', 'under_review');

    if (countError) {
      console.error('❌ خطأ في العد:', countError);
      throw countError;
    }

    console.log(`✅ تم العثور على ${beforeCount} عقد بحالة "قيد المراجعة"\n`);

    if (beforeCount === 0) {
      console.log('ℹ️  لا توجد عقود تحتاج تحديث');
      return;
    }

    // تأكيد من المستخدم
    console.log(`⚠️  سيتم تحديث ${beforeCount} عقد من "قيد المراجعة" إلى "ملغية"`);
    console.log('⏳ جاري التحديث...\n');

    // الخطوة 2: تحديث العقود
    const { data: updatedContracts, error: updateError } = await supabase
      .from('contracts')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('company_id', AL_ARRAF_COMPANY_ID)
      .eq('status', 'under_review')
      .select('id, contract_number, customer_id');

    if (updateError) {
      console.error('❌ خطأ في التحديث:', updateError);
      throw updateError;
    }

    console.log(`✅ تم تحديث ${updatedContracts?.length || 0} عقد بنجاح!\n`);

    // الخطوة 3: التحقق من النتائج
    console.log('📊 الخطوة 3: التحقق من النتائج...');
    const { data: stats, error: statsError } = await supabase
      .from('contracts')
      .select('status')
      .eq('company_id', AL_ARRAF_COMPANY_ID);

    if (statsError) {
      console.error('❌ خطأ في الإحصائيات:', statsError);
      throw statsError;
    }

    // حساب الإحصائيات
    const statusCounts = stats.reduce((acc, contract) => {
      acc[contract.status] = (acc[contract.status] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📈 إحصائيات العقود في شركة العراف:');
    console.log('─────────────────────────────────────');
    Object.entries(statusCounts).forEach(([status, count]) => {
      const statusAr = {
        'active': 'نشط',
        'cancelled': 'ملغي',
        'under_review': 'قيد المراجعة',
        'draft': 'مسودة',
        'suspended': 'معلق',
        'expired': 'منتهي',
        'renewed': 'مجدد'
      };
      console.log(`${statusAr[status] || status}: ${count}`);
    });
    console.log('─────────────────────────────────────\n');

    console.log('✨ اكتمل التحديث بنجاح!');
    console.log(`📊 العقود الملغية الآن: ${statusCounts['cancelled'] || 0}`);

  } catch (error) {
    console.error('❌ حدث خطأ:', error);
    process.exit(1);
  }
}

// تشغيل السكريبت
updateContracts();
