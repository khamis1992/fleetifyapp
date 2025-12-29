/**
 * إضافة العراف لتقاضي
 * Popup Script - Updated with copy buttons for each field
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

  // نسخ نص للحافظة
  async function copyToClipboard(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      const originalText = button.textContent;
      button.textContent = '✓ تم!';
      button.style.background = '#10b981';
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
      }, 1500);
    } catch (e) {
      alert('فشل النسخ');
    }
  }

  // تحديث واجهة المستخدم
  async function updateUI() {
    const data = await getLawsuitData();
    const pageInfo = await checkCurrentPage();

    loading.style.display = 'none';
    mainContent.style.display = 'block';

    if (data) {
      // يوجد بيانات - عرضها مع أزرار نسخ
      const savedDate = data.savedAt ? new Date(data.savedAt).toLocaleString('ar-QA') : 'غير معروف';
      
      dataStatus.innerHTML = `
        <div class="status-header">
          <div class="status-icon ready">✅</div>
          <div>
            <div class="status-title">بيانات الدعوى جاهزة</div>
            <div class="status-subtitle">حُفظت في: ${savedDate}</div>
          </div>
        </div>
      `;

      // عرض جميع البيانات مع أزرار نسخ
      actionButtons.innerHTML = `
        <div class="data-fields">
          <div class="field-item">
            <label>📌 عنوان الدعوى:</label>
            <div class="field-row">
              <input type="text" value="${data.caseTitle || ''}" readonly class="field-input" id="field-title">
              <button class="copy-btn" data-field="field-title">نسخ</button>
            </div>
          </div>
          
          <div class="field-item">
            <label>📝 الوقائع:</label>
            <div class="field-row">
              <textarea readonly class="field-textarea" id="field-facts">${data.facts || ''}</textarea>
              <button class="copy-btn" data-field="field-facts">نسخ</button>
            </div>
          </div>
          
          <div class="field-item">
            <label>📋 الطلبات:</label>
            <div class="field-row">
              <textarea readonly class="field-textarea" id="field-claims">${data.claims || ''}</textarea>
              <button class="copy-btn" data-field="field-claims">نسخ</button>
            </div>
          </div>
          
          <div class="field-item">
            <label>💰 المبلغ:</label>
            <div class="field-row">
              <input type="text" value="${data.amount || ''}" readonly class="field-input" id="field-amount">
              <button class="copy-btn" data-field="field-amount">نسخ</button>
            </div>
          </div>
          
          <div class="field-item">
            <label>✍️ المبلغ كتابة:</label>
            <div class="field-row">
              <input type="text" value="${data.amountInWords || ''}" readonly class="field-input" id="field-words">
              <button class="copy-btn" data-field="field-words">نسخ</button>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;">
          ${pageInfo.isTaqadi ? `
            <button class="btn btn-primary" id="fillFormBtn">
              ✨ محاولة التعبئة التلقائية
            </button>
          ` : `
            <button class="btn btn-primary" id="openTaqadiBtn">
              🔗 فتح موقع تقاضي
            </button>
          `}
          <button class="btn btn-secondary" id="clearDataBtn">
            🗑️ مسح البيانات
          </button>
        </div>
      `;

      // إضافة أحداث أزرار النسخ
      document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
          const fieldId = this.getAttribute('data-field');
          const field = document.getElementById(fieldId);
          await copyToClipboard(field.value, this);
        });
      });

      // أحداث الأزرار الرئيسية
      if (pageInfo.isTaqadi) {
        document.getElementById('fillFormBtn').addEventListener('click', async () => {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          chrome.tabs.sendMessage(tab.id, { action: 'fillForm' });
        });
      } else {
        document.getElementById('openTaqadiBtn').addEventListener('click', () => {
          chrome.tabs.create({ url: 'https://taqadi.sjc.gov.qa/itc/f/caseinfoext/create' });
          window.close();
        });
      }

      document.getElementById('clearDataBtn').addEventListener('click', async () => {
        await chrome.storage.local.remove('alarafLawsuitData');
        updateUI();
      });

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

  // إضافة الأنماط للحقول
  const style = document.createElement('style');
  style.textContent = `
    .data-fields {
      max-height: 300px;
      overflow-y: auto;
    }
    .field-item {
      margin-bottom: 12px;
    }
    .field-item label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
    }
    .field-row {
      display: flex;
      gap: 8px;
    }
    .field-input {
      flex: 1;
      padding: 8px 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 12px;
      background: #f9f9f9;
    }
    .field-textarea {
      flex: 1;
      padding: 8px 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 11px;
      background: #f9f9f9;
      resize: none;
      height: 60px;
    }
    .copy-btn {
      padding: 8px 12px;
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      transition: background 0.2s;
    }
    .copy-btn:hover {
      background: #c0392b;
    }
  `;
  document.head.appendChild(style);

  // تحديث الواجهة
  updateUI();
});
