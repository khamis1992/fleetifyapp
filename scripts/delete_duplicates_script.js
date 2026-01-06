// سكريبت لحذف العملاء المتكررين في شركة العراف
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qwhunliohlkkahbspfiu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTMwODYsImV4cCI6MjA2ODk4OTA4Nn0.vDZxVVqfQqnqrDo5Uw-Ew7RL6Ks8mVjCnXLXOWRxFms';

const supabase = createClient(supabaseUrl, supabaseKey);

const COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4'; // شركة العراف

// الحصول على قائمة العملاء المتكررين للحذف
const duplicateCustomerIds = [
  'abc4266f-7130-42b4-8435-bdf2af914c5f',
  'b2c11c9c-41f5-4e3a-9a10-7f2cb7c13365',
  '7bf12557-685f-4add-a2fe-1c2e1d029c22',
  'f8eb6e24-f81e-4c0e-8f5c-98b30240d8be',
  '81e660b3-e4cc-40f0-bba5-690f47c7f393',
  'ad9e6556-12a1-4430-8505-681ceb31db52',
  '372b6a12-3a1d-4b64-bc3f-0614ce6cb10d',
  'f4fd7fee-5777-4f11-92df-fc435828245d',
  'dd02d5d4-fabc-43d3-9709-1d028da320e7',
  '4fd5dba3-f1fd-456c-85e0-b0c41df5d674',
  '8499e9ee-8c2b-4fda-aba5-0defb6f1da15',
  '4cf9156b-1bc4-41dd-a4cd-d19d32ab710e',
  '9a87c798-51b6-4e51-a750-641193c0cc7d',
  '3499faf9-44d4-486c-a5f9-3945fae7f01b',
  '3fb5c32a-3a2a-47b5-8777-76cb4d25f335',
  '63a59315-668c-4d39-9400-20af7bac1488',
  'd5db2b01-d000-4c36-9de1-ac099512cbfe',
  '1f6449d9-7fbf-4b4b-b8fd-e41c14a27f87',
  'c8a49e2d-c571-4c0f-ae49-3287383ccff4',
  'b81758aa-612d-462d-9ee3-53a05b2fcfc7'
];

async function deleteDuplicateCustomers() {
  console.log('🚀 بدء حذف العملاء المتكررين في شركة العراف...');
  
  let deletedCount = 0;
  let errors = [];
  
  for (const customerId of duplicateCustomerIds) {
    try {
      const { data, error } = await supabase.rpc('enhanced_delete_customer_and_relations', {
        target_customer_id: customerId,
        target_company_id: COMPANY_ID
      });
      
      if (error) {
        console.error(`❌ خطأ في حذف العميل ${customerId}:`, error);
        errors.push({ customerId, error: error.message });
      } else if (data?.success) {
        console.log(`✅ تم حذف العميل ${customerId} بنجاح`);
        deletedCount++;
      } else {
        console.error(`❌ فشل حذف العميل ${customerId}:`, data?.error);
        errors.push({ customerId, error: data?.error });
      }
      
      // انتظار قصير بين العمليات
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err) {
      console.error(`💥 خطأ غير متوقع في حذف العميل ${customerId}:`, err);
      errors.push({ customerId, error: err.message });
    }
  }
  
  console.log('\n📊 نتائج عملية الحذف:');
  console.log(`✅ تم حذف ${deletedCount} عميل بنجاح`);
  console.log(`❌ فشل في حذف ${errors.length} عميل`);
  
  if (errors.length > 0) {
    console.log('\n💥 الأخطاء:');
    errors.forEach(err => {
      console.log(`- ${err.customerId}: ${err.error}`);
    });
  }
  
  console.log('\n🏁 انتهت عملية الحذف');
}

// تشغيل السكريبت
deleteDuplicateCustomers().catch(console.error);