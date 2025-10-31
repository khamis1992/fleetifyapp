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

const SUPABASE_URL = "https://qwhunliohlkkahbspfiu.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ خطأ: متغير البيئة SUPABASE_SERVICE_KEY غير موجود');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

// Get the highest invoice number sequence for this company
async function getNextInvoiceSequence(companyId: string): Promise<number> {
  const { data: lastInvoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (lastInvoice?.invoice_number) {
    // Try to extract sequence from invoice number
    const parts = lastInvoice.invoice_number.split('-');
    const lastPart = parts[parts.length - 1];
    const sequence = parseInt(lastPart) || 0;
    return sequence + 1;
  }
  
  return 1;
}

async function generateUniqueInvoiceNumber(companyId: string, counter: number, baseSequence: number): Promise<string> {
  const prefix = 'INV';
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const sequence = baseSequence + counter;
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  
  return `${prefix}-${year}${month}-${sequence.toString().padStart(6, '0')}-${random}`;
}

function formatMonthlyPaymentDescription(monthDate: Date, contractNumber: string): string {
  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                     'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const month = monthNames[monthDate.getMonth()];
  const year = monthDate.getFullYear();
  return `إيجار شهري - ${month} ${year} - عقد ${contractNumber}`;
}

async function createMissingInvoices() {
  console.log('🚀 بدء إنشاء الفواتير الناقصة للعقود...');
  console.log('');

  const companyId = process.argv[2] || '24bc0b21-4e2d-4413-9842-31719a3669f4';
  console.log(`📋 معرف الشركة: ${companyId}`);
  console.log('');

  // Get all active contracts
  console.log('جلب العقود النشطة...');
  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select('id, contract_number, start_date, end_date, monthly_amount, contract_amount, customer_id, cost_center_id')
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

  // Get all existing invoices
  console.log('جلب الفواتير الموجودة...');
  const { data: allInvoices, error: allInvoicesError } = await supabase
    .from('invoices')
    .select('id, contract_id, invoice_date')
    .eq('company_id', companyId);

  if (allInvoicesError) {
    console.error(`❌ خطأ في جلب الفواتير: ${allInvoicesError.message}`);
    process.exit(1);
  }

  console.log(`✅ تم جلب ${allInvoices?.length || 0} فاتورة موجودة`);
  console.log('');

  // Group invoices by contract_id and month
  const invoicesByContractMonth = new Map<string, Set<string>>();
  (allInvoices || []).forEach(invoice => {
    const month = getMonthString(new Date(invoice.invoice_date));
    const key = `${invoice.contract_id}_${month}`;
    if (!invoicesByContractMonth.has(key)) {
      invoicesByContractMonth.set(key, new Set());
    }
    invoicesByContractMonth.get(key)!.add(invoice.id);
  });

  // Prepare invoices to create
  const invoicesToCreate: Array<{
    contract_id: string;
    contract_number: string;
    month: string;
    invoice_date: Date;
    due_date: Date;
    monthly_amount: number;
    customer_id: string;
    cost_center_id?: string;
  }> = [];

  console.log('فحص الفواتير الناقصة لكل عقد...\n');

  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i];
    
    if (!contract.start_date || !contract.monthly_amount) {
      console.log(`⚠️  عقد #${contract.contract_number}: لا يوجد تاريخ بداية أو مبلغ شهري - تم التخطي`);
      continue;
    }

    const startDate = new Date(contract.start_date);
    const endDate = contract.end_date ? new Date(contract.end_date) : undefined;
    
    // Get expected months
    const expectedMonths = getExpectedMonths(startDate, endDate);
    
    // Check which months are missing
    for (const month of expectedMonths) {
      const key = `${contract.id}_${month}`;
      
      if (!invoicesByContractMonth.has(key)) {
        // Parse month to get date
        const [year, monthNum] = month.split('-').map(Number);
        // Invoice date is 30th of the month
        const invoiceDate = new Date(year, monthNum - 1, 30);
        // Due date is 1st of the next month
        const dueDate = new Date(year, monthNum, 1);
        
        invoicesToCreate.push({
          contract_id: contract.id,
          contract_number: contract.contract_number,
          month,
          invoice_date: invoiceDate,
          due_date: dueDate,
          monthly_amount: contract.monthly_amount,
          customer_id: contract.customer_id,
          cost_center_id: contract.cost_center_id || undefined,
        });
      }
    }

    // Show progress
    if ((i + 1) % 20 === 0 || i === contracts.length - 1) {
      console.log(`  تم فحص ${i + 1}/${contracts.length} عقد...`);
    }
  }

  console.log('');
  console.log(`📊 تم العثور على ${invoicesToCreate.length} فاتورة ناقصة`);
  console.log('');

  if (invoicesToCreate.length === 0) {
    console.log('✅ جميع الفواتير موجودة بالفعل!');
    return;
  }

  // Get base sequence for invoice numbers
  console.log('جلب التسلسل الأساسي لأرقام الفواتير...');
  const baseSequence = await getNextInvoiceSequence(companyId);
  console.log(`✅ التسلسل الأساسي: ${baseSequence}`);
  console.log('');

  // Create invoices in batches
  const BATCH_SIZE = 50;
  let created = 0;
  let errors = 0;
  const errorMessages: string[] = [];

  console.log(`🔄 بدء إنشاء ${invoicesToCreate.length} فاتورة...`);
  console.log('');

  for (let i = 0; i < invoicesToCreate.length; i += BATCH_SIZE) {
    const batch = invoicesToCreate.slice(i, i + BATCH_SIZE);
    
    // Create invoices for this batch - generate unique invoice numbers
    const invoiceInserts = await Promise.all(
      batch.map(async (inv, index) => {
        const invoiceNumber = await generateUniqueInvoiceNumber(companyId, i + index, baseSequence);
        const description = formatMonthlyPaymentDescription(inv.invoice_date, inv.contract_number);
        
        return {
          company_id: companyId,
          invoice_number: invoiceNumber,
          invoice_type: 'sales',
          invoice_date: inv.invoice_date.toISOString().slice(0, 10),
          due_date: inv.due_date.toISOString().slice(0, 10),
          customer_id: inv.customer_id,
          contract_id: inv.contract_id,
          cost_center_id: inv.cost_center_id || null,
          subtotal: inv.monthly_amount,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: inv.monthly_amount,
          balance_due: inv.monthly_amount,
          notes: description,
          terms: '',
          status: 'sent',
          payment_status: 'unpaid',
        };
      })
    );

    // Insert batch
    const { data: insertedInvoices, error: insertError } = await supabase
      .from('invoices')
      .insert(invoiceInserts)
      .select();

    if (insertError) {
      console.error(`❌ خطأ في إدراج الدفعة ${Math.floor(i / BATCH_SIZE) + 1}:`, insertError.message);
      errors += batch.length;
      errorMessages.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${insertError.message}`);
    } else {
      created += insertedInvoices?.length || 0;
      
      // Create invoice items for each invoice
      const invoiceItems = insertedInvoices?.flatMap(invoice => {
        const originalInv = batch.find(b => b.contract_id === invoice.contract_id && 
          getMonthString(new Date(invoice.invoice_date)) === b.month);
        if (!originalInv) return [];
        
        return [{
          invoice_id: invoice.id,
          item_description: formatMonthlyPaymentDescription(originalInv.invoice_date, originalInv.contract_number),
          quantity: 1,
          unit_price: originalInv.monthly_amount,
          line_total: originalInv.monthly_amount,
          tax_rate: 0,
          tax_amount: 0,
        }];
      }) || [];

      if (invoiceItems.length > 0) {
        await supabase.from('invoice_items').insert(invoiceItems);
      }
    }

    // Show progress
    const progress = Math.min(i + BATCH_SIZE, invoicesToCreate.length);
    if (progress % 100 === 0 || progress === invoicesToCreate.length) {
      console.log(`  تم معالجة ${progress}/${invoicesToCreate.length} فاتورة (${created} تم إنشاؤها، ${errors} أخطاء)`);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 ملخص عملية إنشاء الفواتير');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📋 إجمالي الفواتير المطلوبة: ${invoicesToCreate.length}`);
  console.log(`✅ تم إنشاء: ${created} فاتورة`);
  console.log(`❌ أخطاء: ${errors} فاتورة`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  if (errors > 0) {
    console.log('⚠️  رسائل الأخطاء:');
    errorMessages.slice(0, 10).forEach(msg => console.log(`   - ${msg}`));
    if (errorMessages.length > 10) {
      console.log(`   ... و ${errorMessages.length - 10} رسالة خطأ أخرى`);
    }
    console.log('');
  }
}

createMissingInvoices().catch(error => {
  console.error('❌ خطأ فادح:', error);
  process.exit(1);
});

