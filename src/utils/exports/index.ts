/**
 * Export Utilities
 *
 * Barrel export file for all export-related utilities
 */

// PDF exports
export {
  exportChartToPDF,
  exportDashboardToPDF,
  exportTableToPDF,
  addBrandedHeader,
  addBrandedFooter,
  generateFilename as generatePDFFilename,
  type PDFExportOptions,
  type ChartExportData,
} from './pdfExport';

// Excel exports
export {
  exportTableToExcel,
  exportMultiSheetExcel,
  exportChartDataToExcel,
  exportDashboardToExcel,
  formatCells,
  readExcelFile,
  generateFilename as generateExcelFilename,
  type ExcelExportOptions,
  type ExcelSheetData,
} from './excelExport';

// CSV exports
export {
  exportToCSV,
  exportChartDataToCSV,
  exportTableToCSV,
  exportLargeDatasetToCSV,
  parseCSVFile,
  generateFilename as generateCSVFilename,
  type CSVExportOptions,
} from './csvExport';

// Templates and themes
export {
  applyThemeToPDF,
  createStandardHeader,
  createBrandedHeader,
  createMinimalHeader,
  createStandardFooter,
  createTableOfContents,
  DEFAULT_THEME,
  THEMES,
  EXCEL_STYLES,
  PDFTemplateLayout,
  type BrandTheme,
} from './templates';
