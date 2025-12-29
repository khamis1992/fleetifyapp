/**
 * أداة أتمتة تقاضي بالذكاء الاصطناعي
 * تستخدم OpenAI GPT-4 لفهم الصفحة وتعبئة الحقول تلقائياً
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const AIHelper = require('./ai-helper');

// ألوان للطباعة
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
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

function logAI(message) {
  console.log(`${colors.magenta}🧠 ${message}${colors.reset}`);
}

// قراءة البيانات
function loadLawsuitData() {
  const dataPath = path.join(__dirname, 'lawsuit-data.json');
  if (!fs.existsSync(dataPath)) {
    logError('ملف lawsuit-data.json غير موجود');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

// الدالة الرئيسية
async function main() {
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║     🧠🚗  أداة أتمتة تقاضي بالذكاء الاصطناعي - العراف  🚗🧠    ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');

  // التحقق من مفتاح API
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logError('مفتاح OPENAI_API_KEY غير موجود!');
    console.log('\nلتشغيل النسخة الذكية:');
    console.log('  Windows: set OPENAI_API_KEY=sk-your-key && npm run start:ai');
    console.log('  Mac/Linux: OPENAI_API_KEY=sk-your-key npm run start:ai');
    console.log('\nأو استخدم النسخة العادية: npm start');
    process.exit(1);
  }

  const ai = new AIHelper(apiKey);
  logSuccess('تم الاتصال بـ OpenAI');

  // قراءة البيانات
  logStep('1', 'جاري قراءة بيانات الدعوى...');
  const data = loadLawsuitData();
  logSuccess(`تم تحميل: ${data.caseTitle}`);

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

  log('\n⏳ يرجى تسجيل الدخول عبر توثيق...', 'yellow');
  
  try {
    await page.waitForURL('**/home**', { timeout: 300000 });
    logSuccess('تم تسجيل الدخول!');
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

  // اختيار نوع الدعوى
  logStep('5', 'جاري اختيار نوع الدعوى...');
  
  await page.waitForTimeout(2000);
  
  try {
    await page.click('text="عقود الخدمات التجارية"', { timeout: 5000 });
    await page.waitForTimeout(1500);
    await page.click('text="عقود إيجار السيارات وخدمات الليموزين"', { timeout: 5000 });
    await page.waitForTimeout(1500);
    await page.click('text="التالي"', { timeout: 5000 });
    await page.waitForTimeout(3000);
    logSuccess('تم اختيار نوع الدعوى');
  } catch (e) {
    logWarning('لم يتم العثور على خيارات نوع الدعوى - ربما أنت في صفحة مختلفة');
  }

  // تحليل الصفحة بالذكاء الاصطناعي
  logStep('6', 'جاري تحليل الصفحة بالذكاء الاصطناعي...');
  logAI('يتم إرسال HTML للتحليل...');

  const htmlContent = await page.content();
  
  const fieldsToFind = [
    { name: 'عنوان الدعوى', description: 'حقل نص قصير لعنوان الدعوى (50 حرف كحد أقصى)' },
    { name: 'الوقائع', description: 'حقل نص طويل (textarea) لوقائع الدعوى' },
    { name: 'الطلبات', description: 'محرر نص غني (TinyMCE أو Quill) للطلبات' },
    { name: 'المبلغ', description: 'حقل رقمي للمبلغ بالريال القطري' },
    { name: 'المبلغ كتابة', description: 'حقل نص للمبلغ مكتوب بالحروف العربية' },
  ];

  const analysis = await ai.analyzePageForFields(htmlContent, fieldsToFind);
  
  if (analysis && analysis.fields) {
    logAI('تم تحليل الصفحة! الحقول المكتشفة:');
    for (const field of analysis.fields) {
      if (field.found) {
        console.log(`   ${colors.green}✓${colors.reset} ${field.name}: ${field.selector} (${field.type})`);
      } else {
        console.log(`   ${colors.red}✗${colors.reset} ${field.name}: لم يتم العثور عليه`);
      }
    }
  } else {
    logWarning('لم يتمكن الذكاء الاصطناعي من تحليل الصفحة، سيتم استخدام الطريقة التقليدية');
  }

  // تعبئة الحقول
  logStep('7', 'جاري تعبئة الحقول...');
  let filledCount = 0;

  // الحقول المطلوب تعبئتها
  const fieldsData = [
    { name: 'عنوان الدعوى', value: data.caseTitle },
    { name: 'الوقائع', value: data.facts },
    { name: 'الطلبات', value: data.claims },
    { name: 'المبلغ كتابة', value: data.amountInWords },
  ];

  for (const fieldData of fieldsData) {
    logAI(`جاري توليد كود لتعبئة: ${fieldData.name}...`);
    
    const fillCode = await ai.generateFillCode(htmlContent, fieldData.name, fieldData.value);
    
    if (fillCode) {
      try {
        // تنفيذ الكود المولّد
        const result = await page.evaluate(({ code, value }) => {
          try {
            // إنشاء دالة من الكود
            const func = new Function('value', code);
            return func(value);
          } catch (e) {
            console.error('Error executing AI code:', e);
            return false;
          }
        }, { code: fillCode, value: fieldData.value });

        if (result) {
          logSuccess(`تم تعبئة: ${fieldData.name}`);
          filledCount++;
        } else {
          // محاولة بالطريقة التقليدية
          logWarning(`فشل كود AI لـ ${fieldData.name}، جاري المحاولة التقليدية...`);
          const traditionalResult = await fillFieldTraditional(page, fieldData.name, fieldData.value);
          if (traditionalResult) {
            logSuccess(`تم تعبئة: ${fieldData.name} (تقليدي)`);
            filledCount++;
          }
        }
      } catch (e) {
        logWarning(`خطأ في تعبئة ${fieldData.name}: ${e.message}`);
      }
    } else {
      // الطريقة التقليدية
      const traditionalResult = await fillFieldTraditional(page, fieldData.name, fieldData.value);
      if (traditionalResult) {
        logSuccess(`تم تعبئة: ${fieldData.name}`);
        filledCount++;
      }
    }
    
    await page.waitForTimeout(500);
  }

  console.log('\n');
  log(`═══════════════════════════════════════════════════════════`, 'green');
  logSuccess(`تم تعبئة ${filledCount} من ${fieldsData.length} حقول!`);
  log(`═══════════════════════════════════════════════════════════`, 'green');

  logWarning('\n⚠️  ملاحظات:');
  console.log('   1. تحقق من البيانات المعبأة');
  console.log('   2. أكمل الحقول المتبقية يدوياً');
  console.log('   3. راجع قبل الإرسال');

  log('\n🔵 المتصفح مفتوح. اضغط Ctrl+C للإغلاق.', 'blue');
  await new Promise(() => {});
}

// تعبئة بالطريقة التقليدية
async function fillFieldTraditional(page, fieldName, value) {
  try {
    if (fieldName === 'عنوان الدعوى') {
      return await page.evaluate((val) => {
        const inputs = document.querySelectorAll('input.k-input, input.k-textbox, input[type="text"]');
        for (const input of inputs) {
          const parent = input.closest('div, li');
          if (parent && parent.textContent.includes('عنوان')) {
            input.value = val;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
          }
        }
        if (inputs[0]) {
          inputs[0].value = val;
          inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      }, value);
    }
    
    if (fieldName === 'الوقائع') {
      return await page.evaluate((val) => {
        const textarea = document.querySelector('#facts') || document.querySelector('textarea');
        if (textarea) {
          textarea.value = val;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      }, value);
    }
    
    if (fieldName === 'الطلبات') {
      const iframe = await page.$('#caseDetails_ifr');
      if (iframe) {
        const frame = await iframe.contentFrame();
        if (frame) {
          await frame.evaluate((val) => {
            document.body.innerHTML = val.replace(/\n/g, '<br>');
          }, value);
          return true;
        }
      }
      return false;
    }
    
    if (fieldName === 'المبلغ كتابة') {
      return await page.evaluate((val) => {
        const input = document.querySelector('#totalAmountInText') || 
                      document.querySelector('input[name="totalAmountInText"]');
        if (input) {
          input.value = val;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      }, value);
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

main().catch((error) => {
  logError(`خطأ: ${error.message}`);
  process.exit(1);
});

