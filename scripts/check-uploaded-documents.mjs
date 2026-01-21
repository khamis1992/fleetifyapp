#!/usr/bin/env node

/**
 * سكريبت للتحقق من الملفات المرفوعة (130 ملف بطاقة شخصية)
 * والتحقق من ربطها بالعملاء والعقود والمركبات
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUploadedDocuments() {
  console.log('🔍 بدء فحص الملفات المرفوعة...\n');

  try {
    // 1. عدد جميع المستندات في customer_documents
    const { count: totalCount, error: totalError } = await supabase
      .from('customer_documents')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('❌ خطأ في جلب العدد:', totalError);
    } else {
      console.log(`📊 إجمالي المستندات في customer_documents: ${totalCount || 0}\n`);
    }

    // 2. أنواع المستندات المختلفة
    const { data: docTypes, error: typesError } = await supabase
      .from('customer_documents')
      .select('document_type')
      .limit(1000);

    if (!typesError && docTypes) {
      const typeCounts = {};
      docTypes.forEach(doc => {
        typeCounts[doc.document_type] = (typeCounts[doc.document_type] || 0) + 1;
      });
      console.log('📋 أنواع المستندات الموجودة:');
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`   • ${type}: ${count}`);
      });
      console.log('');
    }

    // 3. عدد المستندات من نوع national_id
    const { count: nationalIdCount, error: countError } = await supabase
      .from('customer_documents')
      .select('*', { count: 'exact', head: true })
      .eq('document_type', 'national_id');

    if (countError) {
      console.error('❌ خطأ في جلب العدد:', countError);
    } else {
      console.log(`📊 إجمالي المستندات من نوع national_id: ${nationalIdCount || 0}\n`);
    }

    // 4. جلب جميع المستندات مع معلومات العملاء
    const { data: documents, error: docsError } = await supabase
      .from('customer_documents')
      .select(`
        id,
        customer_id,
        document_name,
        file_path,
        file_size,
        mime_type,
        created_at,
        company_id,
        customers (
          id,
          first_name,
          last_name,
          customer_code,
          phone,
          national_id
        )
      `)
      .eq('document_type', 'national_id')
      .order('created_at', { ascending: false })
      .limit(130);

    if (docsError) {
      console.error('❌ خطأ في جلب المستندات:', docsError);
      return;
    }

    console.log(`✅ تم جلب ${documents?.length || 0} مستند\n`);

    // 5. إحصائيات
    const uniqueCustomers = new Set(documents?.map(d => d.customer_id) || []);
    console.log(`👥 عدد العملاء المختلفين: ${uniqueCustomers.size}\n`);

    // 6. جلب العقود المرتبطة بهؤلاء العملاء
    const customerIds = Array.from(uniqueCustomers);
    const { data: contracts, error: contractsError } = await supabase
      .from('rental_contracts')
      .select(`
        id,
        contract_number,
        customer_id,
        vehicle_id,
        vehicles (
          id,
          plate_number,
          make,
          model,
          year
        )
      `)
      .in('customer_id', customerIds);

    if (contractsError) {
      console.error('❌ خطأ في جلب العقود:', contractsError);
    } else {
      console.log(`📄 عدد العقود المرتبطة: ${contracts?.length || 0}\n`);
    }

    // 7. جلب المركبات المرتبطة
    const vehicleIds = contracts?.map(c => c.vehicle_id).filter(Boolean) || [];
    const uniqueVehicleIds = [...new Set(vehicleIds)];
    
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, plate_number, make, model, year')
      .in('id', uniqueVehicleIds);

    if (vehiclesError) {
      console.error('❌ خطأ في جلب المركبات:', vehiclesError);
    } else {
      console.log(`🚗 عدد المركبات المرتبطة: ${vehicles?.length || 0}\n`);
    }

    // 8. عرض تفاصيل كل عميل مع مستنداته وعقوده ومركباته
    console.log('\n📋 تفاصيل العملاء والمستندات والعقود والمركبات:\n');
    console.log('='.repeat(100));

    const customerMap = new Map();
    
    // تجميع البيانات حسب العميل
    documents?.forEach(doc => {
      const customerId = doc.customer_id;
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customer: doc.customers,
          documents: [],
          contracts: [],
          vehicles: new Set()
        });
      }
      customerMap.get(customerId).documents.push(doc);
    });

    // إضافة العقود والمركبات
    contracts?.forEach(contract => {
      const customerId = contract.customer_id;
      if (customerMap.has(customerId)) {
        customerMap.get(customerId).contracts.push(contract);
        if (contract.vehicles) {
          customerMap.get(customerId).vehicles.add(contract.vehicles);
        }
      }
    });

    // عرض النتائج
    let index = 1;
    for (const [customerId, data] of customerMap.entries()) {
      const customer = data.customer;
      const customerName = customer 
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.customer_code || 'غير معروف'
        : 'غير معروف';
      
      console.log(`\n${index}. العميل: ${customerName} (${customer?.customer_code || 'N/A'})`);
      console.log(`   📱 الهاتف: ${customer?.phone || 'N/A'}`);
      console.log(`   🆔 الهوية: ${customer?.national_id || 'N/A'}`);
      console.log(`   📄 عدد المستندات: ${data.documents.length}`);
      console.log(`   📋 عدد العقود: ${data.contracts.length}`);
      console.log(`   🚗 عدد المركبات: ${data.vehicles.size}`);
      
      if (data.contracts.length > 0) {
        console.log(`   📋 أرقام العقود: ${data.contracts.map(c => c.contract_number).join(', ')}`);
      }
      
      if (data.vehicles.size > 0) {
        const vehiclePlates = Array.from(data.vehicles).map(v => v?.plate_number).filter(Boolean);
        console.log(`   🚗 لوحات المركبات: ${vehiclePlates.join(', ')}`);
      }

      // عرض تفاصيل المستندات
      if (data.documents.length > 0) {
        console.log(`   📎 المستندات:`);
        data.documents.forEach((doc, idx) => {
          console.log(`      ${idx + 1}. ${doc.document_name} (${(doc.file_size / 1024).toFixed(2)} KB) - ${doc.file_path}`);
        });
      }
      
      index++;
    }

    // 9. ملخص نهائي
    console.log('\n' + '='.repeat(100));
    console.log('\n📊 الملخص النهائي:');
    console.log(`   • إجمالي المستندات: ${documents?.length || 0}`);
    console.log(`   • عدد العملاء المختلفين: ${uniqueCustomers.size}`);
    console.log(`   • عدد العقود المرتبطة: ${contracts?.length || 0}`);
    console.log(`   • عدد المركبات المرتبطة: ${vehicles?.length || 0}`);
    
    // 10. التحقق من bucket
    console.log('\n📦 معلومات الـ Storage Buckets:');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ خطأ في جلب الـ buckets:', bucketsError);
    } else if (buckets) {
      console.log(`   • إجمالي الـ buckets: ${buckets.length}`);
      buckets.forEach(bucket => {
        console.log(`   • ${bucket.name}: ✅ موجود (public: ${bucket.public})`);
      });
      
      const documentsBucket = buckets.find(b => b.name === 'documents');
      const contractDocumentsBucket = buckets.find(b => b.name === 'contract-documents');
      
      if (documentsBucket) {
        // محاولة جلب بعض الملفات من bucket
        try {
          const { data: files, error: filesError } = await supabase.storage
            .from('documents')
            .list('', { limit: 10, sortBy: { column: 'created_at', order: 'desc' } });
          
          if (!filesError && files) {
            console.log(`\n   📁 الملفات في bucket 'documents': ${files.length} ملف (عينة)`);
            files.slice(0, 5).forEach(file => {
              console.log(`      • ${file.name} (${(file.metadata?.size / 1024).toFixed(2)} KB)`);
            });
          }
        } catch (err) {
          console.log(`   ⚠️ لا يمكن الوصول إلى ملفات bucket 'documents'`);
        }
      }
    }

    console.log('\n✅ اكتمل الفحص!\n');

  } catch (error) {
    console.error('❌ خطأ عام:', error);
    process.exit(1);
  }
}

// تشغيل الفحص
checkUploadedDocuments();
