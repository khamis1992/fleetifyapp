import { useState } from 'react';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { useCurrentCompany } from '@/hooks/useCurrentCompany';
import { useToast } from '@/hooks/use-toast';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { generateReportContent } from '@/utils/reportFormatters';
import { getModuleTitle } from '@/utils/reportLabels';
import { sanitizeDocumentHtmlToFragment } from '@/utils/htmlSanitizer';
import { fetchReportData } from '@/services/reportDataService';

interface DamagePoint {
  x: number;
  y: number;
  severity: 'minor' | 'moderate' | 'severe';
  description?: string;
}

interface ExportOptions {
  reportId: string;
  moduleType: string;
  filters: Record<string, unknown>;
  title: string;
  format?: 'html' | 'pdf' | 'excel';
  conditionReportId?: string;
  damagePoints?: DamagePoint[];
}

const PRINT_CONTENT_ID = 'report-print-content';
const PRINT_STYLE_ID = 'report-print-styles';

const PRINT_CSS = `
  @media print {
    body * { visibility: hidden; }
    #${PRINT_CONTENT_ID}, #${PRINT_CONTENT_ID} * { visibility: visible; }
    #${PRINT_CONTENT_ID} {
      position: absolute;
      inset: 0;
      width: 100%;
      display: block !important;
      direction: rtl;
      color: #111827;
      background: #fff;
      font-family: Cairo, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.6;
    }
    @page { size: A4; margin: 16mm; }
    .report-header { border-bottom: 3px solid #374151; padding-bottom: 12px; margin-bottom: 20px; }
    .report-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
    .report-heading h1, .report-heading h2, .report-heading p { margin: 0; }
    .report-heading h1 { font-size: 20px; }
    .report-heading h2 { font-size: 16px; color: #374151; }
    .report-meta { color: #4b5563; text-align: left; }
    .filters-section { margin-bottom: 20px; padding: 10px; border: 1px solid #d1d5db; background: #f9fafb; }
    .filters-section h3 { margin: 0 0 6px; font-size: 14px; }
    .filters-grid { display: flex; flex-wrap: wrap; gap: 8px 24px; }
    .grid, .summary-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .bg-white, .summary-card { border: 1px solid #d1d5db; padding: 12px; text-align: center; break-inside: avoid; }
    .summary-card h4, .bg-white h4 { margin: 0 0 4px; color: #4b5563; }
    .summary-card .value, .bg-white p { margin: 0; font-size: 20px; font-weight: 700; }
    .data-section, .vehicle-info-section, .damage-visualization, .damage-table-section, .notes-section { margin-top: 20px; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: right; }
    .data-table th { background: #f3f4f6; font-weight: 700; }
    .vehicle-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 20px; }
    .vehicle-diagram { position: relative; max-width: 520px; margin: 0 auto; }
    .vehicle-outline { width: 100%; height: auto; }
    .damage-overlay { position: absolute; inset: 0; }
    .damage-point { position: absolute; width: 22px; height: 22px; border-radius: 50%; color: #fff; text-align: center; line-height: 22px; }
    .severity-minor { background: #ca8a04; }
    .severity-moderate { background: #ea580c; }
    .severity-severe { background: #dc2626; }
    .damage-legend { display: flex; justify-content: center; gap: 20px; margin-top: 8px; }
    .legend-color { display: inline-block; width: 10px; height: 10px; margin-left: 4px; }
    .no-data, .no-damage { padding: 16px; border: 1px solid #d1d5db; text-align: center; color: #4b5563; }
    .report-footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #d1d5db; text-align: center; color: #6b7280; }
    .no-break { break-inside: avoid; }
  }
`;

function getFilterText(filters: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof filters.startDate === 'string' && filters.startDate) {
    parts.push(`من تاريخ: ${filters.startDate}`);
  }
  if (typeof filters.endDate === 'string' && filters.endDate) {
    parts.push(`إلى تاريخ: ${filters.endDate}`);
  }
  if (typeof filters.moduleType === 'string' && filters.moduleType) {
    parts.push(`القسم: ${getModuleTitle(filters.moduleType)}`);
  }
  return parts.length > 0 ? parts.map(part => `<span>${part}</span>`).join('') : '<span>جميع البيانات المتاحة</span>';
}

function cleanupPrintDocument(): void {
  document.getElementById(PRINT_STYLE_ID)?.remove();
  document.getElementById(PRINT_CONTENT_ID)?.remove();
}

export const useReportExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const companyId = useCurrentCompanyId();
  const { data: company } = useCurrentCompany();
  const { toast } = useToast();
  const { formatCurrency } = useCurrencyFormatter();

  const exportToHTML = async (options: ExportOptions) => {
    setIsExporting(true);

    try {
      if (!companyId) {
        throw new Error('Company context is unavailable');
      }

      const reportData = await fetchReportData(options, companyId);
      const reportContent = generateReportContent(options, reportData, formatCurrency);
      const hasData = Boolean(
        reportData.conditionReport ||
        reportData.data?.length ||
        (reportData.summary && Object.keys(reportData.summary).length > 0)
      );
      const now = new Date();
      const companyName = company?.name || 'الشركة';
      const printContent = `
        <div id="${PRINT_CONTENT_ID}" style="display:none" dir="rtl">
          <header class="report-header">
            <div class="report-heading">
              <div>
                <h1>${companyName}</h1>
                <h2>${options.title}</h2>
              </div>
              <div class="report-meta">
                <p>تاريخ التقرير: ${now.toLocaleDateString('ar-QA')}</p>
                <p>الوقت: ${now.toLocaleTimeString('ar-QA', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </header>
          <section class="filters-section">
            <h3>معايير التصفية</h3>
            <div class="filters-grid">${getFilterText(options.filters)}</div>
          </section>
          <main>${reportContent}</main>
          ${hasData ? '' : '<div class="no-data">لا توجد سجلات متاحة للفترة المحددة</div>'}
          <footer class="report-footer">
            تم إنشاء هذا التقرير بواسطة نظام Fleetify بتاريخ ${now.toLocaleString('ar-QA')}
          </footer>
        </div>
      `;

      cleanupPrintDocument();
      const style = document.createElement('style');
      style.id = PRINT_STYLE_ID;
      style.textContent = PRINT_CSS;
      document.head.appendChild(style);
      document.body.appendChild(sanitizeDocumentHtmlToFragment(printContent));

      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        cleanupPrintDocument();
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup, { once: true });
      window.print();
      window.setTimeout(cleanup, 60_000);

      toast({
        title: 'تم فتح نافذة الطباعة',
        description: 'يمكنك طباعة التقرير أو حفظه بصيغة PDF.',
      });
    } catch (error) {
      console.error('Report export failed:', error);
      toast({
        title: 'فشل تصدير التقرير',
        description: 'تعذر تجهيز التقرير للطباعة. حاول مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return { exportToHTML, isExporting };
};
