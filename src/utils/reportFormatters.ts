/**
 * Report HTML Formatters
 * Extracted from useReportExport.ts for better organization
 * Contains all HTML generation functions for PDF/HTML report generation
 */

import { getSummaryLabel, getSeverityLabel, getConditionLabel } from './reportLabels';

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
  conditionReportId?: string;
  damagePoints?: DamagePoint[];
}

/**
 * Generate main report content based on module type
 */
export const generateReportContent = (
  options: ExportOptions,
  data: ReportData,
  formatCurrency: (value: number) => string
) => {
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
    const tableContent = generateDataTable(data.data, options.moduleType, formatCurrency);
    content += tableContent;
  }

  return content;
};

/**
 * Generate damage report specific content
 */
export const generateDamageReportContent = (options: ExportOptions, data: ReportData) => {
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
  const summaryCards = Object.entries(summary || {})
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
          <strong>رقم اللوحة:</strong> ${(conditionReport.vehicles as any)?.plate_number || 'غير محدد'}
        </div>
        <div class="detail-item">
          <strong>الماركة:</strong> ${(conditionReport.vehicles as any)?.make || 'غير محدد'}
        </div>
        <div class="detail-item">
          <strong>الموديل:</strong> ${(conditionReport.vehicles as any)?.model || 'غير محدد'}
        </div>
        <div class="detail-item">
          <strong>السنة:</strong> ${(conditionReport.vehicles as any)?.year || 'غير محدد'}
        </div>
        <div class="detail-item">
          <strong>المفتش:</strong> ${(conditionReport.profiles as any)?.full_name || 'غير محدد'}
        </div>
        <div class="detail-item">
          <strong>تاريخ الفحص:</strong> ${new Date(conditionReport.inspection_date as string).toLocaleDateString('en-US')}
        </div>
        <div class="detail-item">
          <strong>نوع الفحص:</strong> ${conditionReport.inspection_type === 'pre_dispatch' ? 'قبل الإرسال' : 'بعد الإرسال'}
        </div>
        <div class="detail-item">
          <strong>الحالة العامة:</strong> ${getConditionLabel(conditionReport.overall_condition as string)}
        </div>
      </div>
    </div>
  `;

  // Damage diagram (2D representation)
  const damageVisualization = generateDamageVisualization(damagePoints || []);

  // Damage details table
  const damageTable = generateDamageTable(damagePoints || []);

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

/**
 * Generate damage visualization with 2D vehicle diagram
 */
export const generateDamageVisualization = (damagePoints: DamagePoint[]) => {
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

/**
 * Generate damage details table
 */
export const generateDamageTable = (damagePoints: DamagePoint[]) => {
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

/**
 * Generate data table with module-specific columns
 */
export const generateDataTable = (
  data: Record<string, unknown>[],
  moduleType: string,
  formatCurrency: (value: number) => string
): string => {
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
    const cells = getTableCells(item, moduleType, formatCurrency);
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

/**
 * Get table headers based on module type
 */
export const getTableHeaders = (moduleType: string): string[] => {
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

/**
 * Get table cells based on module type and item data
 */
export const getTableCells = (
  item: Record<string, unknown>,
  moduleType: string,
  formatCurrency: (value: number) => string
): string => {
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
        <td>${new Date(item.created_at as string).toLocaleDateString('en-US')}</td>
      `;
    case 'finance':
      return `
        <td>${item.invoice_number || item.id || 'غير محدد'}</td>
        <td>${new Date(item.created_at as string).toLocaleDateString('en-US')}</td>
        <td>${formatCurrency((item.total_amount as number) || (item.amount as number) || 0)}</td>
        <td>${item.status || 'غير محدد'}</td>
      `;
    default:
      return `<td>${JSON.stringify(item)}</td>`;
  }
};
