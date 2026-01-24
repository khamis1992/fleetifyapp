/**
 * Document Export Utilities
 * وظائف تصدير المستندات بصيغ PDF و Word و Excel
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

/**
 * تحميل HTML كملف PDF
 * @param htmlContent محتوى HTML
 * @param filename اسم الملف
 */
export async function downloadHtmlAsPdf(
  htmlContent: string,
  filename: string = 'document.pdf'
): Promise<void> {
  // إنشاء iframe مؤقت لعرض HTML
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.width = '210mm'; // A4 width
  iframe.style.height = '297mm'; // A4 height
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('Failed to create iframe document');
  }

  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  // انتظار تحميل الصور
  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    const body = iframeDoc.body;
    
    // استخدام html2canvas لالتقاط المحتوى
    const canvas = await html2canvas(body, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: 794, // A4 width in pixels at 96 DPI
      windowHeight: 1123, // A4 height in pixels at 96 DPI
    });

    // إنشاء PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // حساب الأبعاد مع الحفاظ على النسبة
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // إذا كان المحتوى طويلاً، نضيف صفحات متعددة
    const pageHeight = pdfHeight;
    const contentHeight = (imgHeight * pdfWidth) / imgWidth;
    let heightLeft = contentHeight;
    let position = 0;

    // الصفحة الأولى
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, contentHeight);
    heightLeft -= pageHeight;

    // إضافة صفحات إضافية إذا لزم الأمر
    while (heightLeft > 0) {
      position = heightLeft - contentHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, contentHeight);
      heightLeft -= pageHeight;
    }

    // تحميل الملف
    pdf.save(filename);
  } finally {
    document.body.removeChild(iframe);
  }
}

/**
 * تحليل HTML واستخراج العناصر المهيكلة
 */
interface ParsedSection {
  type: 'heading' | 'paragraph' | 'table' | 'list';
  level?: number;
  content: string;
  rows?: string[][];
}

function parseHtmlToSections(html: string): ParsedSection[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const sections: ParsedSection[] = [];

  function processNode(node: Node): void {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      // العناوين
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        sections.push({
          type: 'heading',
          level: parseInt(tagName[1]),
          content: element.textContent?.trim() || '',
        });
      }
      // الفقرات
      else if (tagName === 'p' || tagName === 'div') {
        const text = element.textContent?.trim();
        if (text && text.length > 0) {
          sections.push({
            type: 'paragraph',
            content: text,
          });
        }
      }
      // الجداول
      else if (tagName === 'table') {
        const rows: string[][] = [];
        element.querySelectorAll('tr').forEach((tr) => {
          const cells: string[] = [];
          tr.querySelectorAll('th, td').forEach((cell) => {
            cells.push(cell.textContent?.trim() || '');
          });
          if (cells.length > 0) {
            rows.push(cells);
          }
        });
        if (rows.length > 0) {
          sections.push({
            type: 'table',
            content: '',
            rows,
          });
        }
      }
      // القوائم
      else if (tagName === 'ul' || tagName === 'ol') {
        element.querySelectorAll('li').forEach((li) => {
          sections.push({
            type: 'list',
            content: '• ' + (li.textContent?.trim() || ''),
          });
        });
      }
      // المعالجة التكرارية للعناصر الأخرى
      else {
        element.childNodes.forEach(processNode);
      }
    }
  }

  doc.body.childNodes.forEach(processNode);
  return sections;
}

/**
 * تحميل HTML كملف Word (DOCX)
 * @param htmlContent محتوى HTML
 * @param filename اسم الملف
 */
export async function downloadHtmlAsDocx(
  htmlContent: string,
  filename: string = 'document.docx'
): Promise<void> {
  // استيراد ديناميكي لتجنب مشاكل SSR
  const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableRow, TableCell, WidthType } = await import('docx');
  const { saveAs } = await import('file-saver');

  const sections = parseHtmlToSections(htmlContent);
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];

  for (const section of sections) {
    if (section.type === 'heading') {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.content,
              bold: true,
              size: section.level === 1 ? 32 : section.level === 2 ? 28 : 24,
              font: 'Traditional Arabic',
            }),
          ],
          heading: section.level === 1 ? HeadingLevel.HEADING_1 : 
                   section.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
          alignment: AlignmentType.RIGHT,
          spacing: { before: 200, after: 100 },
          bidirectional: true,
        })
      );
    } else if (section.type === 'paragraph' || section.type === 'list') {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.content,
              size: 24,
              font: 'Traditional Arabic',
            }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 100, after: 100 },
          bidirectional: true,
        })
      );
    } else if (section.type === 'table' && section.rows) {
      const tableRows = section.rows.map(
        (row, rowIndex) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cell,
                          bold: rowIndex === 0,
                          size: 22,
                          font: 'Traditional Arabic',
                        }),
                      ],
                      alignment: AlignmentType.RIGHT,
                      bidirectional: true,
                    }),
                  ],
                  width: {
                    size: 100 / row.length,
                    type: WidthType.PERCENTAGE,
                  },
                })
            ),
          })
      );

      children.push(
        new Table({
          rows: tableRows,
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
        })
      );
    }
  }

  // إنشاء المستند
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children,
      },
    ],
  });

  // تصدير الملف
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

/**
 * تحميل المستند بالصيغة المحددة
 */
export async function downloadDocument(
  htmlContent: string,
  format: 'pdf' | 'docx',
  filename: string
): Promise<void> {
  const baseName = filename.replace(/\.[^/.]+$/, '');

  if (format === 'pdf') {
    await downloadHtmlAsPdf(htmlContent, `${baseName}.pdf`);
  } else {
    await downloadHtmlAsDocx(htmlContent, `${baseName}.docx`);
  }
}

// ============================================================================
// Excel Export Utilities
// وظائف التصدير إلى Excel
// ============================================================================

/**
 * بيانات العميل للقضايا Legal Case Customer Data
 */
export interface LegalCaseCustomerData {
  firstName: string;
  familyName: string;
  nationality: string;
  idNumber: string;
  mobile: string;
  amount: number;
  facts: string;
  requests: string;
}

/**
 * قراءة ملف Excel وتحويله إلى مصفوفة من بيانات العملاء
 * Read Excel file and convert to customer data array
 * @param file ملف Excel
 * @returns مصفوفة من بيانات العملاء
 */
export async function readCustomerDataExcel(
  file: File
): Promise<LegalCaseCustomerData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error('Failed to read file');
        }

        const workbook = XLSX.read(data, { type: 'binary' });

        // قراءة الورقة الأولى "Customer Data"
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // تحويل البيانات إلى JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        }) as string[][];

        // تخطي صف العناوين (الصف الأول)
        const dataRows = jsonData.slice(1);

        // تحويل الصفوف إلى كائنات
        const customers: LegalCaseCustomerData[] = dataRows
          .filter((row) => row[0]) // تصفية الصفوف الفارغة
          .map((row) => ({
            firstName: row[0]?.toString().trim() || '',
            familyName: row[1]?.toString().trim() || '',
            nationality: row[2]?.toString().trim() || '',
            idNumber: row[3]?.toString().trim() || '',
            mobile: row[4]?.toString().trim() || '',
            amount: parseFloat(row[5]?.toString()) || 0,
            facts: row[6]?.toString().trim() || '',
            requests: row[7]?.toString().trim() || '',
          }));

        resolve(customers);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * تحميل قالب Excel للبيانات
 * Download Excel template for customer data
 */
export function downloadCustomerDataTemplate(): void {
  const templateUrl = '/data/templates/customer-data-template.xlsx';
  const link = document.createElement('a');
  link.href = templateUrl;
  link.download = 'customer-data-template.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * تصدير بيانات العملاء إلى Excel
 * Export customer data to Excel
 * @param customers بيانات العملاء
 * @param filename اسم الملف
 */
export function exportCustomerDataToExcel(
  customers: LegalCaseCustomerData[],
  filename: string = 'customer-data.xlsx'
): void {
  // إنشاء ورقة العمل
  const worksheet = XLSX.utils.json_to_sheet(
    customers.map((customer) => ({
      FirstName: customer.firstName,
      FamilyName: customer.familyName,
      Nationality: customer.nationality,
      IDNumber: customer.idNumber,
      Mobile: customer.mobile,
      Amount: customer.amount,
      Facts: customer.facts,
      Requests: customer.requests,
    }))
  );

  // إعداد الأعمدة
  worksheet['!cols'] = [
    { wch: 20 }, // FirstName
    { wch: 20 }, // FamilyName
    { wch: 15 }, // Nationality
    { wch: 18 }, // IDNumber
    { wch: 15 }, // Mobile
    { wch: 15 }, // Amount
    { wch: 50 }, // Facts
    { wch: 50 }, // Requests
  ];

  // إنشاء المصنف
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customer Data');

  // حفظ الملف
  XLSX.writeFile(workbook, filename);
}
