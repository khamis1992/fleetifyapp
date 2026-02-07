/**
 * ثوابت ودوال مساعدة مشتركة للكتب الرسمية
 */

// معلومات الشركة (مطابقة لـ ZhipuAIService.ts)
export const COMPANY_INFO = {
  name_ar: 'شركة العراف لتأجير السيارات',
  name_en: 'AL-ARAF CAR RENTAL L.L.C',
  logo: '/receipts/logo.png',
  address: 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
  phone: '31411919',
  email: 'info@alaraf.qa',
  cr: 'س.ت: 146832',
  authorized_signatory: 'خميس هاشم الجبر',
  authorized_title: 'المخول بالتوقيع',
};

// توليد رقم مرجعي
export function generateRefNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `ALR/${year}/${month}/${random}`;
}

// تنسيق التاريخ بالعربية
export function formatDateAr(date: Date = new Date()): string {
  return date.toLocaleDateString('ar-QA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// استخراج محتوى body من مستند HTML كامل
export function extractHtmlBody(html: string): string {
  if (!html) return '';
  
  // محاولة استخراج محتوى body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    return bodyMatch[1];
  }
  
  // إذا لم يكن هناك body tag، نرجع المحتوى كما هو
  // لكن نزيل الـ doctype و html و head tags إن وجدت
  let content = html;
  content = content.replace(/<!DOCTYPE[^>]*>/i, '');
  content = content.replace(/<html[^>]*>/i, '');
  content = content.replace(/<\/html>/i, '');
  content = content.replace(/<head[^>]*>[\s\S]*?<\/head>/i, '');
  
  return content.trim();
}

/**
 * تنسيق الأرقام بالإنجليزية
 */
export function formatNumberEn(num: number): string {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * تنسيق التاريخ بالإنجليزية
 */
export function formatDateEn(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * تنسيق رقم الهاتف (إزالة رمز الدولة والمسافات)
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '-';
  // إزالة +974 أو 974 من البداية والمسافات
  return phone.replace(/^\+?974\s*/, '').replace(/\s+/g, '');
}
