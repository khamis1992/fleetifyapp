// Background Service Worker للإضافة
console.log('🚗 تم تحميل background script لإضافة العراف');

// الاستماع لرسائل من صفحات الويب
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('📩 رسالة خارجية:', request, 'من:', sender);
  
  if (request.action === 'saveLawsuitData') {
    // حفظ البيانات
    const lawsuitData = {
      ...request.data,
      savedAt: new Date().toISOString()
    };
    
    chrome.storage.local.set({ lawsuitData }, () => {
      console.log('✅ تم حفظ بيانات الدعوى');
      sendResponse({ success: true });
    });
    return true; // للإشارة إلى أن الرد سيكون غير متزامن
  }
  
  if (request.action === 'autoFill') {
    // فتح تقاضي وملء البيانات
    handleAutoFill(request.data, sendResponse);
    return true;
  }
  
  if (request.action === 'checkExtension') {
    sendResponse({ installed: true, version: '2.0.0' });
    return true;
  }
});

// الاستماع لرسائل من content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📩 رسالة داخلية:', request);
  
  if (request.action === 'saveLawsuitData') {
    const lawsuitData = {
      ...request.data,
      savedAt: new Date().toISOString()
    };
    
    chrome.storage.local.set({ lawsuitData }, () => {
      console.log('✅ تم حفظ بيانات الدعوى');
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'getLawsuitData') {
    chrome.storage.local.get(['lawsuitData'], (result) => {
      sendResponse({ data: result.lawsuitData });
    });
    return true;
  }
  
  if (request.action === 'autoFill') {
    handleAutoFill(request.data, sendResponse);
    return true;
  }
});

// معالجة الملء التلقائي
async function handleAutoFill(data, sendResponse) {
  try {
    // حفظ البيانات أولاً
    const lawsuitData = {
      ...data,
      savedAt: new Date().toISOString()
    };
    await chrome.storage.local.set({ lawsuitData });
    
    // البحث عن تبويب تقاضي مفتوح
    const tabs = await chrome.tabs.query({ url: 'https://taqadi.sjc.gov.qa/*' });
    
    let taqadiTab;
    if (tabs.length > 0) {
      taqadiTab = tabs[0];
      // تفعيل التبويب
      await chrome.tabs.update(taqadiTab.id, { active: true });
    } else {
      // فتح تبويب جديد
      taqadiTab = await chrome.tabs.create({ 
        url: 'https://taqadi.sjc.gov.qa/itc/',
        active: true
      });
    }
    
    // انتظار تحميل الصفحة ثم محاولة الملء
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === taqadiTab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        
        // انتظار قليل للتأكد من تحميل الصفحة بالكامل
        setTimeout(async () => {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: taqadiTab.id },
              func: attemptAutoFill,
              args: [lawsuitData]
            });
          } catch (e) {
            console.log('⚠️ لم يتم الملء التلقائي، ربما تحتاج لتسجيل الدخول أولاً');
          }
        }, 2000);
      }
    });
    
    sendResponse({ success: true, message: 'تم فتح تقاضي' });
  } catch (error) {
    console.error('❌ خطأ في الأتمتة:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// دالة الملء التلقائي (تُنفذ في صفحة تقاضي)
function attemptAutoFill(data) {
  console.log('🚀 محاولة الملء التلقائي...', data);
  
  // التحقق من أننا في صفحة إنشاء دعوى
  const isCreatePage = window.location.href.includes('create') || 
                       window.location.href.includes('new') ||
                       document.querySelector('form');
  
  if (!isCreatePage) {
    // عرض رسالة للمستخدم
    showFloatingMessage('📋 البيانات جاهزة! انتقل لصفحة إنشاء دعوى جديدة واضغط على زر 🚗');
    return;
  }
  
  // محاولة ملء الحقول
  let filled = 0;
  
  // ملء عنوان الدعوى
  const titleFields = document.querySelectorAll('input[type="text"], textarea');
  for (const field of titleFields) {
    const label = field.closest('label')?.textContent || 
                  field.placeholder || 
                  field.getAttribute('aria-label') || '';
    
    if (label.includes('عنوان') || label.includes('موضوع') || label.includes('subject')) {
      if (data.texts?.title || data.caseTitle) {
        field.value = data.texts?.title || data.caseTitle;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
        console.log('✅ تم ملء عنوان الدعوى');
      }
    }
    
    if (label.includes('وقائع') || label.includes('facts')) {
      if (data.texts?.facts || data.facts) {
        field.value = data.texts?.facts || data.facts;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
        console.log('✅ تم ملء الوقائع');
      }
    }
    
    if (label.includes('طلبات') || label.includes('requests')) {
      if (data.texts?.claims || data.requests) {
        field.value = data.texts?.claims || data.requests;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
        console.log('✅ تم ملء الطلبات');
      }
    }
  }
  
  // ملء المبلغ
  const amountFields = document.querySelectorAll('input[type="number"], input[type="text"]');
  for (const field of amountFields) {
    const label = field.closest('label')?.textContent || 
                  field.placeholder || '';
    
    if (label.includes('مبلغ') || label.includes('قيمة') || label.includes('amount')) {
      if (data.texts?.amount || data.amounts?.total || data.amount) {
        field.value = data.texts?.amount || data.amounts?.total || data.amount;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        filled++;
        console.log('✅ تم ملء المبلغ');
      }
    }
  }
  
  if (filled > 0) {
    showFloatingMessage(`✅ تم ملء ${filled} حقول تلقائياً! راجع البيانات قبل الاعتماد.`);
  } else {
    showFloatingMessage('📋 البيانات جاهزة! اضغط على زر 🚗 لملء النموذج.');
  }
}

// عرض رسالة عائمة
function showFloatingMessage(message) {
  const existing = document.getElementById('alaraf-auto-msg');
  if (existing) existing.remove();
  
  const div = document.createElement('div');
  div.id = 'alaraf-auto-msg';
  div.innerHTML = `
    <div style="position: fixed; top: 20px; left: 50%; transform: translateX(-50%); 
                background: linear-gradient(135deg, #f97316, #ea580c); 
                color: white; padding: 15px 30px; border-radius: 10px; 
                font-size: 16px; z-index: 999999; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl;
                max-width: 90%; text-align: center;">
      ${message}
    </div>
  `;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 7000);
}

// الاستماع لتثبيت الإضافة
chrome.runtime.onInstalled.addListener((details) => {
  console.log('🚗 تم تثبيت/تحديث إضافة العراف:', details.reason);
});
