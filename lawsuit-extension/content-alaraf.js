// Content Script المبسط لموقع alaraf.online
// يستخرج بيانات الدعوى فقط - بدون أزرار

console.log('✅ تم تحميل إضافة استخراج بيانات الدعوى على alaraf.online');

// ============================================
// مراقبة التغييرات في الصفحة (React SPA)
// ============================================

function observePageChanges() {
  // مراقبة تغييرات DOM لأن الصفحة React SPA
  const observer = new MutationObserver((mutations) => {
    if (LAWSUIT_PAGE_PATTERN.test(window.location.pathname)) {
      extractAndSaveData();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // التحقق عند تحميل الصفحة
  if (LAWSUIT_PAGE_PATTERN.test(window.location.pathname)) {
    setTimeout(extractAndSaveData, 2000);
  }
}

// ============================================
// استخراج وحفظ البيانات تلقائياً
// ============================================

const LAWSUIT_PAGE_PATTERN = /\/legal\/lawsuit\/prepare\//;

function extractAndSaveData() {
  try {
    console.log('📋 جاري استخراج بيانات الدعوى...');

    // استخراج البيانات من الحقول الجاهزة
    const data = {
      defendant: extractDefendantData(),
      vehicle: extractVehicleData(),
      amounts: extractAmountsData(),
      texts: extractTextsData(),
      documents: extractDocumentLinks(),
      extractedAt: new Date().toISOString(),
      pageUrl: window.location.href
    };

    console.log('✅ تم استخراج البيانات:', data);

    // حفظ البيانات تلقائياً
    saveData(data);

  } catch (error) {
    console.error('❌ خطأ في استخراج البيانات:', error);
  }
}

// استخراج بيانات المدعى عليه
function extractDefendantData() {
  let name = '', phone = '', nationalId = '';

  // البحث عن قسم "بيانات المدعى عليه"
  const sections = document.querySelectorAll('div');
  
  sections.forEach(section => {
    const heading = section.querySelector('h3, h4');
    if (heading && heading.textContent?.includes('بيانات المدعى عليه')) {
      // البحث عن الصفوف داخل هذا القسم
      const rows = section.querySelectorAll('div > div');
      rows.forEach(row => {
        const text = row.textContent || '';
        const parts = row.querySelectorAll('div');
        
        if (parts.length >= 2) {
          const label = parts[0]?.textContent?.trim() || '';
          const value = parts[1]?.textContent?.trim() || '';
          
          if (label.includes('الاسم')) name = value;
          if (label.includes('الهوية')) nationalId = value;
          if (label.includes('الهاتف')) phone = value;
        }
      });
    }
  });

  // طريقة بديلة: البحث بالنص
  if (!name) {
    const allText = document.body.textContent || '';
    const nameMatch = allText.match(/الاسم:\s*([^\n]+)/);
    if (nameMatch) name = nameMatch[1].trim();
  }

  if (!phone) {
    const allText = document.body.textContent || '';
    const phoneMatch = allText.match(/الهاتف:\s*(\d+)/);
    if (phoneMatch) phone = phoneMatch[1].trim();
  }

  return { name, phone, nationalId };
}

// استخراج بيانات السيارة والعقد
function extractVehicleData() {
  let model = '', plate = '', contractNumber = '';

  document.querySelectorAll('.flex.justify-between').forEach(row => {
    const label = row.querySelector('.text-muted-foreground')?.textContent?.trim();
    const value = row.querySelector('.font-medium, [class*="Badge"]')?.textContent?.trim();

    if (label === 'السيارة:') model = value || '';
    if (label === 'اللوحة:') plate = value || '';
    if (label === 'رقم العقد:') contractNumber = value || '';
  });

  return { model, plate, contractNumber };
}

// استخراج المبالغ
function extractAmountsData() {
  let overdueRent = 0, lateFees = 0, violations = 0, otherFees = 0, total = 0, totalInWords = '';

  // البحث في ملخص المطالبة
  document.querySelectorAll('.text-center.p-4').forEach(cell => {
    const label = cell.querySelector('.text-sm')?.textContent?.trim();
    const valueText = cell.querySelector('.font-bold, .text-xl, .text-2xl')?.textContent?.trim() || '0';
    const value = parseFloat(valueText.replace(/[^\d.]/g, '')) || 0;

    if (label?.includes('الإيجار المتأخر')) overdueRent = value;
    if (label?.includes('غرامة التأخير')) lateFees = value;
    if (label?.includes('مخالفات')) violations = value;
    if (label?.includes('رسوم إدارية')) otherFees = value;
    if (label?.includes('الإجمالي')) total = value;
  });

  // استخراج المبلغ كتابة
  const wordsElement = Array.from(document.querySelectorAll('.font-medium')).find(
    el => el.textContent?.includes('ريال قطري')
  );
  if (wordsElement) {
    totalInWords = wordsElement.textContent?.trim() || '';
  }

  return { overdueRent, lateFees, violations, otherFees, total, totalInWords };
}

// استخراج النصوص (عنوان الدعوى، الوقائع، الطلبات)
function extractTextsData() {
  let title = '', facts = '', claims = '', amount = 0, amountInWords = '';

  // البحث عن الحقول في قسم "بيانات تقاضي"
  // الحقول هي textbox في الصفحة
  const allInputs = document.querySelectorAll('input, textarea');
  
  allInputs.forEach((input) => {
    const container = input.closest('div')?.parentElement;
    const labelDiv = container?.querySelector('div:first-child');
    const labelText = labelDiv?.textContent?.trim() || '';
    const value = input.value || '';

    if (labelText.includes('عنوان الدعوى')) {
      title = value;
    }
    if (labelText === 'الوقائع' || labelText.includes('الوقائع')) {
      facts = value;
    }
    if (labelText === 'الطلبات' || labelText.includes('الطلبات')) {
      claims = value;
    }
    if (labelText === 'المبلغ' && !labelText.includes('كتابة')) {
      amount = parseFloat(value.replace(/[^\d.]/g, '')) || 0;
    }
    if (labelText.includes('كتابةً') || labelText.includes('كتابة')) {
      amountInWords = value;
    }
  });

  // طريقة بديلة: البحث بالقيم المتوقعة
  if (!title) {
    const titleInput = Array.from(document.querySelectorAll('input')).find(
      i => i.value?.includes('مطالبة مالية')
    );
    if (titleInput) title = titleInput.value;
  }

  if (!facts) {
    const factsInput = Array.from(document.querySelectorAll('textarea, input')).find(
      i => i.value?.includes('أبرمت شركة العراف') || i.value?.includes('المدعية')
    );
    if (factsInput) facts = factsInput.value;
  }

  if (!claims) {
    const claimsInput = Array.from(document.querySelectorAll('textarea, input')).find(
      i => i.value?.includes('إلزام المدعى عليه')
    );
    if (claimsInput) claims = claimsInput.value;
  }

  return { title, facts, claims, amount, amountInWords };
}

// استخراج روابط المستندات
function extractDocumentLinks() {
  const documents = {};

  // البحث عن روابط التحميل
  document.querySelectorAll('a[href*="supabase"], button[data-doc-url]').forEach(link => {
    const href = link.getAttribute('href') || link.getAttribute('data-doc-url');
    const text = link.textContent?.toLowerCase() || '';
    const parentText = link.closest('.flex')?.textContent?.toLowerCase() || '';

    if (parentText.includes('سجل تجاري') || text.includes('commercial')) {
      documents['commercialRegister'] = href;
    }
    if (parentText.includes('iban') || parentText.includes('شهادة')) {
      documents['iban'] = href;
    }
    if (parentText.includes('بطاقة') || parentText.includes('representative')) {
      documents['idCard'] = href;
    }
    if (parentText.includes('مذكرة شارحة')) {
      documents['memo'] = href;
    }
    if (parentText.includes('كشف المستندات')) {
      documents['documentsList'] = href;
    }
    if (parentText.includes('كشف المطالبات')) {
      documents['claimsStatement'] = href;
    }
    if (parentText.includes('عقد الإيجار') || parentText.includes('contract')) {
      documents['contract'] = href;
    }
  });

  return documents;
}

// ============================================
// حفظ البيانات
// ============================================

function saveData(data) {
  // حفظ في chrome.storage.local
  // @ts-ignore - Chrome extension API
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    // @ts-ignore
    chrome.storage.local.set({ lawsuitData: data }, () => {
      if (chrome.runtime.lastError) {
        console.error('خطأ في الحفظ:', chrome.runtime.lastError);
      } else {
        console.log('✅ تم حفظ البيانات في chrome.storage.local');
      }
    });
  }

  // حفظ في localStorage أيضاً (للاستخدام المباشر)
  localStorage.setItem('alarafLawsuitDataFull', JSON.stringify(data));
  console.log('✅ تم حفظ البيانات في localStorage');
}

// ============================================
// الاستماع للرسائل من popup
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractData') {
    const data = extractAndSaveData();
    sendResponse({ data: data });
  } else if (request.action === 'ping') {
    sendResponse({ status: 'alive', page: 'alaraf' });
  }
  // جميع الاستجابات متزامنة، لا حاجة لـ return true
});

// ============================================
// بدء المراقبة
// ============================================

// بدء المراقبة
observePageChanges();

console.log('🚀 إضافة استخراج البيانات جاهزة للعمل - بدون أزرار');
