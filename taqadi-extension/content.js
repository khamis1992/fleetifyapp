// Content script يعمل في صفحة تقاضي
console.log('🚗 تم تحميل إضافة العراف لأتمتة تقاضي');

// الاستماع لرسائل من popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm') {
    fillFormWithData(request.data);
    sendResponse({ success: true });
  }
  return true;
});

// ملء النموذج بالبيانات
function fillFormWithData(data) {
  console.log('📝 جاري ملء النموذج...', data);
  
  // محاولة ملء الحقول المختلفة
  const fields = document.querySelectorAll('input, textarea, select');
  
  fields.forEach(field => {
    const name = (field.name || '').toLowerCase();
    const id = (field.id || '').toLowerCase();
    const placeholder = (field.placeholder || '').toLowerCase();
    
    // عنوان الدعوى
    if (name.includes('subject') || name.includes('title') || 
        id.includes('subject') || id.includes('title') ||
        placeholder.includes('عنوان')) {
      if (data.caseTitle) {
        field.value = data.caseTitle;
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    
    // الوقائع
    if (name.includes('fact') || name.includes('description') ||
        id.includes('fact') || id.includes('description') ||
        placeholder.includes('وقائع')) {
      if (data.facts) {
        field.value = data.facts;
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    
    // الطلبات
    if (name.includes('request') || name.includes('demand') ||
        id.includes('request') || id.includes('demand') ||
        placeholder.includes('طلبات')) {
      if (data.requests) {
        field.value = data.requests;
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    
    // المبلغ
    if (name.includes('amount') || name.includes('value') ||
        id.includes('amount') || id.includes('value') ||
        field.type === 'number') {
      if (data.amount) {
        field.value = data.amount;
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  });
  
  // عرض إشعار نجاح
  showNotification('تم ملء البيانات! راجعها قبل الاعتماد ✅');
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
                font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl;">
      🚗 ${message}
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 5000);
}

// إضافة زر عائم للملء السريع
function addFloatingButton() {
  const existing = document.getElementById('alaraf-float-btn');
  if (existing) return;
  
  const btn = document.createElement('div');
  btn.id = 'alaraf-float-btn';
  btn.innerHTML = `
    <button style="position: fixed; bottom: 20px; left: 20px; 
                   width: 60px; height: 60px; border-radius: 50%; 
                   background: linear-gradient(135deg, #f97316, #ea580c); 
                   border: none; cursor: pointer; 
                   box-shadow: 0 4px 15px rgba(249, 115, 22, 0.4);
                   font-size: 24px; z-index: 999999;
                   display: flex; align-items: center; justify-content: center;
                   transition: transform 0.2s;"
            title="ملء من نظام العراف"
            onmouseover="this.style.transform='scale(1.1)'"
            onmouseout="this.style.transform='scale(1)'">
      🚗
    </button>
  `;
  
  btn.querySelector('button').addEventListener('click', async () => {
    const data = await chrome.storage.local.get(['lawsuitData']);
    if (data.lawsuitData) {
      fillFormWithData(data.lawsuitData);
    } else {
      showNotification('لا توجد بيانات! افتح صفحة تجهيز الدعوى في العراف أولاً ❌');
    }
  });
  
  document.body.appendChild(btn);
}

// تشغيل عند تحميل الصفحة
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addFloatingButton);
} else {
  addFloatingButton();
}

