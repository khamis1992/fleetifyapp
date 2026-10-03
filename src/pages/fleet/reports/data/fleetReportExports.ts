import { FLEET_REPORT_SCOPE, type FleetReportDataset } from './fleetReportModel';
import type { ExportFormat } from '../types/reports.types';

type Cell = string | number | boolean | null | undefined;
export interface FleetExportSection { name: string; headers: string[]; rows: Cell[][] }
export const fleetStatusLabel = (status: string | null) => ({ available: 'متاحة', rented: 'مؤجرة', maintenance: 'صيانة', out_of_service: 'خارج الخدمة', street_52: 'شارع 52', accident: 'حادث', stolen: 'مسروقة', police_station: 'مركز الشرطة', reserved_employee: 'محجوزة لموظف', municipality: 'البلدية' }[status ?? ''] ?? status ?? 'غير مسجل');
const available = (value: Cell): string | number | boolean => value == null ? 'غير متاح' : value;

/** All export formats consume these same complete sections, without fetching or limiting rows. */
export function fleetExportSections(data: FleetReportDataset): FleetExportSection[] {
  const plate = new Map(data.vehicles.map(v => [v.id, v.plate_number]));
  return [
    { name: 'نطاق التقرير', headers: ['البند', 'القيمة'], rows: [
      ['الشركة', data.companyId], ['بداية الفترة المالية', data.period.start], ['نهاية الفترة المالية', data.period.end], ['وقت القراءة UTC', data.readAt], ['حدود التقرير', FLEET_REPORT_SCOPE],
      ['شمول المركبات', data.vehicles.length], ['شمول أوامر الصيانة', data.maintenance.length], ['شمول أسطر الإيرادات والمصروفات', data.ledgerLines.length],
      ['شمول وثائق المركبات', data.documents.length], ['شمول وثائق التأمين', data.insurance.length], ['المقارنة أو التوقعات', 'غير متاحة؛ لا بيانات تقديرية'],
    ] },
    { name: 'المركبات', headers: ['المعرف', 'اللوحة', 'الماركة', 'الموديل', 'السنة', 'الحالة المسجلة', 'نشطة في النظام', 'رقم الهيكل', 'تكلفة الشراء المسجلة', 'القيمة الدفترية المسجلة', 'الإهلاك المسجل', 'السعر اليومي المسجل وليس إيرادا', 'السعر الشهري المسجل وليس إيرادا', 'إيراد المركبة الفعلي', 'تكلفة المركبة المقيدة', 'ربح المركبة', 'ملاحظات السجل'], rows: data.vehicles.map(v => [v.id, v.plate_number, v.make, v.model, v.year, fleetStatusLabel(v.status), v.is_active == null ? null : v.is_active ? 'نعم' : 'لا', v.vin_number, v.purchase_cost, v.book_value, v.accumulated_depreciation, v.daily_rate, v.monthly_rate, null, null, null, v.notes]) },
    { name: 'أوامر الصيانة', headers: ['المعرف', 'رقم الطلب', 'معرف المركبة', 'اللوحة', 'النوع', 'الحالة المسجلة', 'التاريخ المجدول', 'تاريخ الإكمال', 'تكلفة مقدرة في الطلب', 'تكلفة فعلية في الطلب وليست قيدا', 'معرف القيد', 'الوصف'], rows: data.maintenance.map(m => [m.id, m.maintenance_number, m.vehicle_id, plate.get(m.vehicle_id), m.maintenance_type, m.status, m.scheduled_date, m.completed_date, m.estimated_cost, m.actual_cost, m.journal_entry_id, m.description]) },
    { name: 'حركات الشركة الشهرية', headers: ['الشهر', 'الإيراد المقيد للشركة', 'المصروف المقيد للشركة', 'فرق الإيراد والمصروف', 'عدد أسطر القيود', 'نطاق النسبة'], rows: data.monthly.map(m => [m.month, m.revenue, m.expenses, m.result, m.line_count, 'الشركة كاملة؛ غير منسوب للمركبات']) },
    { name: 'أسطر القيود', headers: ['معرف السطر', 'معرف القيد', 'رقم القيد', 'التاريخ', 'الحالة', 'رمز الحساب', 'اسم الحساب', 'نوع الحساب', 'المدين', 'الدائن'], rows: data.ledgerLines.map(l => [l.id, l.journal_entry_id, l.entry.entry_number, l.entry.entry_date, l.entry.status, l.account.account_code, l.account.account_name, l.account.account_type, l.debit_amount ?? 0, l.credit_amount ?? 0]) },
    { name: 'وثائق المركبات', headers: ['معرف الوثيقة', 'معرف المركبة', 'اللوحة', 'النوع', 'الاسم', 'رقم الوثيقة', 'الانتهاء', 'نشطة في السجل'], rows: data.documents.map(d => [d.id, d.vehicle_id, plate.get(d.vehicle_id), d.document_type, d.document_name, d.document_number, d.expiry_date, d.is_active]) },
    { name: 'التأمين', headers: ['معرف التأمين', 'معرف المركبة', 'اللوحة', 'الشركة المؤمنة', 'الانتهاء', 'نشط في السجل'], rows: data.insurance.map(i => [i.id, i.vehicle_id, plate.get(i.vehicle_id), i.insurance_company, i.end_date, i.is_active]) },
  ];
}

export function fleetCsvCell(value: Cell): string {
  let text = String(available(value));
  if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export const buildFleetReportCsv = (data: FleetReportDataset) => '\uFEFF' + fleetExportSections(data).flatMap(s => [[s.name], s.headers, ...s.rows, []]).map(row => row.map(fleetCsvCell).join(',')).join('\r\n');
const html = (value: Cell) => String(available(value)).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));

export function buildFleetReportHtml(data: FleetReportDataset): string {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير الأسطول المسجل</title><style>
  body{font-family:Arial,sans-serif;color:#172a24;margin:24px}h1{font-size:24px}h2{font-size:18px;break-after:avoid}table{width:100%;border-collapse:collapse;margin:12px 0 24px;font-size:10px;table-layout:fixed}th,td{border:1px solid #c9d4ce;padding:6px;overflow-wrap:anywhere;white-space:pre-wrap}th{background:#edf3ef}thead{display:table-header-group}tr{break-inside:avoid}button{padding:12px} @page{size:A4 landscape;margin:12mm}@media print{button{display:none}body{margin:0}}
  </style></head><body><button onclick="window.print()">طباعة / حفظ PDF</button><h1>حصر الأسطول والأداء المالي المقيد للشركة</h1><p>جميع المبالغ بالريال القطري QAR. الحالات المسجلة لا تثبت الأهلية للتشغيل.</p>${fleetExportSections(data).map(s => `<h2>${html(s.name)} (${s.rows.length} سجل)</h2><table><thead><tr>${s.headers.map(h => `<th>${html(h)}</th>`).join('')}</tr></thead><tbody>${s.rows.map(row => `<tr>${row.map(c => `<td>${html(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('')}</body></html>`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportFleetReport(data: FleetReportDataset, format: ExportFormat): Promise<void> {
  const basename = `fleet-${data.companyId}-${data.period.start}-${data.period.end}`;
  if (format === 'csv') { download(new Blob([buildFleetReportCsv(data)], { type: 'text/csv;charset=utf-8' }), `${basename}.csv`); return; }
  if (format === 'html') { download(new Blob([buildFleetReportHtml(data)], { type: 'text/html;charset=utf-8' }), `${basename}.html`); return; }
  if (format === 'pdf') {
    const popup = window.open('', '_blank');
    if (!popup) throw new Error('تعذر فتح نافذة الطباعة؛ اسمح بالنوافذ المنبثقة ثم أعد المحاولة');
    popup.document.open(); popup.document.write(buildFleetReportHtml(data)); popup.document.close();
    popup.focus(); popup.print(); return;
  }
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fleetify';
  for (const section of fleetExportSections(data)) {
    const sheet = workbook.addWorksheet(section.name, { views: [{ rightToLeft: true }] });
    sheet.addRow(section.headers);
    section.rows.forEach(row => sheet.addRow(row.map(available)));
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach(column => { column.width = 24; });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  download(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${basename}.xlsx`);
}
