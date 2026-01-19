// Content Script مبسط لموقع taqadi.sjc.gov.qa
// يملأ النماذج ويرفع الملفات تلقائياً بدون تدخل يدوي

console.log('✅ تم تحميل الإضافة المبسطة لموقع تقاضي');

// ============================================
// المتغيرات العامة
// ============================================

let automationStatus = 'idle'; // idle, processing, completed, error

// ============================================
// الاستماع للرسائل من background script
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📩 رسالة واردة:', request.action);

  // رسالة بدء الأتمتة الكاملة
  if (request.action === 'autoFill') {
    handleAutoFill(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => {
        console.error('خطأ في الأتمتة:', error);
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
      min-width: 350px;
      direction: rtl;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <h3 style="margin: 0 0 15px 0; color: #10b981; font-size: 18px; display: flex; align-items: center; gap: 8px;">
        <span>🤖</span>
        <span>جاري رفع الدعوى تلقائياً...</span>
      </h3>
      <div id="progress-bar" style="
        width: 100%;
        height: 10px;
        background: #e5e7eb;
        border-radius: 5px;
        margin-bottom: 15px;
        overflow: hidden;
      ">
        <div id="progress-fill" style="
          width: 0%;
          height: 100%;
          background: linear-gradient(90deg, #10b981, #059669);
          border-radius: 5px;
          transition: width 0.5s ease;
        "></div>
      </div>
      <div id="progress-steps" style="display: flex; flex-direction: column; gap: 8px;">
        <div class="step" style="display: flex; align-items: center; gap: 8px; color: #6b7280; font-size: 14px;">
          <span style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: #e5e7eb; border-radius: 50%; font-size: 12px;">1</span>
          <span>تحميل الصفحة...</span>
        </div>
      </div>
      <p id="progress-text" style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
        جاري التجهيز...
      </p>
    </div>
  `;
  document.body.appendChild(progressUI);
}

function updateProgress(text, percentage) {
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const stepsContainer = document.getElementById('progress-steps');

  if (progressFill) {
    progressFill.style.width = `${percentage}%`;
  }

  if (progressText) {
    progressText.textContent = text;
  }

  if (stepsContainer && percentage > 0) {
    const stepNumber = Math.ceil(percentage / 20); // 5 خطوات إجمالية
    updateStepsUI(stepNumber, text);
  }

  console.log(`✅ ${text} (${percentage}%)`);
}

function updateStepsUI(currentStep, statusText) {
  const stepsContainer = document.getElementById('progress-steps');
  if (!stepsContainer) return;

  const steps = [
    'تحميل الصفحة',
    'التحقق من تسجيل الدخول',
    'بدء دعوى جديدة',
    'اختيار نوع الدعوى',
    'ملء البيانات',
    'رفع المستندات'
  ];

  stepsContainer.innerHTML = steps.map((step, index) => {
    const isCompleted = index + 1 < currentStep;
    const isCurrent = index + 1 === currentStep;
    const isPending = index + 1 > currentStep;

    return `
      <div class="step" style="
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px;
        border-radius: 8px;
        background: ${isCompleted ? '#d1fae5' : isCurrent ? '#dbeafe' : 'transparent'};
        color: ${isCompleted || isCurrent ? '#065f46' : '#6b7280'};
        font-size: 14px;
        transition: all 0.3s ease;
      ">
        <span style="
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${isCompleted ? '#10b981' : isCurrent ? '#3b82f6' : '#e5e7eb'};
          color: white;
          border-radius: 50%;
          font-weight: bold;
          font-size: 14px;
        ">
          ${isCompleted ? '✓' : index + 1}
        </span>
        <span>${step}</span>
        ${isCompleted ? '<span style="margin-left: auto; color: #10b981;">✓</span>' : ''}
        ${isCurrent ? '<span style="margin-left: auto; color: #3b82f6;">⏳</span>' : ''}
      </div>
    `;
  }).join('');
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
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      padding: 30px 40px;
      border-radius: 16px;
      box-shadow: 0 8px 30px rgba(16, 185, 129, 0.4);
      z-index: 1000000;
      font-size: 18px;
      font-weight: 600;
      animation: scaleIn 0.3s ease;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
      <div style="margin-bottom: 8px;">تمت الأتمتة بنجاح!</div>
      <div style="font-size: 14px; opacity: 0.9;">راجع البيانات واضغط "اعتماد"</div>
    </div>
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'scaleOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

function showErrorNotification(message) {
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      padding: 30px 40px;
      border-radius: 16px;
      box-shadow: 0 8px 30px rgba(239, 68, 68, 0.4);
      z-index: 1000000;
      font-size: 18px;
      font-weight: 600;
      animation: scaleIn 0.3s ease;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
      <div>${message}</div>
    </div>
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'scaleOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
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
      'input[placeholder*="عنوان"]',
      'input[placeholder*="موضوع"]'
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
      'textarea[name*="claim"]',
      'textarea[name*="demand"]'
    ], texts.claims);
    console.log('✅ الطلبات');
  }

  // ملء المبلغ
  if (texts.amount || amounts.total) {
    const amount = String(texts.amount || amounts.total);
    await fillField([
      'input[name*="amount"]',
      'input[type="number"]',
      'input[placeholder*="مبلغ"]',
      'input[placeholder*="قيمة"]'
    ], amount);
    console.log('✅ المبلغ:', amount);
  }

  // ملء المبلغ كتابة
  if (texts.amountInWords || amounts.totalInWords) {
    const amountInWords = texts.amountInWords || amounts.totalInWords;
    await fillField([
      'input[name*="amountWord"]',
      'input[name*="amountText"]',
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
      'input[name*="name"]',
      'input[name*="defendantName"]'
    ], name);
    console.log('✅ الاسم:', name);
  }

  // رقم الهوية
  if (defendant.nationalId || defendant.defendantIdNumber) {
    const idNumber = defendant.nationalId || defendant.defendantIdNumber;
    await fillField([
      'input[name*="id"]',
      'input[placeholder*="هوية"]',
      'input[name*="national"]',
      'input[name*="nationalId"]'
    ], idNumber);
    console.log('✅ رقم الهوية:', idNumber);
  }

  // رقم الهاتف
  if (defendant.phone || defendant.defendantPhone) {
    const phone = defendant.phone || defendant.defendantPhone;
    await fillField([
      'input[name*="phone"]',
      'input[placeholder*="هاتف"]',
      'input[name*="mobile"]',
      'input[name*="defendantPhone"]'
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
  @keyframes scaleIn {
    from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
    to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  }
  @keyframes scaleOut {
    from { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    to { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
  }
`;
document.head.appendChild(style);

console.log('🚀 الإضافة المبسطة جاهزة للعمل - لا تدخل يدوي مطلوب');
