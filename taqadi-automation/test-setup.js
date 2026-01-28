/**
 * اختبار الإعداد - التحقق من أن كل شيء يعمل
 */
import { launchBrowser, setupPage } from './src/services/browser.service.js';
import { logger } from './src/utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSetup() {
  logger.info('🧪 بدء اختبار الإعداد...');
  
  let browser;
  
  try {
    // 1. اختبار إطلاق المتصفح
    logger.info('1️⃣ اختبار إطلاق المتصفح...');
    browser = await launchBrowser({
      headless: false,
      downloadPath: path.join(__dirname, 'downloads'),
    });
    logger.success('✅ المتصفح يعمل!');
    
    // 2. اختبار إعداد الصفحة
    logger.info('2️⃣ اختبار إعداد الصفحة...');
    const page = await setupPage(browser, path.join(__dirname, 'downloads'));
    logger.success('✅ الصفحة جاهزة!');
    
    // 3. اختبار الانتقال لصفحة بسيطة
    logger.info('3️⃣ اختبار الانتقال لصفحة...');
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
    logger.success('✅ الانتقال يعمل!');
    
    // 4. اختبار التقاط صورة
    logger.info('4️⃣ اختبار التقاط صورة...');
    const screenshotPath = path.join(__dirname, 'logs', 'test-screenshot.png');
    await page.screenshot({ path: screenshotPath });
    logger.success(`✅ تم التقاط صورة: ${screenshotPath}`);
    
    // 5. اختبار XPath
    logger.info('5️⃣ اختبار XPath...');
    const searchBox = await page.$x('//input[@name="q"]');
    if (searchBox.length > 0) {
      logger.success('✅ XPath يعمل!');
    } else {
      logger.warning('⚠️ لم يتم العثور على عنصر بـ XPath');
    }
    
    logger.success('🎉 جميع الاختبارات نجحت!');
    logger.info('');
    logger.info('النظام جاهز للاستخدام. يمكنك الآن:');
    logger.info('1. تشغيل الأتمتة الكاملة: npm start [contractId]');
    logger.info('2. تشغيل API server: node server.js');
    logger.info('');
    logger.info('⏸️ المتصفح مفتوح - اضغط Ctrl+C للإغلاق');
    
    // إبقاء المتصفح مفتوحاً
    await new Promise(() => {});
    
  } catch (error) {
    logger.error('❌ فشل الاختبار', { error: error.message });
    throw error;
  }
}

testSetup().catch(error => {
  console.error('خطأ:', error);
  process.exit(1);
});
