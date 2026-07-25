/**
 * دالة موحدة لتهيئة اسم العميل في جميع أنحاء النظام
 * تضمن تطابق الأسماء بين جميع الصفحات (تفاصيل العميل، العقود، المتعثرات، إلخ)
 * 
 * القواعد:
 * 1. إذا كان العميل شركة (corporate/company): الأولوية للاسم العربي للشركة، ثم الإنجليزي
 * 2. إذا كان العميل فرد (individual): الأولوية للاسم الإنجليزي (first_name + last_name)، ثم العربي
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

export interface CustomerNameFormatOptions {
  preferArabic?: boolean;
  fallbackName?: string | null;
}

const cleanName = (value?: string | null): string => value?.trim() || '';

export const formatCustomerName = (
  customer: CustomerNameData | null | undefined,
  options: CustomerNameFormatOptions = {}
): string => {
  if (!customer) return 'غير محدد';

  // التحقق من نوع العميل
  const isCorporate = customer.customer_type === 'corporate' || customer.customer_type === 'company';
  const fallbackName = cleanName(options.fallbackName);

  if (isCorporate) {
    // للشركات: الاسم العربي أولاً، ثم الإنجليزي
    const companyNameAr = cleanName(customer.company_name_ar);
    const companyName = cleanName(customer.company_name);

    if (companyNameAr) {
      return companyNameAr;
    }
    if (fallbackName) {
      return fallbackName;
    }
    if (companyName) {
      return companyName;
    }
    // Fallback if no company name
    return customer.full_name || 'شركة بدون اسم';
  } else {
    const firstName = cleanName(customer.first_name);
    const lastName = cleanName(customer.last_name);
    const fullNameEn = `${firstName} ${lastName}`.trim();
    const firstNameAr = cleanName(customer.first_name_ar);
    const lastNameAr = cleanName(customer.last_name_ar);
    const fullNameAr = `${firstNameAr} ${lastNameAr}`.trim();

    if (options.preferArabic) {
      if (fullNameAr) return fullNameAr;
      if (fallbackName) return fallbackName;
      if (fullNameEn) return fullNameEn;
    } else {
      if (fullNameEn) return fullNameEn;
      if (fullNameAr) return fullNameAr;
      if (fallbackName) return fallbackName;
    }

    // Fallback
    return customer.full_name || 'عميل بدون اسم';
  }
};
