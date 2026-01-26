import * as XLSX from 'xlsx';

/**
 * واجهة بيانات القضية للـ Excel
 */
export interface LawsuitExcelData {
  case_title: string;                    // عنوان الدعوى
  facts: string;                         // الوقائع
  requests: string;                      // الطلبات
  claim_amount: number;                  // قيمة المطالبة
  claim_amount_words: string;            // المبلغ بالحروف
  defendant_first_name: string;          // اسم المدعى عليه الأول
  defendant_middle_name: string;         // اسم المدعى عليه الثالث
  defendant_last_name: string;           // اسم المدعى عليه الأخير
  defendant_nationality: string;         // جنسية المدعى عليه
  defendant_id_number: string;           // رقم هوية المدعى عليه
  defendant_address: string;             // عنوان المدعى عليه
  defendant_phone: string;               // هاتف المدعى عليه
  defendant_email: string;               // بريد المدعى عليه الإلكتروني
}

/**
 * استخراج بيانات القضية من بيانات العميل والعقد
 */
export function extractLawsuitData(
  customer: any,
  contract: any,
  vehicleData: any,
  invoices: any[],
  violations: any[],
  companyInfo: any
): LawsuitExcelData {
  // حساب المبالغ
  const overdueRent = invoices
    .filter((inv) => inv.status === 'overdue' || inv.status === 'unpaid')
    .reduce((sum, inv) => sum + (Number(inv.amount_due) || 0), 0);

  const violationsTotal = violations.reduce(
    (sum, v) => sum + (Number(v.amount) || 0),
    0
  );

  const latePenalty = Math.floor(
    ((new Date().getTime() - new Date(contract.end_date || Date.now()).getTime()) /
      (1000 * 60 * 60 * 24)) *
      120
  );

  const compensation = 10000; // التعويض الافتراضي
  const totalClaim = overdueRent + violationsTotal + latePenalty + compensation;

  // تقسيم الاسم
  const fullName = customer.customer_name || customer.full_name || '';
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts[nameParts.length - 1] || '';
  const middleName = nameParts.slice(1, -1).join(' ') || '';

  // عنوان الدعوى
  const caseTitle = `دعوى مطالبة مالية بمبلغ ${totalClaim.toFixed(2)} ريال قطري`;

  // الوقائع
  const facts = `
تعود وقائع هذه الدعوى إلى أن المدعية (${companyInfo.name_ar || 'شركة العراف لتأجير السيارات'}) قامت بتأجير المركبة رقم (${vehicleData?.plate_number || 'غير محدد'}) من نوع (${vehicleData ? `${vehicleData.make || ''} ${vehicleData.model || ''}`.trim() : 'غير محدد'}) للمدعى عليه بموجب عقد الإيجار رقم (${contract.contract_number || 'غير محدد'}) بتاريخ ${contract.start_date ? new Date(contract.start_date).toLocaleDateString('ar-QA') : 'غير محدد'}.

وقد التزمت المدعية بتسليم المركبة للمدعى عليه في الموعد المحدد وبالحالة المتفق عليها، إلا أن المدعى عليه لم يلتزم بسداد الأقساط المستحقة عليه والبالغة (${overdueRent.toFixed(2)}) ريال قطري.

كما تسبب المدعى عليه في ارتكاب مخالفات مرورية بلغت قيمتها (${violationsTotal.toFixed(2)}) ريال قطري، ولم يقم بتسديدها حتى تاريخه.

وبالرغم من المطالبات المتكررة من قبل المدعية، إلا أن المدعى عليه لم يستجب ولم يقم بسداد المبالغ المستحقة، مما اضطر المدعية إلى اللجوء للقضاء للمطالبة بحقوقها المشروعة.
  `.trim();

  // الطلبات
  const requests = `
بناءً على ما تقدم، تلتمس المدعية من عدالة المحكمة الموقرة الحكم بالآتي:

1. إلزام المدعى عليه بأداء مبلغ (${overdueRent.toFixed(2)}) ريال قطري قيمة الأقساط المستحقة وغير المسددة.

2. إلزام المدعى عليه بأداء مبلغ (${violationsTotal.toFixed(2)}) ريال قطري قيمة المخالفات المرورية.

3. إلزام المدعى عليه بأداء مبلغ (${latePenalty.toFixed(2)}) ريال قطري قيمة غرامة التأخير بواقع 120 ريال قطري عن كل يوم تأخير.

4. إلزام المدعى عليه بأداء مبلغ (${compensation.toFixed(2)}) ريال قطري تعويضاً عن الأضرار المادية والمعنوية التي لحقت بالمدعية.

5. إلزام المدعى عليه بالرسوم والمصاريف ومقابل أتعاب المحاماة.

مع حفظ كافة حقوق المدعية الأخرى.
  `.trim();

  // تحويل المبلغ إلى كلمات (مبسط)
  const claimAmountWords = numberToArabicWords(totalClaim);

  return {
    case_title: caseTitle,
    facts: facts,
    requests: requests,
    claim_amount: totalClaim,
    claim_amount_words: claimAmountWords,
    defendant_first_name: firstName,
    defendant_middle_name: middleName,
    defendant_last_name: lastName,
    defendant_nationality: customer.nationality || 'غير محدد',
    defendant_id_number: customer.national_id || customer.id_number || 'غير محدد',
    defendant_address: customer.address || 'غير محدد',
    defendant_phone: customer.phone || customer.phone_number || 'غير محدد',
    defendant_email: customer.email || 'غير محدد',
  };
}

/**
 * تحويل الرقم إلى كلمات عربية (مبسط)
 */
function numberToArabicWords(num: number): string {
  if (num === 0) return 'صفر';

  const ones = [
    '',
    'واحد',
    'اثنان',
    'ثلاثة',
    'أربعة',
    'خمسة',
    'ستة',
    'سبعة',
    'ثمانية',
    'تسعة',
  ];
  const tens = [
    '',
    'عشرة',
    'عشرون',
    'ثلاثون',
    'أربعون',
    'خمسون',
    'ستون',
    'سبعون',
    'ثمانون',
    'تسعون',
  ];
  const hundreds = [
    '',
    'مائة',
    'مائتان',
    'ثلاثمائة',
    'أربعمائة',
    'خمسمائة',
    'ستمائة',
    'سبعمائة',
    'ثمانمائة',
    'تسعمائة',
  ];

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let result = '';

  // الآلاف
  const thousands = Math.floor(integerPart / 1000);
  if (thousands > 0) {
    if (thousands === 1) {
      result += 'ألف';
    } else if (thousands === 2) {
      result += 'ألفان';
    } else if (thousands <= 10) {
      result += ones[thousands] + ' آلاف';
    } else {
      result += convertHundreds(thousands) + ' ألف';
    }
    result += ' و';
  }

  // المئات والعشرات والآحاد
  const remainder = integerPart % 1000;
  if (remainder > 0) {
    result += convertHundreds(remainder);
  } else if (thousands > 0) {
    result = result.slice(0, -3); // إزالة " و" الأخيرة
  }

  result += ' ريال قطري';

  // الكسور العشرية
  if (decimalPart > 0) {
    result += ' و' + convertHundreds(decimalPart) + ' درهم';
  }

  return result.trim();

  function convertHundreds(n: number): string {
    let str = '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;

    if (h > 0) {
      str += hundreds[h];
      if (t > 0 || o > 0) str += ' و';
    }

    if (t > 1) {
      str += tens[t];
      if (o > 0) str += ' و' + ones[o];
    } else if (t === 1) {
      if (o === 0) {
        str += tens[1];
      } else if (o === 1) {
        str += 'أحد عشر';
      } else if (o === 2) {
        str += 'اثنا عشر';
      } else {
        str += ones[o] + ' عشر';
      }
    } else if (o > 0) {
      str += ones[o];
    }

    return str;
  }
}

/**
 * إنشاء ملف Excel من بيانات القضايا
 */
export function createLawsuitExcelFile(lawsuits: LawsuitExcelData[]): ArrayBuffer {
  // إنشاء ورقة عمل جديدة
  const worksheetData = [
    // رأس الجدول (بالعربية) - بنفس ترتيب الصورة
    [
      'عنوان الدعوى',
      'الوقائع',
      'الطلبات',
      'قيمة المطالبة',
      'المبلغ بالحروف',
      'اسم المدعى عليه الأول',
      'اسم المدعى عليه الثالث',
      'اسم المدعى عليه الأخير',
      'جنسية المدعى عليه',
      'رقم هوية المدعى عليه',
      'عنوان المدعى عليه',
      'هاتف المدعى عليه',
      'بريد المدعى عليه الإلكتروني',
    ],
    // البيانات
    ...lawsuits.map((lawsuit) => [
      lawsuit.case_title,
      lawsuit.facts,
      lawsuit.requests,
      lawsuit.claim_amount,
      lawsuit.claim_amount_words,
      lawsuit.defendant_first_name,
      lawsuit.defendant_middle_name,
      lawsuit.defendant_last_name,
      lawsuit.defendant_nationality,
      lawsuit.defendant_id_number,
      lawsuit.defendant_address,
      lawsuit.defendant_phone,
      lawsuit.defendant_email,
    ]),
  ];

  // إنشاء ورقة العمل
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // تنسيق الأعمدة (عرض الأعمدة)
  worksheet['!cols'] = [
    { wch: 50 }, // عنوان الدعوى
    { wch: 100 }, // الوقائع
    { wch: 100 }, // الطلبات
    { wch: 20 }, // قيمة المطالبة
    { wch: 60 }, // المبلغ بالحروف
    { wch: 25 }, // اسم المدعى عليه الأول
    { wch: 25 }, // اسم المدعى عليه الثالث
    { wch: 25 }, // اسم المدعى عليه الأخير
    { wch: 20 }, // جنسية المدعى عليه
    { wch: 25 }, // رقم هوية المدعى عليه
    { wch: 40 }, // عنوان المدعى عليه
    { wch: 20 }, // هاتف المدعى عليه
    { wch: 30 }, // بريد المدعى عليه الإلكتروني
  ];

  // تنسيق الصفوف (ارتفاع الصفوف)
  worksheet['!rows'] = [
    { hpt: 30 }, // رأس الجدول
    ...lawsuits.map(() => ({ hpt: 100 })), // صفوف البيانات
  ];

  // إنشاء كتاب العمل
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'بيانات القضايا');

  // تحويل إلى ArrayBuffer
  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });

  return excelBuffer;
}
