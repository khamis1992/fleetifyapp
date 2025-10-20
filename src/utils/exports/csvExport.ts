/**
 * CSV Export Utility
 *
 * Provides functions for exporting data to CSV format with UTF-8 support,
 * configurable delimiters, and proper escaping.
 *
 * Features:
 * - UTF-8 BOM for Excel compatibility
 * - Configurable delimiter (comma, semicolon, tab)
 * - Quote handling for special characters
 * - Header row support
 * - Large dataset handling
 */

export interface CSVExportOptions {
  delimiter?: ',' | ';' | '\t';
  includeHeaders?: boolean;
  includeBOM?: boolean; // UTF-8 BOM for Excel compatibility
  quoteStrings?: boolean;
  dateFormat?: 'iso' | 'locale';
  headers?: string[]; // Custom headers (defaults to object keys)
  keys?: string[]; // Specific keys to export (in order)
}

/**
 * Default export options
 */
const DEFAULT_OPTIONS: CSVExportOptions = {
  delimiter: ',',
  includeHeaders: true,
  includeBOM: true, // Important for Arabic text in Excel
  quoteStrings: true,
  dateFormat: 'locale',
};

/**
 * UTF-8 BOM (Byte Order Mark)
 * Required for Excel to correctly interpret UTF-8 encoded Arabic text
 */
const UTF8_BOM = '\uFEFF';

/**
 * Escape CSV value (handle quotes and special characters)
 */
function escapeCSVValue(
  value: any,
  delimiter: string = ',',
  quoteStrings: boolean = true
): string {
  if (value == null) {
    return '';
  }

  let stringValue = String(value);

  // Handle dates
  if (value instanceof Date) {
    stringValue = value.toLocaleString('ar-SA');
  }

  // Check if value needs quoting
  const needsQuoting =
    quoteStrings &&
    (stringValue.includes(delimiter) ||
      stringValue.includes('"') ||
      stringValue.includes('\n') ||
      stringValue.includes('\r'));

  if (needsQuoting) {
    // Escape existing quotes by doubling them
    stringValue = stringValue.replace(/"/g, '""');
    return `"${stringValue}"`;
  }

  return stringValue;
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(
  data: Record<string, any>[],
  options: CSVExportOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (data.length === 0) {
    return opts.includeBOM ? UTF8_BOM : '';
  }

  const lines: string[] = [];

  // Determine columns
  const keys = opts.keys || Object.keys(data[0]);
  const headers = opts.headers || keys;

  // Add BOM if requested
  let csv = opts.includeBOM ? UTF8_BOM : '';

  // Add header row
  if (opts.includeHeaders) {
    const headerRow = headers
      .map(header => escapeCSVValue(header, opts.delimiter, opts.quoteStrings))
      .join(opts.delimiter);
    lines.push(headerRow);
  }

  // Add data rows
  data.forEach(row => {
    const values = keys.map(key => {
      let value = row[key];

      // Format dates
      if (value instanceof Date && opts.dateFormat === 'iso') {
        value = value.toISOString();
      } else if (value instanceof Date) {
        value = value.toLocaleString('ar-SA');
      }

      return escapeCSVValue(value, opts.delimiter, opts.quoteStrings);
    });

    lines.push(values.join(opts.delimiter));
  });

  csv += lines.join('\n');
  return csv;
}

/**
 * Export data to CSV file
 */
export function exportToCSV(
  data: Record<string, any>[],
  filename?: string,
  options: CSVExportOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    if (data.length === 0) {
      throw new Error('لا توجد بيانات للتصدير');
    }

    // Convert data to CSV
    const csvContent = arrayToCSV(data, opts);

    // Create blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Generate filename
    const fileName = filename || generateFilename('تقرير', 'csv');

    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw new Error('فشل التصدير إلى CSV');
  }
}

/**
 * Export chart data to CSV
 */
export function exportChartDataToCSV(
  chartData: { labels: string[]; datasets: { label: string; data: number[] }[] },
  filename?: string,
  options: CSVExportOptions = {}
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

    // Generate headers
    const headers = ['التصنيف', ...chartData.datasets.map(d => d.label)];
    const keys = ['label', ...chartData.datasets.map(d => d.label)];

    // Export
    exportToCSV(data, filename, { ...opts, headers, keys });
  } catch (error) {
    console.error('Error exporting chart data to CSV:', error);
    throw new Error('فشل تصدير بيانات الرسم البياني إلى CSV');
  }
}

/**
 * Export table with custom columns
 */
export function exportTableToCSV(
  data: Record<string, any>[],
  columns: { header: string; key: string }[],
  filename?: string,
  options: CSVExportOptions = {}
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const headers = columns.map(col => col.header);
    const keys = columns.map(col => col.key);

    exportToCSV(data, filename, { ...opts, headers, keys });
  } catch (error) {
    console.error('Error exporting table to CSV:', error);
    throw new Error('فشل تصدير الجدول إلى CSV');
  }
}

/**
 * Export large dataset in chunks (for very large data)
 */
export async function exportLargeDatasetToCSV(
  data: Record<string, any>[],
  filename?: string,
  options: CSVExportOptions = {},
  chunkSize: number = 10000
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    if (data.length === 0) {
      throw new Error('لا توجد بيانات للتصدير');
    }

    // Determine columns
    const keys = opts.keys || Object.keys(data[0]);
    const headers = opts.headers || keys;

    let csvContent = opts.includeBOM ? UTF8_BOM : '';

    // Add header row
    if (opts.includeHeaders) {
      const headerRow = headers
        .map(header => escapeCSVValue(header, opts.delimiter, opts.quoteStrings))
        .join(opts.delimiter);
      csvContent += headerRow + '\n';
    }

    // Process data in chunks
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);

      chunk.forEach(row => {
        const values = keys.map(key => {
          let value = row[key];

          // Format dates
          if (value instanceof Date && opts.dateFormat === 'iso') {
            value = value.toISOString();
          } else if (value instanceof Date) {
            value = value.toLocaleString('ar-SA');
          }

          return escapeCSVValue(value, opts.delimiter, opts.quoteStrings);
        });

        csvContent += values.join(opts.delimiter) + '\n';
      });

      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = filename || generateFilename('تقرير_كبير', 'csv');

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting large dataset to CSV:', error);
    throw new Error('فشل تصدير البيانات الكبيرة إلى CSV');
  }
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(
  baseName: string,
  extension: string = 'csv'
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
 * Parse CSV file (for import functionality)
 */
export async function parseCSVFile(
  file: File,
  options: CSVExportOptions = {}
): Promise<Record<string, any>[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        let content = e.target?.result as string;

        // Remove BOM if present
        if (content.charCodeAt(0) === 0xfeff) {
          content = content.slice(1);
        }

        // Split into lines
        const lines = content.split(/\r?\n/).filter(line => line.trim());

        if (lines.length === 0) {
          resolve([]);
          return;
        }

        // Parse header row
        const headers = parseCSVLine(lines[0], opts.delimiter || ',');

        // Parse data rows
        const data: Record<string, any>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i], opts.delimiter || ',');

          const row: Record<string, any> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          data.push(row);
        }

        resolve(data);
      } catch (error) {
        reject(new Error('فشل تحليل ملف CSV'));
      }
    };

    reader.onerror = () => {
      reject(new Error('فشل قراءة الملف'));
    };

    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Parse CSV line (handle quoted values)
 */
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const values: string[] = [];
  let currentValue = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentValue += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      // End of value
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  // Add last value
  values.push(currentValue.trim());

  return values;
}
