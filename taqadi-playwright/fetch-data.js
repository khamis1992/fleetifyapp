/**
 * جلب بيانات الدعوى من نظام العراف
 * يحفظ البيانات في ملف lawsuit-data.json
 */

require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const CONTRACT_ID = process.env.CONTRACT_ID;

async function fetchLawsuitData() {
  console.log('📋 جاري جلب بيانات العقد:', CONTRACT_ID);
  
  try {
    // جلب بيانات العقد
    const contractRes = await fetch(
      `${SUPABASE_URL}/rest/v1/contracts?id=eq.${CONTRACT_ID}&select=*,customers(*),vehicles(*)`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    
    if (!contractRes.ok) {
      throw new Error(`فشل جلب العقد: ${contractRes.status}`);
    }
    
    const contracts = await contractRes.json();
    
    if (!contracts || contracts.length === 0) {
      throw new Error('العقد غير موجود');
    }
    
    const contract = contracts[0];
    const customer = contract.customers || {};
    const vehicle = contract.vehicles || {};
    
    console.log('✅ تم جلب بيانات العقد:', contract.agreement_number);
    
    // جلب الفواتير المتأخرة
    const invoicesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/invoices?contract_id=eq.${CONTRACT_ID}&status=eq.overdue&select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    
    const invoices = await invoicesRes.json() || [];
    const totalOverdue = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    console.log(`📊 عدد الفواتير المتأخرة: ${invoices.length} بإجمالي ${totalOverdue} ر.ق`);
    
    // جلب المخالفات المرورية
    const violationsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/traffic_violations?contract_id=eq.${CONTRACT_ID}&status=eq.unpaid&select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    
    const violations = await violationsRes.json() || [];
    const totalViolations = violations.reduce((sum, v) => sum + (v.fine_amount || 0), 0);
    
    console.log(`🚦 عدد المخالفات: ${violations.length} بإجمالي ${totalViolations} ر.ق`);
    
    // حساب المبالغ
    const lateFee = Math.round(totalOverdue * 0.05); // 5% غرامة تأخير
    const adminFee = 500;
    const totalAmount = totalOverdue + lateFee + totalViolations + adminFee;
    
    // تحويل المبلغ لكتابة
    const amountInWords = convertToArabicWords(totalAmount);
    
    // بناء اسم المدعى عليه
    const defendantName = [
      customer.first_name,
      customer.second_name,
      customer.third_name,
      customer.last_name
    ].filter(Boolean).join(' ') || customer.full_name || 'غير معروف';
    
    // بناء بيانات السيارة
    const vehicleInfo = `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim();
    
    // تاريخ العقد
    const contractDate = new Date(contract.start_date || contract.created_at);
    const formattedDate = contractDate.toLocaleDateString('ar-QA');
    
    // بناء بيانات الدعوى
    const lawsuitData = {
      // معلومات أساسية
      contractId: CONTRACT_ID,
      agreementNumber: contract.agreement_number,
      
      // بيانات المدعى عليه
      defendantName: defendantName,
      defendantId: customer.national_id || customer.license_number || '-',
      defendantPhone: customer.phone || customer.mobile || '-',
      
      // بيانات السيارة
      vehicleInfo: vehicleInfo,
      vehiclePlate: vehicle.license_plate || '-',
      
      // عنوان الدعوى (50 حرف كحد أقصى)
      caseTitle: `مطالبة مالية-إيجار سيارة-${defendantName}`.substring(0, 50),
      
      // الوقائع
      facts: `بتاريخ ${formattedDate} أبرمت شركة العراف لتأجير السيارات (المدعية) عقد إيجار سيارة مع السيد/ ${defendantName} (المدعى عليه) وذلك لاستئجار سيارة ${vehicleInfo}. وقد التزمت المدعية بتسليم السيارة المؤجرة للمدعى عليه في حالة جيدة وصالحة للاستخدام، إلا أن المدعى عليه أخل بالتزاماته التعاقدية وامتنع عن سداد الإيجارات المستحقة عليه. وبالرغم من المطالبات الودية المتكررة، إلا أن المدعى عليه لم يقم بسداد المبالغ المستحقة والتي بلغت ${totalAmount.toLocaleString('ar-QA')} ريال قطري.${violations.length > 0 ? ` بالإضافة إلى ذلك، ترتبت على المدعى عليه مخالفات مرورية بسبب استخدام السيارة المؤجرة بعدد (${violations.length}) مخالفة بإجمالي مبلغ (${totalViolations.toLocaleString('ar-QA')}) ريال قطري، والتي لم يقم بسدادها حتى تاريخه.` : ''}`,
      
      // الطلبات
      requests: buildRequests(totalOverdue, totalViolations, violations.length),
      
      // المبالغ
      amount: totalAmount.toString(),
      amountFormatted: totalAmount.toLocaleString('ar-QA'),
      amountInWords: amountInWords,
      
      // تفاصيل المبالغ
      breakdown: {
        overdue: totalOverdue,
        lateFee: lateFee,
        violations: totalViolations,
        violationsCount: violations.length,
        adminFee: adminFee,
        total: totalAmount,
      },
      
      // معلومات إضافية
      invoicesCount: invoices.length,
      createdAt: new Date().toISOString(),
    };
    
    // حفظ البيانات
    fs.writeFileSync('lawsuit-data.json', JSON.stringify(lawsuitData, null, 2), 'utf-8');
    console.log('');
    console.log('✅ تم حفظ بيانات الدعوى في: lawsuit-data.json');
    console.log('');
    console.log('📋 ملخص الدعوى:');
    console.log(`   العنوان: ${lawsuitData.caseTitle}`);
    console.log(`   المدعى عليه: ${lawsuitData.defendantName}`);
    console.log(`   المبلغ: ${lawsuitData.amountFormatted} ر.ق`);
    console.log(`   المبلغ كتابةً: ${lawsuitData.amountInWords}`);
    console.log('');
    console.log('🚀 لبدء الأتمتة، شغّل: npm start');
    
    return lawsuitData;
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    process.exit(1);
  }
}

// بناء الطلبات
function buildRequests(overdue, violations, violationsCount) {
  const requests = [];
  let num = 1;
  
  if (overdue > 0) {
    requests.push(`${num}. إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${overdue.toLocaleString('ar-QA')}) ريال قطري قيمة الإيجارات المتأخرة.`);
    num++;
  }
  
  if (violations > 0) {
    requests.push(`${num}. إلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${violations.toLocaleString('ar-QA')}) ريال قطري قيمة المخالفات المرورية غير المسددة (عدد ${violationsCount} مخالفة).`);
    num++;
  }
  
  requests.push(`${num}. إلزام المدعى عليه بالفوائد القانونية من تاريخ الاستحقاق وحتى تمام السداد.`);
  num++;
  
  requests.push(`${num}. إلزام المدعى عليه بالرسوم والمصاريف ومقابل أتعاب المحاماة.`);
  
  return requests.join(' ');
}

// تحويل الأرقام للكتابة بالعربية
function convertToArabicWords(num) {
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  
  if (num === 0) return 'صفر';
  
  let words = [];
  
  // الآلاف
  const thousands = Math.floor(num / 1000);
  if (thousands > 0) {
    if (thousands === 1) words.push('ألف');
    else if (thousands === 2) words.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) words.push(ones[thousands] + ' آلاف');
    else if (thousands > 10) words.push(convertToArabicWords(thousands) + ' ألف');
  }
  
  // المئات
  const remainder = num % 1000;
  const hundredsDigit = Math.floor(remainder / 100);
  if (hundredsDigit > 0) {
    if (words.length > 0) words.push('و');
    words.push(hundreds[hundredsDigit]);
  }
  
  // العشرات والآحاد
  const tensRemainder = remainder % 100;
  if (tensRemainder > 0) {
    if (words.length > 0) words.push('و');
    
    if (tensRemainder < 10) {
      words.push(ones[tensRemainder]);
    } else if (tensRemainder >= 10 && tensRemainder < 20) {
      words.push(teens[tensRemainder - 10]);
    } else {
      const tensDigit = Math.floor(tensRemainder / 10);
      const onesDigit = tensRemainder % 10;
      if (onesDigit > 0) {
        words.push(ones[onesDigit] + ' و' + tens[tensDigit]);
      } else {
        words.push(tens[tensDigit]);
      }
    }
  }
  
  return words.join(' ') + ' ريال قطري';
}

// تشغيل
fetchLawsuitData();

