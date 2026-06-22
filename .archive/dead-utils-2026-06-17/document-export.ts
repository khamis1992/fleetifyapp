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
      else if (tagName === 'p') {
        const text = element.textContent?.trim();
        if (text && text.length > 0) {
          sections.push({
            type: 'paragraph',
            content: text,
          });
        }
      }
      // div - معالجة خاصة للحفاظ على التنسيق
      else if (tagName === 'div') {
        // إذا كان div يحتوي على نص مباشر، أضفه كفقرة
        const directText = Array.from(element.childNodes)
          .filter(n => n.nodeType === Node.TEXT_NODE)
          .map(n => n.textContent?.trim())
          .filter(t => t && t.length > 0)
          .join(' ');
        
        if (directText) {
          sections.push({
            type: 'paragraph',
            content: directText,
          });
        }
        
        // معالجة العناصر الفرعية
        element.childNodes.forEach(processNode);
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
      // br - إضافة سطر فارغ
      else if (tagName === 'br') {
        sections.push({
          type: 'paragraph',
          content: '',
        });
      }
      // المعالجة التكرارية للعناصر الأخرى
      else {
        element.childNodes.forEach(processNode);
      }
    }
    // معالجة النصوص المباشرة
    else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text && text.length > 0) {
        sections.push({
          type: 'paragraph',
          content: text,
        });
      }
    }
  }

  doc.body.childNodes.forEach(processNode);
  return sections;
}

/**
 * دالة مشتركة لإنشاء مستند DOCX من HTML
 * تُستخدم من قبل downloadHtmlAsDocx و convertHtmlToDocxBlob
 * @param htmlContent محتوى HTML
 * @returns Document object من مكتبة docx
 */
async function createDocxDocumentFromHtml(htmlContent: string): Promise<any> {
  // استيراد المكتبة
  const docxModule = await import('docx');
  
  const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, 
          WidthType, BorderStyle, ShadingType, TextDirection, Header, Footer, PageNumber, 
          convertInchesToTwip, UnderlineType } = docxModule;

  // إنشاء parser لتحليل HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  // التحقق من صحة الـ HTML
  if (!doc || !doc.body) {
    throw new Error('Failed to parse HTML content');
  }
  
  // استخراج البيانات الأساسية من HTML
  const extractCompanyInfo = () => {
    const companyAr = doc.querySelector('.company-ar h1')?.textContent?.trim() || 'شركة العراف لتأجير السيارات';
    const companyEn = doc.querySelector('.company-en h1')?.textContent?.trim() || 'AL-ARAF CAR RENTAL L.L.C';
    const cr = doc.querySelector('.company-ar')?.textContent?.match(/س\.ت:\s*(\d+)/)?.[1] || '146832';
    return { companyAr, companyEn, cr };
  };

  const extractMetaInfo = () => {
    const refDate = doc.querySelector('.ref-date');
    const refNumber = refDate?.querySelector('div:first-child')?.textContent?.replace('الرقم المرجعي:', '').trim() || '';
    const dateText = refDate?.querySelector('div:last-child')?.textContent?.replace('التاريخ:', '').trim() || 
                     new Date().toLocaleDateString('ar-QA', { year: 'numeric', month: 'long', day: 'numeric' });
    return { refNumber, dateText };
  };

  const extractSubject = () => {
    const subjectBox = doc.querySelector('.subject-box');
    const mainTitle = subjectBox?.querySelector('strong')?.textContent?.trim() || 'مذكرة شارحة مقدمة إلى محكمة الاستثمار';
    const subtitle = Array.from(subjectBox?.querySelectorAll('span') || [])
      .map(s => s.textContent?.trim()).filter(Boolean).join(' - ') || 
      'في دعوى مطالبة مالية وتعويضات عقدية - إخلال بالتزامات عقد إيجار مركبة';
    return { mainTitle, subtitle };
  };

  const extractInfoBox = () => {
    try {
      const infoRows = doc.querySelectorAll('.info-row');
      const info: { label: string; value: string }[] = [];
      infoRows.forEach(row => {
        try {
          const label = row.querySelector('.info-label')?.textContent?.trim() || '';
          const value = Array.from(row.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE || ((n as Element).className !== 'info-label' && !(n as Element).classList?.contains('info-label')))
            .map(n => n.textContent?.trim())
            .filter(Boolean).join(' ');
          if (label) info.push({ label, value });
        } catch (e) {
          // Skip problematic rows
        }
      });
      return info;
    } catch (e) {
      return [];
    }
  };

  const extractSections = () => {
    const sections: { title: string; content?: string; isTable?: boolean; isList?: boolean; html?: HTMLElement }[] = [];
    const sectionElements = doc.querySelectorAll('.section');
    
    sectionElements.forEach(section => {
      const titleEl = section.querySelector('.section-title');
      const title = titleEl?.textContent?.trim() || '';
      const contentEl = section.querySelector('.section-content');
      const table = section.querySelector('table');
      
      if (table) {
        sections.push({ title, isTable: true, html: table as HTMLElement });
      } else if (contentEl) {
        // التحقق من وجود قائمة
        const hasList = contentEl.querySelector('.requests-list') || contentEl.querySelectorAll('.request-item').length > 0;
        if (hasList) {
          sections.push({ title, isList: true, html: contentEl as HTMLElement });
        } else {
          const content = contentEl.textContent?.trim() || '';
          sections.push({ title, content });
        }
      }
    });
    
    return sections;
  };

  const extractClaimsTableData = () => {
    const table = doc.querySelector('.section table');
    if (!table) return null;
    
    const rows: string[][] = [];
    table.querySelectorAll('tr').forEach(tr => {
      const cells: string[] = [];
      tr.querySelectorAll('th, td').forEach(cell => {
        cells.push(cell.textContent?.trim() || '');
      });
      if (cells.length > 0) rows.push(cells);
    });
    return rows;
  };

  // Helper type for TableRow and TableCell
  type TableRowType = InstanceType<typeof TableRow>;
  type TableCellType = InstanceType<typeof TableCell>;

  // استخراج جميع البيانات
  const companyInfo = extractCompanyInfo();
  const metaInfo = extractMetaInfo();
  const subject = extractSubject();
  const infoBox = extractInfoBox();
  const claimsTable = extractClaimsTableData();

  const children: any[] = [];

  // 1. الترويسة - Header (مطابقة للPDF)
  // في RTL: الخلية الأولى تظهر على اليمين
  children.push(
    new Table({
      rows: [
        new TableRow({
          children: [
            // الشركة العربية (الخلية الأولى = اليمين في RTL)
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: companyInfo.companyAr, size: 24, font: 'Arial', bold: true, color: '1e3a5f', rightToLeft: true })],
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'ذ.م.م', size: 20, font: 'Arial', rightToLeft: true })],
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                }),
                new Paragraph({
                  children: [new TextRun({ text: `س.ت: ${companyInfo.cr}`, size: 20, font: 'Arial', rightToLeft: true })],
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                })
              ],
              width: { size: 35, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.DOUBLE, size: 6, color: '1e3a5f' },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
              },
            }),
            // مساحة الشعار (وسط)
            new TableCell({
              children: [new Paragraph({ text: '' })],
              width: { size: 30, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.DOUBLE, size: 6, color: '1e3a5f' },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
              },
            }),
            // الشركة الإنجليزية (الخلية الأخيرة = اليسار في RTL)
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: companyInfo.companyEn, size: 18, font: 'Arial', bold: true, color: '1e3a5f' })],
                  alignment: AlignmentType.LEFT
                }),
                new Paragraph({
                  children: [new TextRun({ text: `C.R: ${companyInfo.cr}`, size: 16, font: 'Arial' })],
                  alignment: AlignmentType.LEFT
                })
              ],
              width: { size: 35, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.DOUBLE, size: 6, color: '1e3a5f' },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
              },
            })
          ]
        })
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      // @ts-ignore
      visuallyRightToLeft: true,
    })
  );

  // 2. شريط العنوان
  const addressBar = doc.querySelector('.address-bar');
  if (addressBar) {
    const addressLines = addressBar.innerHTML.split(/<br\s*\/?>/i)
      .map(l => l.replace(/<[^>]*>/g, '').trim())
      .filter(l => l);
    
    addressLines.forEach((line, idx) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 18, font: 'Arial', rightToLeft: true })],
          alignment: AlignmentType.CENTER,
          spacing: { before: idx === 0 ? 100 : 40, after: idx === addressLines.length - 1 ? 150 : 40 },
          bidirectional: true,
          border: idx === addressLines.length - 1 ? { 
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' } 
          } : undefined
        })
      );
    });
  }

  // 3. الرقم المرجعي والتاريخ
  // في RTL: الخلية الأولى = اليمين، الخلية الثانية = اليسار
  children.push(
    new Table({
      rows: [
        new TableRow({
          children: [
            // اليمين: الرقم المرجعي (الخلية الأولى في RTL)
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ 
                  text: `الرقم المرجعي: ${metaInfo.refNumber}`, 
                  size: 20, 
                  font: 'Arial', 
                  rightToLeft: true 
                })], 
                alignment: AlignmentType.RIGHT, 
                bidirectional: true,
              })],
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
              }
            }),
            // اليسار: التاريخ (الخلية الثانية في RTL)
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ 
                  text: `التاريخ: ${metaInfo.dateText}`, 
                  size: 20, 
                  font: 'Arial', 
                  rightToLeft: true 
                })], 
                alignment: AlignmentType.RIGHT, 
                bidirectional: true,
              })],
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
              }
            })
          ]
        })
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      // @ts-ignore
      visuallyRightToLeft: true,
    })
  );

  children.push(new Paragraph({ spacing: { before: 150 } }));

  // 4. صندوق الموضوع (بلون خلفية مطابق)
  children.push(
    new Paragraph({
      children: [
        new TextRun({ 
          text: subject.mainTitle, 
          bold: true, 
          size: 26, 
          font: 'Arial', 
          color: 'ffffff',
          rightToLeft: true,
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      shading: { fill: '1e3a5f', type: ShadingType.CLEAR },
      bidirectional: true,
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({ 
          text: subject.subtitle, 
          size: 20, 
          font: 'Arial', 
          color: 'ffffff',
          rightToLeft: true,
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 150 },
      shading: { fill: '1e3a5f', type: ShadingType.CLEAR },
      bidirectional: true,
    })
  );

  // 5. صندوق معلومات الأطراف
  // في RTL: الخلية الأولى = اليمين (التسمية)، الخلية الثانية = اليسار (القيمة)
  if (infoBox.length > 0) {
    children.push(
      new Table({
        rows: infoBox.map(row => new TableRow({
          children: [
            // اليمين: التسمية (الخلية الأولى في RTL)
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ 
                  text: row.label, 
                  size: 22, 
                  font: 'Arial', 
                  bold: true, 
                  color: '1e3a5f',
                  rightToLeft: true 
                })], 
                alignment: AlignmentType.RIGHT, 
                bidirectional: true,
              })],
              width: { size: 25, type: WidthType.PERCENTAGE },
              shading: { fill: 'f5f5f5', type: ShadingType.CLEAR },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.SINGLE, size: 6, color: '1e3a5f' },
                right: { style: BorderStyle.NONE }
              },
              verticalAlign: 'center',
            }),
            // اليسار: القيمة (الخلية الثانية في RTL)
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ 
                  text: row.value, 
                  size: 22, 
                  font: 'Arial',
                  rightToLeft: true 
                })], 
                alignment: AlignmentType.RIGHT, 
                bidirectional: true,
              })],
              width: { size: 75, type: WidthType.PERCENTAGE },
              shading: { fill: 'f5f5f5', type: ShadingType.CLEAR },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE }
              },
              verticalAlign: 'center',
            })
          ]
        })),
        width: { size: 100, type: WidthType.PERCENTAGE },
        // @ts-ignore
        visuallyRightToLeft: true,
      })
    );
    children.push(new Paragraph({ spacing: { before: 200 } }));
  }

  // 6. معالجة الأقسام (الوقائع، المطالبات، الأساس القانوني، الطلبات)
  const processContentParagraphs = (container: HTMLElement) => {
    const paragraphs: any[] = [];
    const elements = container.querySelectorAll('p, .legal-article, .request-item');

    // Helper function to clean text - remove extra spaces and newlines
    const cleanText = (text: string | undefined | null): string => {
      if (!text) return '';
      return text
        .replace(/\s*\n\s+/g, ' ')  // Replace newlines with surrounding spaces with single space
        .replace(/\s+/g, ' ')        // Replace multiple spaces with single space
        .trim();                    // Remove leading/trailing spaces
    };

    elements.forEach(el => {
      const isLegalArticle = el.classList.contains('legal-article');
      const isRequestItem = el.classList.contains('request-item');

      // استخراج النص مع الحفاظ على التنسيق المختلط (bold + normal)
      const textRuns: any[] = [];
      el.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = cleanText(node.textContent);
          if (text) {
            textRuns.push(new TextRun({
              text: text + ' ',
              size: 22,
              font: 'Arial',
              rightToLeft: true,
            }));
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const text = cleanText(el.textContent);
          if (text) {
            textRuns.push(new TextRun({
              text: text + ' ',
              bold: el.tagName === 'STRONG' || el.tagName === 'B',
              size: 22,
              font: 'Arial',
              rightToLeft: true,
            }));
          }
        }
      });

      if (textRuns.length > 0) {
        paragraphs.push(
          new Paragraph({
            children: textRuns,
            alignment: AlignmentType.JUSTIFIED, // ⭐ JUSTIFIED for proper Arabic typography
            spacing: {
              before: isLegalArticle || isRequestItem ? 80 : 120,
              after: isLegalArticle || isRequestItem ? 80 : 120,
              line: 360
            },
            bidirectional: true,
            indent: isLegalArticle ? { right: 400 } : undefined
          })
        );
      }
    });

    return paragraphs;
  };

  // معالجة الأقسام من HTML مباشرة
  try {
    const sections = doc.querySelectorAll('.section');
    sections.forEach((section, sectionIndex) => {
      try {
        const titleEl = section.querySelector('.section-title');
        const contentEl = section.querySelector('.section-content');
        const tableEl = section.querySelector('table');
        
        if (titleEl) {
      const titleText = titleEl.textContent?.trim() || '';
      const titleColor = (titleEl as HTMLElement).style.color || '1e3a5f';
      
      // عنوان القسم
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: titleText,
              bold: true,
              size: 26,
              font: 'Arial',
              color: titleColor.includes('d32f2f') ? 'd32f2f' : '1e3a5f',
              underline: {
                type: UnderlineType.SINGLE,
                color: titleColor.includes('d32f2f') ? 'd32f2f' : '1e3a5f'
              },
              rightToLeft: true,
            })
          ],
          alignment: AlignmentType.LEFT, // Section titles on the LEFT
          spacing: { before: 280, after: 150 },
          bidirectional: true,
        })
      );

      // معالجة الجدول (جدول المطالبات المالية)
      if (tableEl) {
        const rows: TableRowType[] = [];
        tableEl.querySelectorAll('tr').forEach((tr, rowIndex) => {
          const isHeader = tr.closest('thead') !== null || rowIndex === 0;
          const isTotal = tr.classList.contains('total-row');
          
          const cells: TableCellType[] = [];
          tr.querySelectorAll('th, td').forEach(cell => {
            const cellText = cell.textContent?.trim() || '';
            const isAmount = cell.classList.contains('amount');
            const colspan = cell.getAttribute('colspan');
            
            cells.push(new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ 
                  text: cellText, 
                  bold: isHeader || isTotal, 
                  size: isTotal ? 24 : 20, 
                  font: 'Arial',
                  color: isHeader || isTotal ? 'ffffff' : (isAmount ? 'd32f2f' : '000000'),
                  rightToLeft: true 
                })],
                alignment: isAmount || isHeader ? AlignmentType.CENTER : AlignmentType.RIGHT,
                bidirectional: true
              })],
              shading: isHeader || isTotal 
                ? { fill: '1e3a5f', type: ShadingType.CLEAR } 
                : (rowIndex % 2 === 1 ? { fill: 'f9f9f9', type: ShadingType.CLEAR } : undefined),
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
                left: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
                right: { style: BorderStyle.SINGLE, size: 1, color: '333333' }
              },
              columnSpan: colspan ? parseInt(colspan) : undefined
            }));
          });
          
          if (cells.length > 0) {
            rows.push(new TableRow({ children: cells }));
          }
        });
        
        if (rows.length > 0) {
          children.push(
            new Table({
              rows,
              width: { size: 100, type: WidthType.PERCENTAGE },
              // @ts-ignore
              visuallyRightToLeft: true,
            })
          );
        }
      }
      
      // معالجة المحتوى النصي (فقط إذا لم يكن هناك جدول أو معالجة الجدول منفصلة)
      if (contentEl && !tableEl) {
        const contentParagraphs = processContentParagraphs(contentEl as HTMLElement);
        children.push(...contentParagraphs);
      } else if (contentEl && tableEl) {
        // Helper function to clean text - remove extra spaces and newlines
        const cleanText = (text: string | undefined | null): string => {
          if (!text) return '';
          return text
            .replace(/\s*\n\s+/g, ' ')  // Replace newlines with surrounding spaces with single space
            .replace(/\s+/g, ' ')        // Replace multiple spaces with single space
            .trim();                    // Remove leading/trailing spaces
        };

        // معالجة الفقرات النصية فقط (تجاهل الجدول)
        const nonTableContent = Array.from(contentEl.children).filter(el => el.tagName !== 'TABLE');
        nonTableContent.forEach(el => {
          const text = cleanText(el.textContent);
          if (text) {
            children.push(
              new Paragraph({
                children: [new TextRun({
                  text: text,
                  size: 22,
                  font: 'Arial',
                  rightToLeft: true
                })],
                alignment: AlignmentType.JUSTIFIED, // ⭐ JUSTIFIED for proper Arabic typography
                spacing: { before: 100, after: 100, line: 360 },
                bidirectional: true,
              })
            );
          }
        });
      }
    }
    } catch (sectionError) {
      console.warn(`Error processing section ${sectionIndex}:`, sectionError);
    }
    });
  } catch (sectionsError) {
    console.warn('Error processing sections:', sectionsError);
  }

  // 7. الختام
  children.push(new Paragraph({ spacing: { before: 200 } }));
  children.push(
    new Paragraph({
      children: [new TextRun({ 
        text: 'وتفضلوا بقبول فائق الاحترام والتقدير،،،', 
        size: 22, 
        font: 'Arial',
        rightToLeft: true,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 300 },
      bidirectional: true,
    })
  );

  // 8. التوقيع والختم
  // في RTL: الخلية الأولى = اليمين (الختم)، الخلية الثانية = اليسار (التوقيع)
  const signatureSection = doc.querySelector('.signature-section, table');
  if (signatureSection) {
    // استخراج اسم المفوض من HTML
    const signatoryName = doc.querySelector('.signatory .name')?.textContent?.trim() || 
                          'خميس هاشم الجبر';
    
    children.push(
      new Table({
        rows: [
          new TableRow({
            children: [
              // اليمين: الختم (الخلية الأولى في RTL)
              new TableCell({
                children: [
                  new Paragraph({ 
                    children: [new TextRun({ text: '[ختم الشركة]', size: 18, font: 'Arial', color: '666666', rightToLeft: true })], 
                    alignment: AlignmentType.CENTER,
                    bidirectional: true,
                  })
                ],
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE }
                }
              }),
              // اليسار: التوقيع (الخلية الثانية في RTL)
              new TableCell({
                children: [
                  new Paragraph({ 
                    children: [new TextRun({ 
                      text: companyInfo.companyAr, 
                      size: 22, 
                      font: 'Arial', 
                      bold: true, 
                      color: '1e3a5f',
                      rightToLeft: true 
                    })], 
                    alignment: AlignmentType.CENTER,
                    bidirectional: true,
                  }),
                  new Paragraph({ 
                    children: [new TextRun({ text: '[التوقيع]', size: 18, font: 'Arial', color: '666666', rightToLeft: true })], 
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 200 },
                    bidirectional: true,
                  }),
                  new Paragraph({
                    children: [new TextRun({ 
                      text: signatoryName, 
                      size: 22, 
                      font: 'Arial', 
                      bold: true,
                      rightToLeft: true 
                    })],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 100 },
                    border: { top: { style: BorderStyle.SINGLE, size: 2, color: '1e3a5f' } },
                    bidirectional: true,
                  })
                ],
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE }
                }
              })
            ]
          })
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
        // @ts-ignore
        visuallyRightToLeft: true,
      })
    );
  }

  // 9. الذيل
  const footer = doc.querySelector('.footer');
  if (footer) {
    const footerText = footer.textContent?.trim() || 
                       `${companyInfo.companyAr} | س.ت: ${companyInfo.cr}`;
    children.push(new Paragraph({ spacing: { before: 300 } }));
    children.push(
      new Paragraph({
        children: [new TextRun({ 
          text: footerText, 
          size: 16, 
          font: 'Arial',
          rightToLeft: true,
        })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 100 },
        border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' } },
        bidirectional: true,
      })
    );
  }

  // التحقق من وجود عناصر
  if (children.length === 0) {
    throw new Error('No content found to generate document');
  }

  // إنشاء المستند النهائي مع إعدادات RTL كاملة
  const finalDoc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 24,
            rightToLeft: true,
          },
          paragraph: {
            alignment: AlignmentType.RIGHT,
          },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.6),
            right: convertInchesToTwip(0.8),
            bottom: convertInchesToTwip(0.6),
            left: convertInchesToTwip(0.8),
          },
        },
        // @ts-ignore
        textDirection: TextDirection.RIGHT_TO_LEFT || 'tbRl',
      },
      children,
    }],
  });

  // إرجاع Document object
  return { document: finalDoc, docxModule };
}

/**
 * تحميل HTML كملف Word (DOCX) - يستخدم الدالة المشتركة
 * @param htmlContent محتوى HTML
 * @param filename اسم الملف
 */
export async function downloadHtmlAsDocx(
  htmlContent: string,
  filename: string = 'document.docx'
): Promise<void> {
  try {
    // استخدام الدالة المشتركة
    const { document: finalDoc, docxModule } = await createDocxDocumentFromHtml(htmlContent);
    const { Packer } = docxModule;
    
    // استيراد file-saver
    const { saveAs } = await import('file-saver');
    
    // تصدير الملف
    const blob = await Packer.toBlob(finalDoc);
    saveAs(blob, filename);
  } catch (error) {
    console.error('Error in downloadHtmlAsDocx:', error);
    throw new Error('فشل في تحميل المذكرة بصيغة Word: ' + (error as Error).message);
  }
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

/**
 * تحويل HTML إلى DOCX وإرجاع Blob (بدون تحميل)
 * مفيد للاستخدام في ملفات ZIP
 * يستخدم نفس الدالة المشتركة مع downloadHtmlAsDocx لضمان التطابق الكامل
 */
export async function convertHtmlToDocxBlob(htmlContent: string): Promise<Blob> {
  try {
    // استخدام الدالة المشتركة
    const { document: finalDoc, docxModule } = await createDocxDocumentFromHtml(htmlContent);
    const { Packer } = docxModule;
    
    // إرجاع Blob بدلاً من التحميل
    const blob = await Packer.toBlob(finalDoc);
    return blob;
  } catch (error) {
    console.error('Error in convertHtmlToDocxBlob:', error);
    throw new Error('فشل في تحويل HTML إلى DOCX: ' + (error as Error).message);
  }
}

/**
 * استبدال المتغيرات في القالب
 */
function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  
  // استبدال جميع المتغيرات في القالب
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  });
  
  return result;
}

/**
 * تحويل القالب النصي إلى DOCX بتنسيق يطابق PDF
 */
export async function downloadTemplateAsDocx(
  template: string,
  variables: Record<string, string>,
  filename: string = 'document.docx'
): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, TextDirection, ShadingType } = await import('docx');
  const { saveAs } = await import('file-saver');
  
  // استبدال المتغيرات
  const content = replaceTemplateVariables(template, variables);
  
  const children: any[] = [];
  
  // 1. Header - ترويسة الشركة
  children.push(
    new Table({
      rows: [
        new TableRow({
          children: [
            // الشركة بالعربي (يمين)
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: variables.PLAINTIFF_COMPANY_NAME || 'شركة العراف لتأجير السيارات', size: 24, font: 'Arial', bold: true, rightToLeft: true })],
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'ذ.م.م', size: 20, font: 'Arial', rightToLeft: true })],
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true
                }),
                new Paragraph({
                  children: [new TextRun({ text: `س.ت: ${variables.PLAINTIFF_CR || '146832'}`, size: 20, font: 'Arial', rightToLeft: true })],
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true
                })
              ],
              width: { size: 40, type: WidthType.PERCENTAGE },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.DOUBLE, size: 6, color: '1e3a5f' }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            }),
            // مساحة للشعار (وسط)
            new TableCell({
              children: [new Paragraph({ text: '' })],
              width: { size: 20, type: WidthType.PERCENTAGE },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.DOUBLE, size: 6, color: '1e3a5f' }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            }),
            // الشركة بالإنجليزي (يسار)
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'AL-ARAF CAR RENTAL L.L.C', size: 20, font: 'Arial', bold: true })],
                  alignment: AlignmentType.LEFT
                }),
                new Paragraph({
                  children: [new TextRun({ text: `C.R: ${variables.PLAINTIFF_CR || '146832'}`, size: 18, font: 'Arial' })],
                  alignment: AlignmentType.LEFT
                })
              ],
              width: { size: 40, type: WidthType.PERCENTAGE },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.DOUBLE, size: 6, color: '1e3a5f' }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            })
          ]
        })
      ],
      width: { size: 100, type: WidthType.PERCENTAGE }
    })
  );
  
  // 2. Address Bar
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: variables.PLAINTIFF_ADDRESS || 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
          size: 20,
          font: 'Arial',
          rightToLeft: true
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 100 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'cccccc' } },
      bidirectional: true
    })
  );
  
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'هاتف: 31411919 | البريد الإلكتروني: info@alaraf.qa',
          size: 18,
          font: 'Arial',
          rightToLeft: true
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      bidirectional: true
    })
  );
  
  // 3. التاريخ والرقم المرجعي
  const today = new Date().toLocaleDateString('ar-QA', { year: 'numeric', month: 'long', day: 'numeric' });
  const refNumber = `ALR/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(Math.random() * 9000) + 1000}`;
  
  children.push(
    new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `الرقم المرجعي: ${refNumber}`, size: 22, font: 'Arial', bold: true, rightToLeft: true })], alignment: AlignmentType.RIGHT, bidirectional: true })],
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `التاريخ: ${today}`, size: 22, font: 'Arial', bold: true, rightToLeft: true })], alignment: AlignmentType.LEFT, bidirectional: true })],
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
            })
          ]
        })
      ],
      width: { size: 100, type: WidthType.PERCENTAGE }
    })
  );
  
  // 4. Subject Box (صندوق الموضوع بخلفية زرقاء)
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'مذكرة شارحة مقدمة إلى محكمة الاستثمار',
          bold: true,
          size: 28,
          font: 'Arial',
          color: 'ffffff',
          rightToLeft: true
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      shading: { fill: '1e3a5f', type: ShadingType.CLEAR },
      bidirectional: true
    })
  );
  
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'في دعوى مطالبة مالية وتعويضات عقدية - إخلال بالتزامات عقد إيجار مركبة',
          size: 22,
          font: 'Arial',
          color: 'ffffff',
          rightToLeft: true
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      shading: { fill: '1e3a5f', type: ShadingType.CLEAR },
      bidirectional: true
    })
  );
  
  // 5. Info Box (معلومات الأطراف بخلفية رمادية)
  children.push(
    new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'المدعية:', size: 24, font: 'Arial', bold: true, rightToLeft: true })], alignment: AlignmentType.RIGHT, bidirectional: true })],
              width: { size: 20, type: WidthType.PERCENTAGE },
              shading: { fill: 'f5f5f5', type: ShadingType.CLEAR },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.SINGLE, size: 8, color: '1e3a5f' } }
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `${variables.PLAINTIFF_COMPANY_NAME} – ذ.م.م`, size: 24, font: 'Arial', rightToLeft: true })], alignment: AlignmentType.RIGHT, bidirectional: true })],
              shading: { fill: 'f5f5f5', type: ShadingType.CLEAR },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'المدعى عليه:', size: 24, font: 'Arial', bold: true, rightToLeft: true })], alignment: AlignmentType.RIGHT, bidirectional: true })],
              width: { size: 20, type: WidthType.PERCENTAGE },
              shading: { fill: 'f5f5f5', type: ShadingType.CLEAR },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.SINGLE, size: 8, color: '1e3a5f' } }
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: variables.DEFENDANT_NAME, size: 24, font: 'Arial', rightToLeft: true })], alignment: AlignmentType.RIGHT, bidirectional: true })],
              shading: { fill: 'f5f5f5', type: ShadingType.CLEAR },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'رقم الهوية:', size: 24, font: 'Arial', bold: true, rightToLeft: true })], alignment: AlignmentType.RIGHT, bidirectional: true })],
              width: { size: 20, type: WidthType.PERCENTAGE },
              shading: { fill: 'f5f5f5', type: ShadingType.CLEAR },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.SINGLE, size: 8, color: '1e3a5f' } }
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: variables.DEFENDANT_QID, size: 24, font: 'Arial', rightToLeft: true })], alignment: AlignmentType.RIGHT, bidirectional: true })],
              shading: { fill: 'f5f5f5', type: ShadingType.CLEAR },
              borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } }
            })
          ]
        })
      ],
      width: { size: 100, type: WidthType.PERCENTAGE }
    })
  );
  
  // 6. الأقسام (Sections)
  const sections = [
    {
      title: 'أولاً: الوقائع',
      content: `حيث إن الثابت بالأوراق أن الشركة المدعية أبرمت مع المدعى عليه بتاريخ ${variables.CONTRACT_DATE} عقد إيجار مركبة، التزم بموجبه المدعى عليه بسداد الإيجار الشهري في مواعيده، والمحافظة على المركبة، وتحمل كافة الالتزامات المترتبة على استخدامها.`
    },
    {
      title: 'ثانياً: المطالبات المالية المباشرة',
      isTable: true
    },
    {
      title: 'ثالثاً: الأساس القانوني',
      content: 'تستند هذه الدعوى إلى أحكام القانون المدني القطري رقم (22) لسنة 2004، ولا سيما المواد: 171، 263، 266، 267، 589'
    },
    {
      title: 'رابعاً: الطلبات',
      isList: true
    }
  ];
  
  for (const section of sections) {
    // عنوان القسم
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: section.title,
            bold: true,
            size: 28,
            font: 'Arial',
            color: '1e3a5f',
            rightToLeft: true
          })
        ],
        alignment: AlignmentType.LEFT, // Section titles on the LEFT
        spacing: { before: 300, after: 150 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: '1e3a5f' } },
        bidirectional: true
      })
    );
    
    // محتوى القسم
    if (section.isTable) {
      // جدول المطالبات المالية
      children.push(
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'البند', size: 22, font: 'Arial', bold: true, color: 'ffffff', rightToLeft: true })], alignment: AlignmentType.CENTER, bidirectional: true })],
                  width: { size: 10, type: WidthType.PERCENTAGE },
                  shading: { fill: '1e3a5f', type: ShadingType.CLEAR }
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'البيان', size: 22, font: 'Arial', bold: true, color: 'ffffff', rightToLeft: true })], alignment: AlignmentType.CENTER, bidirectional: true })],
                  shading: { fill: '1e3a5f', type: ShadingType.CLEAR }
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'المبلغ (ر.ق)', size: 22, font: 'Arial', bold: true, color: 'ffffff', rightToLeft: true })], alignment: AlignmentType.CENTER, bidirectional: true })],
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  shading: { fill: '1e3a5f', type: ShadingType.CLEAR }
                })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '1', size: 22, font: 'Arial', rightToLeft: true })], alignment: AlignmentType.CENTER })], shading: { fill: 'f9f9f9', type: ShadingType.CLEAR } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'إيجار متأخر غير مسدد', size: 22, font: 'Arial', rightToLeft: true })], alignment: AlignmentType.RIGHT, bidirectional: true })], shading: { fill: 'f9f9f9', type: ShadingType.CLEAR } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: variables.UNPAID_RENT_AMOUNT, size: 22, font: 'Arial', bold: true, color: 'd32f2f' })], alignment: AlignmentType.CENTER })], shading: { fill: 'f9f9f9', type: ShadingType.CLEAR } })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '2', size: 22, font: 'Arial', rightToLeft: true })], alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'غرامات تأخير اتفاقية', size: 22, font: 'Arial', rightToLeft: true })], alignment: AlignmentType.RIGHT, bidirectional: true })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: variables.LATE_FEES_TOTAL, size: 22, font: 'Arial', bold: true, color: 'd32f2f' })], alignment: AlignmentType.CENTER })] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '3', size: 22, font: 'Arial', rightToLeft: true })], alignment: AlignmentType.CENTER })], shading: { fill: 'f9f9f9', type: ShadingType.CLEAR } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'تعويض عن الأضرار والخسائر', size: 22, font: 'Arial', rightToLeft: true })], alignment: AlignmentType.RIGHT, bidirectional: true })], shading: { fill: 'f9f9f9', type: ShadingType.CLEAR } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: variables.DAMAGES_COMPENSATION, size: 22, font: 'Arial', bold: true, color: 'd32f2f' })], alignment: AlignmentType.CENTER })], shading: { fill: 'f9f9f9', type: ShadingType.CLEAR } })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ 
                  children: [new Paragraph({ children: [new TextRun({ text: 'الإجمالي المطالب به', size: 24, font: 'Arial', bold: true, color: 'ffffff', rightToLeft: true })], alignment: AlignmentType.RIGHT, bidirectional: true })],
                  columnSpan: 2,
                  shading: { fill: '1e3a5f', type: ShadingType.CLEAR }
                }),
                new TableCell({ 
                  children: [new Paragraph({ children: [new TextRun({ text: variables.TOTAL_CLAIM_AMOUNT, size: 26, font: 'Arial', bold: true, color: 'ffffff' })], alignment: AlignmentType.CENTER })],
                  shading: { fill: '1e3a5f', type: ShadingType.CLEAR }
                })
              ]
            })
          ],
          width: { size: 100, type: WidthType.PERCENTAGE }
        })
      );
    } else if (section.isList) {
      // قائمة الطلبات
      const requests = [
        `إلزام المدعى عليه بسداد مبلغ ${variables.TOTAL_CLAIM_AMOUNT} ريال قطري.`,
        'الأمر بتحويل المخالفات المرورية.',
        'فسخ عقد الإيجار.',
        'إلزامه بالتعويض والرسوم والمصاريف.'
      ];
      
      requests.forEach((request, index) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${index + 1}. ${request}`,
                size: 24,
                font: 'Arial',
                rightToLeft: true
              })
            ],
            alignment: AlignmentType.JUSTIFIED, // ⭐ JUSTIFIED for proper Arabic typography
            spacing: { before: 80, after: 80 },
            bidirectional: true
          })
        );
      });
    } else if (section.content) {
      // فقرة عادية
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.content,
              size: 24,
              font: 'Arial',
              rightToLeft: true
            })
          ],
          alignment: AlignmentType.JUSTIFIED, // ⭐ JUSTIFIED for proper Arabic typography
          spacing: { before: 100, after: 100, line: 360 },
          shading: { fill: 'fafafa', type: ShadingType.CLEAR },
          border: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'e0e0e0' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'e0e0e0' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'e0e0e0' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'e0e0e0' }
          },
          bidirectional: true
        })
      );
    }
  }
  
  // 7. الختام
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'وتفضلوا بقبول فائق الاحترام والتقدير،،،',
          size: 24,
          font: 'Arial',
          rightToLeft: true
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 200 },
      bidirectional: true
    })
  );
  
  // 8. التوقيع
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `عن ${variables.PLAINTIFF_COMPANY_NAME}`,
          size: 26,
          font: 'Arial',
          bold: true,
          color: '1e3a5f',
          rightToLeft: true
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      bidirectional: true
    })
  );
  
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: variables.AUTHORIZED_SIGNATORY,
          size: 24,
          font: 'Arial',
          bold: true,
          rightToLeft: true
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      border: { top: { style: BorderStyle.DOUBLE, size: 4, color: '1e3a5f' } },
      bidirectional: true
    })
  );
  
  // إنشاء المستند
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
          // @ts-ignore
        textDirection: TextDirection.RIGHT_TO_LEFT || 'tbRl',
        },
        children,
      },
    ],
  });
  
  // تصدير الملف
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
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
