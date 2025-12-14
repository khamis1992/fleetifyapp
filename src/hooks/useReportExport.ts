import { useState } from "react";
import { useCurrentCompanyId } from "@/hooks/useUnifiedCompanyAccess";
import { useToast } from "@/hooks/use-toast";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { getReportStyles } from "@/utils/reportStyles";
import { getModuleTitle } from "@/utils/reportLabels";
import {
  generateReportContent,
  generateDataTable,
  getTableHeaders,
  getTableCells
} from "@/utils/reportFormatters";
import { fetchReportData } from "@/services/reportDataService";

interface DamagePoint {
  x: number;
  y: number;
  severity: 'minor' | 'moderate' | 'severe';
  description?: string;
}

interface ReportData {
  metrics?: Record<string, number | string>;
  summary?: Record<string, number | string>;
  data?: Record<string, unknown>[];
  conditionReport?: Record<string, unknown>;
  damagePoints?: DamagePoint[];
}

interface ExportOptions {
  reportId: string;
  moduleType: string;
  filters: Record<string, unknown>;
  title: string;
  format?: 'html' | 'pdf' | 'excel';
  conditionReportId?: string; // For damage reports
  damagePoints?: DamagePoint[]; // For damage reports
}

export const useReportExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const companyId = useCurrentCompanyId();
const { toast } = useToast();
  const { formatCurrency } = useCurrencyFormatter();

  const exportToHTML = async (options: ExportOptions) => {
    setIsExporting(true);

    try {
      // Generate report data
      const reportData = await fetchReportData(options, companyId);
      const reportContent = generateReportContent(options, reportData, formatCurrency);
      
      // Create simple print-friendly content matching the template
      const printContent = `
        <div id="print-content" style="display: none;">
          <!-- Header -->
          <header class="border-b-4 border-gray-700 pb-4 mb-6">
            <div class="flex justify-between items-center">
              <div>
                <h1 class="text-2xl font-bold text-gray-800">اسم الشركة</h1>
                <h2 class="text-lg text-gray-500">${options.title}</h2>
              </div>
              <div class="text-sm text-gray-600">
                <p>تاريخ التقرير: <span class="font-semibold">${new Date().toLocaleDateString('en-GB')}</span></p>
                <p>الوقت: <span class="font-semibold">${new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span></p>
              </div>
            </div>
          </header>

          <!-- Filters -->
          <section class="mb-6">
            <h3 class="text-lg font-semibold text-gray-700 mb-2">معايير التصفية</h3>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-500">
              ${options.filters && Object.keys(options.filters).length > 0 ? 
                `${options.filters.startDate ? `من تاريخ: ${options.filters.startDate}<br>` : ''}
                 ${options.filters.endDate ? `إلى تاريخ: ${options.filters.endDate}<br>` : ''}
                 ${options.filters.moduleType ? `القسم: ${getModuleTitle(options.filters.moduleType)}` : ''}` 
                : 'لا توجد بيانات عرض'
              }
            </div>
          </section>

          ${reportContent}

          ${reportData && (reportData as any)?.metrics ? '' : `
          <!-- No Data Alert -->
          <section class="mb-6">
            <div class="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center text-gray-600 font-medium">
              لا توجد سجلات متاحة للفترة المحددة
            </div>
          </section>
          `}

          <!-- Footer -->
          <footer class="border-t pt-4 mt-8 text-sm text-gray-500 text-center">
            تم إنشاء هذا التقرير بواسطة نظام إدارة الشركات بتاريخ 
            <span class="font-semibold">${new Date().toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', calendar: 'islamic-umalqura' })} - ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
          </footer>
        </div>
      `;

      // Add simplified print styles matching the template
      const printStyles = `
        <style id="print-styles">
          @media print {
            body * {
              visibility: hidden;
            }
            
            #print-content, #print-content * {
              visibility: visible;
            }
            
            #print-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              display: block !important;
              font-family: 'Cairo', sans-serif;
              background: white;
              color: #333;
              direction: rtl;
            }
            
            /* Page setup */
            @page {
              size: A4;
              margin: 20mm;
            }
            
            .page {
              page-break-after: always;
            }
            
            .no-break {
              page-break-inside: avoid;
            }
            
            /* Header styles */
            .border-b-4 {
              border-bottom: 4px solid;
            }
            
            .border-gray-700 {
              border-color: #374151;
            }
            
            .pb-4 {
              padding-bottom: 1rem;
            }
            
            .mb-6 {
              margin-bottom: 1.5rem;
            }
            
            .flex {
              display: flex;
            }
            
            .justify-between {
              justify-content: space-between;
            }
            
            .items-center {
              align-items: center;
            }
            
            .text-2xl {
              font-size: 1.5rem;
            }
            
            .text-lg {
              font-size: 1.125rem;
            }
            
            .text-sm {
              font-size: 0.875rem;
            }
            
            .font-bold {
              font-weight: bold;
            }
            
            .font-semibold {
              font-weight: 600;
            }
            
            .text-gray-800 {
              color: #1f2937;
            }
            
            .text-gray-500 {
              color: #6b7280;
            }
            
            .text-gray-600 {
              color: #4b5563;
            }
            
            .text-gray-700 {
              color: #374151;
            }
            
            /* Filters section */
            .bg-gray-50 {
              background-color: #f9fafb;
            }
            
            .border {
              border: 1px solid;
            }
            
            .border-gray-200 {
              border-color: #e5e7eb;
            }
            
            .border-gray-300 {
              border-color: #d1d5db;
            }
            
            .rounded-lg {
              border-radius: 0.5rem;
            }
            
            .p-3 {
              padding: 0.75rem;
            }
            
            .p-4 {
              padding: 1rem;
            }
            
            .p-6 {
              padding: 1.5rem;
            }
            
            /* Summary cards */
            .grid {
              display: grid;
            }
            
            .grid-cols-3 {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
            
            .gap-6 {
              gap: 1.5rem;
            }
            
            .bg-white {
              background-color: white;
            }
            
            .bg-gray-100 {
              background-color: #f3f4f6;
            }
            
            .text-center {
              text-align: center;
            }
            
            .shadow-sm {
              box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            }
            
            .mb-2 {
              margin-bottom: 0.5rem;
            }
            
            .text-3xl {
              font-size: 1.875rem;
            }
            
            .text-green-700 {
              color: #15803d;
            }
            
            .text-blue-800 {
              color: #1e40af;
            }
            
            /* Footer */
            .border-t {
              border-top: 1px solid;
            }
            
            .pt-4 {
              padding-top: 1rem;
            }
            
            .mt-8 {
              margin-top: 2rem;
            }
            
            .font-medium {
              font-weight: 500;
            }
          }
        </style>
      `;

      // Add content and styles to current page
      document.head.insertAdjacentHTML('beforeend', printStyles);
      document.body.insertAdjacentHTML('beforeend', printContent);

      // Print directly
      window.print();

      // Clean up after print
      setTimeout(() => {
        const printStylesElement = document.getElementById('print-styles');
        const printContentElement = document.getElementById('print-content');
        if (printStylesElement) printStylesElement.remove();
        if (printContentElement) printContentElement.remove();
      }, 1000);

      toast({
        title: "تم بدء الطباعة",
        description: "تم فتح نافذة الطباعة مباشرة",
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "فشل في تصدير التقرير",
        description: "حدث خطأ أثناء تصدير التقرير",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const generateReportHTML = async (options: ExportOptions): Promise<string> => {
    // Get company branding settings
    const companyName = "اسم الشركة"; // This would come from company data
    const logoUrl = ""; // This would come from company branding
    
    // Generate report data based on type
    const reportData = await fetchReportData(options);
    
    return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title} - ${companyName}</title>
    <style>
        ${getReportStyles()}
    </style>
</head>
<body>
    <div class="report-container">
        <!-- Report Header -->
        <header class="report-header">
            <div class="header-content">
                <div class="company-info">
                    ${logoUrl ? `<img src="${logoUrl}" alt="شعار الشركة" class="company-logo">` : ''}
                    <h1 class="company-name">${companyName}</h1>
                </div>
                <div class="report-info">
                    <h2 class="report-title">${options.title}</h2>
                    <div class="report-meta">
                        <span>تاريخ التقرير: ${new Date().toLocaleDateString('en-GB')}</span>
                        <span>الوقت: ${new Date().toLocaleTimeString('en-GB')}</span>
                    </div>
                </div>
            </div>
        </header>

        <!-- Report Filters Summary -->
        ${options.filters && Object.keys(options.filters).length > 0 ? `
        <section class="filters-section">
            <h3>معايير التصفية:</h3>
            <div class="filters-grid">
                ${options.filters.startDate ? `<div class="filter-item">من تاريخ: ${options.filters.startDate}</div>` : ''}
                ${options.filters.endDate ? `<div class="filter-item">إلى تاريخ: ${options.filters.endDate}</div>` : ''}
                ${options.filters.moduleType ? `<div class="filter-item">القسم: ${getModuleTitle(options.filters.moduleType)}</div>` : ''}
            </div>
        </section>
        ` : ''}

        <!-- Report Content -->
        <main class="report-content">
            ${generateReportContent(options, reportData, formatCurrency)}
        </main>

        <!-- Report Footer -->
        <footer class="report-footer">
            <div class="footer-content">
                <div class="print-info">
                    <span>تم إنشاء هذا التقرير بواسطة نظام إدارة الشركات</span>
                    <span>تاريخ الطباعة: ${new Date().toLocaleString('en-US')}</span>
                </div>
                <div class="page-numbers">
                    <span>صفحة <span class="page-current">1</span> من <span class="page-total">1</span></span>
                </div>
            </div>
        </footer>
    </div>

    <!-- Print Controls -->
    <div class="print-controls no-print">
        <button onclick="window.close()" class="btn btn-secondary">
            ✖️ إغلاق
        </button>
    </div>

    <script>
        // Auto-print when page loads
        window.onload = function() {
            // Small delay to ensure content is fully loaded
            setTimeout(function() {
                window.print();
            }, 500);
        }
    </script>
</body>
</html>`;
  };


  const generateReportContent = (options: ExportOptions, data: ReportData) => {
    // Handle damage report specific content
    if (options.moduleType === 'damage_report') {
      return generateDamageReportContent(options, data);
    }

    if (!data || (!data.metrics && !data.summary)) {
      return '';
    }

    let content = '';

    // Generate simplified summary cards (3 cards maximum)
    if (data.metrics) {
      const entries = Object.entries(data.metrics);
      const cards = [];

      for (let i = 0; i < Math.min(3, entries.length); i++) {
        const [key, value] = entries[i];
        const label = getSummaryLabel(key);
        let colorClass = 'text-gray-800';
        
        if (key.includes('paid') || key.includes('active') || key.includes('resolved')) {
          colorClass = 'text-green-700';
        } else if (key.includes('amount') || key.includes('total')) {
          colorClass = 'text-blue-800';
        }

        const formattedValue = typeof value === 'number' && key.includes('Amount') 
          ? formatCurrency(value) 
          : value?.toString() || '0';

        cards.push(`
          <div class="bg-white border border-gray-200 rounded-lg p-6 text-center shadow-sm no-break">
            <h4 class="text-sm text-gray-500 mb-2">${label}</h4>
            <p class="text-3xl font-bold ${colorClass}">${formattedValue}</p>
          </div>
        `);
      }

      if (cards.length > 0) {
        content += `
          <section class="grid grid-cols-3 gap-6 mb-6">
            ${cards.join('')}
          </section>
        `;
      }
    }

    // Generate simplified data tables
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      const tableContent = generateDataTable(data.data, options.moduleType);
      content += tableContent;
    }

    return content;
  };

  const generateDamageReportContent = (options: ExportOptions, data: ReportData) => {
    const { conditionReport, damagePoints, summary } = data;

    if (!conditionReport) {
      return `
        <div class="no-data">
          <h3>لا يوجد تقرير حالة متاح</h3>
          <p>لم يتم العثور على تقرير حالة المركبة المطلوب</p>
        </div>
      `;
    }

    // Summary cards for damage statistics
    const summaryCards = Object.entries(summary)
      .map(([key, value]) => {
        const label = getSummaryLabel(key);
        return `
          <div class="summary-card">
            <h4>${label}</h4>
            <div class="value">${value}</div>
          </div>
        `;
      })
      .join('');

    // Vehicle information
    const vehicleInfo = `
      <div class="vehicle-info-section">
        <h3>معلومات المركبة</h3>
        <div class="vehicle-details">
          <div class="detail-item">
            <strong>رقم اللوحة:</strong> ${conditionReport.vehicles?.plate_number || 'غير محدد'}
          </div>
          <div class="detail-item">
            <strong>الماركة:</strong> ${conditionReport.vehicles?.make || 'غير محدد'}
          </div>
          <div class="detail-item">
            <strong>الموديل:</strong> ${conditionReport.vehicles?.model || 'غير محدد'}
          </div>
          <div class="detail-item">
            <strong>السنة:</strong> ${conditionReport.vehicles?.year || 'غير محدد'}
          </div>
          <div class="detail-item">
            <strong>المفتش:</strong> ${conditionReport.profiles?.full_name || 'غير محدد'}
          </div>
          <div class="detail-item">
            <strong>تاريخ الفحص:</strong> ${new Date(conditionReport.inspection_date).toLocaleDateString('en-US')}
          </div>
          <div class="detail-item">
            <strong>نوع الفحص:</strong> ${conditionReport.inspection_type === 'pre_dispatch' ? 'قبل الإرسال' : 'بعد الإرسال'}
          </div>
          <div class="detail-item">
            <strong>الحالة العامة:</strong> ${getConditionLabel(conditionReport.overall_condition)}
          </div>
        </div>
      </div>
    `;

    // Damage diagram (2D representation)
    const damageVisualization = generateDamageVisualization(damagePoints);

    // Damage details table
    const damageTable = generateDamageTable(damagePoints);

    return `
      <div class="summary-cards">
        ${summaryCards}
      </div>
      
      ${vehicleInfo}
      ${damageVisualization}
      ${damageTable}
      
      ${conditionReport.notes ? `
      <div class="notes-section">
        <h3>ملاحظات إضافية</h3>
        <div class="notes-content">${conditionReport.notes}</div>
      </div>
      ` : ''}
    `;
  };

  const generateDamageVisualization = (damagePoints: DamagePoint[]) => {
    if (!damagePoints || damagePoints.length === 0) {
      return `
        <div class="damage-visualization">
          <h3>مخطط الأضرار</h3>
          <div class="no-damage">
            <p>لا توجد أضرار مسجلة على هذه المركبة</p>
          </div>
        </div>
      `;
    }

    // Create a 2D vehicle representation with damage points
    const damagePointsHtml = damagePoints.map((point, index) => `
      <div class="damage-point severity-${point.severity}" 
           style="left: ${point.x}%; top: ${point.y}%;"
           title="${point.description}">
        ${index + 1}
      </div>
    `).join('');

    return `
      <div class="damage-visualization">
        <h3>مخطط الأضرار</h3>
        <div class="vehicle-diagram">
          <svg viewBox="0 0 400 200" class="vehicle-outline">
            <!-- Simple car outline -->
            <rect x="50" y="60" width="300" height="80" rx="15" fill="none" stroke="#333" stroke-width="2"/>
            <circle cx="100" cy="160" r="15" fill="none" stroke="#333" stroke-width="2"/>
            <circle cx="300" cy="160" r="15" fill="none" stroke="#333" stroke-width="2"/>
            <rect x="80" y="70" width="60" height="30" fill="none" stroke="#333" stroke-width="1"/>
            <rect x="260" y="70" width="60" height="30" fill="none" stroke="#333" stroke-width="1"/>
          </svg>
          <div class="damage-overlay">
            ${damagePointsHtml}
          </div>
        </div>
        <div class="damage-legend">
          <div class="legend-item">
            <span class="legend-color severity-minor"></span>
            <span>ضرر بسيط</span>
          </div>
          <div class="legend-item">
            <span class="legend-color severity-moderate"></span>
            <span>ضرر متوسط</span>
          </div>
          <div class="legend-item">
            <span class="legend-color severity-severe"></span>
            <span>ضرر شديد</span>
          </div>
        </div>
      </div>
    `;
  };

  const generateDamageTable = (damagePoints: DamagePoint[]) => {
    if (!damagePoints || damagePoints.length === 0) {
      return '';
    }

    const rows = damagePoints.map((point, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${getSeverityLabel(point.severity)}</td>
        <td>${point.description || 'غير محدد'}</td>
        <td>X: ${point.x.toFixed(1)}%, Y: ${point.y.toFixed(1)}%</td>
      </tr>
    `).join('');

    return `
      <div class="damage-table-section">
        <h3>تفاصيل الأضرار</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>الرقم</th>
              <th>مستوى الضرر</th>
              <th>الوصف</th>
              <th>الموقع</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  };


  const generateDataTable = (data: Record<string, unknown>[], moduleType: string): string => {
    if (!data || data.length === 0) {
      return `
        <div class="no-data">
          <h3>لا توجد بيانات للعرض</h3>
          <p>لا توجد سجلات متاحة للفترة المحددة</p>
        </div>
      `;
    }

    // Generate table headers based on module type
    const headers = getTableHeaders(moduleType);
    const headerRow = headers.map(header => `<th>${header}</th>`).join('');

    // Generate table rows
    const rows = data.slice(0, 50).map((item, index) => { // Limit to 50 rows for performance
      const cells = getTableCells(item, moduleType);
      return `<tr>${cells}</tr>`;
    }).join('');

    return `
      <div class="data-section">
        <h3>بيانات التقرير</h3>
        <table class="data-table">
          <thead>
            <tr>${headerRow}</tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        ${data.length > 50 ? `<p class="table-note">تم عرض أول 50 سجل من أصل ${data.length} سجل</p>` : ''}
      </div>
    `;
  };

  const getTableHeaders = (moduleType: string): string[] => {
    switch (moduleType) {
      case 'hr':
        return ['الاسم', 'القسم', 'المنصب', 'تاريخ التوظيف'];
      case 'fleet':
        return ['رقم المركبة', 'النوع', 'الحالة', 'السنة'];
      case 'customers':
        return ['اسم العميل', 'الهاتف', 'البريد الإلكتروني', 'المدينة'];
      case 'legal':
        return ['رقم القضية', 'العنوان', 'الحالة', 'تاريخ الإنشاء'];
      case 'finance':
        return ['الرقم', 'التاريخ', 'المبلغ', 'الحالة'];
      default:
        return ['البيانات'];
    }
  };

  const getTableCells = (item: Record<string, unknown>, moduleType: string): string => {
    switch (moduleType) {
      case 'hr':
        return `
          <td>${(item.full_name as string) || 'غير محدد'}</td>
          <td>${(item.department as string) || 'غير محدد'}</td>
          <td>${(item.position as string) || 'غير محدد'}</td>
          <td>${item.created_at ? new Date(item.created_at as string).toLocaleDateString('en-US') : 'غير محدد'}</td>
        `;
      case 'fleet':
        return `
          <td>${(item.plate_number as string) || 'غير محدد'}</td>
          <td>${(item.vehicle_type as string) || 'غير محدد'}</td>
          <td>${item.status || 'غير محدد'}</td>
          <td>${item.year || 'غير محدد'}</td>
        `;
      case 'customers':
        return `
          <td>${item.company_name || 'غير محدد'}</td>
          <td>${item.phone || 'غير محدد'}</td>
          <td>${item.email || 'غير محدد'}</td>
          <td>${item.city || 'غير محدد'}</td>
        `;
      case 'legal':
        return `
          <td>${item.case_number || 'غير محدد'}</td>
          <td>${item.case_title || 'غير محدد'}</td>
          <td>${item.case_status || 'غير محدد'}</td>
          <td>${new Date(item.created_at).toLocaleDateString('en-US')}</td>
        `;
      case 'finance':
        return `
          <td>${item.invoice_number || item.id || 'غير محدد'}</td>
          <td>${new Date(item.created_at).toLocaleDateString('en-US')}</td>
          <td>${formatCurrency(item.total_amount || item.amount || 0)}</td>
          <td>${item.status || 'غير محدد'}</td>
        `;
      default:
        return `<td>${JSON.stringify(item)}</td>`;
    }
  };


  return {
    exportToHTML,
    isExporting
  };
};