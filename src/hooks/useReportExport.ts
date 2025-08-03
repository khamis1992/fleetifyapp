import { useState } from "react";
import { useCurrentCompanyId } from "@/hooks/useUnifiedCompanyAccess";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";

interface ExportOptions {
  reportId: string;
  moduleType: string;
  filters: any;
  title: string;
  format?: 'html' | 'pdf' | 'excel';
  conditionReportId?: string; // For damage reports
  damagePoints?: any[]; // For damage reports
}

export const useReportExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const companyId = useCurrentCompanyId();
  const { toast } = useToast();

  const exportToHTML = async (options: ExportOptions) => {
    setIsExporting(true);
    
    try {
      const htmlContent = await generateReportHTML(options);
      
      // Open in new tab like financial reports
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        
        toast({
          title: "تم فتح التقرير",
          description: "تم فتح التقرير في نافذة جديدة للطباعة",
        });
      } else {
        toast({
          title: "تعذر فتح التقرير",
          description: "يرجى السماح بالنوافذ المنبثقة لفتح التقرير",
          variant: "destructive",
        });
      }
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
                        <span>تاريخ التقرير: ${new Date().toLocaleDateString('ar-SA')}</span>
                        <span>الوقت: ${new Date().toLocaleTimeString('ar-SA')}</span>
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
            ${generateReportContent(options, reportData)}
        </main>

        <!-- Report Footer -->
        <footer class="report-footer">
            <div class="footer-content">
                <div class="print-info">
                    <span>تم إنشاء هذا التقرير بواسطة نظام إدارة الشركات</span>
                    <span>تاريخ الطباعة: ${new Date().toLocaleString('ar-SA')}</span>
                </div>
                <div class="page-numbers">
                    <span>صفحة <span class="page-current">1</span> من <span class="page-total">1</span></span>
                </div>
            </div>
        </footer>
    </div>

    <!-- Print Controls -->
    <div class="print-controls no-print">
        <button onclick="window.print()" class="btn btn-primary">
            🖨️ طباعة التقرير
        </button>
        <button onclick="window.close()" class="btn btn-secondary">
            ✖️ إغلاق
        </button>
    </div>
</body>
</html>`;
  };

  const getReportStyles = () => `
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        background: #f8f9fa;
        direction: rtl;
    }

    .report-container {
        max-width: 1200px;
        margin: 0 auto;
        background: white;
        min-height: 100vh;
        box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }

    .report-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 2rem;
        text-align: center;
    }

    .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
    }

    .company-logo {
        max-height: 60px;
        margin-bottom: 0.5rem;
    }

    .company-name {
        font-size: 1.8rem;
        font-weight: bold;
        margin-bottom: 0.5rem;
    }

    .report-title {
        font-size: 2rem;
        font-weight: bold;
        margin-bottom: 0.5rem;
    }

    .report-meta {
        display: flex;
        gap: 2rem;
        font-size: 0.9rem;
        opacity: 0.9;
    }

    .filters-section {
        background: #f8f9fa;
        padding: 1.5rem;
        border-bottom: 2px solid #e9ecef;
    }

    .filters-section h3 {
        margin-bottom: 1rem;
        color: #495057;
    }

    .filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
    }

    .filter-item {
        background: white;
        padding: 0.75rem;
        border-radius: 6px;
        border: 1px solid #dee2e6;
        font-weight: 500;
    }

    .report-content {
        padding: 2rem;
    }

    .data-table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .data-table th,
    .data-table td {
        padding: 1rem;
        text-align: right;
        border-bottom: 1px solid #e9ecef;
    }

    .data-table th {
        background: #f8f9fa;
        font-weight: bold;
        color: #495057;
        border-bottom: 2px solid #dee2e6;
    }

    .data-table tbody tr:hover {
        background: #f8f9fa;
    }

    .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin: 2rem 0;
    }

    .summary-card {
        background: white;
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        border-right: 4px solid #667eea;
    }

    .summary-card h4 {
        color: #495057;
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .summary-card .value {
        font-size: 2rem;
        font-weight: bold;
        color: #2d3748;
        margin-bottom: 0.25rem;
    }

    .summary-card .change {
        font-size: 0.8rem;
        color: #666;
    }

    .report-footer {
        background: #f8f9fa;
        padding: 1.5rem 2rem;
        border-top: 2px solid #e9ecef;
        margin-top: 2rem;
    }

    .footer-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.9rem;
        color: #666;
    }

    .print-controls {
        position: fixed;
        bottom: 2rem;
        left: 2rem;
        display: flex;
        gap: 1rem;
        z-index: 1000;
    }

    .btn {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 6px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }

    .btn-primary {
        background: #667eea;
        color: white;
    }

    .btn-primary:hover {
        background: #5a6fd8;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102,126,234,0.4);
    }

    .btn-secondary {
        background: #6c757d;
        color: white;
    }

    .btn-secondary:hover {
        background: #5a6268;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(108,117,125,0.4);
    }

    /* Print Styles */
    @media print {
        body {
            background: white;
        }

        .report-container {
            box-shadow: none;
            max-width: none;
        }

        .no-print {
            display: none !important;
        }

        .report-header {
            background: #667eea !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
        }

        .data-table {
            break-inside: avoid;
        }

        .summary-card {
            break-inside: avoid;
            page-break-inside: avoid;
        }

        @page {
            margin: 1cm;
            size: A4;
        }
    }

    /* Damage Report Specific Styles */
    .vehicle-info-section {
        margin: 2rem 0;
        background: #f8f9fa;
        padding: 1.5rem;
        border-radius: 8px;
        border-right: 4px solid #28a745;
    }

    .vehicle-info-section h3 {
        margin-bottom: 1rem;
        color: #495057;
        font-size: 1.2rem;
    }

    .vehicle-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
    }

    .detail-item {
        background: white;
        padding: 0.75rem;
        border-radius: 6px;
        border: 1px solid #dee2e6;
    }

    .detail-item strong {
        color: #495057;
        margin-left: 0.5rem;
    }

    .damage-visualization {
        margin: 2rem 0;
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .damage-visualization h3 {
        margin-bottom: 1.5rem;
        color: #495057;
        text-align: center;
    }

    .vehicle-diagram {
        position: relative;
        max-width: 600px;
        margin: 0 auto;
        background: #f8f9fa;
        border-radius: 8px;
        padding: 2rem;
    }

    .vehicle-outline {
        width: 100%;
        height: auto;
        display: block;
    }

    .damage-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }

    .damage-point {
        position: absolute;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        color: white;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        transform: translate(-50%, -50%);
    }

    .damage-point.severity-minor {
        background: #28a745;
    }

    .damage-point.severity-moderate {
        background: #ffc107;
        color: #212529;
    }

    .damage-point.severity-severe {
        background: #dc3545;
    }

    .damage-legend {
        display: flex;
        justify-content: center;
        gap: 2rem;
        margin-top: 1.5rem;
        flex-wrap: wrap;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
    }

    .legend-color {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }

    .legend-color.severity-minor {
        background: #28a745;
    }

    .legend-color.severity-moderate {
        background: #ffc107;
    }

    .legend-color.severity-severe {
        background: #dc3545;
    }

    .no-damage {
        text-align: center;
        padding: 2rem;
        color: #666;
        background: #f8f9fa;
        border-radius: 8px;
        border: 2px dashed #dee2e6;
    }

    .damage-table-section {
        margin: 2rem 0;
    }

    .damage-table-section h3 {
        margin-bottom: 1rem;
        color: #495057;
    }

    .notes-section {
        margin: 2rem 0;
        background: #fff3cd;
        padding: 1.5rem;
        border-radius: 8px;
        border-right: 4px solid #ffc107;
    }

    .notes-section h3 {
        margin-bottom: 1rem;
        color: #856404;
    }

    .notes-content {
        color: #856404;
        line-height: 1.6;
        background: white;
        padding: 1rem;
        border-radius: 6px;
        border: 1px solid #ffeaa7;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .header-content {
            flex-direction: column;
            text-align: center;
        }

        .report-meta {
            flex-direction: column;
            gap: 0.5rem;
        }

        .filters-grid {
            grid-template-columns: 1fr;
        }

        .footer-content {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
        }

        .print-controls {
            position: relative;
            bottom: auto;
            left: auto;
            justify-content: center;
            margin: 2rem 0;
        }

        .no-data {
            text-align: center;
            padding: 3rem;
            color: #666;
            background: #f8f9fa;
            border-radius: 8px;
            margin: 2rem 0;
        }

        .data-section {
            margin: 2rem 0;
        }

        .data-section h3 {
            margin-bottom: 1rem;
            color: #495057;
            font-size: 1.2rem;
        }

        .table-note {
            text-align: center;
            color: #666;
            font-style: italic;
            margin-top: 1rem;
        }

        .vehicle-details {
            grid-template-columns: 1fr;
        }

        .damage-legend {
            flex-direction: column;
            align-items: center;
            gap: 1rem;
        }

        .vehicle-diagram {
            padding: 1rem;
        }
    }
  `;

  const generateReportContent = (options: ExportOptions, data: any) => {
    // Handle damage report specific content
    if (options.moduleType === 'damage_report') {
      return generateDamageReportContent(options, data);
    }

    if (!data || !data.summary) {
      return `
        <div class="summary-cards">
          <div class="summary-card">
            <h4>إجمالي السجلات</h4>
            <div class="value">0</div>
            <div class="change">لا توجد بيانات متاحة حالياً</div>
          </div>
        </div>
      `;
    }

    // Generate summary cards based on data
    const summaryCards = Object.entries(data.summary)
      .map(([key, value]) => {
        const label = getSummaryLabel(key);
        const formattedValue = typeof value === 'number' && key.includes('Amount') 
          ? formatCurrency(value) 
          : value?.toString() || '0';
        
        return `
          <div class="summary-card">
            <h4>${label}</h4>
            <div class="value">${formattedValue}</div>
          </div>
        `;
      })
      .join('');

    // Generate data table
    const tableContent = generateDataTable(data.data, options.moduleType);

    return `
      <div class="summary-cards">
        ${summaryCards}
      </div>
      
      ${tableContent}
    `;
  };

  const generateDamageReportContent = (options: ExportOptions, data: any) => {
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
            <strong>تاريخ الفحص:</strong> ${new Date(conditionReport.inspection_date).toLocaleDateString('ar-SA')}
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

  const generateDamageVisualization = (damagePoints: any[]) => {
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

  const generateDamageTable = (damagePoints: any[]) => {
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

  const getConditionLabel = (condition: string) => {
    const labels: Record<string, string> = {
      excellent: 'ممتازة',
      good: 'جيدة',
      fair: 'مقبولة',
      poor: 'ضعيفة'
    };
    return labels[condition] || condition;
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      minor: 'بسيط',
      moderate: 'متوسط',
      severe: 'شديد'
    };
    return labels[severity] || severity;
  };

  const getSummaryLabel = (key: string): string => {
    const labels: Record<string, string> = {
      totalEmployees: 'إجمالي الموظفين',
      activeEmployees: 'الموظفون النشطون',
      departments: 'عدد الأقسام',
      totalPayroll: 'إجمالي الرواتب',
      employeesPaid: 'الموظفون المدفوعة رواتبهم',
      totalVehicles: 'إجمالي المركبات',
      availableVehicles: 'المركبات المتاحة',
      rentedVehicles: 'المركبات المؤجرة',
      maintenanceVehicles: 'مركبات تحت الصيانة',
      totalCustomers: 'إجمالي العملاء',
      activeCustomers: 'العملاء النشطون',
      newCustomers: 'العملاء الجدد',
      totalCases: 'إجمالي القضايا',
      activeCases: 'القضايا النشطة',
      closedCases: 'القضايا المغلقة',
      totalInvoices: 'إجمالي الفواتير',
      totalAmount: 'إجمالي المبلغ',
      paidInvoices: 'الفواتير المدفوعة',
      totalPayments: 'إجمالي المدفوعات',
      totalDamagePoints: 'إجمالي نقاط الضرر',
      severeDamages: 'أضرار شديدة',
      moderateDamages: 'أضرار متوسطة',
      minorDamages: 'أضرار بسيطة'
    };
    return labels[key] || key;
  };

  const generateDataTable = (data: any[], moduleType: string): string => {
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

  const getTableCells = (item: any, moduleType: string): string => {
    switch (moduleType) {
      case 'hr':
        return `
          <td>${item.full_name || 'غير محدد'}</td>
          <td>${item.department || 'غير محدد'}</td>
          <td>${item.position || 'غير محدد'}</td>
          <td>${new Date(item.created_at).toLocaleDateString('ar-SA')}</td>
        `;
      case 'fleet':
        return `
          <td>${item.plate_number || 'غير محدد'}</td>
          <td>${item.vehicle_type || 'غير محدد'}</td>
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
          <td>${new Date(item.created_at).toLocaleDateString('ar-SA')}</td>
        `;
      case 'finance':
        return `
          <td>${item.invoice_number || item.id || 'غير محدد'}</td>
          <td>${new Date(item.created_at).toLocaleDateString('ar-SA')}</td>
          <td>${formatCurrency(item.total_amount || item.amount || 0)}</td>
          <td>${item.status || 'غير محدد'}</td>
        `;
      default:
        return `<td>${JSON.stringify(item)}</td>`;
    }
  };

  const fetchReportData = async (options: ExportOptions) => {
    
    try {
      // Fetch data based on module type
      switch (options.moduleType) {
        case 'hr':
          return await fetchHRData(options, companyId);
        case 'fleet':
          return await fetchFleetData(options, companyId);
        case 'customers':
          return await fetchCustomersData(options, companyId);
        case 'legal':
          return await fetchLegalData(options, companyId);
        case 'finance':
          return await fetchFinanceData(options, companyId);
        case 'damage_report':
          return await fetchDamageReportData(options, companyId);
        default:
          return { data: [], summary: {} };
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      return { data: [], summary: {} };
    }
  };

  const fetchHRData = async (options: ExportOptions, companyId: string) => {
    let query = supabase.from('employees').select('*').eq('company_id', companyId);
    
    if (options.filters?.startDate) {
      query = query.gte('created_at', options.filters.startDate);
    }
    if (options.filters?.endDate) {
      query = query.lte('created_at', options.filters.endDate);
    }

    const { data: employees } = await query;
    
    return {
      data: employees || [],
      summary: {
        totalEmployees: employees?.length || 0,
        activeEmployees: employees?.filter(emp => emp.account_status === 'active').length || 0,
        departments: [...new Set(employees?.map(emp => emp.department))].length || 0
      }
    };
  };

  const fetchFleetData = async (options: ExportOptions, companyId: string) => {
    let query = supabase.from('vehicles').select('*').eq('company_id', companyId);
    
    if (options.filters?.startDate) {
      query = query.gte('created_at', options.filters.startDate);
    }
    if (options.filters?.endDate) {
      query = query.lte('created_at', options.filters.endDate);
    }

    const { data: vehicles } = await query;
    
    return {
      data: vehicles || [],
      summary: {
        totalVehicles: vehicles?.length || 0,
        availableVehicles: vehicles?.filter(v => v.status === 'available').length || 0,
        rentedVehicles: vehicles?.filter(v => v.status === 'rented').length || 0
      }
    };
  };

  const fetchCustomersData = async (options: ExportOptions, companyId: string) => {
    let query = supabase.from('customers').select('*').eq('company_id', companyId);
    
    if (options.filters?.startDate) {
      query = query.gte('created_at', options.filters.startDate);
    }
    if (options.filters?.endDate) {
      query = query.lte('created_at', options.filters.endDate);
    }

    const { data: customers } = await query;
    
    return {
      data: customers || [],
      summary: {
        totalCustomers: customers?.length || 0,
        activeCustomers: customers?.filter(c => c.is_active === true).length || 0
      }
    };
  };

  const fetchLegalData = async (options: ExportOptions, companyId: string) => {
    let query = supabase.from('legal_cases').select('*').eq('company_id', companyId);
    
    if (options.filters?.startDate) {
      query = query.gte('created_at', options.filters.startDate);
    }
    if (options.filters?.endDate) {
      query = query.lte('created_at', options.filters.endDate);
    }

    const { data: cases } = await query;
    
    return {
      data: cases || [],
      summary: {
        totalCases: cases?.length || 0,
        activeCases: cases?.filter(c => c.case_status === 'active').length || 0,
        closedCases: cases?.filter(c => c.case_status === 'closed').length || 0
      }
    };
  };

  const fetchFinanceData = async (options: ExportOptions, companyId: string) => {
    let query = supabase.from('invoices').select('*').eq('company_id', companyId);
    
    if (options.filters?.startDate) {
      query = query.gte('created_at', options.filters.startDate);
    }
    if (options.filters?.endDate) {
      query = query.lte('created_at', options.filters.endDate);
    }

    const { data: invoices } = await query;
    
    return {
      data: invoices || [],
      summary: {
        totalInvoices: invoices?.length || 0,
        totalAmount: invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
        paidInvoices: invoices?.filter(inv => inv.status === 'paid').length || 0
      }
    };
  };

  const fetchDamageReportData = async (options: ExportOptions, companyId: string) => {
    if (options.conditionReportId) {
      // Fetch specific condition report
      const { data: conditionReport } = await supabase
        .from('vehicle_condition_reports')
        .select(`
          *,
          vehicles (plate_number, make, model, year),
          profiles:inspector_id (full_name)
        `)
        .eq('id', options.conditionReportId)
        .eq('company_id', companyId)
        .single();

      if (conditionReport) {
        return {
          conditionReport,
          damagePoints: options.damagePoints || [],
          summary: {
            totalDamagePoints: options.damagePoints?.length || 0,
            severeDamages: options.damagePoints?.filter(p => p.severity === 'severe').length || 0,
            moderateDamages: options.damagePoints?.filter(p => p.severity === 'moderate').length || 0,
            minorDamages: options.damagePoints?.filter(p => p.severity === 'minor').length || 0
          }
        };
      }
    }
    return { conditionReport: null, damagePoints: [], summary: {} };
  };

  const getModuleTitle = (moduleType: string) => {
    const titles: Record<string, string> = {
      finance: 'المالية',
      hr: 'الموارد البشرية',
      fleet: 'الأسطول',
      customers: 'العملاء',
      legal: 'القانونية',
      damage_report: 'تقرير الأضرار'
    };
    return titles[moduleType] || moduleType;
  };

  return {
    exportToHTML,
    isExporting
  };
};