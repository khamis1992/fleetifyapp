// Content Script متقدم لموقع تقاضي
// يقوم بملء النماذج ورفع الملفات تلقائياً

console.log('✅ تم تحميل الإضافة المتقدمة لموقع تقاضي');

// ============================================
// المتغيرات العامة
// ============================================

let automationData = null;
let automationStatus = 'idle'; // idle, processing, completed, error

// ============================================
// استقبال رسائل من background script
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📩 رسالة واردة:', request.action);

  if (request.action === 'autoFill') {
    handleAutoFill(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'fillForm') {
    fillForm(request.data)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'uploadFiles') {
    uploadFiles(request.files)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
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
    automationStatus = 'processing';

    // إظهار واجهة التقدم
    showProgressUI();

    // 1. التحقق من تسجيل الدخول
    const isLoggedIn = await checkLoginStatus();
    if (!isLoggedIn) {
      throw new Error('يرجى تسجيل الدخول عبر توثيق أولاً');
    }

    updateProgress('تم تسجيل الدخول ✓', 20);

    // 2. بدء دعوى جديدة
    await startNewLawsuit();
    updateProgress('تم بدء دعوى جديدة ✓', 40);

    // 3. اختيار نوع الدعوى
    await selectLawsuitType();
    updateProgress('تم اختيار نوع الدعوى ✓', 60);

    // 4. ملء بيانات الدعوى
    await fillLawsuitForm(data);
    updateProgress('تم ملء البيانات ✓', 80);

    // 5. رفع الملفات
    if (data.documents) {
      await uploadAllDocuments(data.documents);
      updateProgress('تم رفع المستندات ✓', 100);
    }

    automationStatus = 'completed';
    showSuccessNotification();
    hideProgressUI();

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
// واجهة التقدم
// ============================================

function showProgressUI() {
  // إزالة واجهة موجودة
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

// ============================================
// التحقق من تسجيل الدخول
// ============================================

async function checkLoginStatus() {
  // انتظار تحميل الصفحة
  await wait(2000);

  // التحقق من وجود عناصر تسجيل الدخول
  const loginButton = document.querySelector('button:contains("توثيق")') ||
                      document.querySelector('a:contains("توثيق")');

  return !loginButton;
}

// ============================================
// بدء دعوى جديدة
// ============================================

async function startNewLawsuit() {
  await wait(2000);

  // البحث عن زر "دعوى جديدة"
  const newCaseButton = findElement([
    'button:contains("دعوى جديدة")',
    'button:contains("إنشاء دعوى")',
    'a:contains("دعوى جديدة")',
    '[class*="new-case"]',
    '[class*="create-lawsuit"]'
  ]);

  if (newCaseButton) {
    newCaseButton.click();
    console.log('✅ تم النقر على "دعوى جديدة"');
    await wait(2000);
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
  const commercialButton = findElement([
    'button:contains("عقود الخدمات التجارية")',
    'option:contains("عقود الخدمات التجارية")',
    '[data-type="commercial"]'
  ]);

  if (commercialButton) {
    commercialButton.click();
    console.log('✅ تم اختيار عقود الخدمات التجارية');
    await wait(1000);
  }

  // اختيار عقود إيجار السيارات
  const carRentalButton = findElement([
    'button:contains("عقود إيجار السيارات")',
    'option:contains("عقود إيجار السيارات")',
    'button:contains("إيجار السيارات")',
    '[data-subtype="car-rental"]'
  ]);

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
    await fillField('input[name*="title"], input[name*="subject"], input[placeholder*="عنوان"]', title);
    console.log('✅ عنوان الدعوى:', title);
  }

  // ملء الوقائع
  if (texts.facts) {
    await fillField('textarea[name*="fact"], textarea[placeholder*="وقائع"], textarea[name*="description"]', texts.facts);
    console.log('✅ الوقائع');
  }

  // ملء الطلبات
  if (texts.claims) {
    await fillField('textarea[name*="request"], textarea[placeholder*="طلبات"], textarea[name*="claim"]', texts.claims);
    console.log('✅ الطلبات');
  }

  // ملء المبلغ
  if (texts.amount || amounts.total) {
    const amount = String(texts.amount || amounts.total);
    await fillField('input[name*="amount"], input[type="number"], input[placeholder*="مبلغ"]', amount);
    console.log('✅ المبلغ:', amount);
  }

  // ملء المبلغ كتابة
  if (texts.amountInWords || amounts.totalInWords) {
    const amountInWords = texts.amountInWords || amounts.totalInWords;
    await fillField('input[name*="amountWord"], input[placeholder*="كتابة"], textarea[name*="amountWord"]', amountInWords);
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
    await fillField('input[name*="defendant"], input[placeholder*="اسم"], input[name*="name"]', name);
    console.log('✅ الاسم:', name);
  }

  // رقم الهوية
  if (defendant.nationalId || defendant.defendantIdNumber) {
    const idNumber = defendant.nationalId || defendant.defendantIdNumber;
    await fillField('input[name*="id"], input[placeholder*="هوية"], input[name*="national"]', idNumber);
    console.log('✅ رقم الهوية:', idNumber);
  }

  // رقم الهاتف
  if (defendant.phone || defendant.defendantPhone) {
    const phone = defendant.phone || defendant.defendantPhone;
    await fillField('input[name*="phone"], input[placeholder*="هاتف"], input[name*="mobile"]', phone);
    console.log('✅ رقم الهاتف:', phone);
  }
}

// ============================================
// رفع جميع المستندات
// ============================================

async function uploadAllDocuments(documents) {
  console.log('📎 رفع المستندات...');

  const documentTypes = [
    { key: 'commercialRegister', label: 'السجل التجاري' },
    { key: 'commercialRegisterUrl', label: 'السجل التجاري' },
    { key: 'iban', label: 'شهادة IBAN' },
    { key: 'ibanCertificate', label: 'شهادة IBAN' },
    { key: 'ibanCertificateUrl', label: 'شهادة IBAN' },
    { key: 'idCard', label: 'البطاقة الشخصية' },
    { key: 'representativeId', label: 'البطاقة الشخصية' },
    { key: 'representativeIdUrl', label: 'البطاقة الشخصية' },
    { key: 'memo', label: 'المذكرة الشارحة' },
    { key: 'explanatoryMemo', label: 'المذكرة الشارحة' },
    { key: 'explanatoryMemoUrl', label: 'المذكرة الشارحة' },
    { key: 'documentsList', label: 'كشف المستندات' },
    { key: 'claimsStatement', label: 'كشف المطالبات' },
    { key: 'contract', label: 'عقد الإيجار' },
    { key: 'contractUrl', label: 'عقد الإيجار' },
    { key: 'establishmentRecord', label: 'قيد المنشأة' },
    { key: 'establishmentRecordUrl', label: 'قيد المنشأة' }
  ];

  for (const docType of documentTypes) {
    const url = documents[docType.key];
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
  const elements = Array.from(document.querySelectorAll('button, div, label, span'));
  const relatedElement = elements.find(el =>
    el.textContent && el.textContent.includes(label)
  );

  if (relatedElement) {
    // البحث عن input file في نفس الحاوية
    const container = relatedElement.closest('div');
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

async function fillField(selector, value) {
  const elements = document.querySelectorAll(selector);

  for (const element of elements) {
    try {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));

      // انتظار قصير للتأكد من التحديث
      await wait(100);
      return;
    } catch (error) {
      continue;
    }
  }

  console.log(`⚠️ لم يتم العثور على حقل: ${selector}`);
}

// ============================================
// البحث عن عنصر
// ============================================

function findElement(selectors) {
  for (const selector of selectors) {
    try {
      // محاولة استخدام :contains
      if (selector.includes(':contains(')) {
        const text = selector.match(/:contains\("(.+?)"\)/)[1];
        const allElements = document.querySelectorAll('button, a, option, div');
        const element = Array.from(allElements).find(el =>
          el.textContent && el.textContent.includes(text)
        );
        if (element) return element;
      }

      // محاولة استخدام selector عادي
      const element = document.querySelector(selector);
      if (element) return element;
    } catch (error) {
      continue;
    }
  }

  return null;
}

// ============================================
// الانتظار
// ============================================

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// دوال للمطابقة مع واجهة برمجة التطبيقات القديمة
// ============================================

async function fillForm(data) {
  return fillLawsuitForm(data);
}

async function uploadFiles(files) {
  return uploadAllDocuments(files);
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

console.log('🚀 الإضافة المتقدمة جاهزة للعمل');

