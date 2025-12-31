// Background Service Worker - مبسط جداً
// يعمل فقط على الأتمتة التلقائية

console.log('🚀 Lawsuit Extension Background Started - Simple Mode');

// ============================================
// إدارة التخزين
// ============================================

// حفظ بيانات الدعوى
async function saveLawsuitData(data) {
  try {
    await chrome.storage.local.set({
      lawsuitData: data,
      savedAt: new Date().toISOString()
    });
    console.log('✅ تم حفظ بيانات الدعوى');
    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في حفظ البيانات:', error);
    return { success: false, error: error.message };
  }
}

// استرجاع بيانات الدعوى
async function getLawsuitData() {
  try {
    const result = await chrome.storage.local.get(['lawsuitData', 'savedAt']);
    return {
      success: true,
      data: result.lawsuitData || null,
      savedAt: result.savedAt || null
    };
  } catch (error) {
    console.error('❌ خطأ في استرجاع البيانات:', error);
    return { success: false, error: error.message };
  }
}

// مسح البيانات
async function clearData() {
  try {
    await chrome.storage.local.clear();
    console.log('🗑️ تم مسح جميع البيانات');
    return { success: true };
  } catch (error) {
    console.error('❌ خطأ في مسح البيانات:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// معالج الأتمتة الكاملة
// ============================================

async function handleAutomation(data) {
  try {
    console.log('🚀 بدء الأتمتة في background...');

    // التحقق من وجود البيانات
    if (!data) {
      const result = await chrome.storage.local.get(['lawsuitData']);
      data = result.lawsuitData;
    }

    if (!data) {
      throw new Error('لا توجد بيانات محفوظة');
    }

    // فتح موقع تقاضي في تبويب جديد
    const tab = await chrome.tabs.create({
      url: 'https://taqadi.sjc.gov.qa/itc/',
      active: true
    });

    console.log('✅ تم فتح موقع تقاضي في تبويب:', tab.id);

    // انتظار تحميل الصفحة
    await waitForTab(tab.id);

    // إرسال البيانات إلى content script
    await chrome.tabs.sendMessage(tab.id, {
      action: 'autoFill',
      data: data
    });

    console.log('✅ تم إرسال البيانات إلى content script');

    return {
      success: true,
      tabId: tab.id,
      message: 'تم فتح تقاضي وإرسال البيانات'
    };
  } catch (error) {
    console.error('❌ خطأ في الأتمتة:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// انتظار تحميل التبويب
async function waitForTab(tabId) {
  return new Promise((resolve) => {
    const checkReady = () => {
      chrome.tabs.get(tabId, (tab) => {
        if (tab.status === 'complete') {
          resolve();
        } else {
          setTimeout(checkReady, 500);
        }
      });
    };
    checkReady();
  });
}

// ============================================
// الاستماع للرسائل
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📩 رسالة واردة:', request.action);

  switch (request.action) {
    case 'saveLawsuitData':
      saveLawsuitData(request.data).then(sendResponse);
      return true; // للرد غير المتزامن

    case 'getLawsuitData':
      getLawsuitData().then(sendResponse);
      return true;

    case 'clearData':
      clearData().then(sendResponse);
      return true;

    case 'autoFill':
    case 'startAutomation':
      handleAutomation(request.data).then(sendResponse);
      return true;

    case 'ping':
      sendResponse({ status: 'alive' });
      return false;

    default:
      console.log('⚠️ رسالة غير معروفة:', request.action);
      sendResponse({ success: false, error: 'Unknown action' });
      return false;
  }
});

// ============================================
// عند تثبيت الإضافة
// ============================================

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('🎉 تم تثبيت الإضافة بنجاح!');
  } else if (details.reason === 'update') {
    console.log('🔄 تم تحديث الإضافة إلى الإصدار:', chrome.runtime.getManifest().version);
  }
});

console.log('✅ Background Service Worker جاهز للعمل - Simple Mode');
