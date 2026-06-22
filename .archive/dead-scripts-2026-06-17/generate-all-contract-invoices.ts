import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Simple function to load .env file manually
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      }
    }
  }
}

loadEnvFile();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
if (!SUPABASE_URL) {
  console.error('❌ Error: VITE_SUPABASE_URL environment variable is not set.');
  console.error('Please set it in your .env file.');
  process.exit(1);
};
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ خطأ: متغير البيئة SUPABASE_SERVICE_KEY غير موجود');
  console.error('يرجى التأكد من وجود المفتاح في ملف .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface BackfillResult {
  contract_id: string;
  contract_number: string;
  months_processed: number;
  invoices_created: number;
  invoices_skipped: number;
}

async function generateAllContractInvoices() {
  console.log('🚀 بدء إنشاء جميع الفواتير للعقود...');
  console.log('');

  // Get company ID from user input or use environment variable
  const companyIdArg = process.argv[2];
  let companyId = companyIdArg;

  if (!companyId) {
    console.error('❌ خطأ: يجب تحديد معرف الشركة');
    console.error('');
    console.error('الاستخدام:');
    console.error('  pnpm generate:all-invoices <company_id>');
    console.error('');
    console.error('أو يمكنك إضافة COMPANY_ID في ملف .env');
    process.exit(1);
  }

  console.log(`📋 معرف الشركة: ${companyId}`);
  console.log('');

  // Verify company exists
  console.log('التحقق من وجود الشركة...');
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', companyId)
    .single();

  if (companyError || !company) {
    console.error(`❌ خطأ: لم يتم العثور على الشركة بالمعرف ${companyId}`);
    console.error(`التفاصيل: ${companyError?.message || 'غير موجود'}`);
    process.exit(1);
  }

  console.log(`✅ الشركة: ${company.name} (ID: ${company.id})`);
  console.log('');

  // Get active contracts count
  console.log('جلب العقود النشطة...');
  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select('id, contract_number, status, start_date, end_date, monthly_amount, contract_amount')
    .eq('company_id', companyId)
    .eq('status', 'active');

  if (contractsError) {
    console.error(`❌ خطأ في جلب العقود: ${contractsError.message}`);
    process.exit(1);
  }

  if (!contracts || contracts.length === 0) {
    console.log('⚠️  لا توجد عقود نشطة لهذه الشركة');
    process.exit(0);
  }

  console.log(`✅ تم العثور على ${contracts.length} عقد نشط`);
  console.log('');

  // Check existing invoices for each contract
  console.log('📊 فحص الفواتير الموجودة...');
  const contractInvoicesMap = new Map<string, number>();
  
  for (const contract of contracts) {
    const { count, error: countError } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('contract_id', contract.id)
      .eq('company_id', companyId);
    
    if (!countError) {
      contractInvoicesMap.set(contract.id, count || 0);
    }
  }

  const contractsWithInvoices = Array.from(contractInvoicesMap.values()).filter(c => c > 0).length;
  const contractsWithoutInvoices = contracts.length - contractsWithInvoices;
  
  console.log(`   - عقود لديها فواتير: ${contractsWithInvoices}`);
  console.log(`   - عقود بدون فواتير: ${contractsWithoutInvoices}`);
  console.log('');

  // Call the backfill function
  console.log('🔄 بدء إنشاء الفواتير للعقود...');
  console.log('هذه العملية قد تستغرق بعض الوقت حسب عدد العقود...');
  console.log('');

  const startTime = Date.now();

  try {
    const { data: results, error: rpcError } = await supabase.rpc('backfill_contract_invoices', {
      p_company_id: companyId,
      p_contract_id: null // null means all contracts
    });

    if (rpcError) {
      console.error('❌ خطأ في استدعاء الدالة:', rpcError.message);
      console.error('التفاصيل الكاملة:', JSON.stringify(rpcError, null, 2));
      process.exit(1);
    }

    const endTime = Date.now();
    const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);

    if (!results || results.length === 0) {
      console.log('⚠️  لم يتم إرجاع أي نتائج');
      console.log('قد تكون جميع الفواتير موجودة بالفعل');
      process.exit(0);
    }

    const backfillResults = results as BackfillResult[];

    // Calculate totals
    const totalCreated = backfillResults.reduce((sum, r) => sum + r.invoices_created, 0);
    const totalSkipped = backfillResults.reduce((sum, r) => sum + r.invoices_skipped, 0);
    const totalProcessed = backfillResults.reduce((sum, r) => sum + r.months_processed, 0);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 ملخص عملية إنشاء الفواتير');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏱️  وقت المعالجة: ${durationSeconds} ثانية`);
    console.log(`📋 عدد العقود المعالجة: ${backfillResults.length}`);
    console.log(`📄 إجمالي الفواتير المُنشأة: ${totalCreated}`);
    console.log(`⏭️  إجمالي الفواتير المُتخطاة: ${totalSkipped}`);
    console.log(`📆 إجمالي الأشهر المعالجة: ${totalProcessed}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    // Show detailed results
    if (backfillResults.length > 0) {
      console.log('📋 تفاصيل النتائج لكل عقد:');
      console.log('');
      
      backfillResults.forEach((result, index) => {
        console.log(`${index + 1}. عقد #${result.contract_number}`);
        console.log(`   - الأشهر المعالجة: ${result.months_processed}`);
        console.log(`   - الفواتير المُنشأة: ${result.invoices_created} ✅`);
        console.log(`   - الفواتير المُتخطاة: ${result.invoices_skipped} ⏭️`);
        console.log('');
      });

      // Show contracts with most invoices created
      const topContracts = [...backfillResults]
        .sort((a, b) => b.invoices_created - a.invoices_created)
        .slice(0, 5);

      if (topContracts.length > 0) {
        console.log('🏆 العقود الأكثر فواتير:');
        topContracts.forEach((contract, index) => {
          console.log(`   ${index + 1}. عقد #${contract.contract_number}: ${contract.invoices_created} فاتورة`);
        });
        console.log('');
      }
    }

    console.log('✅ تم الانتهاء من عملية إنشاء الفواتير بنجاح!');
    console.log('');
    console.log(`📊 الملخص النهائي:`);
    console.log(`   - تم إنشاء ${totalCreated} فاتورة جديدة`);
    console.log(`   - تم تخطي ${totalSkipped} فاتورة موجودة مسبقاً`);
    console.log(`   - إجمالي الفواتير المتاحة: ${totalCreated + totalSkipped}`);
    console.log('');
  } catch (error: any) {
    console.error('');
    console.error('❌ حدث خطأ أثناء إنشاء الفواتير:');
    console.error(error.message || error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

generateAllContractInvoices().catch(error => {
  console.error('❌ خطأ فادح:', error);
  process.exit(1);
});

