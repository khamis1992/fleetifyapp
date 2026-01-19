/**
 * إضافة العراف لتقاضي
 * Content Script for alaraf.online - نقل البيانات للإضافة
 */

(function() {
  'use strict';

  console.log('[العراف] Content script loaded on alaraf.online');

  // مراقبة تغييرات localStorage
  function syncDataToExtension() {
    const dataStr = localStorage.getItem('alarafLawsuitData');
    if (dataStr) {
      try {
        const data = JSON.parse(dataStr);
        console.log('[العراف] تم العثور على بيانات الدعوى:', data);
        
        // حفظ في تخزين الإضافة
        chrome.storage.local.set({ alarafLawsuitData: data }, () => {
          console.log('[العراف] تم نقل البيانات لتخزين الإضافة');
          
          // إظهار تأكيد للمستخدم
          showSyncNotification();
        });
      } catch (e) {
        console.error('[العراف] خطأ في تحليل البيانات:', e);
      }
    }
  }

  // إظهار إشعار التزامن
  function showSyncNotification() {
    // التحقق من عدم وجود الإشعار مسبقاً
    if (document.getElementById('alaraf-sync-notification')) return;

    const notification = document.createElement('div');
    notification.id = 'alaraf-sync-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        z-index: 99999;
        font-family: 'Segoe UI', Arial, sans-serif;
        direction: rtl;
        animation: slideIn 0.3s ease;
        display: flex;
        align-items: center;
        gap: 12px;
      ">
        <span style="font-size: 24px;">✅</span>
        <div>
          <div style="font-weight: bold; font-size: 14px;">تم حفظ بيانات الدعوى!</div>
          <div style="font-size: 12px; opacity: 0.9;">افتح موقع تقاضي واضغط على أيقونة الإضافة</div>
        </div>
      </div>
    `;

    // إضافة الـ CSS للأنيميشن
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);

    // إزالة الإشعار بعد 5 ثواني
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.3s ease reverse';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  // مراقبة تغييرات localStorage
  window.addEventListener('storage', (event) => {
    if (event.key === 'alarafLawsuitData' && event.newValue) {
      console.log('[العراف] تم اكتشاف تغيير في بيانات الدعوى');
      syncDataToExtension();
    }
  });

  // مراقبة النقرات على زر "إرسال للإضافة"
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (button && (button.textContent.includes('إرسال للإضافة') || button.textContent.includes('حفظ بيانات'))) {
      console.log('[العراف] تم الضغط على زر الإرسال');
      // انتظار قليلاً حتى يتم حفظ البيانات
      setTimeout(syncDataToExtension, 500);
    }
  });

  // فحص البيانات عند تحميل الصفحة
  if (window.location.pathname.includes('/legal/lawsuit/prepare')) {
    console.log('[العراف] صفحة تجهيز الدعوى');
    // انتظار تحميل البيانات
    setTimeout(syncDataToExtension, 2000);
  }

  // استماع لرسائل من الصفحة
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'ALARAF_LAWSUIT_DATA') {
      console.log('[العراف] استلام بيانات من الصفحة');
      chrome.storage.local.set({ alarafLawsuitData: event.data.data }, () => {
        console.log('[العراف] تم حفظ البيانات في تخزين الإضافة');
        showSyncNotification();
      });
    }
  });

})();

