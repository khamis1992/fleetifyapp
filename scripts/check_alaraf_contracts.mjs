/**
 * فحص حالة العقود في شركة العراف
 * Check contract status in Al-Arraf company
 */

import { createClient } from '@supabase/supabase-js';

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

const AL_ARRAF_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';

async function checkContracts() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    console.log('📊 جاري فحص العقود في شركة العراف...\n');

    // الحصول على جميع الحالات
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select('status')
      .eq('company_id', AL_ARRAF_COMPANY_ID);

    if (error) {
      console.error('❌ خطأ:', error);
      return;
    }

    console.log(`✅ إجمالي العقود: ${contracts.length}\n`);

    // حساب الإحصائيات
    const statusCounts = contracts.reduce((acc, contract) => {
      acc[contract.status] = (acc[contract.status] || 0) + 1;
      return acc;
    }, {});

    console.log('📈 توزيع العقود حسب الحالة:');
    console.log('─────────────────────────────────────');
    
    const statusLabels = {
      'active': 'نشط (Active)',
      'cancelled': 'ملغي (Cancelled)',
      'under_review': 'قيد المراجعة (Under Review)',
      'draft': 'مسودة (Draft)',
      'suspended': 'معلق (Suspended)',
      'expired': 'منتهي (Expired)',
      'renewed': 'مجدد (Renewed)',
      'completed': 'مكتمل (Completed)',
      'pending': 'معلق (Pending)'
    };

    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        const label = statusLabels[status] || status;
        const percentage = ((count / contracts.length) * 100).toFixed(1);
        console.log(`${label}: ${count} (${percentage}%)`);
      });
    
    console.log('─────────────────────────────────────\n');

    // عرض بعض العقود للمراجعة
    console.log('🔍 عينة من العقود (أول 5):');
    const { data: sample } = await supabase
      .from('contracts')
      .select('id, contract_number, status, created_at')
      .eq('company_id', AL_ARRAF_COMPANY_ID)
      .limit(5);

    sample?.forEach((contract, idx) => {
      console.log(`${idx + 1}. ${contract.contract_number} - ${contract.status} - ${contract.created_at}`);
    });

  } catch (error) {
    console.error('❌ خطأ:', error);
  }
}

checkContracts();
