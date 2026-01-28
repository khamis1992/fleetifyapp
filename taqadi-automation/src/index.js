/**
 * نقطة البداية - أتمتة رفع الدعاوى على تقاضي
 */
import { launchBrowser, setupPage, navigateWithRetry, takeScreenshot } from './services/browser.service.js';
import { waitForDownload, extractZip, cleanDirectory, getDocumentType } from './services/file.service.js';
import { fillCaseType } from './stages/stage0-case-type.js';
import { fillCaseDetails } from './stages/stage1-case-details.js';
import { fillParties } from './stages/stage2-parties.js';
import { uploadDocuments } from './stages/stage3-documents.js';
import { fillFees } from './stages/stage4-fees.js';
import { submitLawsuit } from './stages/stage5-summary.js';
import { logger } from './utils/logger.js';
import { sleep } from './utils/wait.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * الدالة الرئيسية للأتمتة
 */
export async function automateTaqadiLawsuit(config) {
  const {
    contractId,
    prepareUrl = `http://localhost:8080/legal/lawsuit/prepare/${contractId}`,
    downloadDir = path.join(__dirname, '../downloads'),
    workDir = path.join(__dirname, '../work'),
  } = config;

  let browser;
  let page;
  
  try {
    logger.info('🚀 بدء أتمتة رفع الدعوى...');
    logger.info(`Contract ID: ${contractId}`);
    
    // 1. إطلاق المتصفح
    browser = await launchBrowser({ downloadPath: downloadDir });
    page = await setupPage(browser, downloadDir);
    
    // 2. تنظيف مجلدات العمل
    cleanDirectory(downloadDir);
    cleanDirectory(workDir);
    
    // ========================================
    // الجزء الأول: تنزيل الملفات من صفحة تجهيز الدعوى
    // ========================================
    logger.info('📥 الخطوة 1: تنزيل ملفات الدعوى من Fleetify...');
    
    // الانتقال إلى صفحة تجهيز الدعوى
    await navigateWithRetry(page, prepareUrl);
    await sleep(3000);
    
    // التحقق من تسجيل الدخول
    const isLoginPage = await page.evaluate(() => {
      return document.body.innerText.includes('تسجيل الدخول') || 
             document.body.innerText.includes('البريد الإلكتروني');
    });
    
    if (isLoginPage) {
      logger.warning('⚠️ يجب تسجيل الدخول يدوياً في FleetifyApp');
      logger.info('📍 الصفحة الحالية: صفحة تسجيل الدخول');
      logger.info('⏳ انتظر 30 ثانية لتسجيل الدخول يدوياً...');
      await sleep(30000);
      
      // الانتقال مرة أخرى لصفحة التجهيز
      await navigateWithRetry(page, prepareUrl);
      await sleep(3000);
    }
    
    // انتظار تحميل الصفحة بالكامل
    await page.waitForSelector('button', { timeout: 10000 });
    
    // أولاً: توليد جميع المستندات إذا لم تكن جاهزة
    logger.info('📝 التحقق من المستندات...');
    
    // البحث عن جميع الأزرار وتوليد المستندات إذا لزم الأمر
    const generateButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('توليد جميع المستندات'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    
    if (generateButton) {
      logger.info('🔄 تم النقر على زر توليد جميع المستندات');
      await sleep(3000);
      
      // انتظار اكتمال التوليد
      logger.info('⏳ انتظار اكتمال التوليد (حتى 60 ثانية)...');
      await page.waitForFunction(
        () => {
          const text = document.body.innerText;
          return text.includes('5/5') || text.includes('100%');
        },
        { timeout: 60000 }
      ).catch(() => logger.warning('⚠️ انتهى وقت الانتظار'));
      
      await sleep(2000);
      logger.success('✅ تم توليد المستندات');
    } else {
      logger.info('ℹ️ المستندات قد تكون جاهزة بالفعل');
    }
    
    // البحث عن زر "تحميل الكل ZIP" والنقر عليه
    logger.info('🔍 البحث عن زر تحميل ZIP...');
    
    // أولاً: نطبع جميع الأزرار للتشخيص
    const buttonTexts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button'))
        .map(b => b.textContent.trim())
        .filter(t => t.length > 0 && t.length < 50);
    });
    logger.info(`📋 وجدت ${buttonTexts.length} زر في الصفحة`);
    logger.info(`أمثلة: ${buttonTexts.slice(0, 10).join(', ')}`);
    
    const downloadClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => {
        const text = b.textContent;
        return text.includes('تحميل') && (text.includes('ZIP') || text.includes('الكل'));
      });
      if (btn) {
        btn.click();
        return btn.textContent.trim();
      }
      return null;
    });
    
    if (!downloadClicked) {
      throw new Error('لم يتم العثور على زر تحميل ZIP');
    }
    
    logger.success(`✅ تم النقر على الزر: "${downloadClicked}"`);
    logger.info('⏳ جاري تنزيل ZIP...');
    
    // انتظار اكتمال التنزيل
    const zipFilePath = await waitForDownload(downloadDir, 60000);
    logger.success(`✅ تم تنزيل: ${zipFilePath}`);
    
    // فك ضغط ZIP
    const extractedFiles = extractZip(zipFilePath, workDir);
    logger.success(`✅ تم فك ضغط ${extractedFiles.length} ملف`);
    
    // تحديد الملفات المطلوبة للرفع
    const documentsToUpload = extractedFiles
      .filter(f => !f.name.includes('__MACOSX') && !f.name.startsWith('.'))
      .map(f => ({
        path: f.path,
        name: path.basename(f.name),
        type: getDocumentType(f.name),
      }));
    
    logger.info(`📋 الملفات الجاهزة للرفع: ${documentsToUpload.length}`);
    documentsToUpload.forEach(d => logger.info(`  - ${d.name}`));
    
    // ========================================
    // الجزء الثاني: قراءة بيانات تقاضي من الصفحة
    // ========================================
    logger.info('📖 الخطوة 2: قراءة بيانات تقاضي...');
    
    const taqadiData = await page.evaluate(() => {
      // محاولة قراءة البيانات من الصفحة (إذا كانت معروضة)
      // أو يمكن قراءتها من localStorage/API
      
      // هنا نحتاج لتحديد كيفية قراءة البيانات من صفحة تجهيز الدعوى
      // خيار 1: قراءة من عناصر DOM
      // خيار 2: قراءة من localStorage
      // خيار 3: استدعاء API
      
      return {
        caseTitle: 'دعوى مطالبة مالية', // يجب قراءتها من الصفحة
        facts: 'الوقائع...', // يجب قراءتها
        claims: 'الطلبات...', // يجب قراءتها
        amount: 50000,
        amountInWords: 'خمسون ألف ريال قطري',
      };
    });
    
    logger.success('✅ تم قراءة بيانات تقاضي');
    
    // ========================================
    // الجزء الثالث: الانتقال إلى تقاضي وبدء رفع الدعوى
    // ========================================
    logger.info('🌐 الخطوة 3: الانتقال إلى منصة تقاضي...');
    
    // فتح تبويب جديد لتقاضي
    const taqadiPage = await browser.newPage();
    await navigateWithRetry(taqadiPage, 'https://taqadi.sjc.gov.qa/itc/f/caseinfo/create');
    await sleep(3000);
    
    // التحقق من تسجيل الدخول
    const isLoggedIn = await taqadiPage.evaluate(() => {
      return !document.body.innerText.includes('تسجيل الدخول') || 
             document.body.innerText.includes('إنشاء دعوى');
    });
    
    if (!isLoggedIn) {
      logger.warning('⚠️ يجب تسجيل الدخول يدوياً في تقاضي');
      logger.info('انتظر 60 ثانية لتسجيل الدخول...');
      await sleep(60000);
    }
    
    // ========================================
    // الجزء الرابع: تنفيذ المراحل الست
    // ========================================
    
    // المرحلة 0: نوع الدعوى
    await fillCaseType(taqadiPage);
    await takeScreenshot(taqadiPage, 'stage0-complete');
    
    // المرحلة 1: تفاصيل الدعوى
    await fillCaseDetails(taqadiPage, taqadiData);
    await takeScreenshot(taqadiPage, 'stage1-complete');
    
    // المرحلة 2: أطراف الدعوى
    const partiesData = {
      plaintiff1: {
        type: 'company',
        name: 'شركة العراف لتأجير السيارات',
        role: 'plaintiff',
        order: 1,
        commercialReg: '86',
        phone: '97444417171',
        email: 'alaraf@alaraf.qa',
        address: 'الدوحة - قطر',
        bankDetails: {
          nameAr: 'بنك قطر الوطني',
          nameEn: 'QNB',
          iban: 'QA78CBQA000000004610677455001',
          swift: 'QNBAQAQAXXX',
          address: 'الدوحة قطر',
        },
      },
      plaintiff2: {
        type: 'individual',
        name: 'خميس هاشم الجبر',
        role: 'plaintiff',
        order: 2,
        firstName: 'خميس',
        middleName: 'هاشم',
        lastName: 'الجبر',
        nationality: 'قطر',
        idType: 'بطاقة شخصية قطرية',
        idNumber: '29263400736',
        phone: '97466707063',
        email: 'Khamis-1992@hotmail.com',
        address: 'الدوحة - قطر',
        bankDetails: {
          nameAr: 'بنك قطر الوطني',
          nameEn: 'Qnb',
          iban: 'QA78CBQA000000004610677455001',
          swift: 'QNBAQAQAXXX',
          address: 'الدوحة قطر',
        },
      },
      defendant: {
        type: 'individual',
        name: 'محمد أحمد', // يجب قراءته من البيانات الفعلية
        role: 'defendant',
        order: 1,
        firstName: 'محمد',
        lastName: 'أحمد',
        nationality: 'قطر',
        idType: 'بطاقة شخصية قطرية',
        idNumber: '12345678901',
        phone: '97412345678',
        email: 'test@example.com',
        address: 'الدوحة - قطر',
      },
    };
    
    await fillParties(taqadiPage, partiesData);
    await takeScreenshot(taqadiPage, 'stage2-complete');
    
    // المرحلة 3: المستندات
    await uploadDocuments(taqadiPage, documentsToUpload);
    await takeScreenshot(taqadiPage, 'stage3-complete');
    
    // المرحلة 4: الرسوم
    await fillFees(taqadiPage);
    await takeScreenshot(taqadiPage, 'stage4-complete');
    
    // المرحلة 5: الاعتماد
    const result = await submitLawsuit(taqadiPage);
    await takeScreenshot(taqadiPage, 'stage5-complete');
    
    logger.success('🎉🎉🎉 تمت الأتمتة بنجاح! 🎉🎉🎉');
    
    return result;
    
  } catch (error) {
    logger.error('❌ فشلت الأتمتة', { error: error.message, stack: error.stack });
    
    // التقاط صورة للخطأ
    if (page) {
      await takeScreenshot(page, 'error');
    }
    
    throw error;
  } finally {
    // إبقاء المتصفح مفتوحاً للمراجعة
    logger.info('⏸️ المتصفح مفتوح للمراجعة. اضغط Ctrl+C للإغلاق.');
    // await browser.close();
  }
}

// تشغيل مباشر (للاختبار)
// التحقق من أن الملف يتم تشغيله مباشرة
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMainModule || process.argv[1]?.includes('index.js')) {
  const contractId = process.argv[2] || 'f2ecdec0-2038-45d3-92ac-3f3d455627bb';
  
  logger.info(`🚀 تشغيل مباشر - Contract ID: ${contractId}`);
  
  automateTaqadiLawsuit({ contractId })
    .then(result => {
      logger.success('✅ النتيجة:', result);
      // لا نغلق المتصفح للمراجعة
      // process.exit(0);
    })
    .catch(error => {
      logger.error('❌ خطأ:', error);
      process.exit(1);
    });
}
