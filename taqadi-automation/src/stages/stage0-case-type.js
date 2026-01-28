/**
 * المرحلة 0: اختيار نوع الدعوى (0%)
 */
import { SELECTORS, clickXPath, waitForXPath } from '../config/selectors.js';
import { sleep, waitForText } from '../utils/wait.js';
import { logger } from '../utils/logger.js';

export async function fillCaseType(page) {
  logger.info('📝 المرحلة 0: اختيار نوع الدعوى...');
  
  try {
    // 1. اختيار "دعوى مدنية"
    await waitForXPath(page, SELECTORS.caseType.civilCaseRadio);
    await clickXPath(page, SELECTORS.caseType.civilCaseRadio);
    await sleep(500);
    logger.success('اختيار: دعوى مدنية');
    
    // 2. اختيار "إيجار" من القائمة
    // (يجب فتح القائمة أولاً - هذا يعتمد على الواجهة الفعلية)
    await sleep(1000);
    await clickXPath(page, SELECTORS.caseType.rentalCategoryOption);
    await sleep(500);
    logger.success('اختيار: إيجار');
    
    // 3. اختيار "طرد للإخلال بالعقد"
    await sleep(1000);
    await clickXPath(page, SELECTORS.caseType.evictionTypeOption);
    await sleep(500);
    logger.success('اختيار: طرد للإخلال بالعقد');
    
    // 4. النقر على "التالي"
    await sleep(1000);
    await clickXPath(page, SELECTORS.nextButton);
    await sleep(2000);
    
    logger.success('✅ تم إكمال المرحلة 0');
    return true;
  } catch (error) {
    logger.error('فشلت المرحلة 0', { error: error.message });
    throw error;
  }
}
