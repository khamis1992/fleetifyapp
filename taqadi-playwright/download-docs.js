/**
 * تحميل المستندات من Supabase Storage
 * يحمّل جميع المستندات المطلوبة للدعوى إلى مجلد temp/
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

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

// تحميل ملف من URL
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    
    protocol.get(url, (response) => {
      // التعامل مع إعادة التوجيه
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
      
      file.on('error', (err) => {
        fs.unlinkSync(destPath);
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function downloadDocuments() {
  console.log('');
  log('═══════════════════════════════════════════════════════════', '');
  log('📥', 'تحميل المستندات - شركة العراف', colors.magenta);
  log('═══════════════════════════════════════════════════════════', '');
  console.log('');

  // قراءة بيانات الدعوى
  const dataPath = path.join(__dirname, 'lawsuit-data.json');
  if (!fs.existsSync(dataPath)) {
    log('❌', 'ملف lawsuit-data.json غير موجود!', colors.red);
    log('📋', 'شغّل أولاً: npm run fetch', colors.yellow);
    process.exit(1);
  }

  const lawsuitData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  
  if (!lawsuitData.documents || lawsuitData.documents.length === 0) {
    log('❌', 'لا توجد مستندات في البيانات!', colors.red);
    log('📋', 'شغّل أولاً: npm run fetch', colors.yellow);
    process.exit(1);
  }

  // إنشاء مجلد temp
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
    log('📁', 'تم إنشاء مجلد temp/', colors.cyan);
  }

  console.log('');
  log('📋', `عدد المستندات: ${lawsuitData.documents.length}`, colors.cyan);
  console.log('');

  let downloadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const doc of lawsuitData.documents) {
    // تخطي المستندات المُولّدة (سيتم إنشاؤها لاحقاً)
    if (doc.generated) {
      log('⏩', `${doc.name}: سيتم توليده لاحقاً`, colors.yellow);
      skippedCount++;
      continue;
    }

    // تخطي المستندات الخاصة بالعقد (تحتاج معالجة خاصة)
    if (doc.contractSpecific) {
      log('⏩', `${doc.name}: يحتاج رفع يدوي من نظام العراف`, colors.yellow);
      skippedCount++;
      continue;
    }

    // التحقق من وجود رابط
    if (!doc.url) {
      log('⚠️', `${doc.name}: لا يوجد رابط`, colors.yellow);
      skippedCount++;
      continue;
    }

    // تحميل الملف
    const destPath = path.join(__dirname, doc.localPath);
    
    log('⬇️', `جاري تحميل: ${doc.name}...`, colors.cyan);
    
    try {
      await downloadFile(doc.url, destPath);
      
      // التحقق من حجم الملف
      const stats = fs.statSync(destPath);
      if (stats.size < 100) {
        // ملف صغير جداً = خطأ
        fs.unlinkSync(destPath);
        log('❌', `${doc.name}: الملف فارغ أو غير موجود`, colors.red);
        failedCount++;
      } else {
        const sizeKB = (stats.size / 1024).toFixed(1);
        log('✅', `${doc.name}: تم التحميل (${sizeKB} KB)`, colors.green);
        downloadedCount++;
      }
    } catch (error) {
      log('❌', `${doc.name}: فشل التحميل - ${error.message}`, colors.red);
      failedCount++;
    }
  }

  console.log('');
  log('═══════════════════════════════════════════════════════════', '');
  log('📊', 'ملخص التحميل:', colors.magenta);
  log('✅', `تم تحميل: ${downloadedCount} ملفات`, colors.green);
  log('⏩', `تم تخطي: ${skippedCount} ملفات`, colors.yellow);
  if (failedCount > 0) {
    log('❌', `فشل: ${failedCount} ملفات`, colors.red);
  }
  log('═══════════════════════════════════════════════════════════', '');
  console.log('');

  // إنشاء ملفات placeholder للمستندات المُولّدة
  log('📝', 'جاري إنشاء المستندات المُولّدة...', colors.cyan);
  
  const generatedDocs = lawsuitData.documents.filter(d => d.generated);
  for (const doc of generatedDocs) {
    const destPath = path.join(__dirname, doc.localPath);
    
    // إنشاء ملف HTML مؤقت (يمكن تحويله لـ PDF لاحقاً)
    let content = '';
    
    if (doc.type === 'explanatory_memo') {
      content = generateMemo(lawsuitData);
    } else if (doc.type === 'documents_list') {
      content = generateDocsList(lawsuitData);
    } else if (doc.type === 'claims_statement') {
      content = generateClaimsStatement(lawsuitData);
    }
    
    // حفظ كـ HTML
    const htmlPath = destPath.replace('.pdf', '.html');
    fs.writeFileSync(htmlPath, content, 'utf-8');
    log('✅', `${doc.name}: تم التوليد (HTML)`, colors.green);
  }

  console.log('');
  log('📋', 'الملفات الجاهزة في: temp/', colors.cyan);
  
  // عرض الملفات
  const tempFiles = fs.readdirSync(tempDir);
  tempFiles.forEach(file => {
    log('   📄', file, colors.reset);
  });

  console.log('');
  log('🚀', 'لبدء الأتمتة: npm start', colors.magenta);
  console.log('');
}

// توليد المذكرة الشارحة
function generateMemo(data) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>المذكرة الشارحة</title>
  <style>
    body { font-family: 'Traditional Arabic', serif; font-size: 16px; line-height: 2; padding: 40px; direction: rtl; }
    h1 { text-align: center; color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px; }
    .header { text-align: center; margin-bottom: 30px; }
    .section { margin: 20px 0; }
    .section-title { font-weight: bold; color: #2c5282; margin-bottom: 10px; }
    .footer { margin-top: 40px; text-align: left; }
    .signature { margin-top: 60px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>المذكرة الشارحة</h1>
    <p>في الدعوى المقامة من شركة العراف لتأجير السيارات ضد ${data.defendantName}</p>
  </div>
  
  <div class="section">
    <div class="section-title">أولاً: الوقائع</div>
    <p>${data.facts}</p>
  </div>
  
  <div class="section">
    <div class="section-title">ثانياً: الأساس القانوني</div>
    <p>وحيث أن المدعى عليه قد أخل بالتزاماته التعاقدية الناشئة عن عقد الإيجار المبرم بين الطرفين، فإن المدعية تستند في دعواها إلى:</p>
    <ul>
      <li>القانون المدني القطري - أحكام الإيجار</li>
      <li>عقد الإيجار المبرم بين الطرفين</li>
      <li>مبدأ العقد شريعة المتعاقدين</li>
    </ul>
  </div>
  
  <div class="section">
    <div class="section-title">ثالثاً: الطلبات</div>
    <p>${data.requests}</p>
  </div>
  
  <div class="footer">
    <p>والله ولي التوفيق</p>
    <div class="signature">
      <p>مقدمه</p>
      <p>شركة العراف لتأجير السيارات</p>
      <p>التاريخ: ${new Date().toLocaleDateString('ar-QA')}</p>
    </div>
  </div>
</body>
</html>`;
}

// توليد كشف المستندات
function generateDocsList(data) {
  const docs = data.documents.filter(d => d.required);
  let docsHtml = '';
  docs.forEach((doc, index) => {
    docsHtml += `<tr><td>${index + 1}</td><td>${doc.name}</td><td>${doc.required ? 'أصل' : 'صورة'}</td></tr>`;
  });

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>كشف المستندات</title>
  <style>
    body { font-family: 'Traditional Arabic', serif; font-size: 16px; padding: 40px; direction: rtl; }
    h1 { text-align: center; color: #1a365d; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
    th { background-color: #1a365d; color: white; }
    tr:nth-child(even) { background-color: #f5f5f5; }
  </style>
</head>
<body>
  <h1>كشف المستندات</h1>
  <p>المستندات المرفقة مع الدعوى المقامة ضد: ${data.defendantName}</p>
  <table>
    <thead>
      <tr><th>م</th><th>المستند</th><th>النوع</th></tr>
    </thead>
    <tbody>
      ${docsHtml}
    </tbody>
  </table>
  <p style="margin-top: 30px;">إجمالي المستندات: ${docs.length} مستند</p>
  <p>التاريخ: ${new Date().toLocaleDateString('ar-QA')}</p>
</body>
</html>`;
}

// توليد كشف المطالبات
function generateClaimsStatement(data) {
  const breakdown = data.breakdown || {};
  
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>كشف المطالبات</title>
  <style>
    body { font-family: 'Traditional Arabic', serif; font-size: 16px; padding: 40px; direction: rtl; }
    h1 { text-align: center; color: #1a365d; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: right; }
    th { background-color: #1a365d; color: white; }
    .total { font-weight: bold; background-color: #e2e8f0; }
    .amount { direction: ltr; text-align: left; }
  </style>
</head>
<body>
  <h1>كشف المطالبات المالية</h1>
  <p>تفصيل المبالغ المطالب بها من: ${data.defendantName}</p>
  <p>رقم العقد: ${data.agreementNumber}</p>
  
  <table>
    <thead>
      <tr><th>البند</th><th>المبلغ (ر.ق)</th></tr>
    </thead>
    <tbody>
      ${breakdown.overdue ? `<tr><td>إيجارات متأخرة</td><td class="amount">${breakdown.overdue.toLocaleString('ar-QA')}</td></tr>` : ''}
      ${breakdown.lateFee ? `<tr><td>غرامة تأخير</td><td class="amount">${breakdown.lateFee.toLocaleString('ar-QA')}</td></tr>` : ''}
      ${breakdown.violations ? `<tr><td>مخالفات مرورية (${breakdown.violationsCount || ''} مخالفة)</td><td class="amount">${breakdown.violations.toLocaleString('ar-QA')}</td></tr>` : ''}
      ${breakdown.adminFee ? `<tr><td>رسوم إدارية</td><td class="amount">${breakdown.adminFee.toLocaleString('ar-QA')}</td></tr>` : ''}
      <tr class="total">
        <td>الإجمالي</td>
        <td class="amount">${data.amountFormatted}</td>
      </tr>
    </tbody>
  </table>
  
  <p style="margin-top: 20px;">المبلغ كتابةً: ${data.amountInWords}</p>
  <p>التاريخ: ${new Date().toLocaleDateString('ar-QA')}</p>
</body>
</html>`;
}

// تشغيل
downloadDocuments().catch(error => {
  log('❌', `خطأ: ${error.message}`, colors.red);
  process.exit(1);
});

