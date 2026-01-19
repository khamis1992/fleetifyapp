/**
 * إضافة العراف لتقاضي
 * Background Service Worker
 */

// الاستماع لرسائل من صفحات الويب
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveLawsuitData') {
    // حفظ بيانات الدعوى
    chrome.storage.local.set({ 
      alarafLawsuitData: {
        ...request.data,
        savedAt: new Date().toISOString()
      }
    }, () => {
      console.log('[العراف] تم حفظ بيانات الدعوى');
      sendResponse({ success: true });
    });
    return true; // للاستجابة غير المتزامنة
  }
  
  if (request.action === 'getLawsuitData') {
    chrome.storage.local.get(['alarafLawsuitData'], (result) => {
      sendResponse({ data: result.alarafLawsuitData || null });
    });
    return true;
  }

  if (request.action === 'clearLawsuitData') {
    chrome.storage.local.remove('alarafLawsuitData', () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// الاستماع لرسائل من content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveLawsuitData') {
    chrome.storage.local.set({ 
      alarafLawsuitData: {
        ...request.data,
        savedAt: new Date().toISOString()
      }
    }, () => {
      console.log('[العراف] تم حفظ بيانات الدعوى من content script');
      sendResponse({ success: true });
    });
    return true;
  }
});

// عند تثبيت الإضافة
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[العراف] تم تثبيت الإضافة بنجاح');
    // فتح صفحة الترحيب
    chrome.tabs.create({
      url: 'https://www.alaraf.online/legal/overdue-contracts'
    });
  } else if (details.reason === 'update') {
    console.log('[العراف] تم تحديث الإضافة');
  }
});

// تسجيل الإضافة
console.log('[العراف] Background Service Worker loaded');

