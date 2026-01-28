/**
 * المرحلة 3: رفع المستندات (60%)
 */
import { SELECTORS, clickXPath, waitForXPath } from '../config/selectors.js';
import { sleep, waitForTableRow } from '../utils/wait.js';
import { logger } from '../utils/logger.js';
import path from 'path';

/**
 * رفع مستند واحد
 */
async function uploadDocument(page, filePath, documentType) {
  const fileName = path.basename(filePath);
  logger.info(`رفع مستند: ${fileName}`);
  
  try {
    // 1. النقر على "إضافة وثيقة"
    await clickXPath(page, SELECTORS.documents.addDocumentButton);
    await sleep(2000);
    
    // 2. اختيار نوع المستند (إذا كان مطلوباً)
    // ملاحظة: قد يحتاج تحديد نوع المستند من قائمة Kendo
    // يمكن تخطي هذه الخطوة إذا لم تكن إلزامية
    
    // 3. رفع الملف
    await waitForXPath(page, SELECTORS.documents.fileInput);
    const fileInput = await page.waitForSelector(`xpath/${SELECTORS.documents.fileInput}`);
    await fileInput.uploadFile(filePath);
    await sleep(1000);
    logger.success(`تم اختيار الملف: ${fileName}`);
    
    // 4. النقر على "حفظ" أو "رفع"
    await sleep(1000);
    await clickXPath(page, SELECTORS.documents.uploadButton);
    await sleep(3000); // انتظار اكتمال الرفع
    
    // 5. التحقق من ظهور المستند في الجدول
    await waitForTableRow(page, fileName, 10000);
    
    logger.success(`✅ تم رفع: ${fileName}`);
    return true;
  } catch (error) {
    logger.error(`فشل رفع المستند: ${fileName}`, { error: error.message });
    throw error;
  }
}

/**
 * المرحلة 3 الكاملة: رفع جميع المستندات
 */
export async function uploadDocuments(page, documentsFiles) {
  logger.info('📄 المرحلة 3: رفع المستندات...');
  
  try {
    // رفع كل مستند
    for (const doc of documentsFiles) {
      await uploadDocument(page, doc.path, doc.type);
      await sleep(1000);
    }
    
    // النقر على "التالي"
    await sleep(1000);
    await clickXPath(page, SELECTORS.nextButton);
    await sleep(2000);
    
    logger.success('✅ تم إكمال المرحلة 3');
    return true;
  } catch (error) {
    logger.error('فشلت المرحلة 3', { error: error.message });
    throw error;
  }
}
