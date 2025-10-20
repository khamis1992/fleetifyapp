/**
 * Excel Export Utility
 *
 * Provides functions for exporting tables and data to Excel format (.xlsx)
 * with formatting, multiple sheets, and styling.
 *
 * Features:
 * - Single table export
 * - Multi-sheet workbook export
 * - Auto-sized columns
 * - Styled headers (bold, colored background)
 * - Filter dropdowns on headers
 * - Number formatting
 * - RTL support for Arabic content
 */

import * as XLSX from 'xlsx';

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
 */
function createWorksheet(
  data: Record<string, any>[],
  columns?: { header: string; key: string; width?: number }[],
  options: ExcelExportOptions = {}
): XLSX.WorkSheet {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (data.length === 0) {
    throw new Error('لا توجد بيانات للتصدير');
  }

  let ws: XLSX.WorkSheet;
  let headers: string[];
  let keys: string[];

  if (columns) {
    // Use provided columns
    headers = columns.map(col => col.header);
    keys = columns.map(col => col.key);

    // Create data array
    const wsData = [
      headers,
      ...data.map(row => keys.map(key => row[key] ?? ''))
    ];

    ws = XLSX.utils.aoa_to_sheet(wsData);
  } else {
    // Auto-detect columns from data
    ws = XLSX.utils.json_to_sheet(data);
  }

  // Apply column widths
  const colWidths: XLSX.ColInfo[] = [];

  if (columns && columns.some(col => col.width)) {
    // Use provided widths
    columns.forEach((col, idx) => {
      colWidths[idx] = { wch: col.width || 15 };
    });
  } else if (opts.columnWidths) {
    // Use manual widths
    opts.columnWidths.forEach((width, idx) => {
      colWidths[idx] = { wch: width };
    });
  } else {
    // Auto-size based on content
    const allKeys = columns ? keys : Object.keys(data[0]);

    allKeys.forEach((key, idx) => {
      const headerLength = columns ? columns[idx].header.length : key.length;
      const maxContentLength = Math.max(
        ...data.slice(0, 100).map(row => {
          const val = String(row[key] || '');
          return val.length;
        })
      );

      const width = Math.min(Math.max(headerLength, maxContentLength) + 2, 50);
      colWidths[idx] = { wch: width };
    });
  }

  ws['!cols'] = colWidths;

  // Apply header styling
  if (opts.includeHeaders && opts.headerStyle) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const headerRow = 0;

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
      const cell = ws[cellAddress];

      if (cell) {
        cell.s = {
          font: {
            bold: opts.headerStyle.bold,
            color: { rgb: opts.headerStyle.textColor?.replace('#', '') },
            sz: opts.headerStyle.fontSize,
          },
          fill: {
            fgColor: { rgb: opts.headerStyle.backgroundColor?.replace('#', '') },
          },
          alignment: {
            horizontal: 'center',
            vertical: 'center',
          },
        };
      }
    }
  }

  // Apply auto-filter
  if (opts.autoFilter && opts.includeHeaders) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  }

  // Freeze header row
  if (opts.freezeHeader && opts.includeHeaders) {
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  }

  return ws;
}

/**
 * Export single table to Excel
 */
export function exportTableToExcel(
  data: Record<string, any>[],
  columns?: { header: string; key: string; width?: number }[],
  filename?: string,
  options: ExcelExportOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Create worksheet
    const ws = createWorksheet(data, columns, opts);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, opts.sheetName);

    // Generate filename
    const fileName = filename || generateFilename('تقرير', 'xlsx');

    // Write file
    XLSX.writeFile(wb, fileName, { bookType: 'xlsx', type: 'binary' });
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('فشل التصدير إلى Excel');
  }
}

/**
 * Export multiple sheets to Excel workbook
 */
export function exportMultiSheetExcel(
  sheets: ExcelSheetData[],
  filename?: string
): void {
  if (sheets.length === 0) {
    throw new Error('لا توجد أوراق للتصدير');
  }

  try {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Add each sheet
    sheets.forEach((sheetData, index) => {
      const ws = createWorksheet(
        sheetData.data,
        sheetData.columns,
        sheetData.options
      );

      const sheetName = sheetData.sheetName || `ورقة ${index + 1}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    // Generate filename
    const fileName = filename || generateFilename('تقرير_متعدد', 'xlsx');

    // Write file
    XLSX.writeFile(wb, fileName, { bookType: 'xlsx', type: 'binary' });
  } catch (error) {
    console.error('Error exporting multi-sheet Excel:', error);
    throw new Error('فشل التصدير إلى Excel متعدد الأوراق');
  }
}

/**
 * Export chart data to Excel (data behind the chart)
 */
export function exportChartDataToExcel(
  chartData: { labels: string[]; datasets: { label: string; data: number[] }[] },
  filename?: string,
  options: ExcelExportOptions = {}
): void {
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
    exportTableToExcel(data, columns, filename, opts);
  } catch (error) {
    console.error('Error exporting chart data to Excel:', error);
    throw new Error('فشل تصدير بيانات الرسم البياني إلى Excel');
  }
}

/**
 * Export dashboard summary to Excel
 */
export function exportDashboardToExcel(
  dashboardData: {
    summary?: Record<string, any>;
    charts?: { title: string; data: any[] }[];
    tables?: { title: string; data: any[]; columns?: any[] }[];
  },
  filename?: string
): void {
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
    exportMultiSheetExcel(sheets, filename);
  } catch (error) {
    console.error('Error exporting dashboard to Excel:', error);
    throw new Error('فشل تصدير لوحة المعلومات إلى Excel');
  }
}

/**
 * Apply number formatting to cells
 */
export function formatCells(
  ws: XLSX.WorkSheet,
  range: string,
  format: string
): void {
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
 */
export async function readExcelFile(
  file: File
): Promise<{ sheetNames: string[]; data: Record<string, any>[][] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        const sheetNames = workbook.SheetNames;
        const sheetsData = sheetNames.map(name => {
          const worksheet = workbook.Sheets[name];
          return XLSX.utils.sheet_to_json(worksheet);
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

    reader.readAsBinaryString(file);
  });
}
