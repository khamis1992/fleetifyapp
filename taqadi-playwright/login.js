/**
 * تسجيل الدخول لموقع تقاضي وحفظ الـ cookies
 * شغّل هذا مرة واحدة فقط لحفظ بيانات الدخول
 */

const { chromium } = require('playwright');

async function login() {
  console.log('🔐 جاري فتح متصفح Chrome لتسجيل الدخول...');
  console.log('');
  
  // فتح متصفح Chrome الفعلي (ليس headless)
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome', // استخدام Chrome المثبت على الجهاز
    slowMo: 50,
  });

  const context = await browser.newContext({
    locale: 'ar-QA',
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  // الذهاب لموقع تقاضي
  console.log('🌐 جاري فتح موقع تقاضي...');
  await page.goto('https://taqadi.sjc.gov.qa/itc/');
  
  await page.waitForLoadState('networkidle');

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('  📋 يرجى تسجيل الدخول عبر توثيق في نافذة المتصفح');
  console.log('');
  console.log('  ✅ بعد تسجيل الدخول بنجاح، اضغط Enter هنا لحفظ البيانات');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // انتظار المستخدم للضغط على Enter
  await waitForEnter();

  // حفظ الـ cookies وبيانات الجلسة
  console.log('💾 جاري حفظ بيانات الجلسة...');
  await context.storageState({ path: 'auth.json' });
  
  console.log('');
  console.log('✅ تم حفظ بيانات الدخول في: auth.json');
  console.log('');
  console.log('🚀 الآن يمكنك تشغيل الأتمتة: npm start');
  console.log('');

  await browser.close();
}

// انتظار ضغط Enter
function waitForEnter() {
  return new Promise(resolve => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    readline.question('اضغط Enter بعد تسجيل الدخول...', () => {
      readline.close();
      resolve();
    });
  });
}

login().catch(console.error);

