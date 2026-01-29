/**
 * إعداد جلسة تسجيل الدخول
 * يفتح متصفح لتسجيل الدخول يدوياً وحفظ الجلسة
 */

import puppeteer from 'puppeteer';
import { logger } from './utils/logger.js';

const USER_DATA_DIR = './taqadi-user-data';

async function setupLoginSession() {
  logger.info('🔧 إعداد جلسة تسجيل الدخول...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: USER_DATA_DIR,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  logger.info('📱 فتح صفحة تسجيل الدخول...');
  await page.goto('http://localhost:8080/auth', { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  logger.info('\n' + '='.repeat(60));
  logger.info('📝 يرجى تسجيل الدخول في المتصفح المفتوح:');
  logger.info('   البريد الإلكتروني: khamis-1992@hotmail.com');
  logger.info('   كلمة المرور: 123456789');
  logger.info('='.repeat(60) + '\n');
  
  logger.info('⏳ بعد تسجيل الدخول بنجاح، أغلق المتصفح...');
  logger.info('💾 سيتم حفظ الجلسة في: ' + USER_DATA_DIR + '\n');
  
  // انتظار إغلاق المتصفح يدوياً
  await new Promise((resolve) => {
    browser.on('disconnected', resolve);
  });
  
  logger.success('✅ تم حفظ جلسة تسجيل الدخول بنجاح!');
  logger.info('🚀 يمكنك الآن تشغيل الأتمتة بدون الحاجة لتسجيل الدخول مرة أخرى\n');
}

setupLoginSession().catch((error) => {
  logger.error('❌ فشل إعداد الجلسة:', error);
  process.exit(1);
});
