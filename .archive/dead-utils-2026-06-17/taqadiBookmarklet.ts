/**
 * Taqadi Bookmarklet Generator
 * Creates an enhanced bookmarklet for form filling
 */

import type { TaqadiSubmissionData } from '@/services/taqadi';

// ==========================================
// Bookmarklet Configuration
// ==========================================

export interface BookmarkletConfig {
  version: string;
  debug: boolean;
  autoSubmit: boolean;
  highlightFields: boolean;
  showProgress: boolean;
}

// ==========================================
// Selector Mappings (Browser Side)
// ==========================================

const SELECTORS = {
  // Case type
  caseType: 'select[name="caseType"], #caseType',

  // Case title
  caseTitle: 'input[name="caseTitle"], #caseTitle, textarea[name="caseTitle"]',

  // Plaintiff
  plaintiffName: 'input[name="plaintiffName"], #plaintiffName',
  plaintiffCR: 'input[name="plaintiffCR"], #plaintiffCR',
  plaintiffAddress: 'textarea[name="plaintiffAddress"], #plaintiffAddress',
  plaintiffPhone: 'input[name="plaintiffPhone"], #plaintiffPhone',
  plaintiffEmail: 'input[name="plaintiffEmail"], #plaintiffEmail',
  plaintiffIBAN: 'input[name="plaintiffIBAN"], #plaintiffIBAN',
  plaintiffRepName: 'input[name="representativeName"], #representativeName',
  plaintiffRepId: 'input[name="representativeId"], #representativeId',
  plaintiffRepPosition: 'input[name="representativePosition"], #representativePosition',

  // Defendant
  defendantType: 'select[name="defendantType"], #defendantType',
  defendantName: 'input[name="defendantName"], #defendantName',
  defendantId: 'input[name="defendantId"], #defendantId',
  defendantAddress: 'textarea[name="defendantAddress"], #defendantAddress',
  defendantPhone: 'input[name="defendantPhone"], #defendantPhone',
  contractNumber: 'input[name="contractNumber"], #contractNumber',
  vehicleMake: 'input[name="vehicleMake"], #vehicleMake',
  vehicleYear: 'input[name="vehicleYear"], #vehicleYear',
  vehiclePlate: 'input[name="vehiclePlate"], #vehiclePlate',

  // Facts and claims
  facts: 'textarea[name="facts"], #facts, .facts-editor',
  claims: 'textarea[name="claims"], #claims, .claims-editor',

  // Amounts
  principalAmount: 'input[name="principalAmount"], #principalAmount',
  lateFees: 'input[name="lateFees"], #lateFees',
  violationsFines: 'input[name="violationsFines"], #violationsFines',
  otherFees: 'input[name="otherFees"], #otherFees',
  totalAmount: 'input[name="totalAmount"], #totalAmount',
  amountInWords: 'input[name="amountInWords"], textarea[name="amountInWords"], #amountInWords',
  currency: 'select[name="currency"], #currency',

  // Dates
  incidentDate: 'input[name="incidentDate"], #incidentDate, input[type="date"][name*="incident"]',
  claimDate: 'input[name="claimDate"], #claimDate, input[type="date"][name*="claim"]',
};

// ==========================================
// Bookmarklet Code Generator
// ==========================================

/**
 * Generate the bookmarklet JavaScript code
 */
export function generateBookmarkletCode(): string {
  return `
(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    version: '2.0.0',
    debug: true,
    highlightFields: true,
    showProgress: true,
  };

  // Logging utility
  function log(message, type = 'info') {
    if (!CONFIG.debug) return;
    const prefix = '[Taqadi AutoFill]';
    const styles = {
      info: 'color: #3b82f6',
      success: 'color: #22c55e',
      error: 'color: #ef4444',
      warn: 'color: #f59e0b',
    };
    console.log(\`%c\${prefix}\`, styles[type] || styles.info, message);
  }

  // Progress indicator
  function showProgress(message, progress) {
    if (!CONFIG.showProgress) return;

    let progressDiv = document.getElementById('taqadi-progress');
    if (!progressDiv) {
      progressDiv = document.createElement('div');
      progressDiv.id = 'taqadi-progress';
      progressDiv.style.cssText = \`
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 999999;
        min-width: 300px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        direction: rtl;
      \`;
      document.body.appendChild(progressDiv);
    }

    progressDiv.innerHTML = \`
      <div style="font-weight: bold; margin-bottom: 10px; font-size: 16px;">
        🚀 ملء نموذج تقاضي
      </div>
      <div style="font-size: 14px; margin-bottom: 10px;">\${message}</div>
      <div style="background: rgba(255,255,255,0.2); border-radius: 6px; overflow: hidden;">
        <div style="background: white; height: 4px; border-radius: 6px; transition: width 0.3s; width: \${progress}%"></div>
      </div>
      <div style="font-size: 12px; margin-top: 8px; opacity: 0.9;">\${progress}%</div>
    \`;
  }

  function hideProgress() {
    const progressDiv = document.getElementById('taqadi-progress');
    if (progressDiv) {
      progressDiv.remove();
    }
  }

  // Highlight field utility
  function highlightField(element) {
    if (!CONFIG.highlightFields || !element) return;

    element.style.cssText += \`
      border: 2px solid #667eea !important;
      box-shadow: 0 0 10px rgba(102, 126, 234, 0.5) !important;
      transition: all 0.3s !important;
    \`;

    setTimeout(() => {
      element.style.cssText += \`
        border: '' !important;
        box-shadow: '' !important;
      \`;
    }, 2000);
  }

  // Find element using multiple selectors
  function findElement(selectors) {
    if (typeof selectors === 'string') {
      selectors = [selectors];
    }

    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) return element;
      } catch (e) {
        // Invalid selector, try next
      }
    }

    return null;
  }

  // Safe fill input
  function fillInput(selectors, value, label) {
    try {
      const element = findElement(selectors);
      if (!element) {
        log(\`Field not found: \${label}\`, 'warn');
        return false;
      }

      // Focus
      element.focus();

      // Clear existing value
      if (element.value !== undefined) {
        element.value = '';
      }

      // Set new value
      if (element.tagName === 'SELECT') {
        element.value = value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Blur
      element.blur();

      highlightField(element);
      log(\`Filled: \${label}\`, 'success');
      return true;

    } catch (error) {
      log(\`Error filling \${label}: \${error.message}\`, 'error');
      return false;
    }
  }

  // Main fill function
  async function fillTaqadiForm(data) {
    const steps = [
      { name: 'ملء نوع الدعوى...', progress: 10 },
      { name: 'ملء بيانات المدعي...', progress: 25 },
      { name: 'ملء بيانات المدعى عليه...', progress: 40 },
      { name: 'ملء الوقائع والطلبات...', progress: 55 },
      { name: 'ملء المبالغ...', progress: 70 },
      { name: 'ملء التواريخ...', progress: 85 },
      { name: 'اكتمل! 🎉', progress: 100 },
    ];

    let filled = 0;
    let total = 0;

    // Step 1: Case type
    showProgress(steps[0].name, steps[0].progress);
    await new Promise(r => setTimeout(r, 500));
    total++; fillInput(\`${SELECTORS.caseType}\`, data.caseType || 'rent', 'نوع الدعوى') && filled++;

    // Step 2: Plaintiff
    showProgress(steps[1].name, steps[1].progress);
    await new Promise(r => setTimeout(r, 500));
    total++; fillInput(\`${SELECTORS.plaintiffName}\`, data.plaintiffName || '', 'اسم المدعي') && filled++;
    total++; fillInput(\`${SELECTORS.plaintiffCR}\`, data.plaintiffCR || '', 'السجل التجاري') && filled++;
    total++; fillInput(\`${SELECTORS.plaintiffAddress}\`, data.plaintiffAddress || '', 'عنوان المدعي') && filled++;
    total++; fillInput(\`${SELECTORS.plaintiffPhone}\`, data.plaintiffPhone || '', 'هاتف المدعي') && filled++;
    total++; fillInput(\`${SELECTORS.plaintiffEmail}\`, data.plaintiffEmail || '', 'بريد المدعي') && filled++;
    total++; fillInput(\`${SELECTORS.plaintiffIBAN}\`, data.plaintiffIBAN || '', 'IBAN المدعي') && filled++;
    total++; fillInput(\`${SELECTORS.plaintiffRepName}\`, data.plaintiffRepName || '', 'اسم الممثل') && filled++;
    total++; fillInput(\`${SELECTORS.plaintiffRepId}\`, data.plaintiffRepId || '', 'هوية الممثل') && filled++;
    total++; fillInput(\`${SELECTORS.plaintiffRepPosition}\`, data.plaintiffRepPosition || '', 'منصب الممثل') && filled++;

    // Step 3: Defendant
    showProgress(steps[2].name, steps[2].progress);
    await new Promise(r => setTimeout(r, 500));
    total++; fillInput(\`${SELECTORS.defendantType}\`, data.defendantType || 'natural_person', 'نوع المدعى عليه') && filled++;
    total++; fillInput(\`${SELECTORS.defendantName}\`, data.defendantName || '', 'اسم المدعى عليه') && filled++;
    total++; fillInput(\`${SELECTORS.defendantId}\`, data.defendantId || '', 'هوية المدعى عليه') && filled++;
    total++; fillInput(\`${SELECTORS.defendantAddress}\`, data.defendantAddress || '', 'عنوان المدعى عليه') && filled++;
    total++; fillInput(\`${SELECTORS.defendantPhone}\`, data.defendantPhone || '', 'هاتف المدعى عليه') && filled++;
    total++; fillInput(\`${SELECTORS.contractNumber}\`, data.contractNumber || '', 'رقم العقد') && filled++;
    total++; fillInput(\`${SELECTORS.vehicleMake}\`, data.vehicleMake || '', 'السيارة') && filled++;
    total++; fillInput(\`${SELECTORS.vehicleYear}\`, data.vehicleYear || '', 'سنة السيارة') && filled++;
    total++; fillInput(\`${SELECTORS.vehiclePlate}\`, data.vehiclePlate || '', 'لوحة السيارة') && filled++;

    // Step 4: Facts and claims
    showProgress(steps[3].name, steps[3].progress);
    await new Promise(r => setTimeout(r, 500));
    total++; fillInput(\`${SELECTORS.caseTitle}\`, data.caseTitle || '', 'عنوان الدعوى') && filled++;
    total++; fillInput(\`${SELECTORS.facts}\`, data.facts || '', 'الوقائع') && filled++;
    total++; fillInput(\`${SELECTORS.claims}\`, data.claims || '', 'الطلبات') && filled++;

    // Step 5: Amounts
    showProgress(steps[4].name, steps[4].progress);
    await new Promise(r => setTimeout(r, 500));
    total++; fillInput(\`${SELECTORS.principalAmount}\`, data.principalAmount || '0', 'المبلغ الأساسي') && filled++;
    total++; fillInput(\`${SELECTORS.lateFees}\`, data.lateFees || '0', 'غرامة التأخير') && filled++;
    total++; fillInput(\`${SELECTORS.violationsFines}\`, data.violationsFines || '0', 'غرامات المخالفات') && filled++;
    total++; fillInput(\`${SELECTORS.otherFees}\`, data.otherFees || '0', 'رسوم أخرى') && filled++;
    total++; fillInput(\`${SELECTORS.totalAmount}\`, data.totalAmount || '0', 'المبلغ الإجمالي') && filled++;
    total++; fillInput(\`${SELECTORS.amountInWords}\`, data.amountInWords || '', 'المبلغ كتابةً') && filled++;
    total++; fillInput(\`${SELECTORS.currency}\`, 'QAR', 'العملة') && filled++;

    // Step 6: Dates
    showProgress(steps[5].name, steps[5].progress);
    await new Promise(r => setTimeout(r, 500));
    total++; fillInput(\`${SELECTORS.incidentDate}\`, data.incidentDate || '', 'تاريخ الواقعة') && filled++;
    total++; fillInput(\`${SELECTORS.claimDate}\`, data.claimDate || '', 'تاريخ الدعوى') && filled++;

    // Done
    showProgress(steps[6].name, steps[6].progress);
    await new Promise(r => setTimeout(r, 1000));

    log(\`Filled \${filled}/\${total} fields\`, 'success');
    setTimeout(hideProgress, 3000);

    return { filled, total };
  }

  // Load data from localStorage
  function loadData() {
    try {
      const dataStr = localStorage.getItem('taqadiAutomationData');
      const timestamp = localStorage.getItem('taqadiAutomationTimestamp');

      if (!dataStr) {
        alert('❌ لم يتم العثور على بيانات!\\n\\nاذهب لصفحة تجهيز الدعوى واضغط "رفع تلقائي" أولاً');
        return null;
      }

      // Check if data is recent (within 1 hour)
      const age = Date.now() - parseInt(timestamp || '0');
      if (age > 60 * 60 * 1000) {
        if (!confirm('⚠️ البيانات قديمة (أكثر من ساعة). هل تريد المتابعة؟')) {
          return null;
        }
      }

      const data = JSON.parse(dataStr);

      // Convert fields to flat format expected by bookmarklet
      const fields = data.fields || {};
      const formData = {
        caseType: fields.defendant_type === 'legal_entity' ? 'commercial' : 'rent',
        plaintiffName: fields.plaintiff_name || '',
        plaintiffCR: fields.plaintiff_cr || '',
        plaintiffAddress: fields.plaintiff_address || '',
        plaintiffPhone: fields.plaintiff_phone || '',
        plaintiffEmail: fields.plaintiff_email || '',
        plaintiffIBAN: fields.plaintiff_iban || '',
        plaintiffRepName: fields.plaintiff_rep_name || '',
        plaintiffRepId: fields.plaintiff_rep_id || '',
        plaintiffRepPosition: fields.plaintiff_rep_position || '',
        defendantType: fields.defendant_type || 'natural_person',
        defendantName: fields.defendant_name || '',
        defendantId: fields.defendant_id || '',
        defendantAddress: fields.defendant_address || '',
        defendantPhone: fields.defendant_phone || '',
        contractNumber: fields.defendant_contract || '',
        vehicleMake: fields.defendant_vehicle ? fields.defendant_vehicle.split(' ')[0] : '',
        vehicleYear: fields.defendant_vehicle ? fields.defendant_vehicle.split(' ')[2] : '',
        vehiclePlate: fields.defendant_vehicle ? fields.defendant_vehicle.split(' - ')[1] : '',
        caseTitle: fields.case_title || '',
        facts: fields.case_facts || '',
        claims: fields.case_claims || '',
        principalAmount: fields.amount_principal || '0',
        lateFees: fields.amount_late_fees || '0',
        violationsFines: fields.amount_violations || '0',
        otherFees: fields.amount_other || '0',
        totalAmount: fields.amount_total || '0',
        amountInWords: fields.amount_words || '',
        incidentDate: fields.date_incident || '',
        claimDate: fields.date_claim || '',
      };

      return formData;
    } catch (error) {
      console.error('Error loading data:', error);
      alert('❌ خطأ في قراءة البيانات: ' + error.message);
      return null;
    }
  }

  // Main execution
  async function main() {
    log('Starting Taqadi AutoFill...');

    const data = loadData();
    if (!data) return;

    // Show confirmation
    const confirmed = confirm(\`📋 جاري ملء نموذج تقاضي\\n\\nالعنوان: \${data.caseTitle}\\nالمبلغ: \${data.totalAmount} ريال\\n\\nهل تريد المتابعة؟\`);

    if (!confirmed) {
      log('Cancelled by user', 'warn');
      return;
    }

    log('Filling form...');
    const result = await fillTaqadiForm(data);

    // Show completion message
    if (result.filled > 0) {
      setTimeout(() => {
        alert(\`✅ تم ملء النموذج بنجاح!\\n\\nتم تعبئة \${result.filled} حقل من أصل \${result.total}\\n\\nيرجى مراجعة البيانات والتأكد من صحتها قبل الإرسال.\`);
      }, 500);
    }
  }

  // Run
  main();
})();
`;
}

/**
 * Generate the bookmarklet URL (for adding to browser favorites)
 */
export function generateBookmarkletUrl(): string {
  const code = generateBookmarkletCode();

  // Minify by removing unnecessary whitespace
  const minified = code
    .replace(/\s+/g, ' ')
    .replace(/;\s*/g, ';')
    .replace(/\{\s*/g, '{')
    .replace(/\}\s*/g, '}')
    .replace(/'\s*/g, "'")
    .replace(/"\s*/g, '"');

  // Encode as URI component
  const encoded = encodeURIComponent('javascript:' + minified);

  return encoded;
}

/**
 * Generate HTML for bookmarklet installation
 */
export function generateBookmarkletHtml(): string {
  const url = generateBookmarkletUrl();

  return `
<a
  href="${url}"
  onclick="alert('اسحب هذا الزر إلى شريط المفضلة'); return false;"
  style="
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: all 0.3s;
    cursor: move;
  "
  onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(0,0,0,0.2)';"
  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';"
  draggable="true"
>
  🚀 ملء تقاضي
</a>
  `.trim();
}

/**
 * Copy bookmarklet to clipboard
 */
export async function copyBookmarkletToClipboard(): Promise<boolean> {
  try {
    const url = 'javascript:' + generateBookmarkletCode();
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('Failed to copy bookmarklet:', error);
    return false;
  }
}
