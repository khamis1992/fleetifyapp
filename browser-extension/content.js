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

  // تعبئة TinyMCE editor
  function fillTinyMCE(iframeId, value, description) {
    try {
      const iframe = document.getElementById(iframeId);
      if (iframe && iframe.contentDocument) {
        const body = iframe.contentDocument.body;
        if (body) {
          body.innerHTML = value.replace(/\n/g, '<br>');
          // Trigger change event on the hidden textarea
          const textareaId = iframeId.replace('_ifr', '');
          const textarea = document.getElementById(textareaId);
          if (textarea) {
            textarea.value = value;
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
          }
          console.log(`[العراف] تم تعبئة TinyMCE: ${description}`);
          return true;
        }
      }
    } catch (e) {
      console.error(`[العراف] خطأ في تعبئة TinyMCE: ${e.message}`);
    }
    return false;
  }

  // تعبئة حقل Kendo بالبحث عن Label
  function fillKendoByLabel(labelText, value, description) {
    try {
      // البحث عن جميع العناصر التي تحتوي على النص
      const labels = document.querySelectorAll('span, label, div');
      for (const label of labels) {
        if (label.textContent?.trim() === labelText) {
          // البحث عن الحقل في نفس الـ parent
          const parent = label.closest('div[class*="form-group"], div[class*="col"], div[class*="field"]');
          if (parent) {
            // البحث عن input من نوع Kendo
            const kendoInput = parent.querySelector('.k-input, input.form-control, input[type="text"]');
            if (kendoInput && !kendoInput.name?.includes('temp')) {
              kendoInput.value = value;
              kendoInput.dispatchEvent(new Event('input', { bubbles: true }));
              kendoInput.dispatchEvent(new Event('change', { bubbles: true }));
              // التركيز ثم إزالة التركيز لتفعيل التحقق
              kendoInput.focus();
              kendoInput.blur();
              console.log(`[العراف] تم تعبئة Kendo: ${description}`);
              return true;
            }
          }
        }
      }
    } catch (e) {
      console.error(`[العراف] خطأ في البحث بالـ label: ${e.message}`);
    }
    return false;
  }

  // تعبئة حقل Kendo الرقمي
  function fillKendoNumeric(labelText, value, description) {
    try {
      const labels = document.querySelectorAll('span, label, div');
      for (const label of labels) {
        if (label.textContent?.trim() === labelText) {
          const parent = label.closest('div[class*="form-group"], div[class*="col"], li');
          if (parent) {
            // البحث عن kendo-numerictextbox
            const numericWidget = parent.querySelector('kendo-numerictextbox, .k-numerictextbox');
            if (numericWidget) {
              const inputs = numericWidget.querySelectorAll('input');
              for (const input of inputs) {
                if (!input.classList.contains('k-formatted-value')) {
                  input.value = value;
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                  input.focus();
                  input.blur();
                }
              }
              console.log(`[العراف] تم تعبئة Kendo Numeric: ${description}`);
              return true;
            }
          }
        }
      }
    } catch (e) {
      console.error(`[العراف] خطأ في تعبئة Kendo Numeric: ${e.message}`);
    }
    return false;
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
      const totalFields = 4; // الوقائع، الطلبات، المبلغ كتابة، + عنوان اختياري

      // انتظار تحميل الصفحة
      await new Promise(r => setTimeout(r, 1000));

      // 1. تعبئة الوقائع - #facts أو textarea[name="facts"]
      console.log('[العراف] محاولة تعبئة الوقائع...');
      if (fillTextField('#facts', data.facts, 'الوقائع') ||
          fillTextField('textarea[name="facts"]', data.facts, 'الوقائع')) {
        filledFields++;
      }

      await new Promise(r => setTimeout(r, 500));

      // 2. تعبئة الطلبات - TinyMCE مع iframe #caseDetails_ifr
      console.log('[العراف] محاولة تعبئة الطلبات...');
      if (fillTinyMCE('caseDetails_ifr', data.claims, 'الطلبات')) {
        filledFields++;
      } else if (fillTextField('#caseDetails', data.claims, 'الطلبات') ||
                 fillTextField('textarea[name="caseDetails"]', data.claims, 'الطلبات')) {
        filledFields++;
      }

      await new Promise(r => setTimeout(r, 500));

      // 3. تعبئة المبلغ كتابة - #totalAmountInText
      console.log('[العراف] محاولة تعبئة المبلغ كتابة...');
      if (fillTextField('#totalAmountInText', data.amountInWords, 'المبلغ كتابة') ||
          fillTextField('input[name="totalAmountInText"]', data.amountInWords, 'المبلغ كتابة')) {
        filledFields++;
      }

      await new Promise(r => setTimeout(r, 500));

      // 4. محاولة تعبئة عنوان الدعوى (Kendo textbox بدون ID)
      console.log('[العراف] محاولة تعبئة عنوان الدعوى...');
      if (fillKendoByLabel('عنوان الدعوى', data.caseTitle, 'عنوان الدعوى')) {
        filledFields++;
      }

      // 5. محاولة تعبئة المبلغ (Kendo numeric)
      console.log('[العراف] محاولة تعبئة المبلغ...');
      if (data.amount && fillKendoNumeric('المبلغ', data.amount.toString(), 'المبلغ')) {
        // نجاح إضافي
      }

      // عرض النتيجة
      if (filledFields > 0) {
        showStatus(`✅ تم تعبئة ${filledFields} من ${totalFields} حقول بنجاح!<br><br>
          <strong>الحقول المعبأة:</strong>
          <ul style="text-align:right; margin-top:10px;">
            <li>الوقائع ✓</li>
            <li>الطلبات ✓</li>
            <li>المبلغ كتابة ✓</li>
          </ul>
          <br><strong>ملاحظة:</strong> تحقق من البيانات وأكمل الحقول المتبقية يدوياً (نوع المطالبة، المبلغ).`, 'success');
      } else {
        showStatus(`❌ لم يتم العثور على الحقول المطلوبة.<br><br>
          <strong>تأكد من:</strong>
          <ul style="text-align:right;">
            <li>أنك في تبويب "تفاصيل الدعوى" (الخطوة 2)</li>
            <li>تم تحميل الصفحة بالكامل</li>
          </ul>`, 'error');
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
    // لا نرجع true لأن جميع الاستجابات متزامنة
    // Return false/undefined for synchronous responses
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

