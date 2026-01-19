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
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ContractInvoiceCheck {
  contract_id: string;
  contract_number: string;
  start_date: string;
  monthly_amount: number;
  expected_months: number;
  actual_invoices: number;
  missing_invoices: number;
  months_with_invoices: string[];
  months_without_invoices: string[];
}

function getMonthString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getExpectedMonths(startDate: Date, endDate?: Date): string[] {
  const months: string[] = [];
  const current = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  
  // Set to first day of month
  current.setDate(1);
  end.setDate(1);
  
  while (current <= end) {
    months.push(getMonthString(current));
    current.setMonth(current.getMonth() + 1);
  }
  
  return months;
}

async function verifyContractInvoices() {
  console.log('🔍 فحص الفواتير للعقود...');
  console.log('');

  const companyId = process.argv[2] || '24bc0b21-4e2d-4413-9842-31719a3669f4';
  console.log(`📋 معرف الشركة: ${companyId}`);
  console.log('');

  // Get all active contracts
  console.log('جلب العقود النشطة...');
  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select('id, contract_number, start_date, end_date, monthly_amount, contract_amount')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('start_date', { ascending: true });

  if (contractsError) {
    console.error(`❌ خطأ في جلب العقود: ${contractsError.message}`);
    process.exit(1);
  }

  if (!contracts || contracts.length === 0) {
    console.log('⚠️  لا توجد عقود نشطة');
    process.exit(0);
  }

  console.log(`✅ تم العثور على ${contracts.length} عقد نشط`);
  console.log('');

  // Check invoices for each contract - batch fetch all invoices first
  console.log('جلب جميع الفواتير...');
  const { data: allInvoices, error: allInvoicesError } = await supabase
    .from('invoices')
    .select('id, contract_id, invoice_date')
    .eq('company_id', companyId)
    .order('invoice_date', { ascending: true });

  if (allInvoicesError) {
    console.error(`❌ خطأ في جلب الفواتير: ${allInvoicesError.message}`);
    process.exit(1);
  }

  console.log(`✅ تم جلب ${allInvoices?.length || 0} فاتورة`);
  console.log('');

  // Group invoices by contract_id
  const invoicesByContract = new Map<string, typeof allInvoices>();
  (allInvoices || []).forEach(invoice => {
    if (!invoicesByContract.has(invoice.contract_id)) {
      invoicesByContract.set(invoice.contract_id, []);
    }
    invoicesByContract.get(invoice.contract_id)!.push(invoice);
  });

  const results: ContractInvoiceCheck[] = [];
  let totalExpected = 0;
  let totalActual = 0;
  let totalMissing = 0;

  console.log('فحص الفواتير لكل عقد...\n');

  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i];
    
    if (!contract.start_date) {
      console.log(`⚠️  عقد #${contract.contract_number}: لا يوجد تاريخ بداية - تم التخطي`);
      continue;
    }

    const startDate = new Date(contract.start_date);
    const endDate = contract.end_date ? new Date(contract.end_date) : undefined;
    
    // Get expected months
    const expectedMonths = getExpectedMonths(startDate, endDate);
    
    // Get invoices for this contract from the map
    const invoices = invoicesByContract.get(contract.id) || [];

    // Get months with invoices
    const monthsWithInvoices = invoices
      .map(inv => getMonthString(new Date(inv.invoice_date)))
      .filter((month, index, arr) => arr.indexOf(month) === index); // unique

    // Find missing months
    const monthsWithoutInvoices = expectedMonths.filter(
      month => !monthsWithInvoices.includes(month)
    );

    const result: ContractInvoiceCheck = {
      contract_id: contract.id,
      contract_number: contract.contract_number,
      start_date: contract.start_date,
      monthly_amount: contract.monthly_amount || 0,
      expected_months: expectedMonths.length,
      actual_invoices: invoices.length,
      missing_invoices: monthsWithoutInvoices.length,
      months_with_invoices: monthsWithInvoices,
      months_without_invoices: monthsWithoutInvoices,
    };

    results.push(result);
    
    totalExpected += result.expected_months;
    totalActual += result.actual_invoices;
    totalMissing += result.missing_invoices;

    // Show progress every 20 contracts
    if ((i + 1) % 20 === 0 || i === contracts.length - 1) {
      console.log(`  تم فحص ${i + 1}/${contracts.length} عقد...`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 ملخص الفحص');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📋 عدد العقود المفحوصة: ${results.length}`);
  console.log(`📆 إجمالي الأشهر المتوقعة: ${totalExpected}`);
  console.log(`📄 إجمالي الفواتير الموجودة: ${totalActual}`);
  console.log(`❌ إجمالي الفواتير الناقصة: ${totalMissing}`);
  console.log(`📈 نسبة الاكتمال: ${totalExpected > 0 ? ((totalActual / totalExpected) * 100).toFixed(1) : 0}%`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Show contracts with missing invoices
  const contractsWithMissing = results.filter(r => r.missing_invoices > 0);
  
  if (contractsWithMissing.length > 0) {
    console.log(`⚠️  العقود التي لديها فواتير ناقصة (${contractsWithMissing.length}):`);
    console.log('');
    
    contractsWithMissing.slice(0, 20).forEach((result, index) => {
      console.log(`${index + 1}. عقد #${result.contract_number}`);
      console.log(`   - تاريخ البدء: ${result.start_date}`);
      console.log(`   - الأشهر المتوقعة: ${result.expected_months}`);
      console.log(`   - الفواتير الموجودة: ${result.actual_invoices}`);
      console.log(`   - الفواتير الناقصة: ${result.missing_invoices} ❌`);
      
      if (result.months_without_invoices.length > 0) {
        const missingMonths = result.months_without_invoices.slice(0, 5);
        console.log(`   - أشهر ناقصة: ${missingMonths.join(', ')}${result.months_without_invoices.length > 5 ? '...' : ''}`);
      }
      console.log('');
    });

    if (contractsWithMissing.length > 20) {
      console.log(`   ... و ${contractsWithMissing.length - 20} عقود أخرى`);
      console.log('');
    }
  } else {
    console.log('✅ جميع العقود لديها فواتير كاملة لجميع الأشهر!');
    console.log('');
  }

  // Show contracts with complete invoices
  const contractsComplete = results.filter(r => r.missing_invoices === 0);
  if (contractsComplete.length > 0) {
    console.log(`✅ العقود الكاملة (${contractsComplete.length}):`);
    console.log(`   - جميع هذه العقود لديها فواتير لجميع الأشهر المتوقعة`);
    console.log('');
  }

  // Statistics
  console.log('📊 إحصائيات تفصيلية:');
  console.log(`   - عقود كاملة: ${contractsComplete.length} (${(contractsComplete.length / results.length * 100).toFixed(1)}%)`);
  console.log(`   - عقود ناقصة: ${contractsWithMissing.length} (${(contractsWithMissing.length / results.length * 100).toFixed(1)}%)`);
  console.log('');
}

verifyContractInvoices().catch(error => {
  console.error('❌ خطأ فادح:', error);
  process.exit(1);
});

