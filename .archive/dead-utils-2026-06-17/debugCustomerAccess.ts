/**
 * أداة تشخيص الوصول لصفحة تفاصيل العميل
 * استخدم هذه الدالة في Console المتصفح لتشخيص المشاكل
 */

import { supabase } from '@/integrations/supabase/client';

export async function debugCustomerAccess(customerId: string) {
  console.log('🔍 [DEBUG] بدء تشخيص الوصول للعميل:', customerId);
  console.log('================================================');

  // 1. فحص المستخدم الحالي
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error('❌ [DEBUG] خطأ في المصادقة:', authError);
    return { success: false, error: 'مستخدم غير مسجل' };
  }

  console.log('✅ [DEBUG] المستخدم:', {
    id: user.id,
    email: user.email,
  });

  // 2. فحص بيانات المستخدم في profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (profileError) {
    console.error('❌ [DEBUG] خطأ في جلب profile:', profileError);
    return { success: false, error: 'Profile غير موجود' };
  }

  console.log('✅ [DEBUG] Profile:', {
    user_id: profile.user_id,
    company_id: profile.company_id,
    email: profile.email,
  });

  // 3. فحص أدوار المستخدم
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  if (rolesError) {
    console.error('❌ [DEBUG] خطأ في جلب الأدوار:', rolesError);
  } else {
    console.log('✅ [DEBUG] الأدوار:', roles?.map(r => r.role) || []);
  }

  // 4. محاولة جلب العميل
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (customerError) {
    console.error('❌ [DEBUG] خطأ في جلب العميل:', {
      code: customerError.code,
      message: customerError.message,
      details: customerError.details,
      hint: customerError.hint,
    });
    return { success: false, error: customerError };
  }

  console.log('✅ [DEBUG] العميل:', {
    id: customer.id,
    customer_code: customer.customer_code,
    company_id: customer.company_id,
    is_active: customer.is_active,
  });

  // 5. فحص التطابق
  if (customer.company_id !== profile.company_id) {
    console.error('❌ [DEBUG] عدم تطابق الشركة!', {
      customer_company: customer.company_id,
      user_company: profile.company_id,
    });
    return { 
      success: false, 
      error: 'العميل ينتمي لشركة مختلفة عن شركة المستخدم' 
    };
  }

  // 6. محاولة جلب العميل مع تطبيق RLS
  const { data: customerWithCompany, error: rlsError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('company_id', profile.company_id)
    .single();

  if (rlsError) {
    console.error('❌ [DEBUG] RLS منع الوصول:', {
      code: rlsError.code,
      message: rlsError.message,
    });
    return { success: false, error: 'RLS منع الوصول' };
  }

  console.log('✅ [DEBUG] نجح الوصول مع RLS!');
  console.log('================================================');
  console.log('✅ التشخيص كامل - كل شيء يعمل بشكل صحيح!');

  return {
    success: true,
    user,
    profile,
    roles: roles?.map(r => r.role) || [],
    customer: customerWithCompany,
  };
}

// إضافة الدالة للـ window لسهولة الاستخدام في Console
if (typeof window !== 'undefined') {
  (window as any).debugCustomerAccess = debugCustomerAccess;
}

