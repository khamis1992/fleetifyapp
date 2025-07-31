import { useState } from "react";
import { useCurrentCompanyId } from "@/hooks/useUnifiedCompanyAccess";
import { useToast } from "@/hooks/use-toast";

interface ExportOptions {
  reportId: string;
  moduleType: string;
  filters: any;
  title: string;
  format?: 'html' | 'pdf' | 'excel';
}

export const useReportExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const companyId = useCurrentCompanyId();
  const { toast } = useToast();

  const exportToHTML = async (options: ExportOptions) => {
    setIsExporting(true);
    
    try {
      const htmlContent = await generateReportHTML(options);
      
      // Create and download the HTML file
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${options.title}-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "تم تصدير التقرير بنجاح",
        description: "تم تنزيل ملف HTML للتقرير",
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
    }
  `;

  const generateReportContent = (options: ExportOptions, data: any) => {
    // This would generate specific content based on report type
    return `
      <div class="summary-cards">
        <div class="summary-card">
          <h4>إجمالي السجلات</h4>
          <div class="value">0</div>
          <div class="change">لا توجد بيانات متاحة حالياً</div>
        </div>
      </div>
      
      <div class="report-placeholder">
        <h3>محتوى التقرير</h3>
        <p>سيتم عرض بيانات التقرير هنا بناءً على النوع المحدد: ${options.reportId}</p>
        <p>القسم: ${getModuleTitle(options.moduleType)}</p>
      </div>
    `;
  };

  const fetchReportData = async (options: ExportOptions) => {
    // This would fetch actual report data from the database
    // For now, returning placeholder data
    return {
      data: [],
      summary: {}
    };
  };

  const getModuleTitle = (moduleType: string) => {
    const titles: Record<string, string> = {
      finance: 'المالية',
      hr: 'الموارد البشرية',
      fleet: 'الأسطول',
      customers: 'العملاء',
      legal: 'القانونية'
    };
    return titles[moduleType] || moduleType;
  };

  return {
    exportToHTML,
    isExporting
  };
};