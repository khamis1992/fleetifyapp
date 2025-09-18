import { supabase } from '@/integrations/supabase/client';

export interface CustomerSearchResult {
  id: string;
  found: boolean;
  method: 'uuid' | 'national_id' | 'customer_code' | 'name' | 'phone' | 'created';
  confidence: number;
}

export interface CustomerSearchData {
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_id_number?: string;
  national_id?: string;
  customer_code?: string;
}

// فحص ما إذا كان النص UUID صحيح
const isValidUUID = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// فحص ما إذا كان النص رقم هوية وطنية
const isValidNationalId = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  // رقم الهوية الوطنية عادة يكون 10-15 رقم
  return /^\d{10,15}$/.test(str.trim());
};

// فحص ما إذا كان النص رقم هاتف
const isValidPhone = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  
  // تنظيف الرقم من المسافات والشرطات والأقواس
  const cleaned = str.replace(/[\s\-\(\)]/g, '');
  
  // أرقام الهواتف الخليجية - دعم جميع دول الخليج
  const gccPatterns = [
    // قطر: +974 أو 974 (8 أرقام)
    /^(\+?974)[0-9]{8}$/,
    // الكويت: +965 أو 965 (8 أرقام) أو محلي مع 0  
    /^(\+?965|0)?[2-9]\d{7}$/,
    // السعودية: +966 أو 966 (9 أرقام) أو محلي مع 0
    /^(\+?966|0)?5[0-9]{8}$/,
    // الإمارات: +971 أو 971 (9 أرقام) أو محلي مع 0
    /^(\+?971|0)?5[0-9]{8}$/,
    // عُمان: +968 أو 968 (8 أرقام)
    /^(\+?968)[0-9]{8}$/,
    // البحرين: +973 أو 973 (8 أرقام)
    /^(\+?973)[0-9]{8}$/,
    // أرقام محلية بدون مقدمة دولية (7-9 أرقام) - سيتم افتراض قطر
    /^[0-9]{7,9}$/,
    // دعم أرقام قطرية بدون +
    /^974[0-9]{8}$/
  ];
  
  return gccPatterns.some(pattern => pattern.test(cleaned));
};

// البحث المحسن عن العملاء
export const findCustomerEnhanced = async (
  searchData: CustomerSearchData, 
  companyId: string
): Promise<CustomerSearchResult> => {
  console.log('🔍 Enhanced Customer Search: Starting search with data:', searchData);
  
  try {
    // المرحلة 1: البحث بـ UUID إذا كان صحيحاً
    if (searchData.customer_id && isValidUUID(searchData.customer_id)) {
      console.log('🔍 Searching by UUID:', searchData.customer_id);
      
      const { data: uuidCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('id', searchData.customer_id)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single();
      
      if (uuidCustomer) {
        return {
          id: uuidCustomer.id,
          found: true,
          method: 'uuid',
          confidence: 1.0
        };
      }
    }
    
    // المرحلة 2: البحث بالرقم الوطني
    const nationalId = searchData.customer_id_number || searchData.national_id || searchData.customer_id;
    if (nationalId && isValidNationalId(nationalId)) {
      console.log('🔍 Searching by National ID:', nationalId);
      
      const { data: nationalIdCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', companyId)
        .eq('national_id', nationalId)
        .eq('is_active', true)
        .single();
      
      if (nationalIdCustomer) {
        return {
          id: nationalIdCustomer.id,
          found: true,
          method: 'national_id',
          confidence: 0.95
        };
      }
    }
    
    // المرحلة 3: البحث بكود العميل
    if (searchData.customer_code || (searchData.customer_id && !isValidUUID(searchData.customer_id))) {
      const customerCode = searchData.customer_code || searchData.customer_id;
      console.log('🔍 Searching by Customer Code:', customerCode);
      
      const { data: codeCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', companyId)
        .eq('customer_code', customerCode)
        .eq('is_active', true)
        .single();
      
      if (codeCustomer) {
        return {
          id: codeCustomer.id,
          found: true,
          method: 'customer_code',
          confidence: 0.9
        };
      }
    }
    
    // المرحلة 4: البحث بالهاتف
    if (searchData.customer_phone && isValidPhone(searchData.customer_phone)) {
      console.log('🔍 Searching by Phone:', searchData.customer_phone);
      
      const cleanPhone = searchData.customer_phone.replace(/\s|-/g, '');
      const { data: phoneCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', companyId)
        .eq('phone', cleanPhone)
        .eq('is_active', true)
        .single();
      
      if (phoneCustomer) {
        return {
          id: phoneCustomer.id,
          found: true,
          method: 'phone',
          confidence: 0.85
        };
      }
    }
    
    // المرحلة 5: البحث بالاسم (أقل دقة)
    if (searchData.customer_name) {
      console.log('🔍 Searching by Name:', searchData.customer_name);
      
      const cleanName = searchData.customer_name.trim();
      const { data: nameCustomers } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, company_name_ar')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .or(`first_name.ilike.%${cleanName}%,last_name.ilike.%${cleanName}%,company_name.ilike.%${cleanName}%,company_name_ar.ilike.%${cleanName}%`)
        .limit(5);
      
      if (nameCustomers && nameCustomers.length > 0) {
        // البحث عن مطابقة دقيقة أولاً
        const exactMatch = nameCustomers.find(customer => {
          const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
          const companyName = customer.company_name || customer.company_name_ar || '';
          return fullName.toLowerCase() === cleanName.toLowerCase() || 
                 companyName.toLowerCase() === cleanName.toLowerCase();
        });
        
        if (exactMatch) {
          return {
            id: exactMatch.id,
            found: true,
            method: 'name',
            confidence: 0.8
          };
        }
        
        // إذا لم توجد مطابقة دقيقة، استخدم الأول
        return {
          id: nameCustomers[0].id,
          found: true,
          method: 'name',
          confidence: 0.6
        };
      }
    }
    
    // لم يتم العثور على عميل
    return {
      id: '',
      found: false,
      method: 'created',
      confidence: 0.0
    };
    
  } catch (error) {
    console.error('🔍 Enhanced Customer Search Error:', error);
    return {
      id: '',
      found: false,
      method: 'created',
      confidence: 0.0
    };
  }
};

// إنشاء عميل جديد محسن
export const createCustomerEnhanced = async (
  customerData: CustomerSearchData,
  companyId: string
): Promise<{ id: string; created: boolean; errors: string[] }> => {
  const errors: string[] = [];
  
  try {
    console.log('🆕 Creating new customer with data:', customerData);
    
    // التحقق من البيانات الأساسية
    if (!customerData.customer_name || customerData.customer_name.trim() === '') {
      errors.push('اسم العميل مطلوب');
      return { id: '', created: false, errors };
    }
    
    const cleanName = customerData.customer_name.trim();
    
    // تحديد نوع العميل
    const isCompany = cleanName.includes('شركة') || cleanName.includes('مؤسسة') || 
                     cleanName.includes('Company') || cleanName.includes('Corp') ||
                     cleanName.includes('LLC') || cleanName.includes('Ltd');
    
    // إعداد بيانات العميل الجديد
    let newCustomerData: any = {
      company_id: companyId,
      customer_type: isCompany ? 'corporate' : 'individual',
      is_active: true,
      created_via: 'smart_upload',
      notes: 'تم إنشاؤه تلقائياً من النظام الموحد للاستيراد الذكي'
    };
    
    // معالجة الاسم
    if (isCompany) {
      newCustomerData.company_name = cleanName;
      newCustomerData.company_name_ar = cleanName;
    } else {
      const nameParts = cleanName.split(' ').filter(part => part.trim() !== '');
      newCustomerData.first_name = nameParts[0] || cleanName;
      newCustomerData.last_name = nameParts.slice(1).join(' ') || '';
      newCustomerData.first_name_ar = nameParts[0] || cleanName;
      newCustomerData.last_name_ar = nameParts.slice(1).join(' ') || '';
    }
    
    // معالجة الهاتف
    if (customerData.customer_phone) {
      const cleanPhone = customerData.customer_phone.replace(/\s|-/g, '');
      if (isValidPhone(cleanPhone)) {
        newCustomerData.phone = cleanPhone;
      } else {
        errors.push(`رقم الهاتف غير صحيح: ${customerData.customer_phone} - يجب أن يكون رقم هاتف خليجي صالح مثل +97433211272`);
        newCustomerData.phone = 'غير محدد';
      }
    } else {
      newCustomerData.phone = 'غير محدد';
    }
    
    // معالجة الإيميل
    if (customerData.customer_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(customerData.customer_email)) {
        newCustomerData.email = customerData.customer_email;
      } else {
        errors.push(`الإيميل غير صحيح: ${customerData.customer_email}`);
      }
    }
    
    // معالجة الرقم الوطني
    const nationalId = customerData.customer_id_number || customerData.national_id || customerData.customer_id;
    if (nationalId && !isValidUUID(nationalId)) {
      if (isValidNationalId(nationalId)) {
        newCustomerData.national_id = nationalId;
      } else {
        // استخدام كـ customer_code إذا لم يكن رقم هوية صحيح
        newCustomerData.customer_code = nationalId;
        errors.push(`تم حفظ المعرف كرمز عميل: ${nationalId}`);
      }
    }
    
    console.log('🆕 Creating customer with data:', newCustomerData);
    
    // إنشاء العميل
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert(newCustomerData)
      .select('id')
      .single();
    
    if (error) {
      console.error('🆕 Customer creation error:', error);
      errors.push(`فشل في إنشاء العميل: ${error.message}`);
      return { id: '', created: false, errors };
    }
    
    console.log('🆕 Customer created successfully:', newCustomer.id);
    return {
      id: newCustomer.id,
      created: true,
      errors
    };
    
  } catch (error: any) {
    console.error('🆕 Enhanced Customer Creation Error:', error);
    errors.push(`خطأ في إنشاء العميل: ${error.message}`);
    return { id: '', created: false, errors };
  }
};

// دالة موحدة للبحث أو الإنشاء
export const findOrCreateCustomer = async (
  customerData: CustomerSearchData,
  companyId: string
): Promise<{ id: string; created: boolean; errors: string[]; warnings: string[] }> => {
  const warnings: string[] = [];
  
  try {
    // أولاً: محاولة العثور على العميل
    const searchResult = await findCustomerEnhanced(customerData, companyId);
    
    if (searchResult.found) {
      console.log(`🔍 Customer found via ${searchResult.method} with confidence ${searchResult.confidence}`);
      
      if (searchResult.confidence < 0.8) {
        warnings.push(`تم العثور على عميل مشابه بثقة ${(searchResult.confidence * 100).toFixed(0)}%`);
      }
      
      return {
        id: searchResult.id,
        created: false,
        errors: [],
        warnings
      };
    }
    
    // ثانياً: إنشاء عميل جديد
    console.log('🆕 Customer not found, creating new customer');
    const createResult = await createCustomerEnhanced(customerData, companyId);
    
    return {
      id: createResult.id,
      created: createResult.created,
      errors: createResult.errors,
      warnings
    };
    
  } catch (error: any) {
    console.error('🔍 Find or Create Customer Error:', error);
    return {
      id: '',
      created: false,
      errors: [`خطأ في البحث أو إنشاء العميل: ${error.message}`],
      warnings
    };
  }
};
