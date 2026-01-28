/**
 * المرحلة 4: تفاصيل الرسوم (80%)
 */
import { SELECTORS, clickXPath } from '../config/selectors.js';
import { sleep } from '../utils/wait.js';
import { logger } from '../utils/logger.js';

export async function fillFees(page) {
  logger.info('💰 المرحلة 4: تفاصيل الرسوم...');
  
  try {
    // على الأرجح فقط مراجعة الرسوم والنقر على "التالي"
    await sleep(2000);
    
    // النقر على "التالي"
    await clickXPath(page, SELECTORS.nextButton);
    await sleep(2000);
    
    logger.success('✅ تم إكمال المرحلة 4');
    return true;
  } catch (error) {
    logger.error('فشلت المرحلة 4', { error: error.message });
    throw error;
  }
}
