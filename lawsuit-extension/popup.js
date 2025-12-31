// Popup Script
// واجهة المستخدم الرئيسية للإضافة

console.log('🚀 Popup loaded');

// ============================================
// عناصر الواجهة
// ============================================

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const dataPreview = document.getElementById('dataPreview');
const fillBtn = document.getElementById('fillBtn');
const openAlarafBtn = document.getElementById('openAlarafBtn');
const openTaqadiBtn = document.getElementById('openTaqadiBtn');
const clearBtn = document.getElementById('clearBtn');

// ============================================
// تحميل البيانات عند فتح النافذة
// ============================================

async function loadStoredData() {
  try {
    const result = await chrome.storage.local.get(['lawsuitData', 'savedAt']);

    if (result.lawsuitData) {
      const data = result.lawsuitData;
      const savedAt = result.savedAt ? new Date(result.savedAt) : null;

      // تحديث الحالة
      statusDot.className = 'status-dot ready';
      statusText.textContent = 'بيانات جاهزة للإرسال';

      // عرض معاينة البيانات
      const defendantName = data.defendant?.name || data.texts?.title?.split('-').pop()?.trim() || 'غير محدد';
      const amount = data.amounts?.total || data.texts?.amount || 0;
      const savedTime = savedAt ? savedAt.toLocaleString('ar-SA') : 'غير محدد';

      dataPreview.innerHTML = `
        <p>
          <span class="label">المدعى عليه:</span>
          <span class="value">${defendantName}</span>
        </p>
        <p>
          <span class="label">المبلغ:</span>
          <span class="value">${Number(amount).toLocaleString('ar-QA')} ر.ق</span>
        </p>
        <p>
          <span class="label">آخر حفظ:</span>
          <span class="value">${savedTime}</span>
        </p>
      `;

      // تفعيل الأزرار
      fillBtn.disabled = false;
      clearBtn.style.display = 'flex';

    } else {
      // لا توجد بيانات
      statusDot.className = 'status-dot no-data';
      statusText.textContent = 'لا توجد بيانات محفوظة';
      dataPreview.innerHTML = `<p class="empty" style="text-align: center; opacity: 0.7;">افتح صفحة تجهيز الدعوى واضغط "إرسال لتقاضي"</p>`;
      fillBtn.disabled = true;
      clearBtn.style.display = 'none';
    }

  } catch (error) {
    console.error('خطأ في تحميل البيانات:', error);
    statusDot.className = 'status-dot';
    statusText.textContent = 'خطأ في التحميل';
  }
}

// ============================================
// ملء البيانات في تقاضي
// ============================================

fillBtn.addEventListener('click', async () => {
  try {
    fillBtn.disabled = true;
    fillBtn.innerHTML = '<span class="icon loading">⏳</span> جاري الملء...';

    // الحصول على التبويب النشط
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // التحقق من أن المستخدم على موقع تقاضي
    if (!tab.url || !tab.url.includes('taqadi.sjc.gov.qa')) {
      alert('يرجى فتح موقع تقاضي أولاً');
      // فتح تقاضي
      chrome.tabs.create({ url: 'https://taqadi.sjc.gov.qa/itc/' });
      fillBtn.disabled = false;
      fillBtn.innerHTML = '<span class="icon">📋</span> ملء البيانات في تقاضي';
      return;
    }

    // إرسال أمر ملء البيانات إلى content script
    chrome.tabs.sendMessage(tab.id, { action: 'fillData' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('خطأ:', chrome.runtime.lastError);
        alert('تأكد من أنك على صفحة تقاضي وأعد تحميل الصفحة');
      } else if (response && response.success) {
        statusText.textContent = '✅ تم ملء البيانات!';
      } else {
        alert('حدث خطأ أثناء ملء البيانات');
      }

      fillBtn.disabled = false;
      fillBtn.innerHTML = '<span class="icon">📋</span> ملء البيانات في تقاضي';
    });

  } catch (error) {
    console.error('خطأ:', error);
    alert('حدث خطأ: ' + error.message);
    fillBtn.disabled = false;
    fillBtn.innerHTML = '<span class="icon">📋</span> ملء البيانات في تقاضي';
  }
});

// ============================================
// فتح صفحة العقود المتأخرة
// ============================================

openAlarafBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://www.alaraf.online/legal/overdue-contracts' });
});

// ============================================
// فتح موقع تقاضي
// ============================================

openTaqadiBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://taqadi.sjc.gov.qa/itc/' });
});

// ============================================
// مسح البيانات
// ============================================

clearBtn.addEventListener('click', async () => {
  if (confirm('هل أنت متأكد من رغبتك في مسح البيانات المحفوظة؟')) {
    await chrome.storage.local.clear();
    loadStoredData();
    statusText.textContent = '🗑️ تم مسح البيانات';
  }
});

// ============================================
// التهيئة
// ============================================

document.addEventListener('DOMContentLoaded', loadStoredData);
