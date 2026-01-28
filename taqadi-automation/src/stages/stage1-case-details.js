/**
 * المرحلة 1: تفاصيل الدعوى (20%)
 */
import { SELECTORS, clickXPath, typeXPath, waitForXPath } from '../config/selectors.js';
import { sleep } from '../utils/wait.js';
import { logger } from '../utils/logger.js';

/**
 * ملء Rich Text Editor داخل iframe
 */
async function fillRichTextEditor(page, iframeSelector, htmlContent) {
  try {
    // البحث عن iframe
    const frames = page.frames();
    const targetFrame = frames.find(f => {
      const url = f.url();
      return url.includes('editor') || url.includes('tinymce') || url.includes('kendo');
    });
    
    if (!targetFrame) {
      // محاولة أخرى: استخدام CSS selector
      const iframeElement = await page.$(iframeSelector);
      if (iframeElement) {
        const frame = await iframeElement.contentFrame();
        await frame.evaluate((html) => {
          const editor = document.querySelector('p') || document.body;
          editor.innerHTML = html;
          document.body.dispatchEvent(new Event('input', { bubbles: true }));
          document.body.dispatchEvent(new Event('change', { bubbles: true }));
        }, htmlContent);
        return true;
      }
    } else {
      await targetFrame.evaluate((html) => {
        const editor = document.querySelector('p') || document.body;
        editor.innerHTML = html;
        document.body.dispatchEvent(new Event('input', { bubbles: true }));
        document.body.dispatchEvent(new Event('change', { bubbles: true }));
      }, htmlContent);
      return true;
    }
    
    throw new Error('لم يتم العثور على iframe');
  } catch (error) {
    logger.error('فشل ملء Rich Text Editor', { error: error.message });
    throw error;
  }
}

export async function fillCaseDetails(page, taqadiData) {
  logger.info('📝 المرحلة 1: ملء تفاصيل الدعوى...');
  
  try {
    // 1. ملء عنوان الدعوى
    await waitForXPath(page, SELECTORS.caseDetails.caseTitleInput);
    await typeXPath(page, SELECTORS.caseDetails.caseTitleInput, taqadiData.caseTitle);
    await sleep(500);
    logger.success(`عنوان الدعوى: ${taqadiData.caseTitle}`);
    
    // 2. ملء الوقائع
    await sleep(1000);
    await fillRichTextEditor(page, SELECTORS.caseDetails.factsIframe, taqadiData.facts);
    await sleep(500);
    logger.success('تم ملء الوقائع');
    
    // 3. ملء الطلبات
    await sleep(1000);
    await fillRichTextEditor(page, SELECTORS.caseDetails.claimsIframe, taqadiData.claims);
    await sleep(500);
    logger.success('تم ملء الطلبات');
    
    // 4. ملء قيمة الدعوى بالأرقام
    await sleep(500);
    await typeXPath(page, SELECTORS.caseDetails.amountInput, taqadiData.amount.toString());
    await sleep(500);
    logger.success(`قيمة الدعوى: ${taqadiData.amount}`);
    
    // 5. ملء قيمة الدعوى بالكتابة
    await sleep(500);
    await typeXPath(page, SELECTORS.caseDetails.amountWordsInput, taqadiData.amountInWords);
    await sleep(500);
    logger.success(`قيمة الدعوى بالكتابة: ${taqadiData.amountInWords}`);
    
    // 6. النقر على "التالي"
    await sleep(1000);
    await clickXPath(page, SELECTORS.nextButton);
    await sleep(2000);
    
    logger.success('✅ تم إكمال المرحلة 1');
    return true;
  } catch (error) {
    logger.error('فشلت المرحلة 1', { error: error.message });
    throw error;
  }
}
