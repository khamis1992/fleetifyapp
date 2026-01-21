#!/usr/bin/env node

/**
 * سكريبت للتحقق من الاتصال بـ Supabase والتحقق من وجود البيانات
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ خطأ: VITE_SUPABASE_URL أو VITE_SUPABASE_ANON_KEY غير موجود في .env');
  process.exit(1);
}

console.log('🔍 التحقق من الاتصال بـ Supabase...');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Key: ${supabaseKey.substring(0, 20)}...\n`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyConnection() {
  try {
    // 1. التحقق من الاتصال الأساسي
    console.log('1️⃣ التحقق من الاتصال الأساسي...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('customers')
      .select('id', { count: 'exact', head: true });

    if (healthError) {
      console.error('❌ خطأ في الاتصال:', healthError.message);
      console.error('   Code:', healthError.code);
      console.error('   Details:', healthError.details);
      return;
    }

    console.log('✅ الاتصال يعمل بشكل صحيح\n');

    // 2. عدد العملاء
    console.log('2️⃣ عدد العملاء في قاعدة البيانات...');
    const { count: customerCount, error: customerError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    if (customerError) {
      console.error('❌ خطأ:', customerError.message);
    } else {
      console.log(`   👥 عدد العملاء: ${customerCount || 0}\n`);
    }

    // 3. عدد المستندات (جميع الأنواع)
    console.log('3️⃣ عدد المستندات في customer_documents (جميع الأنواع)...');
    const { count: allDocsCount, error: allDocsError } = await supabase
      .from('customer_documents')
      .select('*', { count: 'exact', head: true });

    if (allDocsError) {
      console.error('❌ خطأ:', allDocsError.message);
    } else {
      console.log(`   📄 إجمالي المستندات: ${allDocsCount || 0}\n`);
    }

    // 4. أنواع المستندات
    if (allDocsCount > 0) {
      console.log('4️⃣ أنواع المستندات الموجودة...');
      const { data: docTypes, error: typesError } = await supabase
        .from('customer_documents')
        .select('document_type')
        .limit(1000);

      if (!typesError && docTypes) {
        const typeCounts = {};
        docTypes.forEach(doc => {
          typeCounts[doc.document_type] = (typeCounts[doc.document_type] || 0) + 1;
        });
        Object.entries(typeCounts).forEach(([type, count]) => {
          console.log(`   • ${type}: ${count}`);
        });
        console.log('');
      }
    }

    // 5. عدد العقود
    console.log('5️⃣ عدد العقود...');
    const { count: contractCount, error: contractError } = await supabase
      .from('rental_contracts')
      .select('*', { count: 'exact', head: true });

    if (contractError) {
      console.error('❌ خطأ:', contractError.message);
    } else {
      console.log(`   📋 عدد العقود: ${contractCount || 0}\n`);
    }

    // 6. عدد المركبات
    console.log('6️⃣ عدد المركبات...');
    const { count: vehicleCount, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true });

    if (vehicleError) {
      console.error('❌ خطأ:', vehicleError.message);
    } else {
      console.log(`   🚗 عدد المركبات: ${vehicleCount || 0}\n`);
    }

    // 7. التحقق من Storage Buckets
    console.log('7️⃣ التحقق من Storage Buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ خطأ في جلب الـ buckets:', bucketsError.message);
    } else if (buckets) {
      console.log(`   📦 عدد الـ buckets: ${buckets.length}`);
      if (buckets.length > 0) {
        buckets.forEach(bucket => {
          console.log(`   • ${bucket.name} (public: ${bucket.public})`);
        });
      } else {
        console.log('   ⚠️ لا توجد buckets في Storage');
      }
      console.log('');
    }

    // 8. محاولة الوصول إلى bucket 'documents' إذا كان موجوداً
    if (buckets && buckets.length > 0) {
      const documentsBucket = buckets.find(b => b.name === 'documents');
      if (documentsBucket) {
        console.log('8️⃣ محاولة الوصول إلى ملفات في bucket "documents"...');
        try {
          const { data: files, error: filesError } = await supabase.storage
            .from('documents')
            .list('', { limit: 10 });

          if (filesError) {
            console.error('   ❌ خطأ:', filesError.message);
          } else if (files) {
            console.log(`   📁 عدد الملفات/المجلدات: ${files.length}`);
            files.slice(0, 5).forEach(file => {
              console.log(`      • ${file.name} (${file.id ? 'file' : 'folder'})`);
            });
          }
          console.log('');
        } catch (err) {
          console.log('   ⚠️ لا يمكن الوصول إلى الملفات:', err.message);
          console.log('');
        }
      }
    }

    // 9. ملخص
    console.log('='.repeat(80));
    console.log('📊 الملخص:');
    console.log(`   • العملاء: ${customerCount || 0}`);
    console.log(`   • المستندات: ${allDocsCount || 0}`);
    console.log(`   • العقود: ${contractCount || 0}`);
    console.log(`   • المركبات: ${vehicleCount || 0}`);
    console.log(`   • Storage Buckets: ${buckets?.length || 0}`);
    console.log('='.repeat(80));

    if (allDocsCount === 0) {
      console.log('\n⚠️ تحذير: لا توجد مستندات في قاعدة البيانات');
      console.log('   قد يكون السبب:');
      console.log('   1. الملفات لم تُرفع بنجاح');
      console.log('   2. RLS policies تمنع الوصول');
      console.log('   3. الاتصال بقاعدة بيانات خاطئة');
    }

  } catch (error) {
    console.error('❌ خطأ عام:', error);
    process.exit(1);
  }
}

verifyConnection();
