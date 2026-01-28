/**
 * خدمة إدارة المتصفح
 */
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * إطلاق المتصفح مع User Data Directory
 */
export async function launchBrowser(options = {}) {
  const {
    headless = false,
    userDataDir = path.join(__dirname, '../../taqadi-user-data'),
    downloadPath = path.join(__dirname, '../../downloads'),
  } = options;

  const browser = await puppeteer.launch({
    headless,
    userDataDir,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });

  console.log('✅ تم إطلاق المتصفح بنجاح');
  return browser;
}

/**
 * إعداد صفحة جديدة مع تفعيل التنزيلات
 */
export async function setupPage(browser, downloadPath) {
  const page = await browser.newPage();
  
  // تفعيل التنزيلات
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath,
  });
  
  // إخفاء علامات الأتمتة
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });
  
  console.log('✅ تم إعداد الصفحة');
  return page;
}

/**
 * الانتقال إلى رابط مع retry
 */
export async function navigateWithRetry(page, url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      console.log(`✅ تم الانتقال إلى: ${url}`);
      return true;
    } catch (error) {
      console.error(`محاولة ${i + 1}/${maxRetries} فشلت:`, error.message);
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

/**
 * التقاط صورة للشاشة
 */
export async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(__dirname, '../../logs', `${name}_${timestamp}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  console.log(`📸 تم التقاط صورة: ${filename}`);
  return filename;
}
