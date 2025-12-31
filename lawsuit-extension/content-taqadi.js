// Content Script متقدم لموقع taqadi.sjc.gov.qa
// يقوم بملء النماذج ورفع الملفات تلقائياً

console.log('✅ تم تحميل الإضافة المتقدمة لموقع تقاضي');

// ============================================
// المتغيرات العامة
// ============================================

let currentData = null;
let automationStatus = 'idle'; // idle, processing, completed, error

// ============================================
// إضافة أزرار الإضافة إلى الصفحة
// ============================================

function injectButtons() {
  if (document.getElementById('ext-fill-btn')) return;

  // البحث عن مكان مناسب لإدراج الأزرار
  const form = document.querySelector('form') || document.body;

  // إنشاء حاوية الأزرار
  const container = document.createElement('div');
  container.id = 'lawsuit-extension-container';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 100000;
    display: flex;
    flex-direction: column;
    gap: 10px;
  `;

  // زر ملء البيانات
  const fillBtn = document.createElement('button');
  fillBtn.id = 'ext-fill-btn';
  fillBtn.innerHTML = '📋 ملء البيانات';
  fillBtn.style.cssText = `
    padding: 12px 20px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    color: white;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
    transition: all 0.3s ease;
  `;
  fillBtn.addEventListener('click', handleFillData);
  fillBtn.addEventListener('mouseover', () => {
    fillBtn.style.transform = 'scale(1.05)';
  });
  fillBtn.addEventListener('mouseout', () => {
    fillBtn.style.transform = 'scale(1)';
  });

  container.appendChild(fillBtn);
  document.body.appendChild(container);

  console.log('✅ تم إضافة أزرار الإضافة');
}

// ============================================
// الاستماع للرسائل من background script
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📩 رسالة واردة:', request.action, request);

  // رسالة بدء الأتمتة الكاملة
  if (request.action === 'autoFill' || request.action === 'startAutomation') {
    handleAutoFill(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => {
        console.error('خطأ في الأتمتة:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  // رسالة ملء البيانات فقط (الزر اليدوي)
  if (request.action === 'fillData') {
    handleFillData().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  // رسالة رفع الملفات
  if (request.action === 'uploadFiles') {
    uploadFiles(request.files).then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (request.action === 'ping') {
    sendResponse({ status: 'alive', page: 'taqadi', automationStatus });
    return false;
  }

  return false;
});

// ============================================
// معالج الأتمتة الكاملة
// ============================================

async function handleAutoFill(data) {
  try {
    console.log('🚀 بدء الأتمتة الكاملة...');
    console.log('📋 البيانات المستلمة:', data);

    automationStatus = 'processing';

    // إظهار واجهة التقدم
    showProgressUI();

    // 1. انتظار تحميل الصفحة
    await wait(2000);
    updateProgress('تم تحميل الصفحة ✓', 10);

    // 2. التحقق من تسجيل الدخول
    const isLoggedIn = await checkLoginStatus();
    if (!isLoggedIn) {
      throw new Error('يرجى تسجيل الدخول عبر توثيق أولاً');
    }
    updateProgress('تم تسجيل الدخول ✓', 20);

    // 3. بدء دعوى جديدة
    await startNewLawsuit();
    updateProgress('تم بدء دعوى جديدة ✓', 40);

    // 4. اختيار نوع الدعوى
    await selectLawsuitType();
    updateProgress('تم اختيار نوع الدعوى ✓', 60);

    // 5. ملء بيانات الدعوى
    await fillLawsuitForm(data);
    updateProgress('تم ملء البيانات ✓', 80);

    // 6. رفع الملفات
    if (data.documents) {
      await uploadAllDocuments(data.documents);
      updateProgress('تم رفع المستندات ✓', 100);
    }

    automationStatus = 'completed';
    showSuccessNotification();
    hideProgressUI();

    console.log('✅ تمت الأتمتة بنجاح!');
    return {
      success: true,
      message: 'تمت الأتمتة بنجاح! راجع البيانات واضغط "اعتماد"'
    };

  } catch (error) {
    console.error('❌ خطأ في الأتمتة:', error);
    automationStatus = 'error';
    showErrorNotification(error.message);
    hideProgressUI();
    throw error;
  }
}

// ============================================
// معالج ملء البيانات (الزر اليدوي)
// ============================================

async function handleFillData() {
  try {
    showNotification('📋 جاري ملء البيانات...', 'info');

    // جلب البيانات المحفوظة
    const result = await chrome.storage.local.get(['lawsuitData']);

    if (!result.lawsuitData) {
      showNotification('❌ لا توجد بيانات محفوظة. ارجع لصفحة العراف واضغط "إرسال لتقاضي"', 'error');
      return;
    }

    currentData = result.lawsuitData;
    console.log('📋 البيانات المحفوظة:', currentData);

    // ملء النموذج
    await fillForm(currentData);

    showNotification('✅ تم ملء البيانات! راجع وأكمل الخطوات', 'success');

  } catch (error) {
    console.error('خطأ:', error);
    showNotification(`❌ خطأ: ${error.message}`, 'error');
  }
}

// ============================================
// واجهة التقدم
// ============================================

function showProgressUI() {
  hideProgressUI();

  const progressUI = document.createElement('div');
  progressUI.id = 'taqadi-progress-ui';
  progressUI.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 999999;
      min-width: 300px;
      direction: rtl;
    ">
      <h3 style="margin: 0 0 15px 0; color: #10b981; font-size: 18px;">
        🤖 جاري الأتمتة...
      </h3>
      <div id="progress-bar" style="
        width: 100%;
        height: 8px;
        background: #e5e7eb;
        border-radius: 4px;
        margin-bottom: 10px;
        overflow: hidden;
      ">
        <div id="progress-fill" style="
          width: 0%;
          height: 100%;
          background: linear-gradient(90deg, #10b981, #059669);
          transition: width 0.3s ease;
        "></div>
      </div>
      <p id="progress-text" style="margin: 0; color: #6b7280; font-size: 14px;">
        جاري التجهيز...
      </p>
    </div>
  `;
  document.body.appendChild(progressUI);
}

function updateProgress(text, percentage) {
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');

  if (progressFill) {
    progressFill.style.width = `${percentage}%`;
  }
  if (progressText) {
    progressText.textContent = text;
  }

  console.log(`✅ ${text} (${percentage}%)`);
}

function hideProgressUI() {
  const ui = document.getElementById('taqadi-progress-ui');
  if (ui) {
    ui.remove();
  }
}

function showSuccessNotification() {
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 20px 30px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
      z-index: 999999;
      font-size: 16px;
      font-weight: 600;
      animation: slideDown 0.3s ease;
    ">
      ✅ تمت الأتمتة بنجاح! راجع البيانات واضغط "اعتماد"
    </div>
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideUp 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

function showErrorNotification(message) {
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      padding: 20px 30px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
      z-index: 999999;
      font-size: 16px;
      font-weight: 600;
      animation: slideDown 0.3s ease;
    ">
      ❌ ${message}
    </div>
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideUp 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

function showNotification(message, type = 'info') {
  document.querySelectorAll('.lawsuit-extension-notification').forEach(n => n.remove());

  const notification = document.createElement('div');
  notification.className = 'lawsuit-extension-notification';
  notification.innerHTML = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 16px 24px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 14px;
    z-index: 100001;
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
// التحقق من تسجيل الدخول
// ============================================

async function checkLoginStatus() {
  await wait(2000);

  // التحقق من وجود زر تسجيل الدخول
  const loginButton = findElementByText('توثيق', 'button, a');

  return !loginButton;
}

// ============================================
// بدء دعوى جديدة
// ============================================

async function startNewLawsuit() {
  await wait(2000);

  // البحث عن زر "دعوى جديدة"
  const newCaseButton = findElementByText('دعوى جديدة', 'button, a');

  if (newCaseButton) {
    newCaseButton.click();
    console.log('✅ تم النقر على "دعوى جديدة"');
    await wait(3000);
  } else {
    console.log('⚠️ لم يتم العثور على زر "دعوى جديدة"، قد تكون في صفحة الإنشاء بالفعل');
  }
}

// ============================================
// اختيار نوع الدعوى
// ============================================

async function selectLawsuitType() {
  await wait(1000);

  // اختيار عقود الخدمات التجارية
  const commercialButton = findElementByText('عقود الخدمات التجارية', 'button, option');
  if (commercialButton) {
    commercialButton.click();
    console.log('✅ تم اختيار عقود الخدمات التجارية');
    await wait(1000);
  }

  // اختيار عقود إيجار السيارات
  const carRentalButton = findElementByText('عقود إيجار السيارات', 'button, option');
  if (carRentalButton) {
    carRentalButton.click();
    console.log('✅ تم اختيار عقود إيجار السيارات');
    await wait(2000);
  }
}

// ============================================
// ملء نموذج الدعوى
// ============================================

async function fillLawsuitForm(data) {
  console.log('📋 ملء بيانات الدعوى...');

  const { texts, amounts, defendant } = data;

  // ملء عنوان الدعوى
  if (texts.title || texts.caseTitle) {
    const title = texts.title || texts.caseTitle;
    await fillField([
      'input[name*="title"]',
      'input[name*="subject"]',
      'input[placeholder*="عنوان"]'
    ], title);
    console.log('✅ عنوان الدعوى:', title);
  }

  // ملء الوقائع
  if (texts.facts) {
    await fillField([
      'textarea[name*="fact"]',
      'textarea[placeholder*="وقائع"]',
      'textarea[name*="description"]'
    ], texts.facts);
    console.log('✅ الوقائع');
  }

  // ملء الطلبات
  if (texts.claims) {
    await fillField([
      'textarea[name*="request"]',
      'textarea[placeholder*="طلبات"]',
      'textarea[name*="claim"]'
    ], texts.claims);
    console.log('✅ الطلبات');
  }

  // ملء المبلغ
  if (texts.amount || amounts.total) {
    const amount = String(texts.amount || amounts.total);
    await fillField([
      'input[name*="amount"]',
      'input[type="number"]',
      'input[placeholder*="مبلغ"]'
    ], amount);
    console.log('✅ المبلغ:', amount);
  }

  // ملء المبلغ كتابة
  if (texts.amountInWords || amounts.totalInWords) {
    const amountInWords = texts.amountInWords || amounts.totalInWords;
    await fillField([
      'input[name*="amountWord"]',
      'input[placeholder*="كتابة"]',
      'textarea[name*="amountWord"]'
    ], amountInWords);
    console.log('✅ المبلغ كتابة');
  }

  // ملء بيانات المدعى عليه
  if (defendant) {
    await fillDefendantInfo(defendant);
  }

  await wait(1000);
}

// ============================================
// ملء بيانات المدعى عليه
// ============================================

async function fillDefendantInfo(defendant) {
  console.log('👤 ملء بيانات المدعى عليه...');

  // الاسم
  if (defendant.name || defendant.defendantName) {
    const name = defendant.name || defendant.defendantName;
    await fillField([
      'input[name*="defendant"]',
      'input[placeholder*="اسم"]',
      'input[name*="name"]'
    ], name);
    console.log('✅ الاسم:', name);
  }

  // رقم الهوية
  if (defendant.nationalId || defendant.defendantIdNumber) {
    const idNumber = defendant.nationalId || defendant.defendantIdNumber;
    await fillField([
      'input[name*="id"]',
      'input[placeholder*="هوية"]',
      'input[name*="national"]'
    ], idNumber);
    console.log('✅ رقم الهوية:', idNumber);
  }

  // رقم الهاتف
  if (defendant.phone || defendant.defendantPhone) {
    const phone = defendant.phone || defendant.defendantPhone;
    await fillField([
      'input[name*="phone"]',
      'input[placeholder*="هاتف"]',
      'input[name*="mobile"]'
    ], phone);
    console.log('✅ رقم الهاتف:', phone);
  }
}

// ============================================
// رفع جميع المستندات
// ============================================

async function uploadAllDocuments(documents) {
  console.log('📎 رفع المستندات...');

  const documentTypes = [
    { keys: ['commercialRegister', 'commercialRegisterUrl'], label: 'السجل التجاري' },
    { keys: ['iban', 'ibanCertificate', 'ibanCertificateUrl'], label: 'شهادة IBAN' },
    { keys: ['idCard', 'representativeId', 'representativeIdUrl'], label: 'البطاقة الشخصية' },
    { keys: ['memo', 'explanatoryMemo', 'explanatoryMemoUrl'], label: 'المذكرة الشارحة' },
    { keys: ['documentsList'], label: 'كشف المستندات' },
    { keys: ['claimsStatement'], label: 'كشف المطالبات' },
    { keys: ['contract', 'contractUrl'], label: 'عقد الإيجار' }
  ];

  for (const docType of documentTypes) {
    let url = null;
    for (const key of docType.keys) {
      if (documents[key]) {
        url = documents[key];
        break;
      }
    }

    if (url) {
      try {
        await uploadDocument(docType.label, url);
        console.log(`✅ تم رفع ${docType.label}`);
        await wait(1000);
      } catch (error) {
        console.error(`❌ فشل رفع ${docType.label}:`, error);
      }
    }
  }
}

// ============================================
// رفع ملف واحد
// ============================================

async function uploadDocument(label, url) {
  try {
    // تحميل الملف
    const file = await fetchAndCreateFile(url, label);

    // البحث عن input file للرفع
    const fileInput = findFileInput(label);

    if (fileInput && file) {
      // استخدام FileList لمحاكاة رفع الملف
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;

      // تشغيل الأحداث
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      fileInput.dispatchEvent(new Event('input', { bubbles: true }));

      console.log(`✅ تم رفع ${label}`);
    } else {
      console.log(`⚠️ لم يتم العثور على input file لـ ${label}`);
    }

  } catch (error) {
    console.error(`❌ خطأ في رفع ${label}:`, error);
    throw error;
  }
}

// ============================================
// تحميل الملف من URL وإنشاء File object
// ============================================

async function fetchAndCreateFile(url, label) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`فشل تحميل الملف: ${response.status}`);
    }

    const blob = await response.blob();
    const fileName = `${label}.pdf`;
    const file = new File([blob], fileName, { type: 'application/pdf' });

    return file;
  } catch (error) {
    console.error('❌ خطأ في تحميل الملف:', error);
    throw error;
  }
}

// ============================================
// البحث عن input file للرفع
// ============================================

function findFileInput(label) {
  // البحث عن العنصر المرتبط بالملف
  const allElements = document.querySelectorAll('button, div, label, span, p');
  const relatedElement = Array.from(allElements).find(el =>
    el.textContent && el.textContent.includes(label)
  );

  if (relatedElement) {
    // البحث عن input file في نفس الحاوية
    const container = relatedElement.closest('div, section');
    if (container) {
      const fileInput = container.querySelector('input[type="file"]');
      if (fileInput) return fileInput;
    }
  }

  // البحث عن أي input file متاح
  const allFileInputs = document.querySelectorAll('input[type="file"]');
  if (allFileInputs.length > 0) {
    return allFileInputs[allFileInputs.length - 1];
  }

  return null;
}

// ============================================
// ملء حقل
// ============================================

async function fillField(selectors, value) {
  if (!value) return;

  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector);

      for (const element of elements) {
        try {
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('blur', { bubbles: true }));

          await wait(100);
          console.log(`✅ تم ملء الحقل: ${selector}`);
          return;
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      continue;
    }
  }

  console.log(`⚠️ لم يتم العثور على حقول: ${selectors.join(', ')}`);
}

// ============================================
// البحث عن عنصر بالنص
// ============================================

function findElementByText(text, tagName) {
  const elements = document.querySelectorAll(tagName);

  for (const element of elements) {
    if (element.textContent && element.textContent.includes(text)) {
      return element;
    }
  }

  return null;
}

// ============================================
// ملء النموذج (الزر اليدوي)
// ============================================

async function fillForm(data) {
  console.log('🔄 جاري ملء النموذج...');

  // تجميع البيانات
  const texts = data.texts || {};
  const amounts = data.amounts || {};
  const defendant = data.defendant || {};

  // قائمة الحقول للملء
  const fieldsToFill = [
    {
      value: texts.title || '',
      selectors: [
        'input[name*="subject"]',
        'input[name*="title"]',
        'input[placeholder*="عنوان"]'
      ]
    },
    {
      value: texts.facts || '',
      selectors: [
        'textarea[name*="fact"]',
        'textarea[placeholder*="وقائع"]'
      ]
    },
    {
      value: texts.claims || '',
      selectors: [
        'textarea[name*="request"]',
        'textarea[placeholder*="طلبات"]'
      ]
    },
    {
      value: String(texts.amount || amounts.total || 0),
      selectors: [
        'input[name*="amount"]',
        'input[type="number"]'
      ]
    },
    {
      value: texts.amountInWords || amounts.totalInWords || '',
      selectors: [
        'input[name*="amountWord"]',
        'input[placeholder*="كتابة"]'
      ]
    },
  ];

  let filledCount = 0;

  for (const field of fieldsToFill) {
    if (!field.value) continue;

    for (const selector of field.selectors) {
      const element = document.querySelector(selector);
      if (element) {
        element.value = field.value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));

        console.log(`✅ تم ملء: ${selector}`);
        filledCount++;
        break;
      }
    }
  }

  console.log(`✅ تم ملء ${filledCount} حقول`);

  // محاولة ملء بيانات أطراف الدعوى
  await fillPartyData(defendant);

  return filledCount;
}

// ============================================
// ملء بيانات الأطراف (الزر اليدوي)
// ============================================

async function fillPartyData(defendant) {
  if (!defendant.name) return;

  // البحث عن حقول الأطراف
  const nameInputs = document.querySelectorAll('input[name*="name"], input[placeholder*="اسم"]');
  const phoneInputs = document.querySelectorAll('input[name*="phone"], input[name*="mobile"]');
  const idInputs = document.querySelectorAll('input[name*="id"], input[name*="national"]');

  // تقسيم الاسم
  const nameParts = defendant.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts[nameParts.length - 1] || '';

  // ملء الاسم
  if (nameInputs.length > 0) {
    const lastNameInput = nameInputs[nameInputs.length - 1];
    lastNameInput.value = defendant.name;
    lastNameInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // ملء الهاتف
  if (phoneInputs.length > 0 && defendant.phone) {
    const lastPhoneInput = phoneInputs[phoneInputs.length - 1];
    lastPhoneInput.value = defendant.phone;
    lastPhoneInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // ملء رقم الهوية
  if (idInputs.length > 0 && defendant.nationalId) {
    const lastIdInput = idInputs[idInputs.length - 1];
    lastIdInput.value = defendant.nationalId;
    lastIdInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// ============================================
// رفع الملفات (للاستخدام المباشر)
// ============================================

async function uploadFiles(files) {
  try {
    await uploadAllDocuments(files);
    showNotification('✅ تم رفع الملفات!', 'success');
  } catch (error) {
    console.error('خطأ في رفع الملفات:', error);
    showNotification(`❌ خطأ في رفع الملفات: ${error.message}`, 'error');
  }
}

// ============================================
// الانتظار
// ============================================

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// إضافة CSS للرسوم المتحركة
// ============================================

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

// ============================================
// التهيئة
// ============================================

// إضافة الأزرار عند تحميل الصفحة
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectButtons);
} else {
  injectButtons();
}

console.log('🚀 الإضافة المتقدمة جاهزة للعمل');
