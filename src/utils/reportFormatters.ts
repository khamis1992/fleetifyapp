import type { ReportDataResult } from '@/services/reportDataService';
import { getConditionLabel, getSeverityLabel, getSummaryLabel } from './reportLabels';

interface DamagePoint {
  x: number;
  y: number;
  severity: 'minor' | 'moderate' | 'severe';
  description?: string;
}

interface ReportData extends ReportDataResult {
  metrics?: Record<string, number | string>;
}

interface ReportFormatOptions {
  moduleType: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nestedRecord(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value;
  if (Array.isArray(value) && isRecord(value[0])) return value[0];
  return {};
}

function displayValue(value: unknown, fallback = 'غير محدد'): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

function formatDate(value: unknown): string {
  if (typeof value !== 'string' || !value) return 'غير محدد';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'غير محدد' : date.toLocaleDateString('ar-QA');
}

function normalizeDamagePoints(value: unknown): DamagePoint[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(point => {
    if (!isRecord(point)) return [];
    const x = typeof point.x === 'number' ? point.x : Number(point.x);
    const y = typeof point.y === 'number' ? point.y : Number(point.y);
    const severity = point.severity;
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      (severity !== 'minor' && severity !== 'moderate' && severity !== 'severe')
    ) {
      return [];
    }
    return [{
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
      severity,
      description: typeof point.description === 'string' ? point.description : undefined,
    }];
  });
}

export const generateReportContent = (
  options: ReportFormatOptions,
  data: ReportData,
  formatCurrency: (value: number) => string
): string => {
  if (options.moduleType === 'damage_report') {
    return generateDamageReportContent(data);
  }

  const metrics = data.metrics || data.summary;
  let content = '';

  if (metrics && Object.keys(metrics).length > 0) {
    const cards = Object.entries(metrics)
      .slice(0, 3)
      .map(([key, value]) => {
        const formattedValue = typeof value === 'number' && key.toLowerCase().includes('amount')
          ? formatCurrency(value)
          : displayValue(value, '0');
        return `
          <div class="summary-card no-break">
            <h4>${getSummaryLabel(key)}</h4>
            <div class="value">${formattedValue}</div>
          </div>
        `;
      })
      .join('');
    content += `<section class="summary-cards">${cards}</section>`;
  }

  if (data.data?.length) {
    content += generateDataTable(data.data, options.moduleType, formatCurrency);
  }

  return content;
};

export const generateDamageReportContent = (data: ReportData): string => {
  const conditionReport = data.conditionReport;
  if (!conditionReport) {
    return '<div class="no-data"><h3>لا يوجد تقرير حالة متاح</h3><p>لم يتم العثور على تقرير حالة المركبة المطلوب.</p></div>';
  }

  const summaryCards = Object.entries(data.summary || {})
    .map(([key, value]) => `
      <div class="summary-card">
        <h4>${getSummaryLabel(key)}</h4>
        <div class="value">${displayValue(value, '0')}</div>
      </div>
    `)
    .join('');
  const vehicle = nestedRecord(conditionReport.vehicles);
  const inspector = nestedRecord(conditionReport.profiles);
  const inspectorName = [inspector.first_name, inspector.last_name]
    .map(value => displayValue(value, ''))
    .filter(Boolean)
    .join(' ') || displayValue(inspector.full_name);
  const damagePoints = normalizeDamagePoints(data.damagePoints);

  return `
    ${summaryCards ? `<section class="summary-cards">${summaryCards}</section>` : ''}
    <section class="vehicle-info-section no-break">
      <h3>معلومات المركبة</h3>
      <div class="vehicle-details">
        <div><strong>رقم اللوحة:</strong> ${displayValue(vehicle.plate_number)}</div>
        <div><strong>الماركة:</strong> ${displayValue(vehicle.make)}</div>
        <div><strong>الموديل:</strong> ${displayValue(vehicle.model)}</div>
        <div><strong>السنة:</strong> ${displayValue(vehicle.year)}</div>
        <div><strong>المفتش:</strong> ${inspectorName}</div>
        <div><strong>تاريخ الفحص:</strong> ${formatDate(conditionReport.inspection_date)}</div>
        <div><strong>نوع الفحص:</strong> ${conditionReport.inspection_type === 'pre_dispatch' ? 'قبل التسليم' : 'بعد الاستلام'}</div>
        <div><strong>الحالة العامة:</strong> ${getConditionLabel(displayValue(conditionReport.overall_condition, ''))}</div>
      </div>
    </section>
    ${generateDamageVisualization(damagePoints)}
    ${generateDamageTable(damagePoints)}
    ${conditionReport.notes ? `
      <section class="notes-section no-break">
        <h3>ملاحظات إضافية</h3>
        <div>${displayValue(conditionReport.notes, '')}</div>
      </section>
    ` : ''}
  `;
};

export const generateDamageVisualization = (damagePoints: DamagePoint[]): string => {
  if (damagePoints.length === 0) {
    return '<section class="damage-visualization"><h3>مخطط الأضرار</h3><div class="no-damage">لا توجد أضرار مسجلة على هذه المركبة.</div></section>';
  }

  const points = damagePoints.map((point, index) => `
    <div class="damage-point severity-${point.severity}" style="left:${point.x}%;top:${point.y}%" title="${point.description || ''}">${index + 1}</div>
  `).join('');

  return `
    <section class="damage-visualization no-break">
      <h3>مخطط الأضرار</h3>
      <div class="vehicle-diagram">
        <svg viewBox="0 0 400 200" class="vehicle-outline" aria-label="مخطط المركبة">
          <rect x="50" y="60" width="300" height="80" rx="15" fill="none" stroke="#374151" stroke-width="2" />
          <circle cx="100" cy="160" r="15" fill="none" stroke="#374151" stroke-width="2" />
          <circle cx="300" cy="160" r="15" fill="none" stroke="#374151" stroke-width="2" />
        </svg>
        <div class="damage-overlay">${points}</div>
      </div>
      <div class="damage-legend">
        <span><i class="legend-color severity-minor"></i> بسيط</span>
        <span><i class="legend-color severity-moderate"></i> متوسط</span>
        <span><i class="legend-color severity-severe"></i> شديد</span>
      </div>
    </section>
  `;
};

export const generateDamageTable = (damagePoints: DamagePoint[]): string => {
  if (damagePoints.length === 0) return '';
  const rows = damagePoints.map((point, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${getSeverityLabel(point.severity)}</td>
      <td>${point.description || 'غير محدد'}</td>
      <td>X: ${point.x.toFixed(1)}%، Y: ${point.y.toFixed(1)}%</td>
    </tr>
  `).join('');

  return `
    <section class="damage-table-section">
      <h3>تفاصيل الأضرار</h3>
      <table class="data-table">
        <thead><tr><th>الرقم</th><th>مستوى الضرر</th><th>الوصف</th><th>الموقع</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
  `;
};

export const generateDataTable = (
  data: Record<string, unknown>[],
  moduleType: string,
  formatCurrency: (value: number) => string
): string => {
  if (data.length === 0) return '<div class="no-data">لا توجد بيانات للعرض.</div>';
  const headers = getTableHeaders(moduleType).map(header => `<th>${header}</th>`).join('');
  const rows = data.slice(0, 50)
    .map(item => `<tr>${getTableCells(item, moduleType, formatCurrency)}</tr>`)
    .join('');

  return `
    <section class="data-section">
      <h3>بيانات التقرير</h3>
      <table class="data-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
      ${data.length > 50 ? `<p>تم عرض أول 50 سجلًا من أصل ${data.length} سجل.</p>` : ''}
    </section>
  `;
};

export const getTableHeaders = (moduleType: string): string[] => {
  switch (moduleType) {
    case 'hr': return ['الاسم', 'القسم', 'المنصب', 'تاريخ التوظيف'];
    case 'fleet': return ['رقم اللوحة', 'المركبة', 'الحالة', 'السنة'];
    case 'customers': return ['اسم العميل', 'الهاتف', 'البريد الإلكتروني', 'المدينة'];
    case 'legal': return ['رقم القضية', 'العنوان', 'الحالة', 'تاريخ الإنشاء'];
    case 'finance': return ['الرقم', 'التاريخ', 'المبلغ', 'الحالة'];
    default: return ['البيانات'];
  }
};

export const getTableCells = (
  item: Record<string, unknown>,
  moduleType: string,
  formatCurrency: (value: number) => string
): string => {
  switch (moduleType) {
    case 'hr': {
      const name = displayValue(item.full_name, [displayValue(item.first_name, ''), displayValue(item.last_name, '')].filter(Boolean).join(' '));
      return `<td>${name}</td><td>${displayValue(item.department)}</td><td>${displayValue(item.position)}</td><td>${formatDate(item.created_at)}</td>`;
    }
    case 'fleet':
      return `<td>${displayValue(item.plate_number)}</td><td>${[displayValue(item.make, ''), displayValue(item.model, '')].filter(Boolean).join(' ') || displayValue(item.vehicle_type)}</td><td>${displayValue(item.status)}</td><td>${displayValue(item.year)}</td>`;
    case 'customers': {
      const individualName = [displayValue(item.first_name, ''), displayValue(item.last_name, '')].filter(Boolean).join(' ');
      const name = displayValue(item.company_name, individualName || 'غير محدد');
      return `<td>${name}</td><td>${displayValue(item.phone)}</td><td>${displayValue(item.email)}</td><td>${displayValue(item.city)}</td>`;
    }
    case 'legal':
      return `<td>${displayValue(item.case_number)}</td><td>${displayValue(item.case_title)}</td><td>${displayValue(item.case_status)}</td><td>${formatDate(item.created_at)}</td>`;
    case 'finance': {
      const amount = typeof item.total_amount === 'number'
        ? item.total_amount
        : typeof item.amount === 'number' ? item.amount : 0;
      return `<td>${displayValue(item.invoice_number, displayValue(item.id))}</td><td>${formatDate(item.invoice_date || item.created_at)}</td><td>${formatCurrency(amount)}</td><td>${displayValue(item.status)}</td>`;
    }
    default:
      return `<td>${JSON.stringify(item)}</td>`;
  }
};
