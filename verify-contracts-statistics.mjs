/**
 * فحص تطابق إحصائيات العقود بين الواجهة وقاعدة البيانات
 * Verify Contracts Statistics Match Between UI and Database
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
if (!SUPABASE_URL) {
  console.error('❌ Error: VITE_SUPABASE_URL environment variable is not set.');
  process.exit(1);
}
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
if (!SUPABASE_ANON_KEY) {
  console.error('❌ Error: VITE_SUPABASE_ANON_KEY environment variable is not set.');
  process.exit(1);
}

const AL_ARRAF_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';

async function verifyContractsStatistics() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   فحص تطابق إحصائيات العقود                            ║');
    console.log('║   Verify Contracts Statistics Match                     ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // جلب جميع العقود للإحصائيات (تماماً كما في الكود)
    console.log('📊 الخطوة 1: جلب جميع العقود للإحصائيات...\n');
    
    const { data: allContractsForStats, error: statsError } = await supabase
      .from('contracts')
      .select('id, status, contract_amount, monthly_amount')
      .eq('company_id', AL_ARRAF_COMPANY_ID);

    if (statsError) {
      console.error('❌ خطأ في جلب البيانات:', statsError);
      throw statsError;
    }

    console.log(`✅ تم جلب ${allContractsForStats?.length || 0} عقد\n`);

    // حساب الإحصائيات (تماماً كما في الكود)
    const statsContracts = allContractsForStats || [];
    
    // Function to check if contract amounts are zero or invalid (من الكود)
    const isZeroAmount = (c: any) => {
      const ca = c?.contract_amount;
      const ma = c?.monthly_amount;
      const caNum = ca === undefined || ca === null || ca === '' ? null : Number(ca);
      const maNum = ma === undefined || ma === null || ma === '' ? null : Number(ma);
      return (caNum === 0 && maNum === 0);
    };

    // حساب الحالات (تماماً كما في الكود)
    const activeContracts = statsContracts.filter((c: any) => c.status === 'active');
    const underReviewContracts = statsContracts.filter((c: any) => c.status === 'under_review' && !isZeroAmount(c));
    const draftContracts = statsContracts.filter((c: any) => c.status === 'draft' || (isZeroAmount(c) && !['cancelled','expired','suspended','under_review', 'active'].includes(c.status)));
    const expiredContracts = statsContracts.filter((c: any) => c.status === 'expired');
    const suspendedContracts = statsContracts.filter((c: any) => c.status === 'suspended');
    const cancelledContracts = statsContracts.filter((c: any) => c.status === 'cancelled');

    // حساب الإيرادات
    const totalRevenue = [...activeContracts, ...underReviewContracts].reduce((sum, contract: any) => sum + (contract.contract_amount || 0), 0);

    // عرض النتائج
    console.log('══════════════════════════════════════════════════════════');
    console.log('📊 الإحصائيات المحسوبة (كما في الواجهة):');
    console.log('══════════════════════════════════════════════════════════\n');
    
    console.log(`📋 إجمالي العقود: ${statsContracts.length}`);
    console.log(`✅ نشط (Active): ${activeContracts.length}`);
    console.log(`⏳ قيد المراجعة (Under Review): ${underReviewContracts.length}`);
    console.log(`📝 مسودة (Draft): ${draftContracts.length}`);
    console.log(`❌ ملغي (Cancelled): ${cancelledContracts.length}`);
    console.log(`🔴 منتهي (Expired): ${expiredContracts.length}`);
    console.log(`⏸️  معلق (Suspended): ${suspendedContracts.length}`);
    console.log(`💰 إجمالي الإيرادات: ${totalRevenue.toLocaleString()} QAR`);
    
    console.log('\n══════════════════════════════════════════════════════════');
    console.log('🔍 التحقق من قاعدة البيانات مباشرة:');
    console.log('══════════════════════════════════════════════════════════\n');

    // جلب التوزيع الفعلي من قاعدة البيانات
    const { data: dbStats, error: dbError } = await supabase
      .from('contracts')
      .select('status')
      .eq('company_id', AL_ARRAF_COMPANY_ID);

    if (dbError) {
      console.error('❌ خطأ في جلب إحصائيات قاعدة البيانات:', dbError);
    } else {
      const statusCounts: Record<string, number> = {};
      dbStats?.forEach((contract: any) => {
        statusCounts[contract.status] = (statusCounts[contract.status] || 0) + 1;
      });

      console.log('📊 توزيع الحالات في قاعدة البيانات:');
      Object.entries(statusCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([status, count]) => {
          const label = {
            'active': 'نشط',
            'draft': 'مسودة',
            'under_review': 'قيد المراجعة',
            'cancelled': 'ملغي',
            'expired': 'منتهي',
            'suspended': 'معلق'
          }[status] || status;
          
          const uiCount = {
            'active': activeContracts.length,
            'draft': draftContracts.length,
            'under_review': underReviewContracts.length,
            'cancelled': cancelledContracts.length,
            'expired': expiredContracts.length,
            'suspended': suspendedContracts.length
          }[status] || 0;

          const match = count === uiCount ? '✅' : '❌';
          console.log(`${match} ${label}: ${count} (DB) vs ${uiCount} (UI)`);
        });
    }

    console.log('\n══════════════════════════════════════════════════════════');
    console.log('📝 ملخص المقارنة:');
    console.log('══════════════════════════════════════════════════════════\n');

    // مقارنة مفصلة
    const comparisons = [
      { label: 'إجمالي العقود', db: statsContracts.length, ui: statsContracts.length },
      { label: 'نشط', db: activeContracts.length, ui: activeContracts.length },
      { label: 'ملغي', db: cancelledContracts.length, ui: cancelledContracts.length },
      { label: 'قيد المراجعة', db: underReviewContracts.length, ui: underReviewContracts.length },
      { label: 'مسودة', db: draftContracts.length, ui: draftContracts.length },
    ];

    comparisons.forEach(({ label, db, ui }) => {
      const match = db === ui ? '✅' : '❌';
      console.log(`${match} ${label}: قاعدة البيانات = ${db}, الواجهة = ${ui}`);
    });

    console.log('\n══════════════════════════════════════════════════════════');
    
    // التحقق من أي اختلافات
    const hasDifferences = comparisons.some(({ db, ui }) => db !== ui);
    if (hasDifferences) {
      console.log('⚠️  تم العثور على اختلافات!');
      console.log('💡 قد تكون الأسباب:');
      console.log('   1. RLS (Row Level Security) يمنع عرض بعض العقود');
      console.log('   2. فلاتر مخفية في الكود');
      console.log('   3. مشاكل في التخزين المؤقت (Cache)');
    } else {
      console.log('✅ جميع الأرقام متطابقة!');
    }

    console.log('══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ حدث خطأ:', error);
    process.exit(1);
  }
}

// تشغيل السكريبت
verifyContractsStatistics();

