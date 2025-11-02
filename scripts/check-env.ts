/**
 * سكربت تشخيصي للتحقق من إعدادات البيئة
 */

import fs from 'fs';
import path from 'path';

// دالة تحميل متغيرات البيئة
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    console.log(`✅ تم العثور على ملف .env`);
    console.log(`📄 عدد الأسطر: ${lines.length}`);
    console.log('');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
          
          // طباعة المتغيرات (بدون إظهار القيم الكاملة لأسباب أمنية)
          const displayValue = value.length > 20 ? value.substring(0, 20) + '...' : value;
          console.log(`   ${key.trim()}: ${displayValue}`);
        }
      }
    }
  } else {
    console.error(`❌ ملف .env غير موجود في: ${envPath}`);
  }
}

loadEnvFile();

console.log('');
console.log('🔍 التحقق من المتغيرات المطلوبة:');
console.log('');

const requiredVars = {
  'VITE_SUPABASE_URL': process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'SUPABASE_SERVICE_KEY': process.env.SUPABASE_SERVICE_KEY
};

let allFound = true;

if (requiredVars['VITE_SUPABASE_URL']) {
  console.log('✅ VITE_SUPABASE_URL: موجود');
} else {
  console.log('❌ VITE_SUPABASE_URL: غير موجود');
  allFound = false;
}

if (requiredVars['SUPABASE_SERVICE_ROLE_KEY']) {
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY: موجود');
} else if (requiredVars['SUPABASE_SERVICE_KEY']) {
  console.log('✅ SUPABASE_SERVICE_KEY: موجود (بديل)');
} else {
  console.log('❌ SUPABASE_SERVICE_ROLE_KEY أو SUPABASE_SERVICE_KEY: غير موجود');
  allFound = false;
}

console.log('');

if (allFound) {
  console.log('✅ جميع المتغيرات المطلوبة موجودة!');
} else {
  console.log('❌ بعض المتغيرات المطلوبة غير موجودة!');
  console.log('');
  console.log('يرجى التأكد من إضافة المتغيرات التالية في ملف .env:');
  console.log('VITE_SUPABASE_URL=your_supabase_url');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_key');
}

