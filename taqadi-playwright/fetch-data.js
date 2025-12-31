/**
 * جلب بيانات الدعوى - يمكنك إدخالها يدوياً أو استخدام بيانات تجريبية
 * يحفظ البيانات في ملف lawsuit-data.json
 */

const fs = require('fs');
const readline = require('readline');

async function fetchLawsuitData() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚗 أداة تجهيز بيانات الدعوى - شركة العراف');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('📋 اختر طريقة إدخال البيانات:');
  console.log('');
  console.log('   1. إدخال البيانات يدوياً');
  console.log('   2. استخدام بيانات تجريبية (للاختبار)');
  console.log('');
  
  const choice = await askQuestion('اختر (1 أو 2): ');
  
  let lawsuitData;
  
  if (choice === '2') {
    lawsuitData = getTestData();
  } else {
    lawsuitData = await getManualInput();
  }
  
  // حفظ البيانات
  fs.writeFileSync('lawsuit-data.json', JSON.stringify(lawsuitData, null, 2), 'utf-8');
  
  console.log('');
  console.log('✅ تم حفظ بيانات الدعوى في: lawsuit-data.json');
  console.log('');
  console.log('📋 ملخص الدعوى:');
  console.log(`   العنوان: ${lawsuitData.caseTitle}`);
  console.log(`   المدعى عليه: ${lawsuitData.defendantName}`);
  console.log(`   المبلغ: ${lawsuitData.amountFormatted} ر.ق`);
  console.log('');
  console.log('🚀 لبدء الأتمتة، شغّل: npm start');
  
  return lawsuitData;
}

// بيانات تجريبية من صفحة العراف
function getTestData() {
  console.log('');
  console.log('📋 استخدام البيانات التجريبية...');
  
  const defendantName = 'ياسين سرحان كمال بن عايد';
  const vehicleInfo = 'Bestune T77 2023';
  const contractNumber = 'C-ALF-0025';
  const totalOverdue = 23100;
  const totalViolations = 1600;
  const lateFee = 1155;
  const adminFee = 500;
  const totalAmount = totalOverdue + lateFee + totalViolations + adminFee;
  
  return {
    contractId: 'c1d24b06-dd18-4f6a-8126-c83efaeddfb7',
    agreementNumber: contractNumber,
    defendantName: defendantName,
    defendantId: '-',
    defendantPhone: '71002048',
    vehicleInfo: vehicleInfo,
    vehiclePlate: '2780',
    caseTitle: `مطالبة مالية-إيجار سيارة-${defendantName}`.substring(0, 50),
    facts: `بتاريخ ٢٩‏/١٢‏/٢٠٢٣ أبرمت شركة العراف لتأجير السيارات (المدعية) عقد إيجار سيارة مع السيد/ ${defendantName} (المدعى عليه) وذلك لاستئجار سيارة ${vehicleInfo}. وقد التزمت المدعية بتسليم السيارة المؤجرة للمدعى عليه في حالة جيدة وصالحة للاستخدام، إلا أن المدعى عليه أخل بالتزاماته التعاقدية وامتنع عن سداد الإيجارات المستحقة عليه. وبالرغم من المطالبات الودية المتكررة، إلا أن المدعى عليه لم يقم بسداد المبالغ المستحقة والتي بلغت ${totalAmount.toLocaleString('ar-QA')} ريال قطري. بالإضافة إلى ذلك، ترتبت على المدعى عليه مخالفات مرورية بسبب استخدام السيارة المؤجرة بعدد (5) مخالفة بإجمالي مبلغ (${totalViolations.toLocaleString('ar-QA')}) ريال قطري، والتي لم يقم بسدادها حتى تاريخه.`,
    requests: `1. إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${totalOverdue.toLocaleString('ar-QA')}) ريال قطري قيمة الإيجارات المتأخرة. 2. إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${totalViolations.toLocaleString('ar-QA')}) ريال قطري قيمة المخالفات المرورية غير المسددة (عدد 5 مخالفة). 3. إلزام المدعى عليه بالفوائد القانونية من تاريخ الاستحقاق وحتى تمام السداد. 4. إلزام المدعى عليه بالرسوم والمصاريف ومقابل أتعاب المحاماة.`,
    amount: totalAmount.toString(),
    amountFormatted: totalAmount.toLocaleString('ar-QA'),
    amountInWords: 'ستة وعشرون ألف وثلاثمائة وخمسة وخمسون ريال قطري',
    breakdown: {
      overdue: totalOverdue,
      lateFee: lateFee,
      violations: totalViolations,
      violationsCount: 5,
      adminFee: adminFee,
      total: totalAmount,
    },
    createdAt: new Date().toISOString(),
  };
}

// إدخال البيانات يدوياً
async function getManualInput() {
  console.log('');
  console.log('📝 أدخل بيانات الدعوى:');
  console.log('');
  
  const defendantName = await askQuestion('اسم المدعى عليه: ');
  const defendantPhone = await askQuestion('رقم الهاتف: ');
  const vehicleInfo = await askQuestion('بيانات السيارة (مثال: Toyota Camry 2022): ');
  const vehiclePlate = await askQuestion('رقم اللوحة: ');
  const contractNumber = await askQuestion('رقم العقد: ');
  const totalAmount = parseInt(await askQuestion('إجمالي المبلغ المطالب به: ')) || 0;
  const amountInWords = await askQuestion('المبلغ كتابةً: ');
  
  return {
    contractId: 'manual-entry',
    agreementNumber: contractNumber,
    defendantName: defendantName,
    defendantId: '-',
    defendantPhone: defendantPhone,
    vehicleInfo: vehicleInfo,
    vehiclePlate: vehiclePlate,
    caseTitle: `مطالبة مالية-إيجار سيارة-${defendantName}`.substring(0, 50),
    facts: `أبرمت شركة العراف لتأجير السيارات (المدعية) عقد إيجار سيارة مع السيد/ ${defendantName} (المدعى عليه) وذلك لاستئجار سيارة ${vehicleInfo}. وقد التزمت المدعية بتسليم السيارة المؤجرة للمدعى عليه في حالة جيدة وصالحة للاستخدام، إلا أن المدعى عليه أخل بالتزاماته التعاقدية وامتنع عن سداد الإيجارات المستحقة عليه والتي بلغت ${totalAmount.toLocaleString('ar-QA')} ريال قطري.`,
    requests: `1. إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${totalAmount.toLocaleString('ar-QA')}) ريال قطري. 2. إلزام المدعى عليه بالفوائد القانونية من تاريخ الاستحقاق وحتى تمام السداد. 3. إلزام المدعى عليه بالرسوم والمصاريف ومقابل أتعاب المحاماة.`,
    amount: totalAmount.toString(),
    amountFormatted: totalAmount.toLocaleString('ar-QA'),
    amountInWords: amountInWords,
    breakdown: { total: totalAmount },
    createdAt: new Date().toISOString(),
  };
}

// دالة مساعدة للسؤال
function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

// تشغيل
fetchLawsuitData();
