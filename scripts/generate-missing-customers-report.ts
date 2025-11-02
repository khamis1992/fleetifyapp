/**
 * ====================================================================
 * سكريبت إنشاء تقرير بالعملاء المفقودين
 * Generate Missing Customers Report
 * ====================================================================
 * 
 * يقوم هذا السكريبت بإنشاء تقرير تفصيلي بالعملاء المفقودين
 * من ملف JSON ليتم مراجعتها يدوياً
 * 
 * Usage:
 * npm run report:missing-customers
 * أو
 * npx tsx scripts/generate-missing-customers-report.ts
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====================================================================
// دالة تحميل متغيرات البيئة من ملف .env
// ====================================================================
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

// تحميل متغيرات البيئة
loadEnvFile();

// ====================================================================
// إعدادات الاتصال بـ Supabase
// ====================================================================
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL) {
  console.error('❌ خطأ: يجب تعيين VITE_SUPABASE_URL أو SUPABASE_URL في ملف .env');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ خطأ: يجب تعيين SUPABASE_SERVICE_ROLE_KEY أو SUPABASE_SERVICE_KEY في ملف .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ====================================================================
// الإعدادات
// ====================================================================
const COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4'; // شركة العراف
const JSON_FILE_PATH = path.join(__dirname, '..', '.cursor', 'المركبات_مع_العملاء (1).json');
const REPORT_OUTPUT_PATH = path.join(__dirname, '..', '.cursor', 'تقرير_العملاء_المفقودين.json');
const REPORT_OUTPUT_CSV = path.join(__dirname, '..', '.cursor', 'تقرير_العملاء_المفقودين.csv');

// ====================================================================
// واجهات البيانات
// ====================================================================
interface VehicleData {
  'رقم المركبة': string;
  'اسم العميل': string;
  'تاريخ بداية العقد': string;
  'قيمة القسط': string;
  'رقم الجوال': string;
  'ملاحظات '?: string;
}

interface MissingCustomer {
  vehicleNumber: string;
  customerName: string;
  phone: string;
  contractStartDate: string;
  monthlyRent: string;
  notes: string;
  reason: string;
  suggestions?: string[];
}

// ====================================================================
// دالة تنظيف رقم الهاتف
// ====================================================================
function cleanPhoneNumber(phone: string): string {
  if (!phone || phone === '-') return '';
  
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 8) {
    cleaned = '974' + cleaned;
  } else if (cleaned.length === 7) {
    cleaned = '974' + cleaned;
  }
  
  return cleaned;
}

// ====================================================================
// دالة البحث عن العميل
// ====================================================================
async function findCustomer(
  customerName: string,
  phone: string
): Promise<{ found: boolean; suggestions?: string[] }> {
  try {
    const cleanPhone = cleanPhoneNumber(phone);
    const cleanName = customerName.trim();
    
    // البحث برقم الجوال
    if (cleanPhone) {
      const { data: phoneMatch } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone')
        .eq('company_id', COMPANY_ID)
        .eq('phone', cleanPhone)
        .limit(1)
        .single();
      
      if (phoneMatch) {
        return { found: true };
      }
    }
    
    // البحث بالاسم
    const nameParts = cleanName.split(' ').filter(p => p.length > 0);
    if (nameParts.length > 0) {
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const suggestions: string[] = [];
      
      // البحث بالاسم الأول والأخير
      if (lastName) {
        const { data: nameMatch } = await supabase
          .from('customers')
          .select('id, first_name, last_name, phone')
          .eq('company_id', COMPANY_ID)
          .ilike('first_name', `%${firstName}%`)
          .ilike('last_name', `%${lastName}%`)
          .limit(5);
        
        if (nameMatch && nameMatch.length > 0) {
          nameMatch.forEach(c => {
            suggestions.push(`${c.first_name} ${c.last_name} (${c.phone || 'بدون هاتف'})`);
          });
        }
      }
      
      // البحث بالاسم الأول فقط
      const { data: firstNameMatch } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone')
        .eq('company_id', COMPANY_ID)
        .ilike('first_name', `%${firstName}%`)
        .limit(5);
      
      if (firstNameMatch && firstNameMatch.length > 0) {
        firstNameMatch.forEach(c => {
          const fullName = `${c.first_name} ${c.last_name}`.trim();
          const suggestion = `${fullName} (${c.phone || 'بدون هاتف'})`;
          if (!suggestions.includes(suggestion)) {
            suggestions.push(suggestion);
          }
        });
      }
      
      // البحث بالاسم الكامل
      const { data: fullNameMatch } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone, company_name')
        .eq('company_id', COMPANY_ID)
        .or(`first_name.ilike.%${cleanName}%,last_name.ilike.%${cleanName}%,company_name.ilike.%${cleanName}%`)
        .limit(5);
      
      if (fullNameMatch && fullNameMatch.length > 0) {
        fullNameMatch.forEach(c => {
          const fullName = c.company_name || `${c.first_name} ${c.last_name}`.trim();
          const suggestion = `${fullName} (${c.phone || 'بدون هاتف'})`;
          if (!suggestions.includes(suggestion)) {
            suggestions.push(suggestion);
          }
        });
      }
      
      return { found: false, suggestions: suggestions.length > 0 ? suggestions : undefined };
    }
    
    return { found: false };
  } catch (error) {
    console.error(`   ❌ خطأ في البحث عن العميل ${customerName}:`, error);
    return { found: false };
  }
}

// ====================================================================
// الدالة الرئيسية
// ====================================================================
async function main() {
  console.log('');
  console.log('====================================================================');
  console.log('📋 بدء إنشاء تقرير العملاء المفقودين');
  console.log('====================================================================');
  console.log(`📍 الشركة: العراف (ID: ${COMPANY_ID})`);
  console.log(`📂 الملف: ${JSON_FILE_PATH}`);
  console.log('');
  
  // قراءة ملف JSON
  console.log('📂 قراءة ملف JSON...');
  let jsonData: { vehicles: VehicleData[] };
  
  try {
    const fileContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
    jsonData = JSON.parse(fileContent);
  } catch (error) {
    console.error('❌ خطأ في قراءة ملف JSON:', error);
    process.exit(1);
  }
  
  const vehicles = jsonData.vehicles || [];
  console.log(`✅ تم قراءة ${vehicles.length} سجل من الملف`);
  console.log('');
  
  // البحث عن العملاء المفقودين
  console.log('🔍 البحث عن العملاء المفقودين...');
  console.log('');
  
  const missingCustomers: MissingCustomer[] = [];
  
  for (let i = 0; i < vehicles.length; i++) {
    const vehicleData = vehicles[i];
    const vehicleNumber = vehicleData['رقم المركبة'];
    const customerName = vehicleData['اسم العميل'];
    const phone = vehicleData['رقم الجوال'];
    
    console.log(`   ${i + 1}/${vehicles.length}. البحث عن: ${customerName}...`);
    
    const result = await findCustomer(customerName, phone);
    
    if (!result.found) {
      missingCustomers.push({
        vehicleNumber: vehicleNumber,
        customerName: customerName,
        phone: phone || '-',
        contractStartDate: vehicleData['تاريخ بداية العقد'] || '-',
        monthlyRent: vehicleData['قيمة القسط'] || '-',
        notes: vehicleData['ملاحظات '] || '-',
        reason: 'العميل غير موجود في قاعدة البيانات',
        suggestions: result.suggestions
      });
    }
    
    // تأخير صغير لتجنب الحد من معدل الطلبات
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  console.log('');
  console.log(`✅ تم العثور على ${missingCustomers.length} عميل مفقود`);
  console.log('');
  
  // إنشاء التقرير JSON
  const report = {
    metadata: {
      generated_at: new Date().toISOString(),
      company_id: COMPANY_ID,
      company_name: 'شركة العراف',
      total_records: vehicles.length,
      missing_customers_count: missingCustomers.length,
      found_customers_count: vehicles.length - missingCustomers.length
    },
    missing_customers: missingCustomers
  };
  
  fs.writeFileSync(REPORT_OUTPUT_PATH, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`✅ تم حفظ التقرير JSON في: ${REPORT_OUTPUT_PATH}`);
  
  // إنشاء التقرير CSV
  const csvHeader = 'رقم المركبة,اسم العميل,رقم الجوال,تاريخ بداية العقد,قيمة القسط,ملاحظات,السبب,اقتراحات\n';
  const csvRows = missingCustomers.map(mc => {
    const suggestions = mc.suggestions ? mc.suggestions.join(' | ') : '';
    return `"${mc.vehicleNumber}","${mc.customerName}","${mc.phone}","${mc.contractStartDate}","${mc.monthlyRent}","${mc.notes}","${mc.reason}","${suggestions}"`;
  }).join('\n');
  
  fs.writeFileSync(REPORT_OUTPUT_CSV, '\ufeff' + csvHeader + csvRows, 'utf-8'); // BOM for Arabic support
  console.log(`✅ تم حفظ التقرير CSV في: ${REPORT_OUTPUT_CSV}`);
  
  // طباعة ملخص
  console.log('');
  console.log('====================================================================');
  console.log('✅ اكتمل إنشاء التقرير!');
  console.log('====================================================================');
  console.log('');
  console.log('📊 الملخص:');
  console.log(`   • إجمالي السجلات: ${vehicles.length}`);
  console.log(`   • العملاء الموجودون: ${vehicles.length - missingCustomers.length}`);
  console.log(`   • العملاء المفقودون: ${missingCustomers.length}`);
  console.log('');
  
  if (missingCustomers.length > 0) {
    console.log('📋 قائمة العملاء المفقودين:');
    missingCustomers.forEach((mc, idx) => {
      console.log(`   ${idx + 1}. ${mc.customerName} (المركبة: ${mc.vehicleNumber}, الهاتف: ${mc.phone})`);
      if (mc.suggestions && mc.suggestions.length > 0) {
        console.log(`      💡 اقتراحات: ${mc.suggestions.slice(0, 2).join(', ')}`);
      }
    });
    console.log('');
  }
  
  console.log('====================================================================');
  console.log('');
}

// تشغيل السكريبت
main().catch((error) => {
  console.error('❌ خطأ فادح:', error);
  process.exit(1);
});

