/**
 * ====================================================================
 * سكريبت إنشاء العملاء المفقودين تلقائياً
 * Auto-Create Missing Customers
 * ====================================================================
 * 
 * يقوم هذا السكريبت بإنشاء العملاء المفقودين تلقائياً
 * بناءً على تقرير العملاء المفقودين
 * 
 * Usage:
 * npm run create:missing-customers
 * أو
 * npx tsx scripts/create-missing-customers.ts
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

interface CreateStats {
  totalMissing: number;
  customersCreated: number;
  contractsCreated: number;
  errors: Array<{ vehicle: string; customer: string; error: string }>;
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
// دالة تنسيق التاريخ
// ====================================================================
function parseArabicDate(dateStr: string): string | null {
  if (!dateStr || dateStr === '-') return null;
  
  try {
    let cleanDate = dateStr.split(' ')[0].trim();
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      return cleanDate;
    }
    
    const parts = cleanDate.split(/[/-]/);
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month}-${day}`;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// ====================================================================
// دالة البحث عن المركبة
// ====================================================================
async function findVehicle(vehicleNumber: string): Promise<string | null> {
  try {
    const cleanVehicleNumber = vehicleNumber.trim();
    const noSpaces = cleanVehicleNumber.replace(/\s/g, '');
    
    let { data, error } = await supabase
      .from('vehicles')
      .select('id, plate_number')
      .eq('company_id', COMPANY_ID)
      .eq('plate_number', cleanVehicleNumber)
      .limit(1)
      .single();
    
    if (data && !error) {
      return data.id;
    }
    
    if (noSpaces !== cleanVehicleNumber) {
      const { data: data2, error: error2 } = await supabase
        .from('vehicles')
        .select('id, plate_number')
        .eq('company_id', COMPANY_ID)
        .eq('plate_number', noSpaces)
        .limit(1)
        .single();
      
      if (data2 && !error2) {
        return data2.id;
      }
    }
    
    const { data: data3, error: error3 } = await supabase
      .from('vehicles')
      .select('id, plate_number')
      .eq('company_id', COMPANY_ID)
      .ilike('plate_number', `%${cleanVehicleNumber}%`)
      .limit(5);
    
    if (data3 && data3.length === 1 && !error3) {
      return data3[0].id;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// ====================================================================
// دالة البحث عن العميل
// ====================================================================
async function findCustomer(customerName: string, phone: string): Promise<string | null> {
  try {
    const cleanPhone = cleanPhoneNumber(phone);
    const cleanName = customerName.trim();
    
    if (cleanPhone) {
      const { data: phoneMatch } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', COMPANY_ID)
        .eq('phone', cleanPhone)
        .limit(1)
        .single();
      
      if (phoneMatch) {
        return phoneMatch.id;
      }
    }
    
    const nameParts = cleanName.split(' ').filter(p => p.length > 0);
    if (nameParts.length > 0) {
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';
      
      if (lastName) {
        const { data: nameMatch } = await supabase
          .from('customers')
          .select('id')
          .eq('company_id', COMPANY_ID)
          .ilike('first_name', `%${firstName}%`)
          .ilike('last_name', `%${lastName}%`)
          .limit(1)
          .single();
        
        if (nameMatch) {
          return nameMatch.id;
        }
      }
      
      const { data: firstNameMatch } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', COMPANY_ID)
        .ilike('first_name', `%${firstName}%`)
        .limit(5);
      
      if (firstNameMatch && firstNameMatch.length === 1) {
        return firstNameMatch[0].id;
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// ====================================================================
// دالة إنشاء عميل جديد
// ====================================================================
async function createCustomer(
  customerName: string,
  phone: string
): Promise<string | null> {
  try {
    const cleanName = customerName.trim();
    const cleanPhone = cleanPhoneNumber(phone);
    
    const nameParts = cleanName.split(' ').filter(p => p.length > 0);
    const firstName = nameParts[0] || cleanName;
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const { data: newCustomer, error: createError } = await supabase
      .from('customers')
      .insert({
        company_id: COMPANY_ID,
        customer_type: 'individual',
        first_name: firstName,
        last_name: lastName,
        phone: cleanPhone || null,
        is_active: true
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error(`   ❌ خطأ في إنشاء العميل ${customerName}:`, createError.message);
      return null;
    }
    
    console.log(`   ✨ تم إنشاء عميل جديد: ${customerName} (${cleanPhone || 'بدون هاتف'})`);
    return newCustomer.id;
  } catch (error) {
    console.error(`   ❌ خطأ في معالجة العميل ${customerName}:`, error);
    return null;
  }
}

// ====================================================================
// دالة إنشاء عقد جديد
// ====================================================================
async function createContract(
  vehicleId: string,
  customerId: string,
  contractData: VehicleData
): Promise<boolean> {
  try {
    const vehicleNumber = contractData['رقم المركبة'];
    const startDate = parseArabicDate(contractData['تاريخ بداية العقد']);
    const monthlyRent = parseFloat(contractData['قيمة القسط']) || 0;
    const notes = contractData['ملاحظات '] || '';
    
    if (!startDate) {
      console.log(`   ⚠️  تخطي المركبة ${vehicleNumber}: تاريخ بداية العقد غير صالح`);
      return false;
    }
    
    if (!monthlyRent || monthlyRent <= 0) {
      console.log(`   ⚠️  تخطي المركبة ${vehicleNumber}: قيمة القسط غير صالحة`);
      return false;
    }
    
    // حساب تاريخ النهاية (سنة واحدة)
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const contractPayload: any = {
      company_id: COMPANY_ID,
      vehicle_id: vehicleId,
      customer_id: customerId,
      contract_date: startDate,
      start_date: startDate,
      end_date: endDateStr,
      monthly_amount: monthlyRent,
      contract_amount: monthlyRent,
      contract_type: 'rental',
      status: 'active',
      contract_number: `CNT-${vehicleNumber}-${new Date(startDate).getFullYear()}`,
      description: notes === '-' ? null : notes,
      terms: notes === '-' ? null : notes
    };
    
    const { error: insertError } = await supabase
      .from('contracts')
      .insert(contractPayload)
      .select('id, contract_number')
      .single();
    
    if (insertError) {
      console.error(`   ❌ خطأ في إنشاء العقد للمركبة ${vehicleNumber}:`, insertError.message);
      return false;
    }
    
    console.log(`   ✨ تم إنشاء عقد جديد: ${contractPayload.contract_number}`);
    return true;
  } catch (error) {
    console.error(`   ❌ خطأ في معالجة العقد:`, error);
    return false;
  }
}

// ====================================================================
// الدالة الرئيسية
// ====================================================================
async function main() {
  console.log('');
  console.log('====================================================================');
  console.log('✨ إنشاء العملاء المفقودين تلقائياً');
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
  
  // إحصائيات العملية
  const stats: CreateStats = {
    totalMissing: 0,
    customersCreated: 0,
    contractsCreated: 0,
    errors: []
  };
  
  console.log('🔄 بدء إنشاء العملاء المفقودين...');
  console.log('');
  
  for (let i = 0; i < vehicles.length; i++) {
    const vehicleData = vehicles[i];
    const vehicleNumber = vehicleData['رقم المركبة'];
    const customerName = vehicleData['اسم العميل'];
    const phone = vehicleData['رقم الجوال'];
    
    console.log(`\n   ${i + 1}/${vehicles.length}. 🚗 المركبة: ${vehicleNumber} | العميل: ${customerName}`);
    
    try {
      // البحث عن المركبة
      const vehicleId = await findVehicle(vehicleNumber);
      if (!vehicleId) {
        console.log(`   ⚠️  المركبة ${vehicleNumber} غير موجودة في قاعدة البيانات`);
        stats.errors.push({
          vehicle: vehicleNumber,
          customer: customerName,
          error: 'المركبة غير موجودة في قاعدة البيانات'
        });
        continue;
      }
      
      // البحث عن العميل
      let customerId = await findCustomer(customerName, phone);
      
      if (!customerId) {
        // إنشاء عميل جديد
        stats.totalMissing++;
        customerId = await createCustomer(customerName, phone);
        
        if (!customerId) {
          stats.errors.push({
            vehicle: vehicleNumber,
            customer: customerName,
            error: 'فشل في إنشاء العميل'
          });
          continue;
        }
        
        stats.customersCreated++;
      }
      
      // التحقق من وجود عقد
      const { data: existingContract } = await supabase
        .from('contracts')
        .select('id')
        .eq('company_id', COMPANY_ID)
        .eq('vehicle_id', vehicleId)
        .eq('customer_id', customerId)
        .limit(1)
        .single();
      
      if (!existingContract) {
        // إنشاء عقد جديد
        const success = await createContract(vehicleId, customerId, vehicleData);
        if (success) {
          stats.contractsCreated++;
        }
      } else {
        console.log(`   ℹ️  العقد موجود بالفعل`);
      }
      
      // تأخير صغير
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`   ❌ خطأ في معالجة المركبة ${vehicleNumber}:`, error);
      stats.errors.push({
        vehicle: vehicleNumber,
        customer: customerName,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  }
  
  // طباعة النتائج
  console.log('');
  console.log('====================================================================');
  console.log('✅ اكتملت عملية الإنشاء!');
  console.log('====================================================================');
  console.log('');
  console.log('📊 الإحصائيات:');
  console.log(`   • العملاء المفقودون: ${stats.totalMissing}`);
  console.log(`   • العملاء المُنشأون: ${stats.customersCreated}`);
  console.log(`   • العقود المُنشأة: ${stats.contractsCreated}`);
  console.log(`   • الأخطاء: ${stats.errors.length}`);
  console.log('');
  
  if (stats.errors.length > 0) {
    console.log('⚠️  الأخطاء:');
    stats.errors.forEach((err, idx) => {
      console.log(`   ${idx + 1}. المركبة ${err.vehicle} | العميل ${err.customer}: ${err.error}`);
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

