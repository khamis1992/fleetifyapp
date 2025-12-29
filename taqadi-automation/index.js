/**
 * أداة أتمتة تقاضي - النسخة المحسّنة
 * للتحكم بالمتصفح وتعبئة نماذج الدعاوى تلقائياً
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
    logWarning('قم بتحميل ملف البيانات من نظام العراف');
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

// تعبئة حقل بانتظار ظهوره
async function safeFill(page, selector, value, fieldName, timeout = 10000) {
  try {
    // انتظار ظهور العنصر
    await page.waitForSelector(selector, { state: 'visible', timeout });
    
    // التركيز على العنصر أولاً
    await page.click(selector);
    await page.waitForTimeout(200);
    
    // مسح المحتوى السابق وتعبئة الجديد
    await page.fill(selector, '');
    await page.fill(selector, value);
    
    // إطلاق أحداث التغيير
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, selector);
    
    logSuccess(`تم تعبئة: ${fieldName}`);
    return true;
  } catch (error) {
    logWarning(`لم يتم العثور على: ${fieldName} (${error.message})`);
    return false;
  }
}

// تعبئة textarea
async function fillTextarea(page, selector, value, fieldName) {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: 10000 });
    await page.click(selector);
    await page.waitForTimeout(200);
    
    // استخدام evaluate للتعبئة المباشرة
    await page.evaluate((sel, val) => {
      const el = document.querySelector(sel);
      if (el) {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, selector, value);
    
    logSuccess(`تم تعبئة: ${fieldName}`);
    return true;
  } catch (error) {
    logWarning(`لم يتم العثور على: ${fieldName}`);
    return false;
  }
}

// تعبئة TinyMCE
async function fillTinyMCE(page, iframeSelector, value, fieldName) {
  try {
    await page.waitForSelector(iframeSelector, { state: 'visible', timeout: 10000 });
    
    const iframe = await page.$(iframeSelector);
    if (iframe) {
      const frame = await iframe.contentFrame();
      if (frame) {
        await frame.waitForSelector('body', { state: 'visible' });
        await frame.evaluate((val) => {
          document.body.innerHTML = val.replace(/\n/g, '<br>');
        }, value);
        logSuccess(`تم تعبئة: ${fieldName}`);
        return true;
      }
    }
    logWarning(`لم يتم العثور على: ${fieldName}`);
    return false;
  } catch (error) {
    logWarning(`خطأ في تعبئة ${fieldName}: ${error.message}`);
    return false;
  }
}

// النقر على عنصر بأمان
async function safeClick(page, selector, elementName, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    await page.click(selector);
    logSuccess(`تم النقر على: ${elementName}`);
    return true;
  } catch (error) {
    logWarning(`لم يتم العثور على: ${elementName}`);
    return false;
  }
}

// البحث عن عنصر بالنص والنقر عليه
async function clickByText(page, text, elementName, timeout = 10000) {
  try {
    const element = await page.waitForSelector(`text="${text}"`, { state: 'visible', timeout });
    if (element) {
      await element.click();
      logSuccess(`تم النقر على: ${elementName}`);
      return true;
    }
    return false;
  } catch (error) {
    logWarning(`لم يتم العثور على: ${elementName}`);
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
  const data = loadLawsuitData(filePath);
  logSuccess(`تم تحميل بيانات الدعوى: ${data.caseTitle}`);
  
  console.log('\n--- معلومات الدعوى ---');
  console.log(`عنوان الدعوى: ${data.caseTitle}`);
  console.log(`المبلغ: ${data.amount} ريال قطري`);
  console.log(`المدعى عليه: ${data.defendantName || 'غير محدد'}`);
  console.log('------------------------\n');

  // تشغيل المتصفح
  logStep('2', 'جاري تشغيل المتصفح...');
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
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
    await page.waitForURL('**/home**', { timeout: 300000 });
    logSuccess('تم تسجيل الدخول بنجاح!');
  } catch (error) {
    logError('انتهت مهلة تسجيل الدخول');
    await browser.close();
    process.exit(1);
  }

  await page.waitForTimeout(2000);

  // الذهاب لصفحة إنشاء دعوى
  logStep('4', 'جاري الذهاب لصفحة إنشاء دعوى...');
  await page.goto('https://taqadi.sjc.gov.qa/itc/f/caseinfo/create');
  await page.waitForTimeout(3000);
  logSuccess('تم فتح صفحة إنشاء دعوى');

  // الخطوة 1: اختيار نوع الدعوى
  logStep('5', 'جاري اختيار نوع الدعوى...');
  
  await page.waitForTimeout(2000);
  
  // اختيار "عقود الخدمات التجارية"
  await clickByText(page, 'عقود الخدمات التجارية', 'عقود الخدمات التجارية');
  await page.waitForTimeout(1500);
  
  // اختيار "عقود إيجار السيارات"
  await clickByText(page, 'عقود إيجار السيارات وخدمات الليموزين', 'عقود إيجار السيارات');
  await page.waitForTimeout(1500);
  
  // الضغط على التالي
  await clickByText(page, 'التالي', 'زر التالي');
  await page.waitForTimeout(3000);

  // الخطوة 2: تفاصيل الدعوى
  logStep('6', 'جاري تعبئة تفاصيل الدعوى...');
  await page.waitForTimeout(2000);
  
  let filledCount = 0;

  // البحث عن حقل عنوان الدعوى بعدة طرق
  log('   جاري البحث عن حقل عنوان الدعوى...', 'blue');
  
  // محاولة 1: عن طريق placeholder
  let caseTitleFilled = await safeFill(page, 'input[placeholder*="عنوان"]', data.caseTitle, 'عنوان الدعوى');
  
  // محاولة 2: عن طريق class
  if (!caseTitleFilled) {
    caseTitleFilled = await safeFill(page, 'input.k-textbox', data.caseTitle, 'عنوان الدعوى');
  }
  
  // محاولة 3: أول input في المنطقة
  if (!caseTitleFilled) {
    try {
      // البحث عن العنصر الذي يحتوي على "عنوان الدعوى" والحصول على الـ input المجاور
      await page.evaluate((title) => {
        const labels = document.querySelectorAll('label, span, div');
        for (const label of labels) {
          if (label.textContent && label.textContent.includes('عنوان الدعوى')) {
            const parent = label.closest('div[class*="form"], div[class*="col"], li');
            if (parent) {
              const input = parent.querySelector('input');
              if (input) {
                input.value = title;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
              }
            }
          }
        }
        return false;
      }, data.caseTitle);
      logSuccess('تم تعبئة: عنوان الدعوى');
      caseTitleFilled = true;
    } catch (e) {
      logWarning('لم يتم العثور على حقل عنوان الدعوى');
    }
  }
  
  if (caseTitleFilled) filledCount++;

  // الوقائع
  log('   جاري البحث عن حقل الوقائع...', 'blue');
  let factsFilled = await fillTextarea(page, '#facts', data.facts, 'الوقائع');
  if (!factsFilled) {
    factsFilled = await fillTextarea(page, 'textarea[name="facts"]', data.facts, 'الوقائع');
  }
  if (!factsFilled) {
    // محاولة عبر البحث بالتسمية
    try {
      const filled = await page.evaluate((val) => {
        // البحث عن العنصر الذي يحتوي على "الوقائع"
        const labels = document.querySelectorAll('label, span, div');
        for (const label of labels) {
          if (label.textContent && label.textContent.includes('الوقائع')) {
            const parent = label.closest('div[class*="form"], div[class*="col"], li, fieldset');
            if (parent) {
              const textarea = parent.querySelector('textarea');
              if (textarea) {
                textarea.value = val;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                textarea.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
              }
            }
          }
        }
        // محاولة أخرى - البحث في كل textareas
        const textareas = document.querySelectorAll('textarea');
        for (const ta of textareas) {
          const parent = ta.closest('div, li, fieldset');
          if (parent && parent.textContent && parent.textContent.includes('الوقائع')) {
            ta.value = val;
            ta.dispatchEvent(new Event('input', { bubbles: true }));
            ta.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
        }
        // محاولة أخيرة - أول textarea في الصفحة
        if (textareas.length > 0) {
          textareas[0].value = val;
          textareas[0].dispatchEvent(new Event('input', { bubbles: true }));
          textareas[0].dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return false;
      }, data.facts);
      
      if (filled) {
        logSuccess('تم تعبئة: الوقائع');
        factsFilled = true;
      }
    } catch (e) {
      logWarning('لم يتم العثور على حقل الوقائع');
    }
  }
  if (factsFilled) filledCount++;

  // الطلبات (TinyMCE)
  log('   جاري البحث عن حقل الطلبات...', 'blue');
  const claimsFilled = await fillTinyMCE(page, '#caseDetails_ifr', data.claims, 'الطلبات');
  if (claimsFilled) filledCount++;

  // المبلغ كتابة
  log('   جاري البحث عن حقل المبلغ كتابة...', 'blue');
  let amountWordsFilled = await safeFill(page, '#totalAmountInText', data.amountInWords, 'المبلغ كتابة');
  if (!amountWordsFilled) {
    amountWordsFilled = await safeFill(page, 'input[name="totalAmountInText"]', data.amountInWords, 'المبلغ كتابة');
  }
  if (!amountWordsFilled) {
    // محاولة بالتقييم المباشر
    try {
      await page.evaluate((val) => {
        const labels = document.querySelectorAll('label, span, div');
        for (const label of labels) {
          if (label.textContent && label.textContent.includes('المبلغ الإجمالي كتابة')) {
            const parent = label.closest('div[class*="form"], div[class*="col"], li');
            if (parent) {
              const input = parent.querySelector('input');
              if (input) {
                input.value = val;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
              }
            }
          }
        }
        return false;
      }, data.amountInWords);
      logSuccess('تم تعبئة: المبلغ كتابة');
      amountWordsFilled = true;
    } catch (e) {
      logWarning('لم يتم العثور على حقل المبلغ كتابة');
    }
  }
  if (amountWordsFilled) filledCount++;

  // تعبئة نوع المطالبة (Kendo Dropdown)
  log('   جاري البحث عن نوع المطالبة...', 'blue');
  try {
    const dropdownFilled = await page.evaluate(() => {
      // البحث عن dropdown نوع المطالبة
      const dropdowns = document.querySelectorAll('.k-dropdown, [data-role="dropdownlist"]');
      for (const dropdown of dropdowns) {
        const parent = dropdown.closest('div, li');
        if (parent && parent.textContent.includes('نوع المطالبة')) {
          // النقر على الـ dropdown لفتحه
          const wrapper = dropdown.querySelector('.k-dropdown-wrap') || dropdown;
          wrapper.click();
          return 'clicked';
        }
      }
      return false;
    });
    
    if (dropdownFilled === 'clicked') {
      await page.waitForTimeout(500);
      // اختيار "مطالبة مالية" أو أول خيار
      const optionClicked = await page.evaluate(() => {
        const options = document.querySelectorAll('.k-list .k-item, .k-popup .k-item');
        for (const opt of options) {
          if (opt.textContent.includes('مطالبة') || opt.textContent.includes('إيجار')) {
            opt.click();
            return true;
          }
        }
        // اختر أول خيار
        if (options.length > 0) {
          options[0].click();
          return true;
        }
        return false;
      });
      
      if (optionClicked) {
        logSuccess('تم اختيار: نوع المطالبة');
        filledCount++;
      }
    }
  } catch (e) {
    logWarning('لم يتم العثور على نوع المطالبة');
  }

  // تعبئة المبلغ (Kendo Numeric)
  log('   جاري البحث عن حقل المبلغ الرقمي...', 'blue');
  try {
    const amountFilled = await page.evaluate((amount) => {
      // البحث عن حقل المبلغ
      const numericInputs = document.querySelectorAll('.k-numerictextbox input, input.k-formatted-value, input[data-role="numerictextbox"]');
      for (const input of numericInputs) {
        const parent = input.closest('div, li');
        if (parent && parent.textContent.includes('المبلغ') && !parent.textContent.includes('كتابة')) {
          // البحث عن الـ input الفعلي
          const realInput = parent.querySelector('input[type="text"], input.k-input');
          if (realInput) {
            realInput.value = amount.toString();
            realInput.dispatchEvent(new Event('input', { bubbles: true }));
            realInput.dispatchEvent(new Event('change', { bubbles: true }));
            realInput.dispatchEvent(new Event('blur', { bubbles: true }));
            return true;
          }
        }
      }
      
      // محاولة أخرى - البحث بالتسمية
      const labels = document.querySelectorAll('label, span, div');
      for (const label of labels) {
        if (label.textContent.trim() === 'المبلغ') {
          const parent = label.closest('div, li');
          if (parent) {
            const input = parent.querySelector('input');
            if (input) {
              input.value = amount.toString();
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
        }
      }
      return false;
    }, data.amount);
    
    if (amountFilled) {
      logSuccess('تم تعبئة: المبلغ الرقمي');
      filledCount++;
    } else {
      logWarning('لم يتم العثور على حقل المبلغ الرقمي');
    }
  } catch (e) {
    logWarning('خطأ في تعبئة المبلغ: ' + e.message);
  }

  console.log('\n');
  log(`═══════════════════════════════════════════════════════════`, 'green');
  logSuccess(`تم تعبئة ${filledCount} حقول بنجاح!`);
  log(`═══════════════════════════════════════════════════════════`, 'green');
  
  logWarning('\n⚠️  ملاحظات هامة:');
  console.log('   1. تحقق من جميع البيانات المعبأة');
  console.log('   2. أكمل باقي الخطوات يدوياً (أطراف الدعوى، المستندات)');
  console.log('   3. راجع الدعوى قبل الإرسال النهائي\n');

  log('🔵 المتصفح مفتوح. اضغط Ctrl+C لإغلاق البرنامج.', 'blue');
  
  // منع إغلاق البرنامج
  await new Promise(() => {});
}

// تشغيل البرنامج
main().catch((error) => {
  logError(`خطأ غير متوقع: ${error.message}`);
  process.exit(1);
});
