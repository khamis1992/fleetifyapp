/**
 * Export Dialog Component
 *
 * Advanced export dialog with format selection, content options, and preview.
 * Used for exporting entire dashboards or complex data sets.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { FileText, FileSpreadsheet, FileType, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

export interface ExportDialogProps {
  /** Dialog open state */
  open: boolean;
  /** Callback when dialog closes */
  onOpenChange: (open: boolean) => void;
  /** Dashboard title */
  title: string;
  /** Charts to export */
  charts?: { element: HTMLElement; title: string; subtitle?: string }[];
  /** Table data to export */
  tableData?: Record<string, any>[];
  /** Table columns */
  tableColumns?: { header: string; key: string }[];
  /** Summary data */
  summaryData?: Record<string, any>;
  /** Company name */
  companyName?: string;
  /** Base filename */
  filename?: string;
}

type ExportFormat = 'pdf' | 'excel' | 'csv';
type ContentSelection = 'current' | 'all' | 'custom';

export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onOpenChange,
  title,
  charts = [],
  tableData = [],
  tableColumns,
  summaryData,
  companyName = 'FleetifyApp',
  filename = 'dashboard_export',
}) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [contentSelection, setContentSelection] = useState<ContentSelection>('all');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeTables, setIncludeTables] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);

  /**
   * Reset dialog state
   */
  const resetState = () => {
    setExportFormat('pdf');
    setContentSelection('all');
    setIncludeCharts(true);
    setIncludeTables(true);
    setIncludeSummary(true);
    setIsExporting(false);
    setExportProgress(0);
    setExportComplete(false);
  };

  /**
   * Handle export
   */
  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportComplete(false);

    try {
      if (exportFormat === 'pdf') {
        await handlePDFExport();
      } else if (exportFormat === 'excel') {
        await handleExcelExport();
      } else if (exportFormat === 'csv') {
        await handleCSVExport();
      }

      setExportProgress(100);
      setExportComplete(true);

      toast.success('تم التصدير بنجاح', {
        description: `تم تصدير ${title} بصيغة ${exportFormat.toUpperCase()}`,
      });

      // Close dialog after 1.5 seconds
      setTimeout(() => {
        onOpenChange(false);
        resetState();
      }, 1500);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('فشل التصدير', {
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء التصدير',
      });
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  /**
   * Handle PDF export
   */
  const handlePDFExport = async () => {
    const { exportDashboardToPDF, ChartExportData } = await import('@/utils/exports');

    setExportProgress(10);

    const chartsToExport: any[] = [];

    if (includeCharts && charts.length > 0) {
      charts.forEach((chart, index) => {
        chartsToExport.push({
          element: chart.element,
          title: chart.title,
          subtitle: chart.subtitle,
        });
        setExportProgress(10 + (index + 1) * (70 / charts.length));
      });
    }

    setExportProgress(80);

    await exportDashboardToPDF(chartsToExport, `${filename}.pdf`, {
      companyName,
      title,
      tableOfContents: chartsToExport.length > 1,
      includeHeader: true,
      includeFooter: true,
    });

    setExportProgress(100);
  };

  /**
   * Handle Excel export
   */
  const handleExcelExport = async () => {
    const { exportDashboardToExcel } = await import('@/utils/exports');

    setExportProgress(20);

    const dashboardData: {
      summary?: Record<string, any>;
      charts?: { title: string; data: any[] }[];
      tables?: { title: string; data: any[]; columns?: any[] }[];
    } = {};

    if (includeSummary && summaryData) {
      dashboardData.summary = summaryData;
    }

    setExportProgress(40);

    if (includeTables && tableData.length > 0) {
      dashboardData.tables = [
        {
          title: title,
          data: tableData,
          columns: tableColumns,
        },
      ];
    }

    setExportProgress(60);

    exportDashboardToExcel(dashboardData, `${filename}.xlsx`);

    setExportProgress(100);
  };

  /**
   * Handle CSV export
   */
  const handleCSVExport = async () => {
    const { exportToCSV } = await import('@/utils/exports');

    setExportProgress(30);

    if (tableData.length === 0) {
      throw new Error('لا توجد بيانات جدولية للتصدير إلى CSV');
    }

    setExportProgress(60);

    exportToCSV(tableData, `${filename}.csv`);

    setExportProgress(100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>تصدير {title}</DialogTitle>
          <DialogDescription>
            اختر صيغة التصدير والمحتوى المراد تضمينه
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Format */}
          <div className="space-y-3">
            <Label>صيغة التصدير</Label>
            <RadioGroup
              value={exportFormat}
              onValueChange={(value) => setExportFormat(value as ExportFormat)}
              disabled={isExporting}
            >
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center cursor-pointer">
                  <FileText className="h-4 w-4 ml-2 text-red-500" />
                  <span>PDF</span>
                  <span className="text-sm text-slate-500 mr-2">
                    (مناسب للطباعة والعروض التقديمية)
                  </span>
                </Label>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="flex items-center cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 ml-2 text-green-500" />
                  <span>Excel</span>
                  <span className="text-sm text-slate-500 mr-2">
                    (مناسب للتحليل والمعالجة)
                  </span>
                </Label>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center cursor-pointer">
                  <FileType className="h-4 w-4 ml-2 text-blue-500" />
                  <span>CSV</span>
                  <span className="text-sm text-slate-500 mr-2">
                    (مناسب للتكامل مع الأنظمة الأخرى)
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Content Selection */}
          <div className="space-y-3">
            <Label>المحتوى المراد تضمينه</Label>
            <div className="space-y-2">
              {charts.length > 0 && exportFormat === 'pdf' && (
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="charts"
                    checked={includeCharts}
                    onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
                    disabled={isExporting}
                  />
                  <Label htmlFor="charts" className="cursor-pointer">
                    الرسوم البيانية ({charts.length})
                  </Label>
                </div>
              )}

              {tableData.length > 0 && (
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="tables"
                    checked={includeTables}
                    onCheckedChange={(checked) => setIncludeTables(checked as boolean)}
                    disabled={isExporting}
                  />
                  <Label htmlFor="tables" className="cursor-pointer">
                    الجداول ({tableData.length} صف)
                  </Label>
                </div>
              )}

              {summaryData && exportFormat === 'excel' && (
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="summary"
                    checked={includeSummary}
                    onCheckedChange={(checked) => setIncludeSummary(checked as boolean)}
                    disabled={isExporting}
                  />
                  <Label htmlFor="summary" className="cursor-pointer">
                    الملخص التنفيذي
                  </Label>
                </div>
              )}
            </div>
          </div>

          {/* Export Progress */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>جاري التصدير...</span>
                <span>{Math.round(exportProgress)}%</span>
              </div>
              <Progress value={exportProgress} className="h-2" />
            </div>
          )}

          {/* Export Complete */}
          {exportComplete && (
            <div className="flex items-center justify-center space-x-2 space-x-reverse text-green-600">
              <Check className="h-5 w-5" />
              <span className="font-medium">تم التصدير بنجاح!</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetState();
            }}
            disabled={isExporting}
          >
            إلغاء
          </Button>
          <Button onClick={handleExport} disabled={isExporting || exportComplete}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                جاري التصدير...
              </>
            ) : exportComplete ? (
              'تم التصدير'
            ) : (
              'تصدير'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
