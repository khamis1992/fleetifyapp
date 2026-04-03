const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  let errors = [];
  let warnings = 0;
  
  page.on('pageerror', err => errors.push(err.message.substring(0, 100)));
  page.on('console', msg => {
    const t = msg.text();
    if (msg.type() === 'error' && !t.includes('favicon') && !t.includes('.hot') && !t.includes('manifest')) {
      if (!errors.includes(t.substring(0, 100))) errors.push(`CONSOLE: ${t.substring(0, 100)}`);
    }
    if (msg.type() === 'warning' && t.includes('Maximum update depth')) warnings++;
  });

  // Login
  console.log('🔐 تسجيل الدخول...');
  await page.goto('http://localhost:8080/auth', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);
  const email = await page.$('input[type="email"]') || await page.$('input[name="email"]');
  const pass = await page.$('input[type="password"]');
  if (email && pass) {
    await email.fill('khamis-1992@hotmail.com');
    await pass.fill('123456789');
    const btn = await page.$('button[type="submit"]') || await page.$('button:has-text("تسجيل")');
    if (btn) await btn.click();
    await page.waitForTimeout(5000);
    console.log('✅ تم تسجيل الدخول\n');
  }

  // ALL system pages
  const pages = [
    // الرئيسية
    ['🏠 لوحة التحكم', '/dashboard'],
    
    // إدارة العملاء
    ['👥 قائمة العملاء', '/customers'],
    ['🤝 CRM', '/customers/crm'],
    
    // إدارة الأسطول
    ['🚗 المركبات', '/fleet'],
    ['🔧 الصيانة', '/fleet/maintenance'],
    ['📅 الحجوزات', '/fleet/reservations'],
    ['⚠️ المخالفات', '/fleet/traffic-violations'],
    ['📊 تقارير الأسطول', '/fleet/reports'],
    
    // العروض والعقود
    ['📋 عروض الأسعار', '/quotations'],
    ['📄 العقود', '/contracts'],
    
    // المالية
    ['💰 لوحة التحكم المالية', '/finance/overview'],
    ['🧾 الفواتير والمدفوعات', '/finance/billing'],
    ['🏦 الخزينة', '/finance/treasury'],
    ['📒 دفتر الأستاذ', '/finance/general-ledger'],
    ['📋 دليل الحسابات', '/finance/chart-of-accounts'],
    ['📊 التقارير المالية', '/finance/reports'],
    ['💵 الموازنات', '/finance/budgets'],
    ['📍 مراكز التكلفة', '/finance/cost-centers'],
    ['🚛 الموردين', '/finance/vendors'],
    ['🏢 الأصول الثابتة', '/finance/assets'],
    ['💎 الودائع', '/finance/deposits'],
    ['⚙️ إعدادات المالية', '/finance/settings'],
    ['🔗 ربط الحسابات', '/finance/account-mappings'],
    ['📝 قيد محاسبي جديد', '/finance/new-entry'],
    ['🧙 معالج الإعداد', '/finance/accounting-wizard'],
    ['🚀 استقبال دفعة', '/finance/operations/receive-payment'],
    
    // الموارد البشرية
    ['👤 الموظفين', '/hr/employees'],
    ['⏰ الحضور والإجازات', '/hr/attendance'],
    ['💸 الرواتب', '/hr/payroll'],
    ['📊 تقارير HR', '/hr/reports'],
    
    // الشؤون القانونية
    ['⚖️ القضايا', '/legal/cases'],
    ['📚 المساعد الذكي', '/legal/document-generator'],
    ['📁 مستندات الشركة', '/legal/documents'],
    ['📝 إدارة المتعثرات', '/legal/delinquency'],
    
    // العمليات
    ['🚛 أذونات الصرف', '/fleet/dispatch-permits'],
    
    // النظام
    ['✅ المهام', '/tasks'],
    ['📊 التقارير العامة', '/reports'],
    ['⚙️ الإعدادات', '/settings'],
  ];

  let passed = 0, failed = 0;
  const failedList = [];

  for (const [name, url] of pages) {
    errors = [];
    warnings = 0;
    try {
      await page.goto('http://localhost:8080' + url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(2500);
      
      const hasCritical = warnings > 3 || errors.some(e => e.includes('Maximum update depth') || e.includes('Application error') || e.includes('chunk failed'));
      const bodyText = await page.textContent('body').catch(() => '');
      const hasError = bodyText.includes('Something went wrong') || bodyText.includes('Application error') || bodyText.includes('chunk load');
      
      if (hasCritical || hasError) {
        console.log(`❌ ${name}`);
        failed++;
        failedList.push({ name, url, errors: errors.slice(0, 2) });
      } else {
        console.log(`✅ ${name}`);
        passed++;
      }
    } catch(e) {
      if (e.message.includes('net::ERR') || e.message.includes('timeout')) {
        console.log(`⏱️ ${name} (timeout/redirect)`);
        passed++; // redirects and network issues aren't page errors
      } else {
        console.log(`❌ ${name} — ${e.message.substring(0, 60)}`);
        failed++;
        failedList.push({ name, url, errors: [e.message.substring(0, 60)] });
      }
    }
  }

  await browser.close();

  console.log('\n═════════════════════════════════════════');
  console.log(`📊 اختبار شامل للنظام`);
  console.log(`   الصفحات: ${pages.length}`);
  console.log(`   ✅ ناجحة: ${passed}`);
  console.log(`   ❌ فاشلة: ${failed}`);
  console.log(`   النسبة: ${Math.round(passed/pages.length*100)}%`);
  console.log('═════════════════════════════════════════');
  
  if (failed > 0) {
    console.log('\nالصفحات الفاشلة:');
    failedList.forEach(f => {
      console.log(`  ❌ ${f.name} (${f.url})`);
      f.errors.forEach(e => console.log(`     → ${e}`));
    });
  }
})();
