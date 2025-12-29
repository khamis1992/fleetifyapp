/**
 * أداة أتمتة تقاضي
 * للتحكم بالمتصفح وتعبئة نماذج الدعاوى تلقائياً
 * 
 * الاستخدام:
 *   node index.js                    - تشغيل عادي مع واجهة تفاعلية
 *   node index.js --file data.json   - تعبئة من ملف JSON
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ألوان للطباعة
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`${colors.cyan}[${step}]${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠️ ${message}${colors.reset}`);
}

// قراءة البيانات من ملف
function loadLawsuitData(filePath) {
  const defaultPath = path.join(__dirname, 'lawsuit-data.json');
  const dataPath = filePath || defaultPath;
  
  if (!fs.existsSync(dataPath)) {
    logError(`ملف البيانات غير موجود: ${dataPath}`);
    logWarning('قم بإنشاء ملف lawsuit-data.json أو استخدم --file لتحديد ملف آخر');
    process.exit(1);
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    return data;
  } catch (error) {
    logError(`خطأ في قراءة ملف البيانات: ${error.message}`);
    process.exit(1);
  }
}

// الانتظار للضغط على Enter
function waitForEnter(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(`\n${colors.yellow}${message}${colors.reset}`, () => {
      rl.close();
      resolve();
    });
  });
}

// تعبئة حقل نصي
async function fillField(page, selector, value, fieldName) {
  try {
    const element = await page.$(selector);
    if (element) {
      await element.fill(value);
      logSuccess(`تم تعبئة: ${fieldName}`);
      return true;
    } else {
      logWarning(`لم يتم العثور على: ${fieldName}`);
      return false;
    }
  } catch (error) {
    logError(`خطأ في تعبئة ${fieldName}: ${error.message}`);
    return false;
  }
}

// تعبئة TinyMCE
async function fillTinyMCE(page, iframeId, value, fieldName) {
  try {
    const iframe = await page.$(`#${iframeId}`);
    if (iframe) {
      const frame = await iframe.contentFrame();
      if (frame) {
        await frame.$eval('body', (body, val) => {
          body.innerHTML = val.replace(/\n/g, '<br>');
        }, value);
        logSuccess(`تم تعبئة: ${fieldName}`);
        return true;
      }
    }
    logWarning(`لم يتم العثور على: ${fieldName}`);
    return false;
  } catch (error) {
    logError(`خطأ في تعبئة ${fieldName}: ${error.message}`);
    return false;
  }
}

// النقر على عنصر
async function clickElement(page, selector, elementName) {
  try {
    await page.click(selector, { timeout: 5000 });
    logSuccess(`تم النقر على: ${elementName}`);
    return true;
  } catch (error) {
    logWarning(`لم يتم العثور على: ${elementName}`);
    return false;
  }
}

// اختيار من قائمة منسدلة
async function selectFromDropdown(page, dropdownSelector, optionText, fieldName) {
  try {
    // النقر على القائمة المنسدلة
    await page.click(dropdownSelector);
    await page.waitForTimeout(500);
    
    // البحث عن الخيار والنقر عليه
    const option = await page.$(`text="${optionText}"`);
    if (option) {
      await option.click();
      logSuccess(`تم اختيار: ${fieldName} = ${optionText}`);
      return true;
    }
    logWarning(`لم يتم العثور على الخيار: ${optionText}`);
    return false;
  } catch (error) {
    logError(`خطأ في اختيار ${fieldName}: ${error.message}`);
    return false;
  }
}

// رفع ملف
async function uploadFile(page, inputSelector, filePath, fieldName) {
  try {
    if (!fs.existsSync(filePath)) {
      logWarning(`الملف غير موجود: ${filePath}`);
      return false;
    }
    
    const input = await page.$(inputSelector);
    if (input) {
      await input.setInputFiles(filePath);
      logSuccess(`تم رفع: ${fieldName}`);
      return true;
    }
    logWarning(`لم يتم العثور على حقل الرفع: ${fieldName}`);
    return false;
  } catch (error) {
    logError(`خطأ في رفع ${fieldName}: ${error.message}`);
    return false;
  }
}

// الدالة الرئيسية
async function main() {
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════════╗', 'cyan');
  log('║          🚗  أداة أتمتة تقاضي - شركة العراف  🚗             ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');

  // قراءة البيانات
  const args = process.argv.slice(2);
  const fileArgIndex = args.indexOf('--file');
  const filePath = fileArgIndex !== -1 ? args[fileArgIndex + 1] : null;
  
  logStep('1', 'جاري قراءة بيانات الدعوى...');
  const lawsuitData = loadLawsuitData(filePath);
  logSuccess(`تم تحميل بيانات الدعوى: ${lawsuitData.caseTitle}`);
  
  console.log('\n--- معلومات الدعوى ---');
  console.log(`عنوان الدعوى: ${lawsuitData.caseTitle}`);
  console.log(`المبلغ: ${lawsuitData.amount} ريال قطري`);
  console.log(`المدعى عليه: ${lawsuitData.defendantName || 'غير محدد'}`);
  console.log('------------------------\n');

  // تشغيل المتصفح
  logStep('2', 'جاري تشغيل المتصفح...');
  const browser = await chromium.launch({
    headless: false, // عرض المتصفح
    slowMo: 100, // إبطاء العمليات للمشاهدة
  });
  
  const context = await browser.newContext({
    locale: 'ar-QA',
    viewport: { width: 1400, height: 900 },
  });
  
  const page = await context.newPage();
  logSuccess('تم تشغيل المتصفح');

  // الذهاب لصفحة تسجيل الدخول
  logStep('3', 'جاري فتح موقع تقاضي...');
  await page.goto('https://taqadi.sjc.gov.qa/itc/login');
  logSuccess('تم فتح صفحة تسجيل الدخول');

  // انتظار تسجيل الدخول
  log('\n⏳ يرجى تسجيل الدخول عبر نظام التوثيق الوطني (توثيق)...', 'yellow');
  log('   سيتم استكمال العملية تلقائياً بعد تسجيل الدخول.\n', 'yellow');
  
  try {
    // انتظار الوصول للصفحة الرئيسية بعد تسجيل الدخول
    await page.waitForURL('**/home**', { timeout: 300000 }); // 5 دقائق
    logSuccess('تم تسجيل الدخول بنجاح!');
  } catch (error) {
    logError('انتهت مهلة تسجيل الدخول');
    await browser.close();
    process.exit(1);
  }

  // الذهاب لصفحة إنشاء دعوى
  logStep('4', 'جاري الذهاب لصفحة إنشاء دعوى...');
  await page.goto('https://taqadi.sjc.gov.qa/itc/f/caseinfo/create');
  await page.waitForTimeout(2000);
  logSuccess('تم فتح صفحة إنشاء دعوى');

  // الخطوة 1: اختيار نوع الدعوى
  logStep('5', 'جاري اختيار نوع الدعوى...');
  
  // اختيار "عقود الخدمات التجارية"
  await page.waitForTimeout(1000);
  const serviceContracts = await page.$('text="عقود الخدمات التجارية"');
  if (serviceContracts) {
    await serviceContracts.click();
    await page.waitForTimeout(500);
    logSuccess('تم اختيار: عقود الخدمات التجارية');
  }
  
  // اختيار "عقود إيجار السيارات"
  await page.waitForTimeout(1000);
  const carRental = await page.$('text="عقود إيجار السيارات وخدمات الليموزين"');
  if (carRental) {
    await carRental.click();
    await page.waitForTimeout(500);
    logSuccess('تم اختيار: عقود إيجار السيارات وخدمات الليموزين');
  }
  
  // الضغط على التالي
  await page.waitForTimeout(500);
  const nextBtn1 = await page.$('text="التالي"');
  if (nextBtn1) {
    await nextBtn1.click();
    await page.waitForTimeout(2000);
    logSuccess('تم الانتقال للخطوة التالية');
  }

  // الخطوة 2: تفاصيل الدعوى
  logStep('6', 'جاري تعبئة تفاصيل الدعوى...');
  await page.waitForTimeout(1000);
  
  let filledCount = 0;

  // عنوان الدعوى
  const caseTitleInput = await page.$('input.k-input');
  if (caseTitleInput) {
    await caseTitleInput.fill(lawsuitData.caseTitle);
    filledCount++;
    logSuccess('تم تعبئة: عنوان الدعوى');
  }

  // الوقائع
  const factsField = await page.$('#facts') || await page.$('textarea[name="facts"]');
  if (factsField) {
    await factsField.fill(lawsuitData.facts);
    filledCount++;
    logSuccess('تم تعبئة: الوقائع');
  }

  // الطلبات (TinyMCE)
  await fillTinyMCE(page, 'caseDetails_ifr', lawsuitData.claims, 'الطلبات');
  filledCount++;

  // المبلغ كتابة
  const amountWordsField = await page.$('#totalAmountInText');
  if (amountWordsField) {
    await amountWordsField.fill(lawsuitData.amountInWords);
    filledCount++;
    logSuccess('تم تعبئة: المبلغ كتابة');
  }

  console.log('\n');
  log(`═══════════════════════════════════════════════════════════`, 'green');
  logSuccess(`تم تعبئة ${filledCount} حقول بنجاح!`);
  log(`═══════════════════════════════════════════════════════════`, 'green');
  
  logWarning('\n⚠️  ملاحظات هامة:');
  console.log('   1. تحقق من جميع البيانات المعبأة');
  console.log('   2. قم بتعبئة حقل "المبلغ" يدوياً');
  console.log('   3. اختر "نوع المطالبة" من القائمة');
  console.log('   4. أكمل باقي الخطوات يدوياً (أطراف الدعوى، المستندات، إلخ)');
  console.log('   5. راجع الدعوى قبل الإرسال النهائي\n');

  // إبقاء المتصفح مفتوحاً
  log('🔵 المتصفح مفتوح. اضغط Ctrl+C لإغلاق البرنامج.', 'blue');
  
  // منع إغلاق البرنامج
  await new Promise(() => {});
}

// تشغيل البرنامج
main().catch((error) => {
  logError(`خطأ غير متوقع: ${error.message}`);
  process.exit(1);
});

