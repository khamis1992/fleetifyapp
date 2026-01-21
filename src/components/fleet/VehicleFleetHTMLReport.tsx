/**
 * Vehicle Fleet HTML Report Generator
 * Professional, print-ready HTML report for vehicle fleet management
 * Optimized for both screen viewing and printing/PDF export
 *
 * @component VehicleFleetHTMLReport
 */

import { Vehicle } from '@/hooks/useVehicles';

// Company Information
const COMPANY_INFO = {
  name_ar: 'شركة العراف لتأجير السيارات',
  name_en: 'AL-ARAF CAR RENTAL L.L.C',
  logo: '/receipts/logo.png',
  address: 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
  address_en: 'Um Salal Mohammad – Commercial Street – Building (79) – 1st Floor – Office (2)',
  phone: '+974 3141 1919',
  email: 'info@alaraf.qa',
  website: 'www.alaraf.qa',
  cr_number: '146832',
};

// Arabic status labels
const statusLabels: Record<string, string> = {
  available: 'متاحة',
  rented: 'مؤجرة',
  maintenance: 'صيانة',
  out_of_service: 'خارج الخدمة',
  reserved: 'محجوزة',
  reserved_employee: 'محجوزة لموظف',
  accident: 'حادث',
  stolen: 'مسروقة',
  police_station: 'في مركز الشرطة',
};

// Status colors for badges
const statusColors: Record<string, { bg: string; text: string }> = {
  available: { bg: '#dcfce7', text: '#166534' },
  rented: { bg: '#dbeafe', text: '#1e40af' },
  maintenance: { bg: '#fef3c7', text: '#92400e' },
  out_of_service: { bg: '#fee2e2', text: '#991b1b' },
  reserved: { bg: '#f3e8ff', text: '#6b21a8' },
  reserved_employee: { bg: '#e0e7ff', text: '#3730a3' },
  accident: { bg: '#ffe4e6', text: '#9f1239' },
  stolen: { bg: '#f3f4f6', text: '#374151' },
  police_station: { bg: '#fed7aa', text: '#9a3412' },
};

// Helper function to check missing fields
const getMissingVehicleFields = (vehicle: Vehicle): string[] => {
  const missing: string[] = [];

  if (!vehicle.plate_number) missing.push('رقم اللوحة');
  if (!vehicle.make) missing.push('الماركة');
  if (!vehicle.model) missing.push('الموديل');
  if (!vehicle.year) missing.push('السنة');
  if (!vehicle.color) missing.push('اللون');
  if (!vehicle.vin && !vehicle.vin_number) missing.push('رقم الهيكل (VIN)');

  return missing;
};

// Helper function to format dates
const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '-';
  }
};

// Check if registration is expiring soon
const isExpiringSoon = (dateStr: string | undefined, days: number = 30): boolean => {
  if (!dateStr) return false;
  try {
    const expiryDate = new Date(dateStr);
    const today = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= days && daysUntilExpiry > 0;
  } catch {
    return false;
  }
};

// Check if expired
const isExpired = (dateStr: string | undefined): boolean => {
  if (!dateStr) return false;
  try {
    const expiryDate = new Date(dateStr);
    const today = new Date();
    return expiryDate < today;
  } catch {
    return false;
  }
};

interface VehicleWithDocuments extends Vehicle {
  missingFields?: string[];
  missingDocuments?: string[];
  hasRegistrationDocuments?: boolean;
  registrationDocumentCount?: number;
}

interface ReportMetadata {
  generatedAt: Date;
  generatedBy: string;
  filters?: string;
  totalCount: number;
  completeCount: number;
  incompleteCount: number;
  expiringDocumentsCount: number;
}

/**
 * Generate professional HTML report for vehicle fleet
 */
export const generateVehicleFleetHTMLReport = (
  vehicles: VehicleWithDocuments[],
  metadata: ReportMetadata
): string => {
  const { generatedAt, totalCount, completeCount, incompleteCount, expiringDocumentsCount } = metadata;

  // Generate HTML document
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تقرير أسطول المركبات - ${COMPANY_INFO.name_ar}</title>
  <style>
    /* Base styles */
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #1a1a2e;
      background: #f8fafc;
      direction: rtl;
    }

    /* Page layout */
    .page {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
    }

    @media print {
      body {
        background: white;
      }
      .page {
        box-shadow: none;
        max-width: none;
        margin: 0;
      }
      .no-print {
        display: none !important;
      }
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      color: white;
      padding: 25px 30px;
      position: relative;
      overflow: hidden;
    }

    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: pulse 15s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(-5%, -5%); }
    }

    @media print {
      .header {
        background: #1e3a5f !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      .header::before {
        display: none;
      }
    }

    .header-content {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }

    .company-info {
      flex: 1;
    }

    .company-name-ar {
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 5px;
      letter-spacing: -0.5px;
    }

    .company-name-en {
      font-size: 13px;
      font-weight: 500;
      opacity: 0.9;
      margin-bottom: 10px;
    }

    .company-details {
      font-size: 11px;
      opacity: 0.85;
      line-height: 1.5;
    }

    .report-info {
      text-align: left;
      flex: 0 0 auto;
    }

    .report-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .report-meta {
      font-size: 11px;
      opacity: 0.9;
    }

    /* Summary Stats */
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      padding: 25px 30px;
      background: #f8fafc;
      border-bottom: 2px solid #e2e8f0;
    }

    .stat-card {
      background: white;
      padding: 15px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      text-align: center;
      transition: transform 0.2s;
      border: 1px solid #e2e8f0;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    @media print {
      .stat-card {
        break-inside: avoid;
      }
      .stat-card:hover {
        transform: none;
      }
    }

    .stat-value {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 5px;
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    @media print {
      .stat-value {
        -webkit-text-fill-color: #1e3a5f !important;
        color: #1e3a5f !important;
      }
    }

    .stat-label {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Table Section */
    .table-section {
      padding: 25px 30px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #1e3a5f;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .table-container {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }

    thead {
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      color: white;
    }

    @media print {
      thead {
        background: #1e3a5f !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }

    th {
      padding: 12px 10px;
      text-align: center;
      font-weight: 600;
      font-size: 11px;
      white-space: nowrap;
      letter-spacing: 0.3px;
    }

    td {
      padding: 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }

    tbody tr:nth-child(even) {
      background: #f8fafc;
    }

    tbody tr:hover {
      background: #f1f5f9;
    }

    @media print {
      tbody tr:hover {
        background: #f8fafc !important;
      }
    }

    /* Status Badges */
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;
    }

    /* Data Quality Indicators */
    .quality-indicator {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
    }

    .quality-complete {
      background: #dcfce7;
      color: #166534;
    }

    .quality-incomplete {
      background: #fee2e2;
      color: #991b1b;
    }

    .quality-warning {
      background: #fef3c7;
      color: #92400e;
    }

    /* Document Status Indicators */
    .doc-status-present {
      background: #dcfce7;
      color: #166534;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 2px solid #86efac;
    }

    .doc-status-missing {
      background: #fee2e2;
      color: #991b1b;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 2px solid #fca5a5;
      animation: pulse-red 2s ease-in-out infinite;
    }

    @keyframes pulse-red {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    @media print {
      .doc-status-missing {
        animation: none;
      }
    }

    /* Expiry Indicators */
    .expiry-expired {
      background: #fee2e2;
      color: #991b1b;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 6px;
    }

    .expiry-warning {
      background: #fef3c7;
      color: #92400e;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
    }

    .expiry-ok {
      color: #166534;
    }

    /* Legend */
    .legend {
      padding: 20px 30px;
      background: #fef3c7;
      border-top: 2px solid #f59e0b;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 20px;
    }

    @media print {
      .legend {
        break-inside: avoid;
      }
    }

    .legend-title {
      font-size: 14px;
      font-weight: 700;
      color: #92400e;
      margin-bottom: 8px;
    }

    .legend-items {
      display: flex;
      gap: 25px;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
    }

    .legend-color {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      border: 1px solid rgba(0, 0, 0, 0.1);
    }

    /* Footer */
    .footer {
      padding: 20px 30px;
      background: #f8fafc;
      border-top: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 15px;
      font-size: 10px;
      color: #64748b;
    }

    @media print {
      .footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #f8fafc !important;
      }
    }

    .footer-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .footer-page {
      font-weight: 600;
      color: #1e3a5f;
    }

    /* Print Button */
    .print-button {
      position: fixed;
      top: 20px;
      left: 20px;
      padding: 12px 24px;
      background: #1e3a5f;
      color: white;
      border: none;
      border-radius: 8px;
      font-family: 'Cairo', sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(30, 58, 95, 0.3);
      transition: all 0.3s;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .print-button:hover {
      background: #2d5a87;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(30, 58, 95, 0.4);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .summary {
        grid-template-columns: repeat(2, 1fr);
      }

      .header-content {
        flex-direction: column;
        text-align: center;
      }

      .report-info {
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M6 9V2h12v7"></path>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
      <path d="M6 14h12v8H6z"></path>
    </svg>
    طباعة التقرير
  </button>

  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <div class="company-info">
          <div class="company-name-ar">${COMPANY_INFO.name_ar}</div>
          <div class="company-name-en">${COMPANY_INFO.name_en}</div>
          <div class="company-details">
            📍 ${COMPANY_INFO.address}<br/>
            📞 ${COMPANY_INFO.phone} | 📧 ${COMPANY_INFO.email}<br/>
            🌐 ${COMPANY_INFO.website} | السجل التجاري: ${COMPANY_INFO.cr_number}
          </div>
        </div>
        <div class="report-info">
          <div class="report-title">تقرير أسطول المركبات</div>
          <div class="report-meta">
            تاريخ التقرير: ${formatDate(generatedAt.toISOString())}<br/>
            ${metadata.generatedBy ? `تم الإنشاء بواسطة: ${metadata.generatedBy}<br/>` : ''}
            ${metadata.filters ? `الفلاتر المطبقة: ${metadata.filters}` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="summary">
      <div class="stat-card">
        <div class="stat-value">${totalCount}</div>
        <div class="stat-label">إجمالي المركبات</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="background: linear-gradient(135deg, #166534 0%, #22c55e 100%); -webkit-background-clip: text; background-clip: text;">${completeCount}</div>
        <div class="stat-label">بيانات مكتملة</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="background: linear-gradient(135deg, #991b1b 0%, #ef4444 100%); -webkit-background-clip: text; background-clip: text;">${incompleteCount}</div>
        <div class="stat-label">بيانات ناقصة</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="background: linear-gradient(135deg, #92400e 0%, #f59e0b 100%); -webkit-background-clip: text; background-clip: text;">${expiringDocumentsCount}</div>
        <div class="stat-label">تنتهي قريباً</div>
      </div>
    </div>

    <!-- Vehicle Table -->
    <div class="table-section">
      <div class="section-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
        تفاصيل المركبات
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>رقم اللوحة</th>
              <th>الحالة</th>
              <th>الوثائق (استمارة)</th>
              <th>انتهاء الاستمارة</th>
              <th>انتهاء التأمين</th>
              <th>جودة البيانات</th>
            </tr>
          </thead>
          <tbody>
            ${vehicles.map((vehicle) => {
              const missingFields = vehicle.missingFields || getMissingVehicleFields(vehicle);
              const hasMissingData = missingFields.length > 0;
              const registrationExpired = isExpired(vehicle.registration_expiry);
              const registrationExpiring = isExpiringSoon(vehicle.registration_expiry);
              const insuranceExpired = isExpired(vehicle.insurance_expiry);
              const insuranceExpiring = isExpiringSoon(vehicle.insurance_expiry);

              // Check if vehicle has registration documents
              const hasRegDocuments = vehicle.hasRegistrationDocuments !== undefined
                ? vehicle.hasRegistrationDocuments
                : (vehicle.registrationDocumentCount !== undefined && vehicle.registrationDocumentCount > 0);
              const docCount = vehicle.registrationDocumentCount || 0;

              const statusConfig = statusColors[vehicle.status] || statusColors.available;

              return `
                <tr style="${hasMissingData ? 'background: #fee2e2;' : ''}">
                  <td style="font-family: monospace; font-weight: 600;">${vehicle.plate_number || '-'}</td>
                  <td>
                    <span class="badge" style="background: ${statusConfig.bg}; color: ${statusConfig.text};">
                      ${statusLabels[vehicle.status] || vehicle.status || 'متاحة'}
                    </span>
                  </td>
                  <td style="text-align: center;">
                    ${hasRegDocuments
                      ? `<span class="doc-status-present">✅ تم الرفع (${docCount})</span>`
                      : `<span class="doc-status-missing">⚠️ لا توجد استمارة</span>`
                    }
                  </td>
                  <td style="text-align: center;">
                    ${registrationExpired
                      ? `<span class="expiry-expired">منتهية</span>`
                      : registrationExpiring
                      ? `<span class="expiry-warning">تنتهي قريباً</span><br/><small>${formatDate(vehicle.registration_expiry)}</small>`
                      : `<span class="expiry-ok">${formatDate(vehicle.registration_expiry)}</span>`
                    }
                  </td>
                  <td style="text-align: center;">
                    ${insuranceExpired
                      ? `<span class="expiry-expired">منتهية</span>`
                      : insuranceExpiring
                      ? `<span class="expiry-warning">تنتهي قريباً</span><br/><small>${formatDate(vehicle.insurance_expiry)}</small>`
                      : `<span class="expiry-ok">${formatDate(vehicle.insurance_expiry)}</span>`
                    }
                  </td>
                  <td>
                    ${(() => {
                      const hasMissingDocs = !hasRegDocuments;
                      const missingDocsField = hasMissingDocs ? ['لا توجد استمارة'] : [];
                      const allMissingFields = [...missingFields, ...missingDocsField];
                      const isDataComplete = !hasMissingData && !hasMissingDocs;

                      if (isDataComplete) {
                        return `<span class="quality-indicator quality-complete">✅ مكتملة</span>`;
                      } else {
                        return `<span class="quality-indicator quality-incomplete">⚠️ ناقصة (${allMissingFields.length})</span><br/><small style="color: #991b1b;">${allMissingFields.join('، ')}</small>`;
                      }
                    })()}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Legend -->
    <div class="legend">
      <div>
        <div class="legend-title">دليل الألوان:</div>
        <div class="legend-items">
          <div class="legend-item">
            <div class="legend-color" style="background: #fee2e2; border: 2px solid #fca5a5;"></div>
            <span>أحمر = بيانات ناقصة/منتهية/لا توجد وثائق</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #fef3c7;"></div>
            <span>أصفر = تنتهي قريباً</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #f8fafc; border: 2px solid #e2e8f0;"></div>
            <span>أبيض/رمادي = مكتمل</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #dcfce7; border: 2px solid #86efac;"></div>
            <span>أخضر = جيدة/تم رفع الوثائق</span>
          </div>
          <div class="legend-item">
            <span style="font-size: 11px; color: #991b1b; font-weight: 600;">⚠️ = لا توجد استمارة</span>
          </div>
          <div class="legend-item">
            <span style="font-size: 11px; color: #166534; font-weight: 600;">✅ = تم رفع الوثائق</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-info">
        <strong>${COMPANY_INFO.name_ar}</strong>
        <span>${COMPANY_INFO.address}</span>
        <span>هاتف: ${COMPANY_INFO.phone} | بريد إلكتروني: ${COMPANY_INFO.email}</span>
      </div>
      <div class="footer-page">
        تقرير رسمي - للمراجعة الداخلية فقط
      </div>
      <div style="text-align: left;">
        صفحة <span class="page-number">1</span>
      </div>
    </div>
  </div>

  <script>
    // Auto-add page numbers on print
    window.onbeforeprint = function() {
      // Add any dynamic content here
    };
  </script>
</body>
</html>`;
};

/**
 * Open HTML report in new window
 */
export const openVehicleFleetHTMLReport = (
  vehicles: VehicleWithDocuments[],
  metadata: ReportMetadata
): void => {
  const htmlContent = generateVehicleFleetHTMLReport(vehicles, metadata);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  if (printWindow) {
    // Focus the new window
    printWindow.focus();
  }
};

export default generateVehicleFleetHTMLReport;
