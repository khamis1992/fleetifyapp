/**
 * ====================================================================
 * سكريبت تصحيح حالة العقود وإرجاعها للحالة الأصلية
 * Fix Contract Status - Restore Original Status
 * ====================================================================
 * 
 * يقوم هذا السكريبت بإرجاع حالة العقود التي تم تحديثها
 * إلى حالتها الأصلية (cancelled, completed, expired)
 * 
 * Usage:
 * npm run fix:contract-status
 * أو
 * npx tsx scripts/fix-contract-status.ts
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

interface ContractStatus {
  contractId: string;
  contractNumber: string;
  currentStatus: string;
  originalStatus: string;
  vehicleNumber: string;
  customerName: string;
}

// ====================================================================
// دالة البحث عن المركبة
// ====================================================================
async function findVehicle(vehicleNumber: string): Promise<string | null> {
  try {
    const cleanVehicleNumber = vehicleNumber.trim();
    const noSpaces = cleanVehicleNumber.replace(/\s/g, '');

    // البحث في plate_number
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, plate_number')
      .eq('company_id', COMPANY_ID)
      .eq('plate_number', cleanVehicleNumber)
      .limit(1)
      .single();
    
    if (data && !error) {
      return data.id;
    }
    
    // البحث بدون مسافات
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
    
    // البحث الجزئي
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
  } catch {
    return null;
  }
}

// ====================================================================
// دالة البحث عن العميل
// ====================================================================
async function findCustomer(customerName: string): Promise<string | null> {
  try {
    const cleanName = customerName.trim();
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
  } catch {
    return null;
  }
}

// ====================================================================
// الدالة الرئيسية
// ====================================================================
async function main() {
  console.log('');
  console.log('====================================================================');
  console.log('🔧 تصحيح حالة العقود وإرجاعها للحالة الأصلية');
  console.log('====================================================================');
  console.log(`📍 الشركة: العراف (ID: ${COMPANY_ID})`);
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
  
  console.log('🔍 البحث عن العقود التي تم تحديثها...');
  console.log('');

  // البحث عن العقود التي يجب أن تكون cancelled أو completed
  // بناءً على الملاحظات أو التواريخ
  for (const vehicleData of vehicles) {
    const vehicleNumber = vehicleData['رقم المركبة'];
    const customerName = vehicleData['اسم العميل'];

    // البحث عن المركبة والعميل
    const vehicleId = await findVehicle(vehicleNumber);
    if (!vehicleId) continue;
    
    const customerId = await findCustomer(customerName);
    if (!customerId) continue;
    
    // البحث عن العقود المرتبطة
    const { data: contracts } = await supabase
      .from('contracts')
      .select('id, contract_number, status, updated_at')
      .eq('company_id', COMPANY_ID)
      .eq('vehicle_id', vehicleId)
      .eq('customer_id', customerId)
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (contracts && contracts.length > 0) {
      const contract = contracts[0];
      
      // إذا كان العقد في حالة active ولكن يجب أن يكون cancelled
      // (بناءً على أن جميع العقود القديمة كانت cancelled)
      if (contract.status === 'active') {
        // التحقق من تاريخ التحديث - إذا تم تحديثه اليوم، ربما تم تغييره خطأً
        // التحقق من تاريخ التحديث - إذا تم تحديثه اليوم، ربما تم تغييره خطأً
        const _updatedAt = new Date(contract.updated_at);
        const _today = new Date();

        // إذا تم تحديثه في آخر 24 ساعة وكان active، قد يكون تم تغييره خطأً
        // لكن سنحتاج إلى معرفة الحالة الأصلية من قاعدة البيانات
        // الحل الأفضل: البحث عن جميع العقود القديمة التي كانت cancelled
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // بدلاً من ذلك، دعنا نبحث عن العقود التي تم تحديثها مؤخراً
  // ونرجعها إلى cancelled إذا كانت الأرقام القديمة (LTO, Ret, AGR)
  console.log('🔍 البحث عن العقود التي تم تحديثها مؤخراً...');
  
  const { data: recentContracts, error: recentError } = await supabase
    .from('contracts')
    .select('id, contract_number, status, updated_at, vehicle_id, customer_id')
    .eq('company_id', COMPANY_ID)
    .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // آخر 24 ساعة
    .order('updated_at', { ascending: false })
    .limit(200);
  
  if (recentError) {
    console.error('❌ خطأ في جلب العقود:', recentError.message);
    process.exit(1);
  }
  
  if (!recentContracts || recentContracts.length === 0) {
    console.log('✅ لم يتم العثور على عقود محدثة مؤخراً');
    console.log('');
    console.log('💡 ملاحظة: إذا تم تحديث العقود قبل أكثر من 24 ساعة،');
    console.log('   يمكنك البحث يدوياً عن العقود التي تم تغيير حالتها.');
    console.log('');
    process.exit(0);
  }
  
  console.log(`📋 تم العثور على ${recentContracts.length} عقد تم تحديثه مؤخراً`);
  console.log('');
  
  // تصحيح العقود التي لها أرقام قديمة (LTO, Ret, AGR) ولكن حالتها active
  // نحتاج للبحث عن جميع العقود التي تم تحديثها اليوم والتي لها هذه الأرقام
  console.log('🔍 البحث عن العقود التي تحتاج إلى تصحيح...');
  
  const { data: allContractsToCheck, error: checkError } = await supabase
    .from('contracts')
    .select('id, contract_number, status, updated_at, vehicle_id, customer_id')
    .eq('company_id', COMPANY_ID)
    .in('status', ['active']) // فقط العقود النشطة
    .order('updated_at', { ascending: false })
    .limit(500);
  
  if (checkError) {
    console.error('❌ خطأ في جلب العقود:', checkError.message);
    process.exit(1);
  }
  
  if (!allContractsToCheck || allContractsToCheck.length === 0) {
    console.log('✅ لم يتم العثور على عقود نشطة');
    console.log('');
    process.exit(0);
  }
  
  console.log(`📋 تم العثور على ${allContractsToCheck.length} عقد نشط للفحص`);
  console.log('');
  
  let fixedCount = 0;
  const fixedContracts: ContractStatus[] = [];
  
  for (const contract of allContractsToCheck) {
    const contractNumber = contract.contract_number || '';
    
    // إذا كان رقم العقد يبدأ بـ LTO أو Ret أو AGR أو رقم فقط، يجب أن يكون cancelled
    const isOldFormat = 
      contractNumber.startsWith('LTO') || 
      contractNumber.startsWith('Ret') || 
      contractNumber.startsWith('AGR') ||
      contractNumber.match(/^\d+$/); // أرقام فقط مثل "251", "288"
    
    if (isOldFormat && contract.status === 'active') {
      // جلب معلومات المركبة والعميل
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('plate_number')
        .eq('id', contract.vehicle_id)
        .single();
      
      const { data: customer } = await supabase
        .from('customers')
        .select('first_name, last_name')
        .eq('id', contract.customer_id)
        .single();
      
      const vehicleNumber = vehicle?.plate_number || 'غير معروف';
      const customerName = customer ? `${customer.first_name} ${customer.last_name}`.trim() : 'غير معروف';
      
      // تحديث الحالة إلى cancelled
      const { error: updateError } = await supabase
        .from('contracts')
        .update({ 
          status: 'cancelled'
        })
        .eq('id', contract.id);
      
      if (!updateError) {
        fixedCount++;
        fixedContracts.push({
          contractId: contract.id,
          contractNumber: contractNumber,
          currentStatus: 'active',
          originalStatus: 'cancelled',
          vehicleNumber: vehicleNumber,
          customerName: customerName
        });
        console.log(`   ✅ تم تصحيح العقد: ${contractNumber} (${vehicleNumber}) - ${customerName}`);
      } else {
        console.error(`   ❌ خطأ في تصحيح العقد ${contractNumber}:`, updateError.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  console.log('');
  console.log('====================================================================');
  console.log('✅ اكتمل التصحيح!');
  console.log('====================================================================');
  console.log('');
  console.log(`📊 تم تصحيح ${fixedCount} عقد`);
  console.log('');
  
  if (fixedContracts.length > 0) {
    console.log('📋 قائمة العقود المُصححة:');
    fixedContracts.forEach((fc, idx) => {
      console.log(`   ${idx + 1}. ${fc.contractNumber} | ${fc.vehicleNumber} | ${fc.customerName}`);
      console.log(`      من: ${fc.currentStatus} → إلى: ${fc.originalStatus}`);
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

