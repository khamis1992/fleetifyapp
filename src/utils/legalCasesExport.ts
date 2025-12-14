/**
 * Legal Cases Export Utility
 * أداة تصدير القضايا القانونية
 * 
 * Supports:
 * - CSV export
 * - Excel export (future)
 * - PDF export (future)
 */

import { LegalCase } from '@/components/legal/CasesCardList';

const priorityLabels: Record<string, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'عالي',
  urgent: 'عاجل',
};

const statusLabels: Record<string, string> = {
  active: 'نشطة',
  pending: 'معلقة',
  closed: 'مغلقة',
};

const caseTypeLabels: Record<string, string> = {
  commercial: 'تجاري',
  civil: 'مدني',
  labor: 'عمالي',
  rental: 'إيجارات',
  payment_collection: 'تحصيل مدفوعات',
  contract_dispute: 'نزاع عقد',
  other: 'أخرى',
};

/**
 * Export cases to CSV
 */
export const exportToCSV = (cases: LegalCase[], filename?: string) => {
  if (cases.length === 0) {
    throw new Error('لا توجد قضايا للتصدير');
  }

  // CSV Headers (Arabic)
  const headers = [
    'رقم القضية',
    'العنوان',
    'العميل',
    'المحامي',
    'النوع',
    'الأولوية',
    'الحالة',
    'التكلفة',
    'الموعد القادم',
    'تاريخ الإنشاء',
    'الوصف',
  ];

  // Convert cases to CSV rows
  const rows = cases.map((c) => [
    c.case_number,
    c.title,
    c.customer_name,
    c.lawyer_name || '-',
    caseTypeLabels[c.case_type] || c.case_type,
    priorityLabels[c.priority],
    statusLabels[c.status],
    c.total_cost.toLocaleString('en-US'),
    c.next_hearing_date || '-',
    new Date(c.created_at).toLocaleDateString('en-US'),
    c.description || '-',
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  // Add BOM for proper Arabic display in Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Download file
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename || `legal-cases-${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export cases to Excel (XLSX)
 * Note: Requires xlsx library
 */
export const exportToExcel = async (cases: LegalCase[], filename?: string) => {
  try {
    // Dynamic import to reduce bundle size
    const XLSX = await import('xlsx');

    if (cases.length === 0) {
      throw new Error('لا توجد قضايا للتصدير');
    }

    // Prepare data
    const data = cases.map((c) => ({
      'رقم القضية': c.case_number,
      'العنوان': c.title,
      'العميل': c.customer_name,
      'المحامي': c.lawyer_name || '-',
      'النوع': caseTypeLabels[c.case_type] || c.case_type,
      'الأولوية': priorityLabels[c.priority],
      'الحالة': statusLabels[c.status],
      'التكلفة': c.total_cost,
      'الموعد القادم': c.next_hearing_date || '-',
      'تاريخ الإنشاء': new Date(c.created_at).toLocaleDateString('en-US'),
      'الوصف': c.description || '-',
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths
    const columnWidths = [
      { wch: 15 }, // رقم القضية
      { wch: 30 }, // العنوان
      { wch: 20 }, // العميل
      { wch: 20 }, // المحامي
      { wch: 15 }, // النوع
      { wch: 10 }, // الأولوية
      { wch: 10 }, // الحالة
      { wch: 12 }, // التكلفة
      { wch: 15 }, // الموعد القادم
      { wch: 15 }, // تاريخ الإنشاء
      { wch: 40 }, // الوصف
    ];
    worksheet['!cols'] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'القضايا القانونية');

    // Download file
    XLSX.writeFile(workbook, filename || `legal-cases-${Date.now()}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('فشل التصدير إلى Excel. يرجى المحاولة مرة أخرى.');
  }
};

/**
 * Export cases to PDF
 * Note: Requires jsPDF library
 */
export const exportToPDF = async (cases: LegalCase[], filename?: string) => {
  try {
    // Dynamic import to reduce bundle size
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    if (cases.length === 0) {
      throw new Error('لا توجد قضايا للتصدير');
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Add Arabic font support (if available)
    // Note: You may need to add Arabic font to jsPDF

    // Title
    doc.setFontSize(16);
    doc.text('تقرير القضايا القانونية', 148, 15, { align: 'center' });

    // Subtitle
    doc.setFontSize(10);
    doc.text(
      `تاريخ التقرير: ${new Date().toLocaleDateString('en-US')}`,
      148,
      22,
      { align: 'center' }
    );
    doc.text(
      `عدد القضايا: ${cases.length}`,
      148,
      28,
      { align: 'center' }
    );

    // Table data
    const tableData = cases.map((c) => [
      c.case_number,
      c.title.substring(0, 30) + (c.title.length > 30 ? '...' : ''),
      c.customer_name,
      caseTypeLabels[c.case_type] || c.case_type,
      priorityLabels[c.priority],
      statusLabels[c.status],
      c.total_cost.toLocaleString('en-US'),
      c.next_hearing_date || '-',
    ]);

    // Add table
    (doc as any).autoTable({
      head: [
        [
          'رقم القضية',
          'العنوان',
          'العميل',
          'النوع',
          'الأولوية',
          'الحالة',
          'التكلفة',
          'الموعد القادم',
        ],
      ],
      body: tableData,
      startY: 35,
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [0, 77, 64], // Primary color
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    // Save PDF
    doc.save(filename || `legal-cases-${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('فشل التصدير إلى PDF. يرجى المحاولة مرة أخرى.');
  }
};

/**
 * Print cases (opens print dialog)
 */
export const printCases = (cases: LegalCase[]) => {
  if (cases.length === 0) {
    throw new Error('لا توجد قضايا للطباعة');
  }

  // Create printable HTML
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('تم حظر نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.');
  }

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>تقرير القضايا القانونية</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          direction: rtl;
          padding: 20px;
        }
        h1 {
          text-align: center;
          color: #004d40;
        }
        .meta {
          text-align: center;
          margin-bottom: 20px;
          color: #666;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: right;
        }
        th {
          background-color: #004d40;
          color: white;
        }
        tr:nth-child(even) {
          background-color: #f2f2f2;
        }
        @media print {
          button {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <h1>تقرير القضايا القانونية</h1>
      <div class="meta">
        <p>تاريخ التقرير: ${new Date().toLocaleDateString('en-US')}</p>
        <p>عدد القضايا: ${cases.length}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>رقم القضية</th>
            <th>العنوان</th>
            <th>العميل</th>
            <th>النوع</th>
            <th>الأولوية</th>
            <th>الحالة</th>
            <th>التكلفة</th>
            <th>الموعد القادم</th>
          </tr>
        </thead>
        <tbody>
          ${cases
            .map(
              (c) => `
            <tr>
              <td>${c.case_number}</td>
              <td>${c.title}</td>
              <td>${c.customer_name}</td>
              <td>${caseTypeLabels[c.case_type] || c.case_type}</td>
              <td>${priorityLabels[c.priority]}</td>
              <td>${statusLabels[c.status]}</td>
              <td>${c.total_cost.toLocaleString('en-US')} ر.س</td>
              <td>${c.next_hearing_date || '-'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      <script>
        window.onload = () => {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
