// Content script يعمل في صفحة تقاضي
console.log('🚗 تم تحميل إضافة العراف لأتمتة تقاضي v2.1');

// متغير لتخزين البيانات
let cachedLawsuitData = null;

// الاستماع لرسائل من popup و background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📩 رسالة من الإضافة:', request);
  
  if (request.action === 'fillForm') {
    fillFormWithData(request.data);
    sendResponse({ success: true });
  } else if (request.action === 'checkPage') {
    sendResponse({ 
      url: window.location.href,
      hasForm: !!document.querySelector('form'),
      isLoggedIn: !window.location.href.includes('login')
    });
  } else if (request.action === 'setData') {
    cachedLawsuitData = request.data;
    chrome.storage.local.set({ lawsuitData: request.data });
    sendResponse({ success: true });
  }
  // جميع الاستجابات متزامنة، لا حاجة لـ return true
});

// التحقق من البيانات المحفوظة عند تحميل الصفحة
async function checkForSavedData() {
  try {
    // أولاً: التحقق من chrome.storage
    const result = await chrome.storage.local.get(['lawsuitData']);
    if (result.lawsuitData) {
      cachedLawsuitData = result.lawsuitData;
      console.log('📋 بيانات محفوظة موجودة في storage:', cachedLawsuitData);
    }
    
    // إضافة الزر العائم
    addFloatingButton();
    
    // إذا كانت البيانات جديدة (أقل من 10 دقائق)، حاول الملء التلقائي
    if (cachedLawsuitData) {
      const savedAt = new Date(cachedLawsuitData.savedAt);
      const now = new Date();
      const diffMinutes = (now - savedAt) / 1000 / 60;
      
      console.log('⏱️ عمر البيانات:', diffMinutes.toFixed(1), 'دقيقة');
      
      if (diffMinutes < 10) {
        // انتظار تحميل الصفحة
        waitForPageLoad().then(() => {
          if (isOnCreatePage()) {
            showNotification('🚀 تم اكتشاف بيانات جديدة! جاري ملء النموذج...');
            setTimeout(() => fillFormWithData(cachedLawsuitData), 1500);
          } else {
            showNotification('📋 البيانات جاهزة! انتقل لصفحة إنشاء دعوى جديدة');
          }
        });
      }
    }
  } catch (e) {
    console.log('⚠️ خطأ في التحقق من البيانات:', e);
    addFloatingButton();
  }
}

// انتظار تحميل الصفحة بالكامل
function waitForPageLoad() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      setTimeout(resolve, 1000);
    } else {
      window.addEventListener('load', () => setTimeout(resolve, 1000));
    }
  });
}

// التحقق من أننا في صفحة إنشاء دعوى
function isOnCreatePage() {
  const url = window.location.href.toLowerCase();
  const pageText = document.body.innerText.toLowerCase();
  
  // التحقق من URL
  if (url.includes('create') || url.includes('new') || url.includes('add')) {
    return true;
  }
  
  // التحقق من محتوى الصفحة
  if (pageText.includes('إنشاء دعوى') || pageText.includes('دعوى جديدة')) {
    return true;
  }
  
  // التحقق من وجود نموذج مع حقول معينة
  const form = document.querySelector('form');
  if (form) {
    const formText = form.innerText.toLowerCase();
    if (formText.includes('عنوان') || formText.includes('وقائع') || formText.includes('طلبات')) {
      return true;
    }
  }
  
  return false;
}

// ملء النموذج بالبيانات
function fillFormWithData(data) {
  console.log('📝 جاري ملء النموذج...', data);
  
  if (!data) {
    showNotification('❌ لا توجد بيانات للملء');
    return 0;
  }
  
  let filledCount = 0;
  
  // استخراج البيانات من الهيكل المختلف
  const texts = data.texts || data;
  const title = texts.title || texts.caseTitle || data.caseTitle;
  const facts = texts.facts || data.facts;
  const claims = texts.claims || texts.requests || data.requests;
  const amount = texts.amount || data.amounts?.total || data.amount;
  const amountInWords = texts.amountInWords || data.amounts?.totalInWords || data.amountText;
  
  console.log('📊 البيانات المستخرجة:', { title, facts: facts?.substring(0, 50), claims: claims?.substring(0, 50), amount });
  
  // البحث عن جميع الحقول
  const allInputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea');
  
  console.log('🔍 عدد الحقول الموجودة:', allInputs.length);
  
  // دالة مساعدة لملء حقل
  function fillField(field, value, fieldName) {
    if (!field || !value) return false;
    
    // التحقق من أن الحقل قابل للتعديل
    if (field.disabled || field.readOnly) {
      console.log(`⚠️ الحقل ${fieldName} غير قابل للتعديل`);
      return false;
    }
    
    try {
      // التركيز على الحقل
      field.focus();
      
      // مسح القيمة الحالية
      field.value = '';
      
      // تعيين القيمة الجديدة
      field.value = value;
      
      // إطلاق أحداث متعددة للتأكد من التقاط التغيير
      ['input', 'change', 'blur', 'keyup'].forEach(eventType => {
        field.dispatchEvent(new Event(eventType, { bubbles: true }));
      });
      
      // لـ Angular/React - استخدام native setter
      const descriptor = Object.getOwnPropertyDescriptor(
        field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value'
      );
      if (descriptor && descriptor.set) {
        descriptor.set.call(field, value);
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      console.log(`✅ تم ملء ${fieldName}`);
      filledCount++;
      return true;
    } catch (e) {
      console.error(`❌ خطأ في ملء ${fieldName}:`, e);
      return false;
    }
  }
  
  // البحث عن الحقول بعدة طرق
  function findAndFillField(keywords, value, fieldName) {
    if (!value) {
      console.log(`⚠️ لا توجد قيمة لـ ${fieldName}`);
      return false;
    }
    
    // البحث في جميع الحقول
    for (const field of allInputs) {
      const name = (field.name || '').toLowerCase();
      const id = (field.id || '').toLowerCase();
      const placeholder = (field.placeholder || '').toLowerCase();
      const ariaLabel = (field.getAttribute('aria-label') || '').toLowerCase();
      const className = (field.className || '').toLowerCase();
      
      // البحث عن label مرتبط
      let labelText = '';
      const labelFor = document.querySelector(`label[for="${field.id}"]`);
      if (labelFor) {
        labelText = labelFor.textContent.toLowerCase();
      }
      // البحث عن label parent
      const parentLabel = field.closest('label');
      if (parentLabel) {
        labelText += ' ' + parentLabel.textContent.toLowerCase();
      }
      // البحث عن label sibling
      const prevSibling = field.previousElementSibling;
      if (prevSibling && prevSibling.tagName === 'LABEL') {
        labelText += ' ' + prevSibling.textContent.toLowerCase();
      }
      
      const allText = `${name} ${id} ${placeholder} ${ariaLabel} ${className} ${labelText}`;
      
      for (const keyword of keywords) {
        if (allText.includes(keyword.toLowerCase())) {
          console.log(`🎯 وجدت حقل ${fieldName} عبر: ${keyword}`);
          if (fillField(field, value, fieldName)) {
            return true;
          }
        }
      }
    }
    
    console.log(`❌ لم يتم العثور على حقل ${fieldName}`);
    return false;
  }
  
  // ملء الحقول بالترتيب
  findAndFillField(['عنوان', 'موضوع', 'subject', 'title', 'case_title'], title, 'عنوان الدعوى');
  findAndFillField(['وقائع', 'facts', 'description', 'وصف', 'تفاصيل'], facts, 'الوقائع');
  findAndFillField(['طلبات', 'مطالب', 'requests', 'demands', 'claims', 'مطالبة'], claims, 'الطلبات');
  findAndFillField(['مبلغ', 'قيمة', 'amount', 'value', 'total', 'المطالبة'], amount?.toString(), 'المبلغ');
  findAndFillField(['كتابة', 'بالحروف', 'words', 'text', 'كتابةً'], amountInWords, 'المبلغ كتابةً');
  
  // عرض النتيجة
  if (filledCount > 0) {
    showNotification(`✅ تم ملء ${filledCount} حقول بنجاح! راجع البيانات قبل الاعتماد.`);
  } else {
    showNotification('⚠️ لم يتم العثور على حقول لملئها. جرب الانتقال لصفحة إنشاء الدعوى.');
  }
  
  return filledCount;
}

// عرض إشعار
function showNotification(message) {
  const existing = document.getElementById('alaraf-notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.id = 'alaraf-notification';
  notification.innerHTML = `
    <div style="position: fixed; top: 20px; left: 50%; transform: translateX(-50%); 
                background: linear-gradient(135deg, #f97316, #ea580c); 
                color: white; padding: 15px 30px; border-radius: 10px; 
                font-size: 16px; z-index: 999999; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl;
                max-width: 90%; text-align: center; cursor: pointer;"
         onclick="this.parentElement.remove()">
      🚗 ${message}
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 7000);
}

// إضافة زر عائم للملء السريع
function addFloatingButton() {
  const existing = document.getElementById('alaraf-float-btn');
  if (existing) return;
  
  const btn = document.createElement('div');
  btn.id = 'alaraf-float-btn';
  btn.innerHTML = `
    <button id="alaraf-fill-btn" style="position: fixed; bottom: 20px; left: 20px; 
                   width: 60px; height: 60px; border-radius: 50%; 
                   background: linear-gradient(135deg, #f97316, #ea580c); 
                   border: none; cursor: pointer; 
                   box-shadow: 0 4px 15px rgba(249, 115, 22, 0.4);
                   font-size: 24px; z-index: 999999;
                   display: flex; align-items: center; justify-content: center;
                   transition: all 0.3s ease;"
            title="ملء من نظام العراف">
      🚗
    </button>
    <div id="alaraf-tooltip" style="position: fixed; bottom: 90px; left: 20px;
                                    background: #333; color: white; padding: 8px 12px;
                                    border-radius: 6px; font-size: 12px; z-index: 999999;
                                    display: none; white-space: nowrap;
                                    font-family: 'Segoe UI', Tahoma, sans-serif;">
      اضغط لملء البيانات من العراف
    </div>
  `;
  
  document.body.appendChild(btn);
  
  const fillBtn = document.getElementById('alaraf-fill-btn');
  const tooltip = document.getElementById('alaraf-tooltip');
  
  fillBtn.addEventListener('mouseenter', () => {
    fillBtn.style.transform = 'scale(1.1)';
    tooltip.style.display = 'block';
  });
  
  fillBtn.addEventListener('mouseleave', () => {
    fillBtn.style.transform = 'scale(1)';
    tooltip.style.display = 'none';
  });
  
  fillBtn.addEventListener('click', async () => {
    fillBtn.innerHTML = '⏳';
    fillBtn.disabled = true;
    
    try {
      // محاولة جلب البيانات من chrome.storage
      const result = await chrome.storage.local.get(['lawsuitData']);
      
      if (result.lawsuitData) {
        cachedLawsuitData = result.lawsuitData;
        const filled = fillFormWithData(cachedLawsuitData);
        fillBtn.innerHTML = filled > 0 ? '✅' : '⚠️';
      } else {
        showNotification('❌ لا توجد بيانات! افتح صفحة تجهيز الدعوى في العراف واضغط على زر "رفع تلقائي"');
        fillBtn.innerHTML = '❌';
      }
    } catch (e) {
      console.error('خطأ:', e);
      showNotification('❌ حدث خطأ في جلب البيانات');
      fillBtn.innerHTML = '❌';
    }
    
    setTimeout(() => {
      fillBtn.innerHTML = '🚗';
      fillBtn.disabled = false;
    }, 2000);
  });
}

// مراقبة تغييرات الصفحة (لـ SPA)
const observer = new MutationObserver((mutations) => {
  // إعادة إضافة الزر إذا تمت إزالته
  if (!document.getElementById('alaraf-float-btn')) {
    addFloatingButton();
  }
});

// تشغيل عند تحميل الصفحة
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    checkForSavedData();
    observer.observe(document.body, { childList: true, subtree: true });
  });
} else {
  checkForSavedData();
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

// مراقبة تغيير URL (للـ SPA)
let lastUrl = window.location.href;
setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    console.log('🔄 تغير URL:', lastUrl);
    // إعادة التحقق من البيانات عند تغيير الصفحة
    setTimeout(checkForSavedData, 1000);
  }
}, 1000);
