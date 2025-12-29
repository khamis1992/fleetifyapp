/**
 * إضافة العراف لتقاضي
 * Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  const loading = document.getElementById('loading');
  const mainContent = document.getElementById('main-content');
  const dataStatus = document.getElementById('data-status');
  const actionButtons = document.getElementById('action-buttons');

  // جلب بيانات الدعوى من التخزين
  async function getLawsuitData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['alarafLawsuitData'], (result) => {
        resolve(result.alarafLawsuitData || null);
      });
    });
  }

  // التحقق من الصفحة الحالية
  async function checkCurrentPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return {
        isTaqadi: tab.url.includes('taqadi.sjc.gov.qa'),
        isAlaraf: tab.url.includes('alaraf.online'),
        url: tab.url
      };
    } catch (e) {
      return { isTaqadi: false, isAlaraf: false, url: '' };
    }
  }

  // تنسيق المبلغ
  function formatAmount(amount) {
    return new Intl.NumberFormat('ar-QA').format(amount) + ' ر.ق';
  }

  // تحديث واجهة المستخدم
  async function updateUI() {
    const data = await getLawsuitData();
    const pageInfo = await checkCurrentPage();

    loading.style.display = 'none';
    mainContent.style.display = 'block';

    if (data) {
      // يوجد بيانات
      const savedDate = data.savedAt ? new Date(data.savedAt).toLocaleString('ar-QA') : 'غير معروف';
      
      dataStatus.innerHTML = `
        <div class="status-header">
          <div class="status-icon ready">✅</div>
          <div>
            <div class="status-title">بيانات الدعوى جاهزة</div>
            <div class="status-subtitle">حُفظت في: ${savedDate}</div>
          </div>
        </div>
        <div class="lawsuit-info">
          <div class="lawsuit-info-item">
            <span class="lawsuit-info-label">المدعى عليه:</span>
            <span class="lawsuit-info-value">${data.defendantName || '-'}</span>
          </div>
          <div class="lawsuit-info-item">
            <span class="lawsuit-info-label">المبلغ:</span>
            <span class="lawsuit-info-value">${formatAmount(data.amount)}</span>
          </div>
          <div class="lawsuit-info-item">
            <span class="lawsuit-info-label">رقم العقد:</span>
            <span class="lawsuit-info-value">${data.contractNumber || '-'}</span>
          </div>
        </div>
      `;

      if (pageInfo.isTaqadi) {
        // في موقع تقاضي
        actionButtons.innerHTML = `
          <button class="btn btn-primary" id="fillFormBtn">
            ✨ تعبئة النموذج تلقائياً
          </button>
          <button class="btn btn-secondary" id="clearDataBtn">
            🗑️ مسح البيانات
          </button>
        `;

        document.getElementById('fillFormBtn').addEventListener('click', async () => {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          chrome.tabs.sendMessage(tab.id, { action: 'fillForm' });
          window.close();
        });

        document.getElementById('clearDataBtn').addEventListener('click', async () => {
          await chrome.storage.local.remove('alarafLawsuitData');
          updateUI();
        });

      } else {
        // ليس في موقع تقاضي
        actionButtons.innerHTML = `
          <div class="alert alert-warning">
            ⚠️ افتح موقع تقاضي لتتمكن من التعبئة التلقائية
          </div>
          <button class="btn btn-primary" id="openTaqadiBtn">
            🔗 فتح موقع تقاضي
          </button>
          <button class="btn btn-secondary" id="clearDataBtn">
            🗑️ مسح البيانات
          </button>
        `;

        document.getElementById('openTaqadiBtn').addEventListener('click', () => {
          chrome.tabs.create({ url: 'https://taqadi.sjc.gov.qa/itc/f/caseinfoext/create' });
          window.close();
        });

        document.getElementById('clearDataBtn').addEventListener('click', async () => {
          await chrome.storage.local.remove('alarafLawsuitData');
          updateUI();
        });
      }

    } else {
      // لا يوجد بيانات
      dataStatus.innerHTML = `
        <div class="status-header">
          <div class="status-icon not-ready">❌</div>
          <div>
            <div class="status-title">لا توجد بيانات دعوى</div>
            <div class="status-subtitle">يرجى تجهيز الدعوى من نظام العراف</div>
          </div>
        </div>
      `;

      actionButtons.innerHTML = `
        <button class="btn btn-primary" id="openAlarafBtn">
          🚗 فتح نظام العراف
        </button>
      `;

      document.getElementById('openAlarafBtn').addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://www.alaraf.online/legal/overdue-contracts' });
        window.close();
      });
    }
  }

  // الاستماع للرسائل من content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'dataUpdated') {
      updateUI();
    }
  });

  // تحديث الواجهة
  updateUI();
});

