// Service Worker المحسن - يدير البيانات والملفات
// يعمل محلياً في متصفح المستخدم

console.log('🚀 Lawsuit Extension Service Worker started');

// ============================================
// تخزين البيانات
// ============================================

// حفظ بيانات الدعوى
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveLawsuitData') {
    saveLawsuitData(request.data)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // رسالة async
  }

  // جلب البيانات
  if (request.action === 'getLawsuitData') {
    getLawsuitData()
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // مسح البيانات
  if (request.action === 'clearLawsuitData') {
    clearLawsuitData()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // حفظ الملف
  if (request.action === 'saveFile') {
    saveFile(request.fileData)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // جلب ملف
  if (request.action === 'getFile') {
    getFile(request.fileId)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // بدء الأتمتة
  if (request.action === 'startAutomation') {
    startAutomation()
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // ping
  if (request.action === 'ping') {
    sendResponse({ status: 'alive' });
    return false;
  }
});

// ============================================
// دوال التخزين
// ============================================

async function saveLawsuitData(data) {
  try {
    await chrome.storage.local.set({
      lawsuitData: data,
      savedAt: new Date().toISOString()
    });
    console.log('✅ تم حفظ بيانات الدعوى');
  } catch (error) {
    console.error('❌ خطأ في حفظ البيانات:', error);
    throw error;
  }
}

async function getLawsuitData() {
  try {
    const result = await chrome.storage.local.get(['lawsuitData', 'savedAt']);
    return {
      data: result.lawsuitData,
      savedAt: result.savedAt
    };
  } catch (error) {
    console.error('❌ خطأ في جلب البيانات:', error);
    throw error;
  }
}

async function clearLawsuitData() {
  try {
    await chrome.storage.local.remove(['lawsuitData', 'savedAt', 'files']);
    console.log('✅ تم مسح البيانات');
  } catch (error) {
    console.error('❌ خطأ في مسح البيانات:', error);
    throw error;
  }
}

// ============================================
// إدارة الملفات
// ============================================

async function saveFile(fileData) {
  try {
    const result = await chrome.storage.local.get(['files']);
    const files = result.files || {};
    files[fileData.id] = fileData;
    await chrome.storage.local.set({ files });
    console.log(`✅ تم حفظ الملف: ${fileData.name}`);
  } catch (error) {
    console.error('❌ خطأ في حفظ الملف:', error);
    throw error;
  }
}

async function getFile(fileId) {
  try {
    const result = await chrome.storage.local.get(['files']);
    const files = result.files || {};
    return files[fileId];
  } catch (error) {
    console.error('❌ خطأ في جلب الملف:', error);
    throw error;
  }
}

// ============================================
// بدء الأتمتة
// ============================================

async function startAutomation() {
  try {
    console.log('🚀 بدء الأتمتة...');

    // جلب البيانات
    const dataResult = await getLawsuitData();
    if (!dataResult.data) {
      throw new Error('لا توجد بيانات محفوظة');
    }

    // فتح موقع تقاضي في تبويب جديد
    const tab = await chrome.tabs.create({
      url: 'https://taqadi.sjc.gov.qa/itc/',
      active: true
    });

    console.log('✅ تم فتح موقع تقاضي');

    // انتظار تحميل الصفحة
    await waitForTabReady(tab.id);

    // إرسال البيانات إلى content script
    await chrome.tabs.sendMessage(tab.id, {
      action: 'autoFill',
      data: dataResult.data
    });

    return {
      success: true,
      tabId: tab.id
    };
  } catch (error) {
    console.error('❌ خطأ في بدء الأتمتة:', error);
    throw error;
  }
}

// انتظار تحميل التبويب
async function waitForTabReady(tabId) {
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
// تثبيت الإضافة
// ============================================

chrome.runtime.onInstalled.addListener(() => {
  console.log('✅ تم تثبيت إضافة رفع الدعاوى');
});

