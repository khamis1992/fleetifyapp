/**
 * فحص حالة العقود في شركة العراف
 * Check contract status in Al-Arraf company
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qwhunliohlkkahbspfiu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTMwODYsImV4cCI6MjA2ODk4OTA4Nn0.x5o6IpzWcYo7a6jRq2J8V0hKyNeRKZCEQIuXTPADQqs';

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
