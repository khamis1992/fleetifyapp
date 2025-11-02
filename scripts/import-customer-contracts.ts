/**
 * ====================================================================
 * سكريبت استيراد بيانات العقود والعملاء
 * Import Customer Contracts from JSON File
 * ====================================================================
 * 
 * يقوم هذا السكريبت بقراءة ملف JSON ويحدث:
 * 1. بيانات العملاء (customers)
 * 2. بيانات المركبات (vehicles)
 * 3. بيانات العقود (rental_contracts)
 * 
 * Usage:
 * npm run import-contracts
 * أو
 * npx tsx scripts/import-customer-contracts.ts
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====================================================================
// إعدادات الاتصال بـ Supabase
// ====================================================================
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_KEY';

if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
  console.error('❌ خطأ: يجب تعيين VITE_SUPABASE_URL في ملف .env');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_KEY') {
  console.error('❌ خطأ: يجب تعيين SUPABASE_SERVICE_ROLE_KEY في ملف .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ====================================================================
// الإعدادات
// ====================================================================
const COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4'; // معرف الشركة (الرجاء التحديث)
const JSON_FILE_PATH = path.join(__dirname, '..', '.cursor', 'المركبات_مع_العملاء (1).json');
const BATCH_SIZE = 10;
const DEFAULT_MONTHLY_RENT = 1500; // القيمة الافتراضية إذا لم تكن موجودة

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

interface ImportStats {
  totalRecords: number;
  customersCreated: number;
  customersUpdated: number;
  vehiclesFound: number;
  vehiclesNotFound: number;
  contractsCreated: number;
  contractsUpdated: number;
  errors: Array<{ vehicle: string; error: string }>;
}

// ====================================================================
// دالة تنسيق التاريخ
// ====================================================================
function parseArabicDate(dateStr: string): string | null {
  if (!dateStr || dateStr === '-') return null;
  
  try {
    // معالجة التنسيقات المختلفة
    // 15/4/2025 -> 2025-04-15
    // 01-09-2025 -> 2025-09-01
    // 2025-01-02 00:00:00 -> 2025-01-02
    
    // إزالة الوقت إذا كان موجوداً
    let cleanDate = dateStr.split(' ')[0].trim();
    
    // تنسيق ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      return cleanDate;
    }
    
    // تنسيق dd/mm/yyyy أو dd-mm-yyyy
    const parts = cleanDate.split(/[/-]/);
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      
      // التأكد من أن السنة 4 أرقام
      const fullYear = year.length === 2 ? `20${year}` : year;
      
      return `${fullYear}-${month}-${day}`;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ خطأ في تحويل التاريخ: ${dateStr}`, error);
    return null;
  }
}

// ====================================================================
// دالة تنظيف رقم الهاتف
// ====================================================================
function cleanPhoneNumber(phone: string): string {
  if (!phone || phone === '-') return '';
  
  // إزالة الأحرف غير الرقمية
  let cleaned = phone.replace(/\D/g, '');
  
  // إضافة رمز الدولة إذا لم يكن موجوداً (قطر +974)
  if (cleaned.length === 8) {
    cleaned = '974' + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith('974')) {
    // بالفعل يحتوي على رمز الدولة
  }
  
  return cleaned;
}

// ====================================================================
// دالة البحث عن المركبة
// ====================================================================
async function findVehicle(vehicleNumber: string): Promise<string | null> {
  try {
    const cleanVehicleNumber = vehicleNumber.trim();
    
    const { data, error } = await supabase
      .from('vehicles')
      .select('id')
      .eq('company_id', COMPANY_ID)
      .or(`vehicle_number.eq.${cleanVehicleNumber},license_plate.eq.${cleanVehicleNumber}`)
      .limit(1)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') {
        console.error(`   ⚠️  خطأ في البحث عن المركبة ${vehicleNumber}:`, error.message);
      }
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error(`   ❌ خطأ في البحث عن المركبة ${vehicleNumber}:`, error);
    return null;
  }
}

// ====================================================================
// دالة البحث عن العميل أو إنشائه
// ====================================================================
async function findOrCreateCustomer(
  customerName: string,
  phone: string
): Promise<string | null> {
  try {
    const cleanName = customerName.trim();
    const cleanPhone = cleanPhoneNumber(phone);
    
    // البحث عن العميل أولاً
    let { data: existingCustomer, error: searchError } = await supabase
      .from('customers')
      .select('id')
      .eq('company_id', COMPANY_ID)
      .or(`first_name.ilike.%${cleanName}%,last_name.ilike.%${cleanName}%,company_name.ilike.%${cleanName}%`)
      .limit(1)
      .single();
    
    if (existingCustomer) {
      return existingCustomer.id;
    }
    
    // إنشاء عميل جديد
    const nameParts = cleanName.split(' ');
    const firstName = nameParts[0] || cleanName;
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const { data: newCustomer, error: createError } = await supabase
      .from('customers')
      .insert({
        company_id: COMPANY_ID,
        customer_type: 'individual',
        first_name: firstName,
        last_name: lastName,
        phone: cleanPhone,
        is_active: true
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error(`   ❌ خطأ في إنشاء العميل ${customerName}:`, createError.message);
      return null;
    }
    
    console.log(`   ✅ تم إنشاء عميل جديد: ${customerName}`);
    return newCustomer.id;
  } catch (error) {
    console.error(`   ❌ خطأ في معالجة العميل ${customerName}:`, error);
    return null;
  }
}

// ====================================================================
// دالة إنشاء أو تحديث العقد
// ====================================================================
async function createOrUpdateContract(
  vehicleId: string,
  customerId: string,
  contractData: VehicleData
): Promise<boolean> {
  try {
    const vehicleNumber = contractData['رقم المركبة'];
    const startDate = parseArabicDate(contractData['تاريخ بداية العقد']);
    const monthlyRent = parseFloat(contractData['قيمة القسط']) || DEFAULT_MONTHLY_RENT;
    const notes = contractData['ملاحظات '] || '';
    
    if (!startDate) {
      console.log(`   ⚠️  تخطي المركبة ${vehicleNumber}: تاريخ بداية العقد غير صالح`);
      return false;
    }
    
    // حساب تاريخ النهاية (سنة واحدة)
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // توليد رقم العقد
    const contractNumber = `CNT-${vehicleNumber}-${new Date(startDate).getFullYear()}`;
    
    // البحث عن عقد موجود
    const { data: existingContract } = await supabase
      .from('rental_contracts')
      .select('id')
      .eq('company_id', COMPANY_ID)
      .eq('vehicle_id', vehicleId)
      .eq('customer_id', customerId)
      .limit(1)
      .single();
    
    const contractPayload = {
      company_id: COMPANY_ID,
      vehicle_id: vehicleId,
      customer_id: customerId,
      contract_number: contractNumber,
      contract_date: startDate,
      start_date: startDate,
      end_date: endDateStr,
      monthly_rent: monthlyRent,
      status: 'active',
      notes: notes,
      payment_day: 1,
      late_fee_per_day: 120,
      max_late_fee: 3000
    };
    
    if (existingContract) {
      // تحديث العقد الموجود
      const { error: updateError } = await supabase
        .from('rental_contracts')
        .update(contractPayload)
        .eq('id', existingContract.id);
      
      if (updateError) {
        console.error(`   ❌ خطأ في تحديث العقد للمركبة ${vehicleNumber}:`, updateError.message);
        return false;
      }
      
      console.log(`   ♻️  تم تحديث العقد: ${contractNumber}`);
      return true;
    } else {
      // إنشاء عقد جديد
      const { error: insertError } = await supabase
        .from('rental_contracts')
        .insert(contractPayload);
      
      if (insertError) {
        console.error(`   ❌ خطأ في إنشاء العقد للمركبة ${vehicleNumber}:`, insertError.message);
        return false;
      }
      
      console.log(`   ✨ تم إنشاء عقد جديد: ${contractNumber}`);
      return true;
    }
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
  console.log('🚀 بدء استيراد بيانات العقود والعملاء');
  console.log('====================================================================');
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
  
  const vehicles = jsonData.vehicles;
  console.log(`✅ تم قراءة ${vehicles.length} سجل من الملف`);
  console.log('');
  
  // إحصائيات العملية
  const stats: ImportStats = {
    totalRecords: vehicles.length,
    customersCreated: 0,
    customersUpdated: 0,
    vehiclesFound: 0,
    vehiclesNotFound: 0,
    contractsCreated: 0,
    contractsUpdated: 0,
    errors: []
  };
  
  // معالجة البيانات على دفعات
  console.log('🔄 بدء معالجة البيانات...');
  console.log('');
  
  for (let i = 0; i < vehicles.length; i += BATCH_SIZE) {
    const batch = vehicles.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(vehicles.length / BATCH_SIZE);
    
    console.log(`📦 معالجة الدفعة ${batchNumber}/${totalBatches} (${batch.length} سجلات)...`);
    
    for (const vehicleData of batch) {
      const vehicleNumber = vehicleData['رقم المركبة'];
      console.log(`\n   🚗 المركبة: ${vehicleNumber}`);
      
      try {
        // البحث عن المركبة
        const vehicleId = await findVehicle(vehicleNumber);
        if (!vehicleId) {
          console.log(`   ⚠️  المركبة ${vehicleNumber} غير موجودة في قاعدة البيانات`);
          stats.vehiclesNotFound++;
          stats.errors.push({
            vehicle: vehicleNumber,
            error: 'المركبة غير موجودة في قاعدة البيانات'
          });
          continue;
        }
        stats.vehiclesFound++;
        
        // البحث عن العميل أو إنشائه
        const customerName = vehicleData['اسم العميل'];
        const phone = vehicleData['رقم الجوال'];
        
        const customerId = await findOrCreateCustomer(customerName, phone);
        if (!customerId) {
          console.log(`   ⚠️  فشل في إنشاء/البحث عن العميل: ${customerName}`);
          stats.errors.push({
            vehicle: vehicleNumber,
            error: `فشل في معالجة العميل: ${customerName}`
          });
          continue;
        }
        stats.customersCreated++;
        
        // إنشاء أو تحديث العقد
        const success = await createOrUpdateContract(vehicleId, customerId, vehicleData);
        if (success) {
          stats.contractsCreated++;
        } else {
          stats.errors.push({
            vehicle: vehicleNumber,
            error: 'فشل في إنشاء/تحديث العقد'
          });
        }
        
        // تأخير صغير لتجنب الحد من معدل الطلبات
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`   ❌ خطأ في معالجة المركبة ${vehicleNumber}:`, error);
        stats.errors.push({
          vehicle: vehicleNumber,
          error: error instanceof Error ? error.message : 'خطأ غير معروف'
        });
      }
    }
    
    console.log('');
  }
  
  // طباعة النتائج
  console.log('');
  console.log('====================================================================');
  console.log('✅ اكتملت عملية الاستيراد!');
  console.log('====================================================================');
  console.log('');
  console.log('📊 الإحصائيات:');
  console.log(`   • إجمالي السجلات: ${stats.totalRecords}`);
  console.log(`   • المركبات الموجودة: ${stats.vehiclesFound}`);
  console.log(`   • المركبات غير الموجودة: ${stats.vehiclesNotFound}`);
  console.log(`   • العملاء الجدد: ${stats.customersCreated}`);
  console.log(`   • العقود المُنشأة/المحدثة: ${stats.contractsCreated}`);
  console.log(`   • الأخطاء: ${stats.errors.length}`);
  console.log('');
  
  if (stats.errors.length > 0) {
    console.log('⚠️  الأخطاء:');
    stats.errors.forEach((err, idx) => {
      console.log(`   ${idx + 1}. المركبة ${err.vehicle}: ${err.error}`);
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

