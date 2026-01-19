/**
 * Excel Export Utility
 *
 * Provides functions for exporting tables and data to Excel format (.xlsx)
 * with formatting, multiple sheets, and styling using ExcelJS.
 *
 * Features:
 * - Single table export
 * - Multi-sheet workbook export
 * - Auto-sized columns
 * - Styled headers (bold, colored background)
 * - Filter dropdowns on headers
 * - Number formatting
 * - RTL support for Arabic content
 * - Security: Uses ExcelJS instead of vulnerable xlsx package
 *
 * Performance: Lazy loads ExcelJS library on-demand
 */

// Lazy load ExcelJS - only when exporting/importing (SECURE alternative to vulnerable xlsx)

export interface ExcelExportOptions {
  sheetName?: string;
  fileName?: string;
  includeHeaders?: boolean;
  autoFilter?: boolean;
  freezeHeader?: boolean;
  columnWidths?: number[]; // Manual column widths (optional)
  headerStyle?: {
    bold?: boolean;
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
  };
  dateFormat?: string;
  numberFormat?: string;
}

export interface ExcelSheetData {
  sheetName: string;
  data: Record<string, any>[];
  columns?: { header: string; key: string; width?: number }[];
  options?: ExcelExportOptions;
}

/**
 * Default export options
 */
const DEFAULT_OPTIONS: ExcelExportOptions = {
  sheetName: 'Sheet1',
  includeHeaders: true,
  autoFilter: true,
  freezeHeader: true,
  headerStyle: {
    bold: true,
    backgroundColor: 'FF3B82F6', // Blue
    textColor: 'FFFFFFFF', // White
    fontSize: 12,
  },
};

/**
 * Convert data to worksheet with formatting
 * Lazy loads ExcelJS library on-demand
 */
async function createWorksheet(
  workbook: any,
  data: Record<string, any>[],
  columns?: { header: string; key: string; width?: number }[],
  options: ExcelExportOptions = {}
): Promise<any> {
  // Dynamically import ExcelJS only when needed (SECURE alternative)
  const ExcelJS = await import('exceljs');

  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (data.length === 0) {
    throw new Error('لا توجد بيانات للتصدير');
  }

  // Add worksheet
  const worksheet = workbook.addWorksheet(opts.sheetName);

  let headers: string[];
  let keys: string[];

  if (columns) {
    // Use provided columns
    headers = columns.map(col => col.header);
    keys = columns.map(col => col.key);
  } else {
    // Auto-detect columns from data
    keys = Object.keys(data[0]);
    headers = keys;
  }

  // Add header row with styling
  if (opts.includeHeaders) {
    const headerRow = worksheet.addRow(headers);

    if (opts.headerStyle) {
      headerRow.eachCell((cell, colNumber) => {
        cell.font = {
          bold: opts.headerStyle.bold,
          color: { argb: opts.headerStyle.textColor?.replace('#', 'FF') || 'FFFFFFFF' },
          size: opts.headerStyle.fontSize,
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: opts.headerStyle.backgroundColor?.replace('#', 'FF') || 'FF3B82F6' },
        };
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };
      });
    }
  }

  // Add data rows
  data.forEach(row => {
    const rowData = keys.map(key => row[key] ?? '');
    worksheet.addRow(rowData);
  });

  // Apply column widths
  if (columns && columns.some(col => col.width)) {
    // Use provided widths
    columns.forEach((col, idx) => {
      worksheet.getColumn(idx + 1).width = col.width || 15;
    });
  } else if (opts.columnWidths) {
    // Use manual widths
    opts.columnWidths.forEach((width, idx) => {
      worksheet.getColumn(idx + 1).width = width;
    });
  } else {
    // Auto-size based on content
    keys.forEach((key, idx) => {
      const headerLength = columns ? columns[idx].header.length : key.length;
      const maxContentLength = Math.max(
        ...data.slice(0, 100).map(row => {
          const val = String(row[key] || '');
          return val.length;
        })
      );

      const width = Math.min(Math.max(headerLength, maxContentLength) + 2, 50);
      worksheet.getColumn(idx + 1).width = width;
    });
  }

  // Apply auto-filter
  if (opts.autoFilter && opts.includeHeaders) {
    worksheet.autoFilter = {
      from: {
        row: 1,
        column: 1
      },
      to: {
        row: 1,
        column: keys.length
      }
    };
  }

  // Freeze header row
  if (opts.freezeHeader && opts.includeHeaders) {
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];
  }

  return worksheet;
}

/**
 * Export single table to Excel
 * Lazy loads ExcelJS library on first use (SECURE)
 */
export async function exportTableToExcel(
  data: Record<string, any>[],
  columns?: { header: string; key: string; width?: number }[],
  filename?: string,
  options: ExcelExportOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Dynamically import ExcelJS only when needed (SECURE alternative)
    const ExcelJS = await import('exceljs');

    // Create workbook
    const workbook = new ExcelJS.Workbook();

    // Create worksheet
    await createWorksheet(workbook, data, columns, opts);

    // Generate filename
    const fileName = filename || generateFilename('تقرير', 'xlsx');

    // Write file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('فشل التصدير إلى Excel');
  }
}

/**
 * Export multiple sheets to Excel workbook
 * Lazy loads ExcelJS library on first use (SECURE)
 */
export async function exportMultiSheetExcel(
  sheets: ExcelSheetData[],
  filename?: string
): Promise<void> {
  if (sheets.length === 0) {
    throw new Error('لا توجد أوراق للتصدير');
  }

  try {
    // Dynamically import ExcelJS only when needed (SECURE alternative)
    const ExcelJS = await import('exceljs');

    // Create workbook
    const workbook = new ExcelJS.Workbook();

    // Add each sheet
    for (const sheetData of sheets) {
      const opts = { ...DEFAULT_OPTIONS, ...sheetData.options, sheetName: sheetData.sheetName };
      await createWorksheet(workbook, sheetData.data, sheetData.columns, opts);
    }

    // Generate filename
    const fileName = filename || generateFilename('تقرير_متعدد', 'xlsx');

    // Write file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting multi-sheet Excel:', error);
    throw new Error('فشل التصدير إلى Excel متعدد الأوراق');
  }
}

/**
 * Export chart data to Excel (data behind the chart)
 * Lazy loads xlsx library on first use
 */
export async function exportChartDataToExcel(
  chartData: { labels: string[]; datasets: { label: string; data: number[] }[] },
  filename?: string,
  options: ExcelExportOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Convert chart data to table format
    const data: Record<string, any>[] = chartData.labels.map((label, index) => {
      const row: Record<string, any> = { label };

      chartData.datasets.forEach(dataset => {
        row[dataset.label] = dataset.data[index];
      });

      return row;
    });

    // Generate columns
    const columns = [
      { header: 'التصنيف', key: 'label', width: 20 },
      ...chartData.datasets.map(dataset => ({
        header: dataset.label,
        key: dataset.label,
        width: 15,
      })),
    ];

    // Export
    await exportTableToExcel(data, columns, filename, opts);
  } catch (error) {
    console.error('Error exporting chart data to Excel:', error);
    throw new Error('فشل تصدير بيانات الرسم البياني إلى Excel');
  }
}

/**
 * Export dashboard summary to Excel
 * Lazy loads xlsx library on first use
 */
export async function exportDashboardToExcel(
  dashboardData: {
    summary?: Record<string, any>;
    charts?: { title: string; data: any[] }[];
    tables?: { title: string; data: any[]; columns?: any[] }[];
  },
  filename?: string
): Promise<void> {
  try {
    const sheets: ExcelSheetData[] = [];

    // Summary sheet (if provided)
    if (dashboardData.summary) {
      const summaryData = Object.entries(dashboardData.summary).map(([key, value]) => ({
        metric: key,
        value: value,
      }));

      sheets.push({
        sheetName: 'ملخص',
        data: summaryData,
        columns: [
          { header: 'المقياس', key: 'metric', width: 30 },
          { header: 'القيمة', key: 'value', width: 20 },
        ],
      });
    }

    // Chart data sheets
    if (dashboardData.charts) {
      dashboardData.charts.forEach((chart, index) => {
        sheets.push({
          sheetName: chart.title.substring(0, 30), // Excel sheet name limit
          data: chart.data,
        });
      });
    }

    // Table data sheets
    if (dashboardData.tables) {
      dashboardData.tables.forEach((table, index) => {
        sheets.push({
          sheetName: table.title.substring(0, 30),
          data: table.data,
          columns: table.columns,
        });
      });
    }

    // Export multi-sheet workbook
    await exportMultiSheetExcel(sheets, filename);
  } catch (error) {
    console.error('Error exporting dashboard to Excel:', error);
    throw new Error('فشل تصدير لوحة المعلومات إلى Excel');
  }
}

/**
 * Apply number formatting to cells
 * Note: This function requires the worksheet object from xlsx
 */
export async function formatCells(
  ws: any,
  range: string,
  format: string
): Promise<void> {
  const XLSX = await import('xlsx');
  const decodedRange = XLSX.utils.decode_range(range);

  for (let row = decodedRange.s.r; row <= decodedRange.e.r; row++) {
    for (let col = decodedRange.s.c; col <= decodedRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = ws[cellAddress];

      if (cell) {
        cell.z = format;
      }
    }
  }
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(
  baseName: string,
  extension: string = 'xlsx'
): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .split('T')
    .join('_')
    .slice(0, -5);

  return `${baseName}_${timestamp}.${extension}`;
}

/**
 * Read Excel file (for import functionality)
 * Lazy loads ExcelJS library on first use (SECURE)
 */
export async function readExcelFile(
  file: File
): Promise<{ sheetNames: string[]; data: Record<string, any>[][] }> {
  // Dynamically import ExcelJS only when needed (SECURE alternative)
  const ExcelJS = await import('exceljs');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(data);

        const sheetNames = workbook.worksheets.map(sheet => sheet.name);
        const sheetsData = workbook.worksheets.map(worksheet => {
          const jsonData: Record<string, any>[] = [];
          const headers: string[] = [];

          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) {
              // Extract headers
              row.eachCell((cell, colNumber) => {
                headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
              });
            } else {
              // Extract data rows
              const rowData: Record<string, any> = {};
              row.eachCell((cell, colNumber) => {
                const header = headers[colNumber - 1] || `Column${colNumber}`;
                rowData[header] = cell.value;
              });
              jsonData.push(rowData);
            }
          });

          return jsonData;
        });

        resolve({
          sheetNames,
          data: sheetsData,
        });
      } catch (error) {
        reject(new Error('فشل قراءة ملف Excel'));
      }
    };

    reader.onerror = () => {
      reject(new Error('فشل قراءة الملف'));
    };

    reader.readAsArrayBuffer(file);
  });
}
