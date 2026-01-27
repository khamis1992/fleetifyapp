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
 * تحليل HTML المحسّن مع الحفاظ على التنسيق
 */
function parseHtmlToDocxElements(html: string): any[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const elements: any[] = [];

  function processElement(element: HTMLElement): void {
    const tagName = element.tagName.toLowerCase();
    const className = element.className;

    // 1. معالجة الترويسة (Header)
    if (className.includes('header')) {
      const companyAr = element.querySelector('.company-ar')?.textContent?.trim() || '';
      // استخراج النص من company-ar سطر سطر إذا وجد
      const companyArLines = element.querySelector('.company-ar')?.innerHTML.split('<br>').map(s => s.replace(/<[^>]*>/g, '').trim()).filter(s => s) || [];
      
      const companyEnLines = element.querySelector('.company-en')?.innerHTML.split('<br>').map(s => s.replace(/<[^>]*>/g, '').trim()).filter(s => s) || [];

      elements.push({
        type: 'header-table',
        companyAr: companyArLines.length > 0 ? companyArLines : [companyAr],
        companyEn: companyEnLines
      });
      return;
    }

    // 2. معالجة معلومات التاريخ والمرجع (Meta Info)
    if (className.includes('meta-info')) {
      const dateText = element.querySelector('div:first-child')?.textContent?.trim() || '';
      const refText = element.querySelector('div:last-child')?.textContent?.trim() || '';
      elements.push({
        type: 'meta-table',
        left: dateText,
        right: refText
      });
      return;
    }

    // 3. معالجة صندوق الموضوع (Subject Box)
    if (className.includes('subject-box')) {
      const lines = Array.from(element.childNodes)
        .map(n => n.textContent?.trim())
        .filter(t => t);
      elements.push({
        type: 'subject-box',
        lines
      });
      return;
    }

    // 4. معالجة صندوق المعلومات (Info Box)
    if (className.includes('info-box')) {
      const infoRows: {label: string, value: string}[] = [];
      const rows = element.querySelectorAll('.info-row');
      rows.forEach((row) => {
        const label = row.querySelector('.info-label')?.textContent?.trim() || '';
        const value = Array.from(row.childNodes)
          .filter(n => n.nodeType === Node.TEXT_NODE || (n.nodeType === Node.ELEMENT_NODE && !(n as HTMLElement).classList.contains('info-label')))
          .map(n => n.textContent?.trim())
          .filter(t => t)
          .join(' ');
        
        if (label || value) {
          infoRows.push({ label, value });
        }
      });
      elements.push({
        type: 'info-box-table',
        rows: infoRows
      });
      return;
    }

    // 5. معالجة عنوان القسم (Section Title)
    if (className.includes('section-title')) {
      elements.push({
        type: 'section-title',
        content: element.textContent?.trim() || '',
      });
      return;
    }

    // 6. معالجة الجداول (Tables)
    if (tagName === 'table') {
      const rows: string[][] = [];
      // Header row
      const headerCells: string[] = [];
      element.querySelectorAll('thead th').forEach(th => headerCells.push(th.textContent?.trim() || ''));
      if (headerCells.length > 0) rows.push(headerCells);

      // Body rows
      element.querySelectorAll('tbody tr').forEach((tr) => {
        const cells: string[] = [];
        tr.querySelectorAll('td').forEach((cell) => {
          cells.push(cell.textContent?.trim() || '');
        });
        if (cells.length > 0) {
          rows.push(cells);
        }
      });
      
      // Footer row (Totals)
      const footerRow = element.querySelector('tr.total-row');
      if (footerRow) {
         const cells: string[] = [];
         footerRow.querySelectorAll('td').forEach(td => cells.push(td.textContent?.trim() || ''));
         if (cells.length > 0) rows.push(cells);
      }

      if (rows.length > 0) {
        elements.push({
          type: 'table',
          rows,
        });
      }
      return;
    }

    // 7. معالجة الفقرات والنصوص العادية
    if (tagName === 'p') {
      // محاولة استخراج النصوص الغامقة (Bold)
      const children: {text: string, bold: boolean}[] = [];
      
      // دالة لإضافة علامات Unicode للتحكم بالاتجاه
      const addBidiMarkers = (text: string): string => {
        // إضافة RLM (Right-to-Left Mark) قبل وبعد الأقواس والأرقام
        // هذا يساعد في عرض النص بشكل صحيح في Word
        return text
          .replace(/\(/g, '\u200F(\u200F')  // RLM قبل وبعد القوس الفاتح
          .replace(/\)/g, '\u200F)\u200F'); // RLM قبل وبعد القوس الغالق
      };
      
      element.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          // الحفاظ على المسافات وتنظيف الأسطر الجديدة
          let t = node.textContent?.replace(/[\n\r\t]+/g, ' ') || '';
          // تطبيق علامات BiDi
          t = addBidiMarkers(t);
          if (t) children.push({ text: t, bold: false });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          let t = el.textContent?.replace(/[\n\r\t]+/g, ' ') || '';
          // تطبيق علامات BiDi
          t = addBidiMarkers(t);
          if (el.tagName.toLowerCase() === 'strong' || el.tagName.toLowerCase() === 'b') {
             if (t) children.push({ text: t, bold: true });
          } else {
             if (t) children.push({ text: t, bold: false });
          }
        }
      });

      if (children.length > 0) {
        elements.push({
          type: 'paragraph-mixed',
          children
        });
      } else {
         const text = element.textContent?.trim();
         if (text) {
            elements.push({ type: 'paragraph', content: addBidiMarkers(text) });
         }
      }
      return;
    }

    // معالجة العناوين
    if (['h1', 'h2', 'h3', 'h4'].includes(tagName)) {
      elements.push({
        type: 'heading',
        level: parseInt(tagName[1]),
        content: element.textContent?.trim() || '',
      });
      return;
    }

    // معالجة div العامة (للمرور على العناصر الفرعية)
    if (tagName === 'div') {
      element.childNodes.forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          processElement(child as HTMLElement);
        }
      });
    }
  }

  doc.body.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      processElement(node as HTMLElement);
    }
  });

  return elements;
}

/**
 * تحميل HTML كملف Word (DOCX) - نسخة محسّنة مع نص قابل للتحرير
 * @param htmlContent محتوى HTML
 * @param filename اسم الملف
 */
export async function downloadHtmlAsDocx(
  htmlContent: string,
  filename: string = 'document.docx'
): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, TextDirection } = await import('docx');
  const { saveAs } = await import('file-saver');

  const elements = parseHtmlToDocxElements(htmlContent);
  const children: any[] = [];

  for (const element of elements) {
    
    // 1. Header Table (Invisible)
    if (element.type === 'header-table') {
      children.push(
        new Table({
          rows: [
            new TableRow({
              children: [
                // Right Cell (Arabic) - في RTL، الخلية الأولى تكون على اليمين
                new TableCell({
                  children: element.companyAr.map((line: string) => new Paragraph({
                    children: [new TextRun({ text: line, size: 24, font: 'Arial', bold: true, rightToLeft: true })],
                    alignment: AlignmentType.RIGHT,
                    bidirectional: true
                  })),
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
                }),
                // Left Cell (English) - في RTL، الخلية الثانية تكون على اليسار
                new TableCell({
                  children: element.companyEn.map((line: string) => new Paragraph({
                    children: [new TextRun({ text: line, size: 20, font: 'Arial', rightToLeft: false })],
                    alignment: AlignmentType.LEFT
                  })),
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
                }),
              ],
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
      // فاصل
      children.push(new Paragraph({ spacing: { before: 80, after: 80 } }));
    }

    // 2. Meta Table (Date & Ref)
    else if (element.type === 'meta-table') {
      children.push(
        new Table({
          rows: [
            new TableRow({
              children: [
                // Right (Ref usually) - في RTL، الخلية الأولى تكون على اليمين
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: element.right, size: 22, font: 'Arial', rightToLeft: true })], alignment: AlignmentType.RIGHT, bidirectional: true })],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                }),
                // Left (Date usually) - في RTL، الخلية الثانية تكون على اليسار
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: element.left, size: 22, font: 'Arial', rightToLeft: false })], alignment: AlignmentType.LEFT })],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                }),
              ],
            }),
          ],
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
      children.push(new Paragraph({ spacing: { before: 150 } }));
    }

    // 3. Subject Box
    else if (element.type === 'subject-box') {
      children.push(
        new Paragraph({
          children: element.lines.map((line: string, idx: number) => new TextRun({
            text: line,
            bold: true,
            size: idx === 0 ? 28 : 24,
            font: 'Arial',
            color: '1e3a5f',
            break: idx > 0 ? 1 : 0
          })),
          alignment: AlignmentType.CENTER,
          spacing: { before: 150, after: 150 },
          border: {
            top: { style: BorderStyle.SINGLE, space: 8 },
            bottom: { style: BorderStyle.SINGLE, space: 8 },
            left: { style: BorderStyle.SINGLE, space: 8 },
            right: { style: BorderStyle.SINGLE, space: 8 },
          },
          shading: {
            fill: 'F5F5F5',
            type: ShadingType.CLEAR,
          },
          bidirectional: true
        })
      );
    }

    // 4. Info Box Table
    else if (element.type === 'info-box-table') {
      children.push(
        new Table({
          rows: element.rows.map((row: any) => new TableRow({
            children: [
              // Label - في RTL، الخلية الأولى تكون على اليمين
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: row.label, size: 24, font: 'Arial', bold: true, rightToLeft: true })], alignment: AlignmentType.RIGHT, bidirectional: true })],
                width: { size: 20, type: WidthType.PERCENTAGE },
                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              }),
              // Value - في RTL، الخلية الثانية تكون على اليسار
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: row.value, size: 24, font: 'Arial', rightToLeft: true })], alignment: AlignmentType.RIGHT, bidirectional: true })],
                borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
              })
            ]
          })),
          width: { size: 100, type: WidthType.PERCENTAGE },
        })
      );
      children.push(new Paragraph({ spacing: { before: 150 } }));
    }

    // 5. Section Title
    else if (element.type === 'section-title') {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: element.content,
              bold: true,
              size: 26,
              font: 'Arial',
              color: '1e3a5f',
              rightToLeft: true
            }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 150, after: 80 },
          bidirectional: true,
        })
      );
    }

    // 6. Mixed Paragraph (Bold + Normal)
    else if (element.type === 'paragraph-mixed') {
      children.push(
        new Paragraph({
          children: element.children.map((child: any) => {
            return new TextRun({
              text: child.text,
              bold: child.bold,
              size: 24,
              // استخدام خط Arial الذي يدعم العربية والإنجليزية والأرقام بشكل ممتاز
              font: 'Arial',
              // جميع النصوص RTL لأن المستند عربي
              rightToLeft: true,
            });
          }),
          alignment: AlignmentType.RIGHT,
          spacing: { before: 80, after: 80, line: 300 }, // تقليل المسافات
          bidirectional: true,
        })
      );
    }

    // 7. Normal Paragraph
    else if (element.type === 'paragraph') {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: element.content,
              size: 24,
              font: 'Arial',
              rightToLeft: true
            }),
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 80, after: 80, line: 300 },
          bidirectional: true,
        })
      );
    }

    // 8. Data Table
    else if (element.type === 'table' && element.rows) {
      const tableRows = element.rows.map((row: string[], rowIndex: number) =>
        new TableRow({
          children: row.map((cell: string) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cell,
                      bold: rowIndex === 0,
                      size: 22,
                      font: 'Arial',
                      rightToLeft: true
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  bidirectional: true,
                }),
              ],
              verticalAlign: 'center',
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
                right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
              },
              shading: rowIndex === 0 ? { fill: 'EEEEEE', type: ShadingType.CLEAR } : undefined
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
      children.push(new Paragraph({ spacing: { before: 150 } }));
    }
  }

  // إنشاء المستند
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1800, // 1.25 inch - margin أكبر على اليمين (بداية الصفحة في RTL)
              bottom: 1440, // 1 inch
              left: 1080, // 0.75 inch - margin أصغر على اليسار
            },
          },
          textDirection: TextDirection.RIGHT_TO_LEFT, // تعيين اتجاه الصفحة إلى RTL
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
 * تحويل القالب النصي إلى DOCX
 */
export async function downloadTemplateAsDocx(
  template: string,
  variables: Record<string, string>,
  filename: string = 'document.docx'
): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, TextDirection } = await import('docx');
  const { saveAs } = await import('file-saver');
  
  // استبدال المتغيرات
  const content = replaceTemplateVariables(template, variables);
  
  // تقسيم المحتوى إلى أقسام
  const sections = content.split('====================================');
  
  const children: any[] = [];
  
  for (const section of sections) {
    const lines = section.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) continue;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // تخطي الخطوط الفارغة
      if (!trimmedLine) continue;
      
      // عنوان رئيسي (يبدأ بـ "أولاً:" أو "ثانياً:" إلخ)
      if (trimmedLine.match(/^(أولاً|ثانياً|ثالثاً|رابعاً|خامساً|سادساً|سابعاً|ثامناً):/)) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine,
                bold: true,
                size: 28,
                font: 'Arial',
                color: '1e3a5f',
                rightToLeft: true
              }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 300, after: 150 },
            bidirectional: true,
          })
        );
      }
      // عنوان فرعي (ينتهي بـ ":")
      else if (trimmedLine.endsWith(':')) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine,
                bold: true,
                size: 24,
                font: 'Arial',
                rightToLeft: true
              }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 150, after: 80 },
            bidirectional: true,
          })
        );
      }
      // جدول (يبدأ بـ "|")
      else if (trimmedLine.startsWith('|')) {
        // سنتعامل مع الجداول لاحقاً
        continue;
      }
      // نقطة في قائمة (تبدأ بـ "-")
      else if (trimmedLine.startsWith('-')) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '• ' + trimmedLine.substring(1).trim(),
                size: 24,
                font: 'Arial',
                rightToLeft: true
              }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 80, after: 80 },
            bidirectional: true,
          })
        );
      }
      // فقرة عادية
      else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: trimmedLine,
                size: 24,
                font: 'Arial',
                rightToLeft: true
              }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 80, after: 80, line: 300 },
            bidirectional: true,
          })
        );
      }
    }
  }
  
  // إنشاء المستند
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1800,
              bottom: 1440,
              left: 1080,
            },
          },
          textDirection: TextDirection.RIGHT_TO_LEFT,
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
