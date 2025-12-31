// Content Script لموقع taqadi.sjc.gov.qa
// يملأ نموذج الدعوى تلقائياً

console.log('✅ تم تحميل إضافة رفع الدعاوى على تقاضي');

// ============================================
// متغيرات عامة
// ============================================

let currentData = null;
let isInjected = false;

// ============================================
// إضافة أزرار الإضافة إلى الصفحة
// ============================================

function injectButtons() {
  if (isInjected) return;

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

  isInjected = true;
  console.log('✅ تم إضافة أزرار الإضافة');
}

// ============================================
// معالج ملء البيانات
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
// ملء النموذج
// ============================================

async function fillForm(data) {
  console.log('🔄 جاري ملء النموذج...');

  // تجميع البيانات
  const texts = data.texts || {};
  const amounts = data.amounts || {};
  const defendant = data.defendant || {};

  // قائمة الحقول للملء
  const fieldsToFill = [
    // عنوان الدعوى
    {
      value: texts.title || '',
      selectors: [
        'input[name*="subject"]',
        'input[name*="title"]',
        'input[id*="subject"]',
        'input[id*="title"]',
        'input[placeholder*="عنوان"]',
        'input[placeholder*="موضوع"]',
      ]
    },
    // الوقائع
    {
      value: texts.facts || '',
      selectors: [
        'textarea[name*="fact"]',
        'textarea[name*="description"]',
        'textarea[id*="fact"]',
        'textarea[placeholder*="وقائع"]',
        'textarea[placeholder*="وصف"]',
      ]
    },
    // الطلبات
    {
      value: texts.claims || '',
      selectors: [
        'textarea[name*="request"]',
        'textarea[name*="demand"]',
        'textarea[name*="claim"]',
        'textarea[id*="request"]',
        'textarea[placeholder*="طلبات"]',
        'textarea[placeholder*="مطالب"]',
      ]
    },
    // المبلغ
    {
      value: String(texts.amount || amounts.total || 0),
      selectors: [
        'input[name*="amount"]',
        'input[name*="value"]',
        'input[id*="amount"]',
        'input[type="number"]',
        'input[placeholder*="مبلغ"]',
        'input[placeholder*="قيمة"]',
      ]
    },
    // المبلغ كتابة
    {
      value: texts.amountInWords || amounts.totalInWords || '',
      selectors: [
        'input[name*="amountText"]',
        'input[name*="amountWord"]',
        'input[name*="words"]',
        'textarea[name*="amountText"]',
        'input[placeholder*="كتابة"]',
      ]
    },
  ];

  let filledCount = 0;

  for (const field of fieldsToFill) {
    if (!field.value) continue;

    for (const selector of field.selectors) {
      const element = document.querySelector(selector);
      if (element) {
        // ملء الحقل
        element.value = field.value;

        // تشغيل الأحداث
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
// ملء بيانات الأطراف
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
// عرض الإشعارات
// ============================================

function showNotification(message, type = 'info') {
  // إزالة الإشعارات السابقة
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
// الاستماع للرسائل
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📩 رسالة واردة:', request.action);

  if (request.action === 'fillData') {
    handleFillData().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (request.action === 'ping') {
    sendResponse({ status: 'alive', page: 'taqadi' });
    return false;
  }

  return false;
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

// إضافة الأزرار عند تحميل الصفحة
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectButtons);
} else {
  injectButtons();
}

console.log('🚀 إضافة تقاضي جاهزة للعمل');
