/**
 * المرحلة 5: ملخص الدعوى والاعتماد (100%)
 */
import { SELECTORS, clickXPath, waitForXPath } from '../config/selectors.js';
import { sleep, waitForText } from '../utils/wait.js';
import { logger } from '../utils/logger.js';

export async function submitLawsuit(page) {
  logger.info('✅ المرحلة 5: اعتماد ورفع الدعوى...');
  
  try {
    // 1. مراجعة الملخص
    await sleep(2000);
    
    // 2. النقر على "اعتماد"
    await waitForXPath(page, SELECTORS.summary.approveButton);
    await clickXPath(page, SELECTORS.summary.approveButton);
    await sleep(2000);
    
    // 3. تأكيد (إذا ظهرت نافذة تأكيد)
    try {
      const confirmExists = await waitForXPath(page, SELECTORS.summary.confirmButton, 3000);
      if (confirmExists) {
        await clickXPath(page, SELECTORS.summary.confirmButton);
        await sleep(2000);
      }
    } catch (e) {
      // لا توجد نافذة تأكيد
    }
    
    // 4. انتظار رسالة النجاح
    await waitForText(page, 'نجاح', 10000);
    
    // 5. محاولة استخراج رقم الدعوى
    const caseNumber = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const match = bodyText.match(/رقم[:\s]*(\d+)/);
      return match ? match[1] : null;
    });
    
    logger.success(`🎉 تم رفع الدعوى بنجاح!${caseNumber ? ` رقم الدعوى: ${caseNumber}` : ''}`);
    
    return {
      success: true,
      caseNumber,
    };
  } catch (error) {
    logger.error('فشلت المرحلة 5', { error: error.message });
    throw error;
  }
}
