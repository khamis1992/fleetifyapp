// Content Script لموقع alaraf.online
// يعمل على صفحة تجهيز الدعوى القضائية (/legal/lawsuit-preparation/)

console.log('✅ تم تحميل إضافة رفع الدعاوى على alaraf.online');

// ============================================
// متغيرات عامة
// ============================================

let injectedButton = false;
const LAWSUIT_PAGE_PATTERN = /\/legal\/lawsuit-preparation\//;

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

  // البحث عن مكان إدراج الزر
  // أولاً: البحث عن زر "نسخ الكل"
  const copyAllBtn = Array.from(document.querySelectorAll('button')).find(
    btn => btn.textContent?.includes('نسخ الكل')
  );

  // ثانياً: البحث عن CardHeader الخاص ببيانات تقاضي
  const taqadiHeader = Array.from(document.querySelectorAll('div')).find(
    div => div.textContent?.includes('بيانات تقاضي')
  );

  if (!copyAllBtn && !taqadiHeader) {
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
  if (copyAllBtn && copyAllBtn.parentElement) {
    copyAllBtn.parentElement.insertBefore(extensionBtn, copyAllBtn);
    console.log('✅ تم إضافة زر الإضافة بجانب "نسخ الكل"');
  } else if (taqadiHeader) {
    const buttonContainer = taqadiHeader.querySelector('.flex') || taqadiHeader;
    buttonContainer.appendChild(extensionBtn);
    console.log('✅ تم إضافة زر الإضافة في بيانات تقاضي');
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
  // البحث عن بطاقة بيانات المدعى عليه
  const cards = document.querySelectorAll('[class*="Card"]');
  let name = '', phone = '', nationalId = '';

  cards.forEach(card => {
    const text = card.textContent || '';
    if (text.includes('بيانات المدعى عليه')) {
      // استخراج الاسم
      const nameMatch = text.match(/الاسم:\s*(.+?)(?=رقم الهوية|الهاتف|$)/);
      if (nameMatch) name = nameMatch[1].trim();

      // استخراج رقم الهوية
      const idMatch = text.match(/رقم الهوية:\s*(.+?)(?=الهاتف|$)/);
      if (idMatch) nationalId = idMatch[1].trim();

      // استخراج الهاتف
      const phoneMatch = text.match(/الهاتف:\s*(.+?)$/m);
      if (phoneMatch) phone = phoneMatch[1].trim();
    }
  });

  // طريقة بديلة: البحث في الجداول
  if (!name) {
    document.querySelectorAll('.flex.justify-between').forEach(row => {
      const label = row.querySelector('.text-muted-foreground')?.textContent?.trim();
      const value = row.querySelector('.font-medium')?.textContent?.trim();
      
      if (label === 'الاسم:') name = value || '';
      if (label === 'رقم الهوية:') nationalId = value || '';
      if (label === 'الهاتف:') phone = value || '';
    });
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
  const inputs = document.querySelectorAll('input[readonly], textarea[readonly]');
  
  inputs.forEach((input, index) => {
    const label = input.closest('.space-y-2')?.querySelector('label')?.textContent?.trim();
    const value = (input as HTMLInputElement | HTMLTextAreaElement).value;

    if (label?.includes('عنوان الدعوى')) title = value;
    if (label?.includes('الوقائع')) facts = value;
    if (label?.includes('الطلبات')) claims = value;
    if (label === 'المبلغ') amount = parseFloat(value) || 0;
    if (label?.includes('كتابةً')) amountInWords = value;
  });

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
