/**
 * إضافة العراف لتقاضي
 * Content Script - يعمل على موقع تقاضي
 */

(function() {
  'use strict';

  // التحقق من أننا في صفحة إنشاء دعوى
  const isCreateCasePage = window.location.href.includes('/caseinfoext/create') || 
                           window.location.href.includes('/caseinfo/');

  if (!isCreateCasePage) {
    console.log('[العراف] ليست صفحة إنشاء دعوى');
    return;
  }

  console.log('[العراف] تم تحميل إضافة العراف على تقاضي');

  // إنشاء زر التعبئة التلقائية
  function createAutoFillButton() {
    // التحقق من عدم وجود الزر مسبقاً
    if (document.getElementById('alaraf-autofill-btn')) return;

    const button = document.createElement('button');
    button.id = 'alaraf-autofill-btn';
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3l1.2 3.6a1 1 0 0 0 .8.6H18l-3 2.4a1 1 0 0 0-.4 1l1.2 3.6-3-2.4a1 1 0 0 0-1.2 0l-3 2.4 1.2-3.6a1 1 0 0 0-.4-1L6 7.2h4a1 1 0 0 0 .8-.6L12 3z"/>
      </svg>
      <span>تعبئة من العراف</span>
    `;
    button.className = 'alaraf-autofill-button';
    button.onclick = handleAutoFill;

    document.body.appendChild(button);
  }

  // إنشاء نافذة الحالة
  function createStatusModal() {
    const modal = document.createElement('div');
    modal.id = 'alaraf-status-modal';
    modal.className = 'alaraf-modal hidden';
    modal.innerHTML = `
      <div class="alaraf-modal-content">
        <div class="alaraf-modal-header">
          <h3>🚗 نظام العراف</h3>
          <button class="alaraf-close-btn" onclick="document.getElementById('alaraf-status-modal').classList.add('hidden')">&times;</button>
        </div>
        <div class="alaraf-modal-body" id="alaraf-modal-body">
          <div class="alaraf-loading">
            <div class="alaraf-spinner"></div>
            <p>جاري جلب البيانات...</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // عرض رسالة في النافذة
  function showStatus(message, type = 'info') {
    const modal = document.getElementById('alaraf-status-modal');
    const body = document.getElementById('alaraf-modal-body');
    
    modal.classList.remove('hidden');
    
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      loading: '⏳'
    };

    if (type === 'loading') {
      body.innerHTML = `
        <div class="alaraf-loading">
          <div class="alaraf-spinner"></div>
          <p>${message}</p>
        </div>
      `;
    } else {
      body.innerHTML = `
        <div class="alaraf-status alaraf-status-${type}">
          <span class="alaraf-icon">${icons[type]}</span>
          <p>${message}</p>
        </div>
      `;
    }
  }

  // جلب بيانات الدعوى من التخزين
  async function getLawsuitData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['alarafLawsuitData'], (result) => {
        resolve(result.alarafLawsuitData || null);
      });
    });
  }

  // تعبئة حقل نصي
  function fillTextField(selector, value, description) {
    const field = document.querySelector(selector);
    if (field) {
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`[العراف] تم تعبئة: ${description}`);
      return true;
    }
    console.warn(`[العراف] لم يتم العثور على: ${description}`);
    return false;
  }

  // تعبئة محرر نص (Rich Text Editor)
  function fillRichTextField(selector, value, description) {
    const editor = document.querySelector(selector);
    if (editor) {
      // محاولة تعبئة contenteditable
      const editable = editor.querySelector('[contenteditable="true"]') || editor;
      if (editable.getAttribute('contenteditable') === 'true') {
        editable.innerHTML = value.replace(/\n/g, '<br>');
        editable.dispatchEvent(new Event('input', { bubbles: true }));
        console.log(`[العراف] تم تعبئة محرر: ${description}`);
        return true;
      }
      
      // محاولة تعبئة textarea
      const textarea = editor.querySelector('textarea');
      if (textarea) {
        textarea.value = value;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        console.log(`[العراف] تم تعبئة: ${description}`);
        return true;
      }
    }
    console.warn(`[العراف] لم يتم العثور على محرر: ${description}`);
    return false;
  }

  // النقر على عنصر
  function clickElement(selector, description) {
    const element = document.querySelector(selector);
    if (element) {
      element.click();
      console.log(`[العراف] تم النقر على: ${description}`);
      return true;
    }
    console.warn(`[العراف] لم يتم العثور على: ${description}`);
    return false;
  }

  // الانتظار لظهور عنصر
  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Timeout waiting for ${selector}`));
      }, timeout);
    });
  }

  // التعبئة التلقائية
  async function handleAutoFill() {
    showStatus('جاري جلب بيانات الدعوى...', 'loading');

    try {
      const data = await getLawsuitData();
      
      if (!data) {
        showStatus('لا توجد بيانات دعوى محفوظة. يرجى الذهاب لصفحة تجهيز الدعوى في نظام العراف أولاً.', 'error');
        return;
      }

      console.log('[العراف] البيانات المستلمة:', data);
      showStatus('جاري تعبئة النموذج...', 'loading');

      let filledFields = 0;
      let totalFields = 5;

      // 1. تعبئة عنوان الدعوى
      await new Promise(r => setTimeout(r, 500));
      const titleSelectors = [
        'input[formcontrolname="caseTitle"]',
        'input[name="caseTitle"]',
        '#caseTitle',
        'input[placeholder*="عنوان"]'
      ];
      for (const sel of titleSelectors) {
        if (fillTextField(sel, data.caseTitle, 'عنوان الدعوى')) {
          filledFields++;
          break;
        }
      }

      // 2. تعبئة الوقائع
      await new Promise(r => setTimeout(r, 300));
      const factsSelectors = [
        '[formcontrolname="facts"]',
        '[name="facts"]',
        '#facts',
        '.ql-editor' // Quill editor
      ];
      for (const sel of factsSelectors) {
        if (fillRichTextField(sel, data.facts, 'الوقائع')) {
          filledFields++;
          break;
        }
      }

      // 3. تعبئة الطلبات
      await new Promise(r => setTimeout(r, 300));
      const claimsSelectors = [
        '[formcontrolname="requests"]',
        '[name="requests"]',
        '#requests',
        '.ql-editor'
      ];
      // قد يكون هناك أكثر من محرر Quill
      const quillEditors = document.querySelectorAll('.ql-editor');
      if (quillEditors.length >= 2) {
        quillEditors[1].innerHTML = data.claims.replace(/\n/g, '<br>');
        quillEditors[1].dispatchEvent(new Event('input', { bubbles: true }));
        filledFields++;
        console.log('[العراف] تم تعبئة: الطلبات');
      } else {
        for (const sel of claimsSelectors) {
          if (fillRichTextField(sel, data.claims, 'الطلبات')) {
            filledFields++;
            break;
          }
        }
      }

      // 4. تعبئة المبلغ
      await new Promise(r => setTimeout(r, 300));
      const amountSelectors = [
        'input[formcontrolname="amount"]',
        'input[name="amount"]',
        '#amount',
        'input[type="number"]'
      ];
      for (const sel of amountSelectors) {
        if (fillTextField(sel, data.amount.toString(), 'المبلغ')) {
          filledFields++;
          break;
        }
      }

      // 5. تعبئة المبلغ كتابة
      await new Promise(r => setTimeout(r, 300));
      const amountWordsSelectors = [
        'input[formcontrolname="amountInWords"]',
        'input[name="amountInWords"]',
        '#amountInWords',
        'input[placeholder*="كتابة"]'
      ];
      for (const sel of amountWordsSelectors) {
        if (fillTextField(sel, data.amountInWords, 'المبلغ كتابة')) {
          filledFields++;
          break;
        }
      }

      // عرض النتيجة
      if (filledFields > 0) {
        showStatus(`تم تعبئة ${filledFields} من ${totalFields} حقول بنجاح!<br><br>
          <strong>ملاحظة:</strong> تحقق من البيانات وأكمل الحقول المتبقية يدوياً.`, 'success');
      } else {
        showStatus('لم يتم العثور على الحقول المطلوبة. تأكد أنك في صفحة "تفاصيل الدعوى".', 'error');
      }

    } catch (error) {
      console.error('[العراف] خطأ:', error);
      showStatus(`حدث خطأ: ${error.message}`, 'error');
    }
  }

  // إضافة أحداث الرسائل من الإضافة
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fillForm') {
      handleAutoFill();
      sendResponse({ status: 'started' });
    } else if (request.action === 'checkPage') {
      sendResponse({ 
        isCreatePage: isCreateCasePage,
        url: window.location.href
      });
    }
    return true;
  });

  // تهيئة الإضافة
  function init() {
    createAutoFillButton();
    createStatusModal();
    console.log('[العراف] تم تهيئة الإضافة بنجاح');
  }

  // تشغيل عند تحميل الصفحة
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

