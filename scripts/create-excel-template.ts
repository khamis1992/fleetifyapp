import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

interface ColumnConfig {
  letter: string;
  headerEn: string;
  headerAr: string;
  width: number;
}

interface CustomerData {
  firstName: string;
  familyName: string;
  nationality: string;
  idNumber: string;
  mobile: string;
  amount: number;
  facts: string;
  requests: string;
}

const columns: ColumnConfig[] = [
  { letter: 'A', headerEn: 'FirstName', headerAr: 'الاسم الأول', width: 20 },
  { letter: 'B', headerEn: 'FamilyName', headerAr: 'اسم العائلة', width: 20 },
  { letter: 'C', headerEn: 'Nationality', headerAr: 'الجنسية', width: 15 },
  { letter: 'D', headerEn: 'IDNumber', headerAr: 'رقم الهوية', width: 18 },
  { letter: 'E', headerEn: 'Mobile', headerAr: 'رقم الجوال', width: 15 },
  { letter: 'F', headerEn: 'Amount', headerAr: 'المبلغ الإجمالي', width: 15 },
  { letter: 'G', headerEn: 'Facts', headerAr: 'الوقائع', width: 50 },
  { letter: 'H', headerEn: 'Requests', headerAr: 'الطلبات', width: 50 },
];

const sampleData: CustomerData[] = [
  {
    firstName: 'أحمد',
    familyName: 'محمد عبدالله',
    nationality: 'قطري',
    idNumber: '29263400736',
    mobile: '66123456',
    amount: 5500,
    facts: `بتاريخ 15/01/2024، أبرم المدعى عليه عقد إيجار سيارة مع المدعي لاستئجار سيارة نوع تويوتا كامري موديل 2023، مقابل مبلغ إيجار شهري قدره 1,800 ريال قطري. وفقاً لعقد الإيجار الموقع بين الطرفين، التزم المدعى عليه بسداد الإيجار شهرياً في الموعد المحدد (اليوم الخامس من كل شهر). خلف المدعى عليه بسداد أجرت الإيجار المستحقة اعتباراً من شهر يونيو 2024 وحتى تاريخه، علماً بأن المدعي قام بتوجيه عدة إنذارات رسمية وتنبيهات للمدعى عليه بموجب المادة 134 من القانون المدني والتي تم تجاهلها تماماً من قبل المدعى عليه.`,
    requests: `بناءً على ما تقدم، يلتمس المدعي من المحكمة الموقرة:
1. إلزام المدعى عليه بدفع مبلغ قدره (5,500) ريال قطري فقط، وذلك كمستحقات مالية مترتبة بذمته لصالح المدعي ناشئة عن عقد إيجار سيارات.
2. إلزام المدعى عليه بدفع الفوائد القانونية المستحقة اعتباراً من تاريخ الاستحقاق وحتى تاريخ السداد الكامل.
3. إلزام المدعى عليه بكافة المصاريف والمصروفات ومبلغ الخمسين ريال رسوم الدعوى.
4. الفصل في الدعوى بحكم مشمول بالنفاذ المعجل والكفاءة.
سائلين المولى عز وجل أن يتولاكم برعايته وأيدتنا دائماً بالتوفيق،،،`,
  },
  {
    firstName: 'محمد',
    familyName: 'سالم الخاطري',
    nationality: 'قطري',
    idNumber: '28512345678',
    mobile: '55987654',
    amount: 7250,
    facts: `بتاريخ 01/03/2024، وقع المدعى عليه عقد إيجار مركبة مع الشركة المدعية لاستئجار سيارة نوع نيسان باترول موديل 2022، بمبلغ إيجار شهري قدره 2,500 ريال قطري. ينص العقد على التزام المستأجر بسداد الإيجار في بداية كل شهر. توقف المدعى عليه عن السداد اعتباراً من شهر أغسطس 2024. رغم التذكيرات المتكررة عبر الهاتف وواتساب، لم يقم المدعى عليه بالسداد. المبلغ المستحق حالياً يبلغ 7,250 ريال قطري.`,
    requests: `يطلب المدعي من المحكمة الموقرة:
أولاً: الحكم على المدعى عليه بمبلغ (7,250) ريال قطري كدين للمدعي عن الإيجارات المستحقة.
ثانياً: إلزام المدعى عليه بدفع الفوائد القانونية.
ثالثاً: إلزام المدعى عليه بالمصاريف والرسوم.
رابعاً: النفاذ المعجل للحكم.`,
  },
  {
    firstName: 'خالد',
    familyName: 'عبدالرحمن المالكي',
    nationality: 'سعودي',
    idNumber: '24567890123',
    mobile: '50123456',
    amount: 4200,
    facts: `عقد إيجار سيارة lexus es350 موديل 2024 beginning 01/02/2024 monthly rent 3,000 QAR. Tenant stopped payment from July 2024. Multiple reminders ignored. Current outstanding: 4,200 QAR.`,
    requests: `Plaintiff requests:
1. Payment of 4,200 QAR for unpaid rent.
2. Legal interest from due date.
3. Court costs and attorney fees.
4. Immediate execution.`,
  },
  {
    firstName: 'فهد',
    familyName: 'أحمد الكواري',
    nationality: 'قطري',
    idNumber: '27890543216',
    mobile: '66554433',
    amount: 9000,
    facts: `استئجار سيارة GMC Yukon موديل 2023 ابتداءً من 15/01/2024 بإيجار شهري 4,500 ريال. المدعى عليه متأخر في الدفع 3 أشهر (أبريل، مايو، يونيو 2024). إجمالي المستحقات: 9,000 ريال قطري شاملة تأخير السيارة.`,
    requests: `المطلوب:
1. تسليم مبلغ 9,000 ريال.
2. الفوائد القانونية.
3. المصاريف.
4. النفاذ المعجل.`,
  },
];

function createCustomerDataSheet(): XLSX.WorkSheet {
  // Create header row
  const headerRow = columns.map(col => `${col.headerEn} ${col.headerAr}`);

  // Create data rows
  const dataRows = sampleData.map(data => [
    data.firstName,
    data.familyName,
    data.nationality,
    data.idNumber,
    data.mobile,
    data.amount,
    data.facts,
    data.requests,
  ]);

  // Combine header and data
  const allData = [headerRow, ...dataRows];

  // Create worksheet from array of arrays
  const ws = XLSX.utils.aoa_to_sheet(allData);

  // Set column widths
  ws['!cols'] = columns.map(col => ({ wch: col.width }));

  // Set row heights
  ws['!rows'] = [
    { hpx: 30 }, // Header row
    { hpx: 15 }, // Data row 2
    { hpx: 15 }, // Data row 3
    { hpx: 15 }, // Data row 4
    { hpx: 15 }, // Data row 5
  ];

  // Apply formatting to header cells
  columns.forEach((col, index) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });
    if (ws[cellAddress]) {
      ws[cellAddress].s = {
        font: { bold: true, sz: 12 },
        fill: { fgColor: { rgb: 'D9E1F2' } },
        alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { auto: 1 } },
          bottom: { style: 'thin', color: { auto: 1 } },
          left: { style: 'thin', color: { auto: 1 } },
          right: { style: 'thin', color: { auto: 1 } },
        },
      };
    }
  });

  // Apply formatting to data cells
  for (let row = 0; row < dataRows.length; row++) {
    const rowNum = row + 1; // +1 because of header

    // Columns A-F (basic data)
    for (let col = 0; col < 6; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowNum, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          alignment: {
            vertical: 'top',
            horizontal: col === 5 ? 'right' : (col === 2 || col === 3 || col === 4 ? 'center' : 'left')
          },
          border: {
            top: { style: 'thin', color: { auto: 1 } },
            bottom: { style: 'thin', color: { auto: 1 } },
            left: { style: 'thin', color: { auto: 1 } },
            right: { style: 'thin', color: { auto: 1 } },
          },
        };
      }
    }

    // Columns G-H (long text with wrap)
    for (let col = 6; col < 8; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowNum, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          alignment: { vertical: 'top', horizontal: 'left', wrapText: true },
          border: {
            top: { style: 'thin', color: { auto: 1 } },
            bottom: { style: 'thin', color: { auto: 1 } },
            left: { style: 'thin', color: { auto: 1 } },
            right: { style: 'thin', color: { auto: 1 } },
          },
        };
      }
    }
  }

  ws['!merges'] = [];
  return ws;
}

function createInstructionsSheet(): XLSX.WorkSheet {
  const instructions = [
    ['تعليمات ملء ملف بيانات العملاء'],
    ['Customer Data Template Instructions'],
    [''],
    ['1. ملاحظات هامة - Important Notes'],
    ['• All fields are mandatory except where noted'],
    ['• Use Arabic text for names and descriptions'],
    ['• Mobile: 8 digits only (no country code)'],
    ['• Amount: numbers only (no currency symbol)'],
    ['• Facts/Requests: Maximum 2000 characters'],
    [''],
    ['2. تنسيق البيانات - Data Format'],
    ['• FirstName: Arabic text only'],
    ['• FamilyName: Full family name'],
    ['• Nationality: Arabic (قطري، مصري، سعودي، etc.)'],
    ['• IDNumber: 11 digits for Qatari ID'],
    ['• Mobile: 8 digits starting with 3, 5, 6, 7'],
    ['• Amount: Integer numbers (e.g., 5000)'],
    ['• Facts: Detailed case description'],
    ['• Requests: Legal claims list'],
    [''],
    ['3. نصائح ملء الوقائع والطلبات - Tips for Facts & Requests'],
    ['• Include: Date, contract details, amount, default period'],
    ['• Be specific and factual'],
    ['• Mention any warnings sent'],
    ['• Number the requests clearly'],
    ['• Use formal legal Arabic'],
    [''],
    ['4. أمثلة - Examples'],
    ['See sample data in "Customer Data" sheet for properly filled examples'],
    [''],
    ['5. أخطاء شائعة - Common Errors'],
    ['❌ Using "974" country code in mobile'],
    ['    ✅ Use: 66123456'],
    ['❌ Adding "QAR" or "ريال" in amount'],
    ['    ✅ Use: 5000'],
    ['❌ Writing facts in English'],
    ['    ✅ Use: Arabic text'],
    ['❌ Very short descriptions'],
    ['    ✅ Be detailed and specific'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(instructions);

  // Set column widths
  ws['!cols'] = [{ wch: 50 }];

  // Apply formatting
  ws['A1'].s = {
    font: { bold: true, sz: 16, color: { rgb: '1F4E78' } },
    fill: { fgColor: { rgb: 'D9E1F2' } },
    alignment: { vertical: 'center', horizontal: 'center' },
  };

  ws['A2'].s = {
    font: { bold: true, sz: 12, color: { rgb: '44546A' } },
    fill: { fgColor: { rgb: 'E7E6E6' } },
    alignment: { vertical: 'center', horizontal: 'center' },
  };

  // Section headers (rows 4, 11, 21, 28, 31)
  [4, 11, 21, 28, 31].forEach(rowNum => {
    const cellRef = 'A' + rowNum;
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, sz: 12, color: { rgb: '1F4E78' } },
        fill: { fgColor: { rgb: 'FFF2CC' } },
        alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
      };
    }
  });

  // Error messages (rows 32, 34, 36, 38)
  [32, 34, 36, 38].forEach(rowNum => {
    const cellRef = 'A' + rowNum;
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { sz: 11, color: { rgb: 'C00000' } },
        alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
      };
    }
  });

  // Success messages (rows 33, 35, 37, 39)
  [33, 35, 37, 39].forEach(rowNum => {
    const cellRef = 'A' + rowNum;
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { sz: 11, color: { rgb: '00B050' } },
        alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
      };
    }
  });

  ws['!merges'] = [];
  return ws;
}

function createValidationSheet(): XLSX.WorkSheet {
  const validationData = [
    ['Column', 'Rule', 'Valid Examples', 'Invalid Examples'],
    ['FirstName', 'Arabic letters only', 'أحمد، محمد', 'Ahmed, محمد123'],
    ['FamilyName', 'Arabic letters only', 'آل ثاني، الراشد', 'Al-Thani'],
    ['Nationality', 'Arabic nationality', 'قطري، مصري', 'Qatari, Egyptian'],
    ['IDNumber', '11 digits', '29263400736', '292-634-00736'],
    ['Mobile', '8 digits, starts with 3/5/6/7', '66123456', '+97466123456'],
    ['Amount', 'Positive integer', '5000, 7500.50', '5,000, "5000 QAR"'],
    ['Facts', 'Arabic text, 50-2000 chars', 'Long text...', 'Short English'],
    ['Requests', 'Arabic text, numbered list', '1. ... 2. ...', 'Plain text'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(validationData);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 },
    { wch: 30 },
    { wch: 25 },
    { wch: 25 },
  ];

  // Format header row
  for (let col = 0; col < 4; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, sz: 12 },
        fill: { fgColor: { rgb: 'D9E1F2' } },
        alignment: { vertical: 'center', horizontal: 'center' },
        border: {
          top: { style: 'thin', color: { auto: 1 } },
          bottom: { style: 'thin', color: { auto: 1 } },
          left: { style: 'thin', color: { auto: 1 } },
          right: { style: 'thin', color: { auto: 1 } },
        },
      };
    }
  }

  // Format data rows
  for (let row = 1; row < validationData.length; row++) {
    for (let col = 0; col < 4; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
      if (ws[cellRef]) {
        const isColumn = col === 0;
        const isValid = col === 2;
        const isInvalid = col === 3;

        ws[cellRef].s = {
          font: {
            bold: isColumn,
            color: { rgb: isValid ? '00B050' : isInvalid ? 'C00000' : '000000' }
          },
          alignment: { vertical: 'center', horizontal: 'left' },
          border: {
            top: { style: 'thin', color: { auto: 1 } },
            bottom: { style: 'thin', color: { auto: 1 } },
            left: { style: 'thin', color: { auto: 1 } },
            right: { style: 'thin', color: { auto: 1 } },
          },
        };
      }
    }
  }

  ws['!merges'] = [];
  return ws;
}

function main() {
  console.log('Creating Excel template...');

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Add sheets
  const customerDataSheet = createCustomerDataSheet();
  XLSX.utils.book_append_sheet(wb, customerDataSheet, 'Customer Data');

  const instructionsSheet = createInstructionsSheet();
  XLSX.utils.book_append_sheet(wb, instructionsSheet, 'Instructions');

  const validationSheet = createValidationSheet();
  XLSX.utils.book_append_sheet(wb, validationSheet, 'Validation Rules');

  // Generate output path
  const outputPath = path.join(process.cwd(), 'data', 'templates', 'customer-data-template.xlsx');

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write file
  XLSX.writeFile(wb, outputPath);

  console.log(`✅ Excel template created successfully at: ${outputPath}`);
  console.log('📋 Sheets included:');
  console.log('   1. Customer Data - Main data sheet with sample data');
  console.log('   2. Instructions - Detailed instructions in Arabic and English');
  console.log('   3. Validation Rules - Validation rules reference');
}

main();
