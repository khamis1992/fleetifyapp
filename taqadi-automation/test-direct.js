/**
 * اختبار مباشر لنظام الأتمتة
 * يتجاوز FleetifyApp ويختبر الأتمتة مباشرة
 */

import { automateTaqadiLawsuit } from './src/index.js';

console.log('🧪 بدء اختبار نظام الأتمتة...\n');

// معلومات الاختبار
const testConfig = {
  contractId: 'f2ecdec0-2038-45d3-92ac-3f3d455627bb',
  // استخدام الصفحة التجريبية بدلاً من FleetifyApp
  prepareUrl: 'file:///' + process.cwd().replace(/\\/g, '/') + '/demo-page.html',
  downloadDir: './test-downloads'
};

console.log('📋 إعدادات الاختبار:');
console.log(`   - Contract ID: ${testConfig.contractId}`);
console.log(`   - Prepare URL: ${testConfig.prepareUrl}`);
console.log(`   - Download Dir: ${testConfig.downloadDir}\n`);

// تشغيل الأتمتة
try {
  console.log('🚀 بدء الأتمتة...\n');
  
  const result = await automateTaqadiLawsuit(testConfig);
  
  console.log('\n✅ نجح الاختبار!');
  console.log('📊 النتيجة:', result);
  
} catch (error) {
  console.error('\n❌ فشل الاختبار!');
  console.error('الخطأ:', error.message);
  console.error('\nالتفاصيل:', error);
  process.exit(1);
}
