/**
 * أتمتة رفع الدعاوى على موقع تقاضي
 * 
 * الاستخدام:
 * 1. npm run fetch     - جلب بيانات الدعوى من العراف
 * 2. npm run download  - تحميل المستندات
 * 3. npm run login     - تسجيل الدخول (مرة واحدة)
 * 4. npm start         - تشغيل الأتمتة
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ألوان للطباعة
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(emoji, message, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

async function automate() {
  // التحقق من وجود بيانات الدعوى
  const dataPath = path.join(__dirname, 'lawsuit-data.json');
  if (!fs.existsSync(dataPath)) {
    log('❌', 'ملف lawsuit-data.json غير موجود!', colors.red);
    log('📋', 'شغّل أولاً: npm run fetch', colors.yellow);
    process.exit(1);
  }

  // التحقق من وجود مجلد المستندات
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    log('⚠️', 'مجلد temp غير موجود - جاري تحميل المستندات...', colors.yellow);
    try {
      execSync('node download-docs.js', { cwd: __dirname, stdio: 'inherit' });
    } catch (e) {
      log('❌', 'فشل تحميل المستندات', colors.red);
    }
  }

  // التحقق من وجود بيانات تسجيل الدخول
  const authPath = path.join(__dirname, 'auth.json');
  const hasAuth = fs.existsSync(authPath);
  
  if (!hasAuth) {
    log('⚠️', 'لم يتم تسجيل الدخول بعد', colors.yellow);
    log('🔐', 'سيتم فتح المتصفح لتسجيل الدخول...', colors.cyan);
  }

  // قراءة بيانات الدعوى
  const lawsuitData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  console.log('');
  log('═══════════════════════════════════════════════════════════', '');
  log('🚗', 'أتمتة تقاضي - شركة العراف', colors.magenta);
  log('═══════════════════════════════════════════════════════════', '');
  console.log('');
  log('📋', `الدعوى: ${lawsuitData.caseTitle}`, colors.cyan);
  log('👤', `المدعى عليه: ${lawsuitData.defendantName}`, colors.cyan);
  log('💰', `المبلغ: ${lawsuitData.amountFormatted} ر.ق`, colors.cyan);
  console.log('');

  // فتح المتصفح
  log('🌐', 'جاري فتح متصفح Chrome...', colors.yellow);
  
  const browser = await chromium.launch({
    headless: false, // المتصفح مرئي للمراقبة
    channel: 'chrome', // استخدام Chrome المثبت
    slowMo: 100, // تبطيء قليل لرؤية الخطوات
  });

  // إنشاء سياق مع الـ cookies المحفوظة
  const contextOptions = {
    locale: 'ar-QA',
    viewport: { width: 1400, height: 900 },
  };
  
  if (hasAuth) {
    contextOptions.storageState = authPath;
  }
  
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  // الذهاب لموقع تقاضي
  log('🔗', 'جاري الانتقال لموقع تقاضي...', colors.yellow);
  await page.goto('https://taqadi.sjc.gov.qa/itc/');
  await page.waitForLoadState('networkidle');

  // التحقق من تسجيل الدخول
  await page.waitForTimeout(2000);
  
  const currentUrl = page.url();
  const isLoggedIn = !currentUrl.includes('login') && !currentUrl.includes('tawtheeq');
  
  if (!isLoggedIn) {
    log('🔐', 'يرجى تسجيل الدخول عبر توثيق...', colors.yellow);
    console.log('');
    log('⏳', 'انتظار تسجيل الدخول...', colors.cyan);
    
    // انتظار التوجيه للصفحة الرئيسية
    await page.waitForURL('**/itc/**', { timeout: 300000 }); // 5 دقائق
    await page.waitForLoadState('networkidle');
    
    // حفظ بيانات الدخول للمرات القادمة
    log('💾', 'جاري حفظ بيانات الدخول...', colors.yellow);
    await context.storageState({ path: authPath });
    log('✅', 'تم حفظ بيانات الدخول', colors.green);
  } else {
    log('✅', 'تم تسجيل الدخول بنجاح', colors.green);
  }

  // البحث عن زر إنشاء دعوى جديدة
  console.log('');
  log('📝', 'جاري البحث عن نموذج إنشاء الدعوى...', colors.yellow);
  
  // محاولة العثور على رابط/زر الدعوى الجديدة
  const newCaseSelectors = [
    'text=دعوى جديدة',
    'text=إنشاء دعوى',
    'text=تقديم دعوى',
    'text=رفع دعوى',
    'a[href*="new"]',
    'button:has-text("جديد")',
  ];

  let foundNewCase = false;
  for (const selector of newCaseSelectors) {
    const element = await page.$(selector);
    if (element) {
      log('🔍', `تم العثور على: ${selector}`, colors.green);
      await element.click();
      await page.waitForLoadState('networkidle');
      foundNewCase = true;
      break;
    }
  }

  if (!foundNewCase) {
    log('⚠️', 'لم يتم العثور على زر الدعوى الجديدة', colors.yellow);
    log('📋', 'يرجى التنقل يدوياً لصفحة إنشاء الدعوى', colors.cyan);
    
    // انتظار التنقل اليدوي
    await waitForUser('اضغط Enter بعد فتح صفحة إنشاء الدعوى');
  }

  // ملء النموذج
  console.log('');
  log('═══════════════════════════════════════════════════════════', '');
  log('📝', 'جاري ملء النموذج...', colors.magenta);
  log('═══════════════════════════════════════════════════════════', '');
  console.log('');

  // قائمة الحقول للملء
  const fieldsToFill = [
    {
      name: 'عنوان الدعوى',
      value: lawsuitData.caseTitle,
      selectors: [
        'input[name*="subject"]',
        'input[name*="title"]',
        'input[id*="subject"]',
        'input[id*="title"]',
        'input[placeholder*="عنوان"]',
        'input[placeholder*="موضوع"]',
      ],
    },
    {
      name: 'الوقائع',
      value: lawsuitData.facts,
      selectors: [
        'textarea[name*="fact"]',
        'textarea[name*="description"]',
        'textarea[id*="fact"]',
        'textarea[placeholder*="وقائع"]',
        'textarea[placeholder*="وصف"]',
      ],
    },
    {
      name: 'الطلبات',
      value: lawsuitData.requests,
      selectors: [
        'textarea[name*="request"]',
        'textarea[name*="demand"]',
        'textarea[id*="request"]',
        'textarea[placeholder*="طلبات"]',
        'textarea[placeholder*="مطالب"]',
      ],
    },
    {
      name: 'المبلغ',
      value: lawsuitData.amount,
      selectors: [
        'input[name*="amount"]',
        'input[name*="value"]',
        'input[id*="amount"]',
        'input[type="number"]',
        'input[placeholder*="مبلغ"]',
        'input[placeholder*="قيمة"]',
      ],
    },
    {
      name: 'المبلغ كتابةً',
      value: lawsuitData.amountInWords,
      selectors: [
        'input[name*="amountText"]',
        'input[name*="amountWord"]',
        'textarea[name*="amountText"]',
        'input[placeholder*="كتابة"]',
      ],
    },
  ];

  let filledCount = 0;

  for (const field of fieldsToFill) {
    let filled = false;
    
    for (const selector of field.selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          await element.fill(field.value);
          log('✅', `${field.name}: تم الملء`, colors.green);
          filled = true;
          filledCount++;
          break;
        }
      } catch (e) {
        // تجاهل الأخطاء والمحاولة مع المحدد التالي
      }
    }
    
    if (!filled) {
      log('⚠️', `${field.name}: لم يتم العثور على الحقل`, colors.yellow);
    }
  }

  console.log('');
  log('═══════════════════════════════════════════════════════════', '');
  
  if (filledCount > 0) {
    log('✅', `تم ملء ${filledCount} حقول بنجاح!`, colors.green);
  } else {
    log('⚠️', 'لم يتم ملء أي حقول', colors.yellow);
    log('📋', 'قد يكون تصميم الصفحة مختلفاً', colors.cyan);
  }
  
  // رفع المستندات
  console.log('');
  log('═══════════════════════════════════════════════════════════', '');
  log('📎', 'جاري رفع المستندات...', colors.magenta);
  log('═══════════════════════════════════════════════════════════', '');
  console.log('');

  await uploadDocuments(page, lawsuitData);
  
  console.log('');
  log('📋', 'راجع البيانات ثم اضغط "اعتماد" لتقديم الدعوى', colors.magenta);
  log('⚠️', 'لا تغلق هذه النافذة حتى تكتمل العملية', colors.yellow);
  console.log('');

  // إبقاء المتصفح مفتوحاً
  await waitForUser('اضغط Enter بعد الانتهاء من مراجعة الدعوى');

  // حفظ screenshot للتوثيق
  const screenshotPath = `screenshot-${Date.now()}.png`;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  log('📸', `تم حفظ صورة الشاشة: ${screenshotPath}`, colors.cyan);

  await browser.close();
  
  console.log('');
  log('✅', 'تم الانتهاء!', colors.green);
}

// انتظار ضغط المستخدم
function waitForUser(message) {
  return new Promise(resolve => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    readline.question(`${message}... `, () => {
      readline.close();
      resolve();
    });
  });
}

// رفع المستندات
async function uploadDocuments(page, lawsuitData) {
  if (!lawsuitData.documents || lawsuitData.documents.length === 0) {
    log('⚠️', 'لا توجد مستندات للرفع', colors.yellow);
    return;
  }

  const tempDir = path.join(__dirname, 'temp');
  let uploadedCount = 0;

  // البحث عن زر رفع الملفات
  const uploadSelectors = [
    'input[type="file"]',
    'button:has-text("رفع")',
    'button:has-text("إرفاق")',
    'button:has-text("ملف")',
    'a:has-text("رفع")',
    '.upload-btn',
    '[data-action="upload"]',
  ];

  let fileInput = null;
  for (const selector of uploadSelectors) {
    try {
      fileInput = await page.$(selector);
      if (fileInput) {
        log('🔍', `تم العثور على زر الرفع: ${selector}`, colors.green);
        break;
      }
    } catch (e) {
      // تجاهل
    }
  }

  if (!fileInput) {
    log('⚠️', 'لم يتم العثور على زر رفع الملفات', colors.yellow);
    log('📋', 'يرجى رفع المستندات يدوياً', colors.cyan);
    
    // عرض قائمة المستندات للرفع اليدوي
    console.log('');
    log('📎', 'المستندات المتاحة للرفع:', colors.cyan);
    
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      files.forEach((file, index) => {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(1);
        log(`   ${index + 1}.`, `${file} (${sizeKB} KB)`, colors.reset);
      });
      console.log('');
      log('📁', `المسار: ${tempDir}`, colors.cyan);
    }
    
    await waitForUser('اضغط Enter بعد رفع المستندات يدوياً');
    return;
  }

  // جمع الملفات للرفع
  const filesToUpload = [];
  
  for (const doc of lawsuitData.documents) {
    // البحث عن الملف في temp
    let filePath = path.join(__dirname, doc.localPath);
    
    // إذا كان PDF غير موجود، جرب HTML
    if (!fs.existsSync(filePath)) {
      const htmlPath = filePath.replace('.pdf', '.html');
      if (fs.existsSync(htmlPath)) {
        filePath = htmlPath;
      }
    }
    
    if (fs.existsSync(filePath)) {
      filesToUpload.push(filePath);
      log('📄', `جاهز: ${doc.name}`, colors.cyan);
    } else {
      log('⚠️', `غير موجود: ${doc.name}`, colors.yellow);
    }
  }

  if (filesToUpload.length === 0) {
    log('⚠️', 'لا توجد ملفات جاهزة للرفع', colors.yellow);
    return;
  }

  // محاولة رفع الملفات
  try {
    // إذا كان input[type="file"] - رفع مباشر
    const tagName = await fileInput.evaluate(el => el.tagName.toLowerCase());
    
    if (tagName === 'input') {
      // رفع جميع الملفات دفعة واحدة
      await fileInput.setInputFiles(filesToUpload);
      log('✅', `تم رفع ${filesToUpload.length} ملفات`, colors.green);
      uploadedCount = filesToUpload.length;
    } else {
      // إذا كان زر، نحتاج للنقر وانتظار filechooser
      for (const filePath of filesToUpload) {
        try {
          const [fileChooser] = await Promise.all([
            page.waitForEvent('filechooser', { timeout: 5000 }),
            fileInput.click(),
          ]);
          await fileChooser.setFiles([filePath]);
          
          const fileName = path.basename(filePath);
          log('✅', `تم رفع: ${fileName}`, colors.green);
          uploadedCount++;
          
          // انتظار قليل بين الملفات
          await page.waitForTimeout(1000);
        } catch (e) {
          log('⚠️', `فشل رفع: ${path.basename(filePath)}`, colors.yellow);
        }
      }
    }
  } catch (error) {
    log('❌', `خطأ في الرفع: ${error.message}`, colors.red);
  }

  console.log('');
  log('═══════════════════════════════════════════════════════════', '');
  log('📊', `تم رفع ${uploadedCount} من ${filesToUpload.length} ملفات`, colors.magenta);
  log('═══════════════════════════════════════════════════════════', '');
}

// تشغيل
automate().catch(error => {
  log('❌', `خطأ: ${error.message}`, colors.red);
  process.exit(1);
});

