// Content Script لموقع alaraf.online
// يعمل على صفحة تجهيز الدعوى القضائية (/legal/lawsuit-preparation/)

console.log('✅ تم تحميل إضافة رفع الدعاوى على alaraf.online');

// ============================================
// متغيرات عامة
// ============================================

let injectedButton = false;
const LAWSUIT_PAGE_PATTERN = /\/legal\/lawsuit\/prepare\//;

// ============================================
// مراقبة التغييرات في الصفحة (React SPA)
// ============================================

function observePageChanges() {
  // مراقبة تغييرات DOM لأن الصفحة React SPA
  const observer = new MutationObserver((mutations) => {
    if (LAWSUIT_PAGE_PATTERN.test(window.location.pathname)) {
      if (!injectedButton) {
        setTimeout(injectExtensionButton, 500);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // التحقق عند تحميل الصفحة
  if (LAWSUIT_PAGE_PATTERN.test(window.location.pathname)) {
    setTimeout(injectExtensionButton, 1000);
  }
}

// ============================================
// إضافة زر الإضافة إلى الصفحة
// ============================================

function injectExtensionButton() {
  // التحقق من عدم وجود الزر مسبقاً
  if (document.getElementById('lawsuit-extension-btn')) {
    injectedButton = true;
    return;
  }

  // البحث عن زر "نسخ الكل"
  const copyAllBtn = Array.from(document.querySelectorAll('button')).find(
    btn => btn.textContent?.includes('نسخ الكل')
  );

  // البحث عن زر "فتح تقاضي يدوياً"
  const openTaqadiBtn = Array.from(document.querySelectorAll('button')).find(
    btn => btn.textContent?.includes('فتح تقاضي يدوياً')
  );

  // البحث عن عنوان الصفحة
  const pageTitle = Array.from(document.querySelectorAll('h1')).find(
    h1 => h1.textContent?.includes('تجهيز دعوى')
  );

  if (!copyAllBtn && !openTaqadiBtn && !pageTitle) {
    console.log('⏳ انتظار تحميل صفحة تجهيز الدعوى...');
    return;
  }

  // إنشاء زر الإضافة
  const extensionBtn = document.createElement('button');
  extensionBtn.id = 'lawsuit-extension-btn';
  extensionBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px;">
      <path d="M12 5v14M5 12h14"/>
    </svg>
    إرسال لتقاضي
  `;
  extensionBtn.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 20px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    margin-right: 10px;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
  `;

  extensionBtn.addEventListener('mouseover', () => {
    extensionBtn.style.transform = 'translateY(-2px)';
    extensionBtn.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
  });

  extensionBtn.addEventListener('mouseout', () => {
    extensionBtn.style.transform = 'translateY(0)';
    extensionBtn.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
  });

  extensionBtn.addEventListener('click', handleSaveAndSend);

  // إدراج الزر
  if (openTaqadiBtn && openTaqadiBtn.parentElement) {
    // إضافة بجانب "فتح تقاضي يدوياً"
    openTaqadiBtn.parentElement.insertBefore(extensionBtn, openTaqadiBtn);
    console.log('✅ تم إضافة زر الإضافة بجانب "فتح تقاضي"');
  } else if (copyAllBtn && copyAllBtn.parentElement) {
    copyAllBtn.parentElement.appendChild(extensionBtn);
    console.log('✅ تم إضافة زر الإضافة بجانب "نسخ الكل"');
  } else if (pageTitle && pageTitle.parentElement) {
    pageTitle.parentElement.appendChild(extensionBtn);
    console.log('✅ تم إضافة زر الإضافة في رأس الصفحة');
  }

  injectedButton = true;
}

// ============================================
// استخراج البيانات من الصفحة
// ============================================

function extractLawsuitData() {
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
    return data;

  } catch (error) {
    console.error('❌ خطأ في استخراج البيانات:', error);
    return null;
  }
}

// استخراج بيانات المدعى عليه
function extractDefendantData() {
  let name = '', phone = '', nationalId = '';

  // البحث عن قسم "بيانات المدعى عليه"
  const sections = document.querySelectorAll('div');
  
  sections.forEach(section => {
    const heading = section.querySelector('h3');
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
// معالج حفظ وإرسال البيانات
// ============================================

async function handleSaveAndSend() {
  try {
    showNotification('📋 جاري حفظ البيانات...', 'info');

    // استخراج البيانات
    const data = extractLawsuitData();

    if (!data || !data.texts.title) {
      showNotification('❌ لم يتم العثور على بيانات الدعوى. تأكد من وجود بيانات في الصفحة.', 'error');
      return;
    }

    // إرسال البيانات إلى background script
    chrome.runtime.sendMessage({
      action: 'saveLawsuitData',
      data: data
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('خطأ في الإرسال:', chrome.runtime.lastError);
        showNotification('❌ خطأ في الاتصال بالإضافة', 'error');
        return;
      }

      if (response && response.success) {
        showNotification('✅ تم حفظ البيانات! افتح موقع تقاضي واضغط "ملء البيانات"', 'success');
        
        // عرض خيار فتح تقاضي
        setTimeout(() => {
          if (confirm('هل تريد فتح موقع تقاضي الآن؟')) {
            window.open('https://taqadi.sjc.gov.qa/itc/', '_blank');
          }
        }, 1500);
      } else {
        showNotification('❌ خطأ في حفظ البيانات', 'error');
      }
    });

  } catch (error) {
    console.error('خطأ:', error);
    showNotification(`❌ خطأ: ${error.message}`, 'error');
  }
}

// ============================================
// عرض الإشعارات
// ============================================

function showNotification(message, type = 'info') {
  // إزالة الإشعارات السابقة
  document.querySelectorAll('.lawsuit-extension-notification').forEach(n => n.remove());

  const notification = document.createElement('div');
  notification.className = 'lawsuit-extension-notification';
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 18px;">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <span>${message}</span>
    </div>
  `;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 16px 24px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 14px;
    z-index: 100000;
    animation: slideDown 0.3s ease;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    ${type === 'success' ? 'background: linear-gradient(135deg, #10b981, #059669); color: white;' : ''}
    ${type === 'error' ? 'background: linear-gradient(135deg, #ef4444, #dc2626); color: white;' : ''}
    ${type === 'info' ? 'background: linear-gradient(135deg, #3b82f6, #2563eb); color: white;' : ''}
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideUp 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// ============================================
// الاستماع للرسائل من popup
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractData') {
    const data = extractLawsuitData();
    sendResponse({ data: data });
  }
  if (request.action === 'ping') {
    sendResponse({ status: 'alive', page: 'alaraf' });
  }
  return true;
});

// ============================================
// استقبال البيانات من الصفحة عبر postMessage
// ============================================

window.addEventListener('message', (event) => {
  // التحقق من أن الرسالة من نفس النافذة
  if (event.source !== window) return;

  if (event.data && event.data.type === 'ALARAF_LAWSUIT_DATA') {
    console.log('📨 استلام بيانات من صفحة العراف:', event.data.data);
    
    // حفظ البيانات في تخزين الإضافة
    const extensionData = {
      defendant: { 
        name: event.data.data.defendantName,
        phone: '',
        nationalId: ''
      },
      texts: {
        title: event.data.data.caseTitle,
        facts: event.data.data.facts,
        claims: event.data.data.claims,
        amount: event.data.data.amount,
        amountInWords: event.data.data.amountInWords
      },
      amounts: {
        total: event.data.data.amount,
        totalInWords: event.data.data.amountInWords
      },
      vehicle: {
        contractNumber: event.data.data.contractNumber
      },
      documents: {},
      extractedAt: new Date().toISOString(),
      pageUrl: window.location.href
    };

    chrome.runtime.sendMessage({
      action: 'saveLawsuitData',
      data: extensionData
    }, (response) => {
      if (response && response.success) {
        showNotification('✅ تم حفظ البيانات! افتح موقع تقاضي واضغط "ملء البيانات"', 'success');
      }
    });
  }
});

// ============================================
// التهيئة
// ============================================

// إضافة CSS للرسوم المتحركة
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from { transform: translateX(-50%) translateY(-100px); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateX(-50%) translateY(0); opacity: 1; }
    to { transform: translateX(-50%) translateY(-100px); opacity: 0; }
  }
`;
document.head.appendChild(style);

// بدء المراقبة
observePageChanges();

console.log('🚀 إضافة رفع الدعاوى جاهزة للعمل');
