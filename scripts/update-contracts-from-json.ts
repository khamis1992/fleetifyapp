/**
 * ====================================================================
 * سكريبت تحديث بيانات العقود من ملف JSON
 * Update Rental Contracts from JSON File
 * ====================================================================
 * 
 * يقوم هذا السكريبت بقراءة ملف JSON ويحدث بيانات العقود المرتبطة بالعملاء:
 * - تحديث تاريخ بداية العقد (start_date)
 * - تحديث قيمة القسط الشهري (monthly_rent)
 * - تحديث ملاحظات العقد (notes)
 * - تحديث تاريخ العقد (contract_date)
 * 
 * Usage:
 * npm run update-contracts
 * أو
 * npx tsx scripts/update-contracts-from-json.ts
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
const BATCH_SIZE = 10;

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

interface UpdateStats {
  totalRecords: number;
  vehiclesFound: number;
  vehiclesNotFound: number;
  customersFound: number;
  customersUpdated: number;
  customersNotFound: number;
  contractsFound: number;
  contractsUpdated: number;
  contractsCreated: number;
  contractsSkipped: number;
  errors: Array<{ vehicle: string; customer: string; error: string }>;
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
  } else if (cleaned.length === 7) {
    // أرقام من 7 أرقام - إضافة 974
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
    const noSpaces = cleanVehicleNumber.replace(/\s/g, '');
    
    // محاولة 1: البحث الدقيق في plate_number (الأكثر شيوعاً)
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
    
    // محاولة 2: البحث بدون مسافات
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
    
    // محاولة 3: البحث باستخدام ILIKE (case-insensitive) في plate_number
    const { data: data3, error: error3 } = await supabase
      .from('vehicles')
      .select('id, plate_number')
      .eq('company_id', COMPANY_ID)
      .ilike('plate_number', cleanVehicleNumber)
      .limit(5);
    
    if (data3 && data3.length === 1 && !error3) {
      return data3[0].id;
    }
    
    // محاولة 4: البحث الجزئي (يحتوي على الرقم)
    const { data: data4, error: error4 } = await supabase
      .from('vehicles')
      .select('id, plate_number')
      .eq('company_id', COMPANY_ID)
      .ilike('plate_number', `%${cleanVehicleNumber}%`)
      .limit(5);
    
    if (data4 && data4.length === 1 && !error4) {
      return data4[0].id;
    }
    
    // محاولة 5: البحث بدون مسافات (جزئي)
    if (noSpaces !== cleanVehicleNumber) {
      const { data: data5, error: error5 } = await supabase
        .from('vehicles')
        .select('id, plate_number')
        .eq('company_id', COMPANY_ID)
        .ilike('plate_number', `%${noSpaces}%`)
        .limit(5);
      
      if (data5 && data5.length === 1 && !error5) {
        return data5[0].id;
      }
    }
    
    // محاولة 6: البحث في جميع الأعمدة المحتملة (vehicle_number, license_plate, registration_number)
    const { data: data6, error: error6 } = await supabase
      .from('vehicles')
      .select('id, plate_number, registration_number')
      .eq('company_id', COMPANY_ID)
      .or(`plate_number.ilike.%${cleanVehicleNumber}%,registration_number.ilike.%${cleanVehicleNumber}%`)
      .limit(5);
    
    if (data6 && data6.length === 1 && !error6) {
      return data6[0].id;
    }
    
    return null;
  } catch (error) {
    console.error(`   ❌ خطأ في البحث عن المركبة ${vehicleNumber}:`, error);
    return null;
  }
}

// ====================================================================
// دالة البحث عن العميل وتحديث بياناته
// ====================================================================
async function findAndUpdateCustomer(
  customerName: string,
  phone: string
): Promise<{ id: string | null; updated: boolean }> {
  try {
    const cleanPhone = cleanPhoneNumber(phone);
    const cleanName = customerName.trim();
    
    // البحث أولاً برقم الجوال (الأكثر دقة)
    if (cleanPhone) {
      const { data: phoneMatch, error: phoneError } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone')
        .eq('company_id', COMPANY_ID)
        .eq('phone', cleanPhone)
        .limit(1)
        .single();
      
      if (phoneMatch && !phoneError) {
        return { id: phoneMatch.id, updated: false };
      }
    }
    
    // البحث بالاسم (الأولوية للاسم)
    const nameParts = cleanName.split(' ').filter(p => p.length > 0);
    if (nameParts.length > 0) {
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';
      
      let foundCustomer: any = null;
      
      if (lastName) {
        // البحث بالاسم الأول والأخير
        const { data: nameMatch, error: nameError } = await supabase
          .from('customers')
          .select('id, first_name, last_name, phone')
          .eq('company_id', COMPANY_ID)
          .ilike('first_name', `%${firstName}%`)
          .ilike('last_name', `%${lastName}%`)
          .limit(1)
          .single();
        
        if (nameMatch && !nameError) {
          foundCustomer = nameMatch;
        }
      }
      
      // إذا لم نجد، البحث بالاسم الأول فقط
      if (!foundCustomer) {
        const { data: firstNameMatch, error: firstNameError } = await supabase
          .from('customers')
          .select('id, first_name, last_name, phone')
          .eq('company_id', COMPANY_ID)
          .ilike('first_name', `%${firstName}%`)
          .limit(5);
        
        if (firstNameMatch && firstNameMatch.length === 1 && !firstNameError) {
          foundCustomer = firstNameMatch[0];
        }
      }
      
      // إذا لم نجد، البحث بالاسم الكامل
      if (!foundCustomer) {
        const { data: fullNameMatch, error: fullNameError } = await supabase
          .from('customers')
          .select('id, first_name, last_name, phone, company_name')
          .eq('company_id', COMPANY_ID)
          .or(`first_name.ilike.%${cleanName}%,last_name.ilike.%${cleanName}%,company_name.ilike.%${cleanName}%`)
          .limit(5);
        
        if (fullNameMatch && fullNameMatch.length === 1 && !fullNameError) {
          foundCustomer = fullNameMatch[0];
        }
      }
      
      // إذا وجدنا العميل، نحدث رقم الهاتف إذا كان مختلفاً
      if (foundCustomer && cleanPhone) {
        const currentPhone = foundCustomer.phone || '';
        const cleanedCurrentPhone = cleanPhoneNumber(currentPhone);
        
        if (cleanedCurrentPhone !== cleanPhone) {
          // تحديث رقم الهاتف
          const { error: updateError } = await supabase
            .from('customers')
            .update({ 
              phone: cleanPhone,
              updated_at: new Date().toISOString()
            })
            .eq('id', foundCustomer.id);
          
          if (!updateError) {
            console.log(`   📞 تم تحديث رقم الهاتف للعميل: ${customerName} (${currentPhone} → ${cleanPhone})`);
            return { id: foundCustomer.id, updated: true };
          }
        }
        
        return { id: foundCustomer.id, updated: false };
      }
    }
    
    return { id: null, updated: false };
  } catch (error) {
    console.error(`   ❌ خطأ في البحث عن العميل ${customerName}:`, error);
    return { id: null, updated: false };
  }
}

// ====================================================================
// دالة البحث عن العقد الموجود أو إنشاء عقد جديد
// ====================================================================
async function findOrCreateContract(
  vehicleId: string,
  customerId: string,
  contractData: VehicleData
): Promise<{ created: boolean; updated: boolean; skipped: boolean }> {
  try {
    const vehicleNumber = contractData['رقم المركبة'];
    const startDate = parseArabicDate(contractData['تاريخ بداية العقد']);
    const monthlyRent = parseFloat(contractData['قيمة القسط']) || 0;
    const notes = contractData['ملاحظات '] || '';
    
    if (!startDate) {
      console.log(`   ⚠️  تخطي المركبة ${vehicleNumber}: تاريخ بداية العقد غير صالح`);
      return { created: false, updated: false, skipped: true };
    }
    
    if (!monthlyRent || monthlyRent <= 0) {
      console.log(`   ⚠️  تخطي المركبة ${vehicleNumber}: قيمة القسط غير صالحة`);
      return { created: false, updated: false, skipped: true };
    }
    
    // حساب تاريخ النهاية (سنة واحدة)
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // البحث عن عقود موجودة مرتبطة بالعميل (حتى لو كانت بمركبة مختلفة)
    // أولاً: البحث عن عقود مرتبطة بالمركبة والعميل
    let { data: existingContracts, error: searchError } = await supabase
      .from('contracts')
      .select('id, start_date, monthly_amount, status, contract_number, vehicle_id')
      .eq('company_id', COMPANY_ID)
      .eq('vehicle_id', vehicleId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // إذا لم نجد، نبحث عن أي عقود للعميل (حتى بمركبة مختلفة)
    if ((!existingContracts || existingContracts.length === 0) && !searchError) {
      const { data: customerContracts, error: customerContractsError } = await supabase
        .from('contracts')
        .select('id, start_date, monthly_amount, status, contract_number, vehicle_id')
        .eq('company_id', COMPANY_ID)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!customerContractsError && customerContracts && customerContracts.length > 0) {
        existingContracts = customerContracts;
        console.log(`   📋 تم العثور على ${customerContracts.length} عقد للعميل بمركبات مختلفة`);
      }
    }
    
    if (searchError) {
      console.error(`   ⚠️  خطأ في البحث عن العقود: ${searchError.message}`);
      // لا نوقف العملية، نستمر في محاولة إنشاء عقد جديد
    }
    
    let contractToUpdate = null;
    
    if (existingContracts && existingContracts.length > 0) {
      // البحث عن عقد نشط أولاً
      contractToUpdate = existingContracts.find(c => c.status === 'active');
      
      // إذا لم يكن هناك عقد نشط، نأخذ الأحدث
      if (!contractToUpdate) {
        contractToUpdate = existingContracts[0];
      }
      
      if (contractToUpdate) {
        const currentVehicleId = contractToUpdate.vehicle_id;
        const vehicleChanged = currentVehicleId !== vehicleId;
        
        console.log(`   📋 تم العثور على عقد موجود: ${contractToUpdate.contract_number || contractToUpdate.id} (الحالة: ${contractToUpdate.status})`);
        if (vehicleChanged) {
          console.log(`   🔄 سيتم تحديث رقم المركبة في العقد`);
        }
      }
    }
    
    const contractPayload: any = {
      company_id: COMPANY_ID,
      vehicle_id: vehicleId,
      customer_id: customerId,
      contract_date: startDate,
      start_date: startDate,
      end_date: endDateStr,
      monthly_amount: monthlyRent,
      contract_amount: monthlyRent, // إجمالي قيمة العقد
      contract_type: 'rental',
      description: notes === '-' ? null : notes,
      terms: notes === '-' ? null : notes,
      updated_at: new Date().toISOString()
    };
    
    if (contractToUpdate) {
      // تحديث العقد الموجود
      // إذا كان العقد ملغى أو منتهي، نفعله نشطاً
      if (contractToUpdate.status === 'cancelled' || contractToUpdate.status === 'completed' || contractToUpdate.status === 'expired') {
        contractPayload.status = 'active';
      } else {
        contractPayload.status = contractToUpdate.status || 'active';
      }
      
      const { error: updateError } = await supabase
        .from('contracts')
        .update(contractPayload)
        .eq('id', contractToUpdate.id);
      
      if (updateError) {
        const errorDetails = updateError.message || updateError.toString();
        const errorCode = (updateError as any).code || 'N/A';
        const errorHint = (updateError as any).hint || '';
        
        console.error(`   ❌ خطأ في تحديث العقد للمركبة ${vehicleNumber}:`);
        console.error(`      الرسالة: ${errorDetails}`);
        console.error(`      الكود: ${errorCode}`);
        if (errorHint) {
          console.error(`      تلميح: ${errorHint}`);
        }
        
        const enhancedError = new Error(`${errorDetails} (Code: ${errorCode})${errorHint ? ` - ${errorHint}` : ''}`);
        throw enhancedError;
      }
      
      console.log(`   ♻️  تم تحديث العقد: ${contractToUpdate.contract_number || contractToUpdate.id}`);
      return { created: false, updated: true, skipped: false };
    } else {
      // إنشاء عقد جديد
      contractPayload.status = 'active';
      contractPayload.contract_number = `CNT-${vehicleNumber}-${new Date(startDate).getFullYear()}`;
      
      const { data: newContract, error: insertError } = await supabase
        .from('contracts')
        .insert(contractPayload)
        .select('id, contract_number')
        .single();
      
      if (insertError) {
        const errorDetails = insertError.message || insertError.toString();
        const errorCode = (insertError as any).code || 'N/A';
        const errorHint = (insertError as any).hint || '';
        
        console.error(`   ❌ خطأ في إنشاء العقد للمركبة ${vehicleNumber}:`);
        console.error(`      الرسالة: ${errorDetails}`);
        console.error(`      الكود: ${errorCode}`);
        if (errorHint) {
          console.error(`      تلميح: ${errorHint}`);
        }
        
        const enhancedError = new Error(`${errorDetails} (Code: ${errorCode})${errorHint ? ` - ${errorHint}` : ''}`);
        throw enhancedError;
      }
      
      console.log(`   ✨ تم إنشاء عقد جديد: ${newContract.contract_number}`);
      return { created: true, updated: false, skipped: false };
    }
  } catch (error) {
    console.error(`   ❌ خطأ في معالجة العقد:`, error);
    throw error;
  }
}

// ====================================================================
// الدالة الرئيسية
// ====================================================================
async function main() {
  console.log('');
  console.log('====================================================================');
  console.log('🚀 بدء تحديث بيانات العقود من ملف JSON');
  console.log('====================================================================');
  console.log(`📍 الشركة: العراف (ID: ${COMPANY_ID})`);
  console.log(`📂 الملف: ${JSON_FILE_PATH}`);
  console.log('');
  
  // التحقق من وجود الملف
  if (!fs.existsSync(JSON_FILE_PATH)) {
    console.error(`❌ خطأ: الملف غير موجود في المسار: ${JSON_FILE_PATH}`);
    process.exit(1);
  }
  
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
  
  // التحقق من وجود جدول contracts
  console.log('🔍 التحقق من وجود جدول contracts...');
  const { data: tableCheck, error: tableError } = await supabase
    .from('contracts')
    .select('id')
    .limit(1);
  
  if (tableError) {
    console.error(`❌ خطأ في الوصول إلى جدول contracts: ${tableError.message}`);
    console.error(`   الكود: ${(tableError as any).code || 'N/A'}`);
    console.error('');
    console.error('⚠️  قد يكون الجدول غير موجود أو لا توجد صلاحيات للوصول إليه.');
    console.error('   يرجى التحقق من:');
    console.error('   1. وجود جدول contracts في قاعدة البيانات');
    console.error('   2. صلاحيات SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  console.log('✅ جدول contracts موجود ويمكن الوصول إليه');
  console.log('');
  
  // التشخيص: طباعة بعض الأمثلة من المركبات الموجودة في قاعدة البيانات
  console.log('🔍 التشخيص: جلب أمثلة من المركبات الموجودة في قاعدة البيانات...');
  const { data: sampleVehicles, error: sampleError } = await supabase
    .from('vehicles')
    .select('id, plate_number, registration_number')
    .eq('company_id', COMPANY_ID)
    .limit(10);
  
  if (!sampleError && sampleVehicles && sampleVehicles.length > 0) {
    console.log(`   ✅ تم العثور على ${sampleVehicles.length} مركبة كأمثلة:`);
    sampleVehicles.forEach((v, idx) => {
      console.log(`   ${idx + 1}. plate_number: "${v.plate_number}" | registration_number: "${v.registration_number || 'N/A'}"`);
    });
  } else {
    console.log(`   ⚠️  لم يتم العثور على مركبات في قاعدة البيانات لشركة العراف`);
    if (sampleError) {
      console.log(`   ❌ خطأ: ${sampleError.message}`);
    }
  }
  console.log('');
  
  // طباعة بعض الأمثلة من أرقام المركبات في ملف JSON
  console.log('📋 أمثلة من أرقام المركبات في ملف JSON:');
  vehicles.slice(0, 10).forEach((v, idx) => {
    console.log(`   ${idx + 1}. "${v['رقم المركبة']}"`);
  });
  console.log('');
  
  // إحصائيات العملية
  const stats: UpdateStats = {
    totalRecords: vehicles.length,
    vehiclesFound: 0,
    vehiclesNotFound: 0,
    customersFound: 0,
    customersUpdated: 0,
    customersNotFound: 0,
    contractsFound: 0,
    contractsUpdated: 0,
    contractsCreated: 0,
    contractsSkipped: 0,
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
      const customerName = vehicleData['اسم العميل'];
      console.log(`\n   🚗 المركبة: ${vehicleNumber} | العميل: ${customerName}`);
      
      try {
        // البحث عن المركبة
        const vehicleId = await findVehicle(vehicleNumber);
        if (!vehicleId) {
          // محاولة إيجاد مركبات مشابهة للتشخيص
          const { data: similarVehicles } = await supabase
            .from('vehicles')
            .select('plate_number, registration_number')
            .eq('company_id', COMPANY_ID)
            .ilike('plate_number', `%${vehicleNumber.replace(/\s/g, '').slice(-4)}%`)
            .limit(3);
          
          if (similarVehicles && similarVehicles.length > 0) {
            console.log(`   ⚠️  المركبة ${vehicleNumber} غير موجودة. مركبات مشابهة: ${similarVehicles.map(v => v.plate_number).join(', ')}`);
          } else {
            console.log(`   ⚠️  المركبة ${vehicleNumber} غير موجودة في قاعدة البيانات`);
          }
          
          stats.vehiclesNotFound++;
          stats.errors.push({
            vehicle: vehicleNumber,
            customer: customerName,
            error: 'المركبة غير موجودة في قاعدة البيانات'
          });
          continue;
        }
        stats.vehiclesFound++;
        
        // البحث عن العميل وتحديث بياناته
        const phone = vehicleData['رقم الجوال'];
        const customerResult = await findAndUpdateCustomer(customerName, phone);
        if (!customerResult.id) {
          console.log(`   ⚠️  العميل ${customerName} غير موجود في قاعدة البيانات`);
          stats.customersNotFound++;
          stats.errors.push({
            vehicle: vehicleNumber,
            customer: customerName,
            error: `العميل غير موجود في قاعدة البيانات (الهاتف: ${phone})`
          });
          continue;
        }
        stats.customersFound++;
        if (customerResult.updated) {
          stats.customersUpdated++;
        }
        
        const customerId = customerResult.id;
        
        // البحث عن العقد أو إنشاؤه
        const result = await findOrCreateContract(vehicleId, customerId, vehicleData);
        
        if (result.created) {
          stats.contractsCreated++;
        } else if (result.updated) {
          stats.contractsUpdated++;
          stats.contractsFound++;
        } else if (result.skipped) {
          stats.contractsSkipped++;
        }
        
        // تأخير صغير لتجنب الحد من معدل الطلبات
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        let errorMessage = 'خطأ غير معروف';
        
        if (error instanceof Error) {
          errorMessage = error.message || error.toString();
          // إذا كان الخطأ من Supabase، أضف تفاصيل إضافية
          if ('code' in error && 'message' in error) {
            errorMessage = `${error.message} (Code: ${(error as any).code || 'N/A'})`;
          }
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object') {
          errorMessage = JSON.stringify(error);
        }
        
        console.error(`   ❌ خطأ في معالجة المركبة ${vehicleNumber}:`, errorMessage);
        if (error instanceof Error && error.stack) {
          console.error(`   📍 Stack trace:`, error.stack.split('\n').slice(0, 3).join('\n'));
        }
        
        stats.errors.push({
          vehicle: vehicleNumber,
          customer: customerName,
          error: errorMessage
        });
      }
    }
    
    console.log('');
  }
  
  // طباعة النتائج
  console.log('');
  console.log('====================================================================');
  console.log('✅ اكتملت عملية التحديث!');
  console.log('====================================================================');
  console.log('');
  console.log('📊 الإحصائيات:');
  console.log(`   • إجمالي السجلات: ${stats.totalRecords}`);
  console.log(`   • المركبات الموجودة: ${stats.vehiclesFound}`);
  console.log(`   • المركبات غير الموجودة: ${stats.vehiclesNotFound}`);
  console.log(`   • العملاء الموجودون: ${stats.customersFound}`);
  console.log(`   • العملاء المحدثون: ${stats.customersUpdated}`);
  console.log(`   • العملاء غير الموجودين: ${stats.customersNotFound}`);
  console.log(`   • العقود المحدثة: ${stats.contractsUpdated}`);
  console.log(`   • العقود المُنشأة: ${stats.contractsCreated}`);
  console.log(`   • العقود المتخطاة: ${stats.contractsSkipped}`);
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

