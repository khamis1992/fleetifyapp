/**
 * جميع الـ Selectors لموقع تقاضي
 * استراتيجية: XPath + label-based (مقاومة لتغيّر الواجهة)
 */

export const SELECTORS = {
  // أزرار عامة
  nextButton: '//a[contains(., "التالي")]',
  saveButton: '//button[contains(., "حفظ")]',
  closeButton: '//button[contains(., "إغلاق")]',
  
  // المرحلة 0: نوع الدعوى
  caseType: {
    civilCaseRadio: '//input[@value="مدنية"]',
    rentalCategoryOption: '//li[contains(., "إيجار")]',
    evictionTypeOption: '//li[contains(., "طرد للإخلال بالعقد")]',
  },
  
  // المرحلة 1: تفاصيل الدعوى
  caseDetails: {
    // عنوان الدعوى - البحث عن input بجانب label
    caseTitleInput: '//input[preceding::*[contains(., "عنوان الدعوى")]]',
    // الوقائع - iframe
    factsIframe: 'iframe[title*="الوقائع"], iframe:has(+ div:contains("الوقائع"))',
    // الطلبات - iframe
    claimsIframe: 'iframe[title*="الطلبات"], iframe:has(+ div:contains("الطلبات"))',
    // قيمة الدعوى بالأرقام
    amountInput: '//input[preceding::*[contains(., "قيمة الدعوى") and contains(., "أرقام")]]',
    // قيمة الدعوى بالكتابة
    amountWordsInput: '//input[preceding::*[contains(., "قيمة الدعوى") and contains(., "كتابة")]]',
  },
  
  // المرحلة 2: أطراف الدعوى
  parties: {
    addPartyButton: '//button[contains(., "إضافة طرف")]',
    
    // داخل نافذة الطرف
    partyTypeDropdown: '//div[contains(@class, "k-dropdown") and preceding-sibling::*[contains(., "تصنيف الطرف")]]',
    partyRoleDropdown: '//div[contains(@class, "k-dropdown") and preceding-sibling::*[contains(., "صفة الطرف")]]',
    orderInput: '//input[preceding::*[contains(., "الترتيب حسب صحيفة الدعوى")]]',
    
    // خيارات تصنيف الطرف
    companyOption: '//li[@role="option" and contains(., "شركة")]',
    individualOption: '//li[@role="option" and contains(., "شخص طبيعي")]',
    
    // خيارات صفة الطرف
    plaintiffOption: '//li[@role="option" and contains(., "مدعى") and not(contains(., "عليه"))]',
    defendantOption: '//li[@role="option" and contains(., "المدعى عليه")]',
    
    // حقول الشركة
    companyName: '//input[preceding::*[contains(., "اسم الشركة")]]',
    commercialReg: '//input[preceding::*[contains(., "السجل التجاري")]]',
    
    // حقول الشخص الطبيعي
    firstName: '//input[preceding::*[contains(., "الاسم") and not(contains(., "الثاني")) and not(contains(., "الثالث")) and not(contains(., "العائلة"))]]',
    middleName: '//input[preceding::*[contains(., "الاسم الثاني")]]',
    thirdName: '//input[preceding::*[contains(., "الاسم الثالث")]]',
    lastName: '//input[preceding::*[contains(., "اسم العائلة")]]',
    
    // الجنسية (Kendo dropdown)
    nationalityDropdown: '//div[contains(@class, "k-dropdown") and preceding-sibling::*[contains(., "الجنسية")]]',
    qatarNationalityOption: '//li[@role="option" and contains(., "قطر")]',
    
    // نوع البطاقة
    idTypeDropdown: '//div[contains(@class, "k-dropdown") and preceding-sibling::*[contains(., "نوع البطاقة")]]',
    qatariIdOption: '//li[@role="option" and contains(., "بطاقة شخصية قطرية")]',
    
    idNumber: '//input[preceding::*[contains(., "رقم البطاقة")]]',
    phone: '//input[preceding::*[contains(., "رقم الهاتف المحمول")]]',
    email: '//input[preceding::*[contains(., "البريد الإلكتروني")]]',
    address: '//input[preceding::*[contains(., "العنوان") and not(contains(., "نوع"))]]',
    
    // تفاصيل البنك
    bankNameAr: '//input[preceding::*[contains(., "اسم البنك") and contains(., "العربية")]]',
    bankNameEn: '//input[preceding::*[contains(., "اسم البنك") and contains(., "الإنجليزية")]]',
    iban: '//input[preceding::*[contains(., "IBAN")]]',
    swift: '//input[preceding::*[contains(., "السويفت") or contains(., "SWIFT")]]',
    bankAddress: '//input[preceding::*[contains(., "عنوان البنك")]]',
    
    // زر تحديث طرف في الجدول
    updatePartyButton: (partyName) => `//td[contains(., "${partyName}")]/following-sibling::td//a[contains(@title, "تحديث") or .//span[contains(., "تحديث")]]`,
  },
  
  // المرحلة 3: المستندات
  documents: {
    addDocumentButton: '//button[contains(., "إضافة وثيقة")]',
    documentTypeDropdown: '//div[contains(@class, "k-dropdown") and preceding-sibling::*[contains(., "النوع")]]',
    fileInput: '//input[@type="file"]',
    uploadButton: '//button[contains(., "رفع") or contains(., "حفظ")]',
    
    // التحقق من رفع المستند
    documentRow: (docName) => `//tr[contains(., "${docName}")]`,
  },
  
  // المرحلة 4: الرسوم
  fees: {
    // على الأرجح فقط "التالي"
  },
  
  // المرحلة 5: الملخص والاعتماد
  summary: {
    approveButton: '//button[contains(., "اعتماد") or contains(., "تأكيد")]',
    confirmButton: '//button[contains(., "نعم") or contains(., "تأكيد")]',
  },
};

/**
 * Helper: انتظار وجود عنصر بـ XPath
 */
export async function waitForXPath(page, xpath, timeout = 10000) {
  try {
    await page.waitForSelector(`xpath/${xpath}`, { timeout });
    return true;
  } catch (error) {
    console.error(`Element not found: ${xpath}`);
    return false;
  }
}

/**
 * Helper: النقر على عنصر بـ XPath
 */
export async function clickXPath(page, xpath) {
  try {
    const element = await page.waitForSelector(`xpath/${xpath}`, { timeout: 10000 });
    await element.click();
    return true;
  } catch (error) {
    throw new Error(`Element not found for click: ${xpath}`);
  }
}

/**
 * Helper: كتابة نص في عنصر بـ XPath
 */
export async function typeXPath(page, xpath, text) {
  try {
    const element = await page.waitForSelector(`xpath/${xpath}`, { timeout: 10000 });
    await element.click(); // focus
    await element.type(text, { delay: 50 });
    return true;
  } catch (error) {
    throw new Error(`Element not found for typing: ${xpath}`);
  }
}
