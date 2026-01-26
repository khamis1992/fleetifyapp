/**
 * دالة موحدة لتهيئة اسم العميل في جميع أنحاء النظام
 * تضمن تطابق الأسماء بين جميع الصفحات (تفاصيل العميل، العقود، المتعثرات، إلخ)
 * 
 * القواعد:
 * 1. إذا كان العميل شركة (corporate/company): الأولوية للاسم العربي للشركة، ثم الإنجليزي
 * 2. إذا كان العميل فرد (individual): الأولوية للاسم الكامل العربي، ثم الإنجليزي
 */

export interface CustomerNameData {
  first_name?: string | null;
  last_name?: string | null;
  first_name_ar?: string | null;
  last_name_ar?: string | null;
  company_name?: string | null;
  company_name_ar?: string | null;
  customer_type?: string | null;
  full_name?: string | null; // For cases where only full_name is available
}

export const formatCustomerName = (customer: CustomerNameData | null | undefined): string => {
  if (!customer) return 'غير محدد';

  // التحقق من نوع العميل
  const isCorporate = customer.customer_type === 'corporate' || customer.customer_type === 'company';

  if (isCorporate) {
    // للشركات: الاسم العربي أولاً، ثم الإنجليزي
    if (customer.company_name_ar && customer.company_name_ar.trim()) {
      return customer.company_name_ar.trim();
    }
    if (customer.company_name && customer.company_name.trim()) {
      return customer.company_name.trim();
    }
    // Fallback if no company name
    return customer.full_name || 'شركة بدون اسم';
  } else {
    // للأفراد: الاسم العربي أولاً
    const firstNameAr = customer.first_name_ar || '';
    const lastNameAr = customer.last_name_ar || '';
    const fullNameAr = `${firstNameAr} ${lastNameAr}`.trim();

    if (fullNameAr) {
      return fullNameAr;
    }

    // ثم الاسم الإنجليزي
    const firstName = customer.first_name || '';
    const lastName = customer.last_name || '';
    const fullNameEn = `${firstName} ${lastName}`.trim();

    if (fullNameEn) {
      return fullNameEn;
    }
    
    // Fallback
    return customer.full_name || 'عميل بدون اسم';
  }
};
