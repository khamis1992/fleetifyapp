/**
 * سكريبت أتمتة تقاضي - يعمل محلياً على جهازك
 * يفتح متصفح Chrome ويملأ نموذج الدعوى تلقائياً
 * 
 * التشغيل:
 * 1. npm install
 * 2. node run-automation.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// قراءة بيانات الدعوى من ملف JSON
const dataFile = path.join(__dirname, 'lawsuit-data.json');

async function runAutomation() {
  // تحقق من وجود ملف البيانات
  if (!fs.existsSync(dataFile)) {
    console.error('❌ ملف lawsuit-data.json غير موجود!');
    console.log('📋 يرجى تحميل ملف البيانات من صفحة تجهيز الدعوى');
    process.exit(1);
  }

  const lawsuitData = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  console.log('✅ تم قراءة بيانات الدعوى:', lawsuitData.caseTitle);

  // فتح المتصفح
  console.log('🚀 جاري فتح المتصفح...');
  const browser = await chromium.launch({
    headless: false, // المتصفح مرئي
    slowMo: 500, // إبطاء للمشاهدة
  });

  const context = await browser.newContext({
    locale: 'ar-QA',
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  try {
    // الذهاب لموقع تقاضي
    console.log('🔗 جاري فتح موقع تقاضي...');
    await page.goto('https://taqadi.sjc.gov.qa/itc/', { waitUntil: 'networkidle' });

    // انتظار تسجيل الدخول
    console.log('⏳ يرجى تسجيل الدخول عبر توثيق...');
    console.log('   (انتظر حتى يتم توجيهك للصفحة الرئيسية)');
    
    // انتظار حتى يتم تسجيل الدخول
    await page.waitForURL('**/home**', { timeout: 300000 }); // 5 دقائق للتسجيل
    console.log('✅ تم تسجيل الدخول!');

    // الذهاب لإنشاء دعوى جديدة
    console.log('📝 جاري الانتقال لإنشاء دعوى...');
    await page.goto('https://taqadi.sjc.gov.qa/itc/f/caseinfo/create', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // اختيار نوع الدعوى
    console.log('📂 جاري اختيار نوع الدعوى...');
    
    // انتظار تحميل القائمة
    await page.waitForSelector('.k-item', { timeout: 10000 }).catch(() => {});
    
    // النقر على "عقود الخدمات التجارية"
    const serviceContracts = page.locator('text=عقود الخدمات التجارية').first();
    if (await serviceContracts.isVisible()) {
      await serviceContracts.click();
      await page.waitForTimeout(1000);
    }

    // النقر على "عقود إيجار السيارات"
    const carRental = page.locator('text=عقود إيجار السيارات').first();
    if (await carRental.isVisible()) {
      await carRental.click();
      await page.waitForTimeout(1000);
    }

    // النقر على التالي
    const nextBtn = page.locator('text=التالي').first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(2000);
    }

    // تعبئة تفاصيل الدعوى
    console.log('✍️ جاري تعبئة تفاصيل الدعوى...');

    // عنوان الدعوى
    const titleInput = page.locator('input').first();
    await titleInput.fill(lawsuitData.caseTitle);

    // الوقائع
    const factsTextarea = page.locator('textarea').first();
    if (await factsTextarea.isVisible()) {
      await factsTextarea.fill(lawsuitData.facts);
    }

    // المبلغ
    const amountInput = page.locator('input[type="number"]').first();
    if (await amountInput.isVisible()) {
      await amountInput.fill(String(lawsuitData.amount));
    }

    console.log('✅ تم تعبئة البيانات الأساسية!');
    console.log('');
    console.log('📋 الخطوات المتبقية:');
    console.log('   1. راجع البيانات المعبأة');
    console.log('   2. أكمل أي حقول إضافية');
    console.log('   3. ارفع المستندات');
    console.log('   4. اضغط "اعتماد" لتقديم الدعوى');
    console.log('');
    console.log('⏳ المتصفح مفتوح - أغلقه عند الانتهاء');

    // انتظار إغلاق المتصفح يدوياً
    await page.waitForEvent('close', { timeout: 0 }).catch(() => {});

  } catch (error) {
    console.error('❌ حدث خطأ:', error.message);
  } finally {
    await browser.close();
    console.log('👋 تم إغلاق المتصفح');
  }
}

runAutomation().catch(console.error);

