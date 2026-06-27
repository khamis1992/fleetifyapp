export type OfficialReportStatus = "draft" | "published" | "approved" | "archived" | "voided";

export type OfficialFinancialReportMetadata = {
  reportTitle: string;
  companyName?: string | null;
  reportType: string;
  currency?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  asOfDate?: string | null;
  sourceFingerprint?: string | null;
  reportHash?: string | null;
  status?: OfficialReportStatus | string | null;
  generatedBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  exportedAt?: string | null;
};

export type OfficialFinancialReportColumn = {
  header: string;
  key: string;
  width?: number;
  align?: "left" | "center" | "right";
  type?: "text" | "money" | "number" | "date";
};

export type OfficialFinancialReportExportPayload = {
  metadata: OfficialFinancialReportMetadata;
  columns: OfficialFinancialReportColumn[];
  rows: Record<string, string | number | null | undefined>[];
  summaryRows?: Record<string, string | number | null | undefined>[];
};

export type OfficialReportDocumentPayload = {
  metadata: OfficialFinancialReportMetadata;
  bodyHtml: string;
};

const REQUIRED_AUDIT_FIELDS = ["sourceFingerprint"] as const;
const SOURCE_FINGERPRINT_REQUIRED_ERROR = "sourceFingerprint_required";

export function normalizeOfficialReportMetadata(metadata: OfficialFinancialReportMetadata) {
  return {
    companyName: metadata.companyName || "Fleetify",
    currency: String(metadata.currency || "QAR").toUpperCase(),
    status: metadata.status || "draft",
    exportedAt: metadata.exportedAt || new Date().toISOString(),
    ...metadata,
  };
}

export function validateOfficialReportExportPayload(payload: OfficialFinancialReportExportPayload) {
  const missingFields = REQUIRED_AUDIT_FIELDS.filter((field) => !String(payload.metadata[field] || "").trim());
  const errors: string[] = [];

  if (!payload.metadata.reportTitle?.trim()) errors.push("report_title_required");
  if (!payload.metadata.reportType?.trim()) errors.push("report_type_required");
  if (payload.columns.length === 0) errors.push("columns_required");
  if (payload.rows.length === 0 && (payload.summaryRows || []).length === 0) errors.push("rows_required");
  if (missingFields.includes("sourceFingerprint")) errors.push(SOURCE_FINGERPRINT_REQUIRED_ERROR);

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildOfficialReportAuditRows(metadataInput: OfficialFinancialReportMetadata) {
  const metadata = normalizeOfficialReportMetadata(metadataInput);
  return [
    { label: "Company", value: metadata.companyName },
    { label: "Report Type", value: metadata.reportType },
    { label: "Currency", value: metadata.currency },
    { label: "Period Start", value: metadata.periodStart || "-" },
    { label: "Period End", value: metadata.periodEnd || "-" },
    { label: "As Of Date", value: metadata.asOfDate || "-" },
    { label: "Status", value: metadata.status },
    { label: "Source Fingerprint", value: metadata.sourceFingerprint || "-" },
    { label: "Report Hash", value: metadata.reportHash || "-" },
    { label: "Exported At", value: metadata.exportedAt },
    { label: "Approved By", value: metadata.approvedBy || "-" },
    { label: "Approved At", value: metadata.approvedAt || "-" },
  ];
}

export function buildOfficialReportFileName(metadataInput: OfficialFinancialReportMetadata, extension: "pdf" | "xlsx") {
  const metadata = normalizeOfficialReportMetadata(metadataInput);
  const datePart = metadata.asOfDate || metadata.periodEnd || new Date().toISOString().slice(0, 10);
  const typePart = metadata.reportType.replace(/[^a-zA-Z0-9_-]+/g, "_");
  const fingerprintPart = String(metadata.sourceFingerprint || "unfingerprinted").slice(0, 10);
  return `${typePart}_${datePart}_${fingerprintPart}.${extension}`;
}

function toDisplayValue(value: string | number | null | undefined) {
  if (value == null) return "";
  return value;
}

function escapeHtml(value: string | number | null | undefined) {
  return String(toDisplayValue(value))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatOfficialDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat("ar-QA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatOfficialValue(value: string | number | null | undefined, column?: OfficialFinancialReportColumn, currency = "QAR") {
  if (value == null || value === "") return "-";
  if (column?.type === "money") {
    return `${Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;
  }
  if (column?.type === "number") {
    return Number(value || 0).toLocaleString("en-US");
  }
  if (column?.type === "date") {
    return formatOfficialDate(String(value));
  }
  return String(value);
}

function buildOfficialRefNumber(metadata: ReturnType<typeof normalizeOfficialReportMetadata>) {
  const datePart = (metadata.asOfDate || metadata.periodEnd || metadata.exportedAt || new Date().toISOString()).slice(0, 10).replace(/-/g, "");
  const fingerprintPart = String(metadata.sourceFingerprint || "000000").slice(0, 6).toUpperCase();
  return `FIN-${datePart}-${fingerprintPart}`;
}

function buildOfficialReportRows(payload: OfficialFinancialReportExportPayload, metadata: ReturnType<typeof normalizeOfficialReportMetadata>) {
  return [...payload.rows, ...(payload.summaryRows || [])]
    .map((row, index) => {
      const cells = payload.columns
        .map((column) => {
          const value = formatOfficialValue(row[column.key], column, metadata.currency);
          const alignClass = column.type === "money" || column.type === "number" ? "ltr-value" : "";
          return `<td class="${alignClass}">${escapeHtml(value)}</td>`;
        })
        .join("");
      return `<tr class="${index >= payload.rows.length ? "summary-row" : ""}">${cells}</tr>`;
    })
    .join("");
}

async function imageUrlToDataUrl(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function buildOfficialFinancialReportHtml(payload: OfficialFinancialReportExportPayload) {
  const metadata = normalizeOfficialReportMetadata(payload.metadata);
  const refNumber = buildOfficialRefNumber(metadata);
  const reportDate = formatOfficialDate(metadata.asOfDate || metadata.periodEnd || metadata.exportedAt);
  const currentDate = formatOfficialDate(metadata.exportedAt);
  const rowsHtml = buildOfficialReportRows(payload, metadata);
  const headerCells = payload.columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join("");
  const auditRows = buildOfficialReportAuditRows(metadata)
    .map((row) => `<tr><th>${escapeHtml(row.label)}</th><td>${escapeHtml(row.value)}</td></tr>`)
    .join("");

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(metadata.reportTitle)}</title>
  <style>
    @page { size: A4 portrait; margin: 18mm 15mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #ffffff;
      color: #000000;
      direction: rtl;
      text-align: right;
      font-family: "Amiri", "Traditional Arabic", "Times New Roman", serif;
      font-size: 12pt;
      line-height: 1.8;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .letter-container {
      width: 794px;
      min-height: 1123px;
      margin: 0 auto;
      padding: 58px 56px 46px;
      background: #ffffff;
    }
    .official-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 130px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
      border-bottom: 3px double #1e3a5f;
      padding-bottom: 12px;
      margin-bottom: 10px;
    }
    .company-ar h1,
    .company-en h1 {
      color: #1e3a5f;
      margin: 0;
      font-weight: 700;
      line-height: 1.35;
    }
    .company-ar h1 { font-size: 17px; }
    .company-en h1 { font-size: 13px; direction: ltr; text-align: left; }
    .company-ar p,
    .company-en p {
      margin: 2px 0;
      color: #000;
      font-size: 10.5px;
      line-height: 1.45;
    }
    .company-en { direction: ltr; text-align: left; }
    .logo-box {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 74px;
      padding: 2px 8px;
    }
    .logo-box img {
      display: block;
      max-height: 82px;
      max-width: 148px;
      width: auto;
      height: auto;
      object-fit: contain;
    }
    .address-bar {
      text-align: center;
      color: #000;
      font-size: 10.5px;
      line-height: 1.65;
      margin-bottom: 12px;
      padding-bottom: 9px;
      border-bottom: 1px solid #cccccc;
    }
    .ref-date {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
      font-size: 11.5px;
    }
    .ref-date .left {
      direction: ltr;
      text-align: left;
    }
    .recipient-box {
      margin: 10px 0 12px;
      font-size: 12pt;
    }
    .subject-box {
      background: #1e3a5f;
      color: #ffffff;
      padding: 9px 14px;
      margin-bottom: 14px;
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      border-radius: 2px;
    }
    .intro {
      margin: 0 0 12px;
      text-align: justify;
    }
    .meta-table,
    .report-table,
    .audit-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 14px;
      page-break-inside: avoid;
    }
    .meta-table th,
    .meta-table td,
    .report-table th,
    .report-table td,
    .audit-table th,
    .audit-table td {
      border: 1px solid #000;
      padding: 7px 8px;
      text-align: right;
      vertical-align: top;
      line-height: 1.6;
      color: #000;
    }
    .meta-table th,
    .report-table th,
    .audit-table th {
      background: #f2f2f2;
      font-weight: 700;
    }
    .report-table thead th {
      text-align: center;
      font-size: 11pt;
    }
    .report-table td {
      font-size: 10.5pt;
    }
    .summary-row td {
      font-weight: 700;
      background: #f7f7f7;
      border-top: 2px solid #000;
    }
    .ltr-value {
      direction: ltr;
      text-align: left !important;
      white-space: nowrap;
    }
    .section-title {
      margin: 16px 0 8px;
      color: #1e3a5f;
      font-size: 13.5pt;
      font-weight: 700;
      border-bottom: 1px solid #1e3a5f;
      padding-bottom: 3px;
    }
    .verification {
      margin-top: 12px;
      padding: 10px 12px;
      border: 1px solid #000;
      font-size: 10.5pt;
      line-height: 1.7;
      page-break-inside: avoid;
    }
    .approval-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 22px;
      margin-top: 28px;
      padding-top: 18px;
      border-top: 2px solid #000;
      page-break-inside: avoid;
    }
    .approval-box {
      min-height: 84px;
      border: 1px solid #000;
      padding: 10px;
    }
    .approval-box strong {
      display: block;
      margin-bottom: 22px;
    }
    .footer {
      margin-top: 18px;
      padding-top: 8px;
      border-top: 1px solid #cccccc;
      color: #333333;
      font-size: 9.5px;
      line-height: 1.5;
      direction: ltr;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="letter-container">
    <header class="official-header">
      <div class="company-ar">
        <h1>شركة العراف لتأجير السيارات ذ.م.م</h1>
        <p>سجل تجاري: 146832</p>
        <p>الدوحة - دولة قطر</p>
      </div>
      <div class="logo-box">
        <img src="/receipts/logo.png" alt="شعار الشركة" onerror="this.style.display='none'" />
      </div>
      <div class="company-en">
        <h1>Alaraf Car Rental LLC</h1>
        <p>C.R: 146832</p>
        <p>Doha - State of Qatar</p>
      </div>
    </header>

    <div class="address-bar">
      أم صلال محمد - الشارع التجاري - هاتف: +974 66070076 - البريد الإلكتروني: khamis-1992@hotmail.com
    </div>

    <div class="ref-date">
      <div><strong>الرقم المرجعي:</strong> ${escapeHtml(refNumber)}</div>
      <div class="left"><strong>التاريخ:</strong> ${escapeHtml(currentDate)}</div>
    </div>

    <div class="recipient-box">
      <p><strong>إلى /</strong> الإدارة المالية</p>
      <p>تحية طيبة وبعد،،،</p>
    </div>

    <div class="subject-box">
      الموضوع: ${escapeHtml(metadata.reportTitle)}
    </div>

    <p class="intro">
      بناءً على طلبكم، نرفق لكم التقرير المالي الموضح أدناه بصيغة رسمية قابلة للمراجعة والتدقيق، مع ربط التقرير ببصمة مصدر البيانات وهاش التقرير لضمان إمكانية المطابقة مع السجلات المالية.
    </p>

    <table class="meta-table">
      <tbody>
        <tr>
          <th>اسم التقرير</th>
          <td>${escapeHtml(metadata.reportTitle)}</td>
          <th>نوع التقرير</th>
          <td>${escapeHtml(metadata.reportType)}</td>
        </tr>
        <tr>
          <th>تاريخ التقرير</th>
          <td>${escapeHtml(reportDate)}</td>
          <th>العملة</th>
          <td>${escapeHtml(metadata.currency)}</td>
        </tr>
        <tr>
          <th>الحالة</th>
          <td>${escapeHtml(metadata.status)}</td>
          <th>الشركة</th>
          <td>${escapeHtml(metadata.companyName)}</td>
        </tr>
      </tbody>
    </table>

    <h2 class="section-title">أولاً: بيانات التقرير</h2>
    <table class="report-table">
      <thead>
        <tr>${headerCells}</tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <h2 class="section-title">ثانياً: سجل التدقيق والمطابقة</h2>
    <table class="audit-table">
      <tbody>${auditRows}</tbody>
    </table>

    <div class="verification">
      نقر بأن هذا التقرير تم توليده من النظام المالي، وأن بصمة مصدر البيانات وهاش التقرير المذكورين أعلاه مخصصان للتحقق من سلامة البيانات عند المراجعة أو المطابقة اللاحقة.
    </div>

    <section class="approval-section">
      <div class="approval-box">
        <strong>إعداد ومراجعة</strong>
        الاسم: _______________________<br>
        التوقيع: ______________________
      </div>
      <div class="approval-box">
        <strong>اعتماد الإدارة المالية</strong>
        الاسم: _______________________<br>
        التوقيع: ______________________
      </div>
    </section>

    <div class="footer">
      Fleetify official financial report export | ${escapeHtml(metadata.exportedAt)} | ${escapeHtml(metadata.sourceFingerprint || "-")}
    </div>
  </div>
</body>
</html>`;
}

export function buildOfficialReportDocumentHtml(payload: OfficialReportDocumentPayload) {
  const shellHtml = buildOfficialFinancialReportHtml({
    metadata: payload.metadata,
    columns: [{ header: "Report Content", key: "content" }],
    rows: [{ content: " " }],
  });

  const contentHtml = `
    <div class="official-report-content">
      ${payload.bodyHtml}
    </div>
  `;

  return shellHtml
    .replace(
      ".meta-table,",
      `.official-report-content {
      margin: 10px 0 14px;
      color: #000000;
      page-break-inside: auto;
    }
    .official-report-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 14px;
    }
    .official-report-content th,
    .official-report-content td {
      border: 1px solid #000000;
      padding: 7px 8px;
      text-align: right;
      vertical-align: top;
      line-height: 1.6;
      color: #000000;
    }
    .official-report-content th {
      background: #f2f2f2;
      font-weight: 700;
    }
    .official-report-content img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 8px auto;
    }
    .meta-table,`
    )
    .replace(/<table class="report-table">[\s\S]*?<\/table>/, contentHtml);
}

export async function exportOfficialFinancialReportToExcel(payload: OfficialFinancialReportExportPayload) {
  const validation = validateOfficialReportExportPayload(payload);
  if (!validation.valid) {
    throw new Error(`Official report export is missing audit fields: ${validation.errors.join(", ")}`);
  }

  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Fleetify";
  workbook.created = new Date();
  workbook.modified = new Date();

  const metadata = normalizeOfficialReportMetadata(payload.metadata);
  const auditSheet = workbook.addWorksheet("Audit Trail", { views: [{ rightToLeft: true }] });
  auditSheet.columns = [
    { header: "Field", key: "label", width: 28 },
    { header: "Value", key: "value", width: 70 },
  ];
  buildOfficialReportAuditRows(metadata).forEach((row) => auditSheet.addRow(row));
  auditSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  auditSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF020617" } };

  const dataSheet = workbook.addWorksheet("Report Data", { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  dataSheet.columns = payload.columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width || 18,
  }));
  [...payload.rows, ...(payload.summaryRows || [])].forEach((row) => {
    dataSheet.addRow(Object.fromEntries(payload.columns.map((column) => [column.key, toDisplayValue(row[column.key])])));
  });
  dataSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: payload.columns.length },
  };
  dataSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  dataSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF020617" } };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildOfficialReportFileName(metadata, "xlsx");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportOfficialHtmlToPDF(html: string, fileName: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const renderHost = document.createElement("div");
  renderHost.setAttribute("dir", "rtl");
  renderHost.style.position = "fixed";
  renderHost.style.left = "-10000px";
  renderHost.style.top = "0";
  renderHost.style.width = "794px";
  renderHost.style.background = "#ffffff";
  renderHost.style.zIndex = "-1";
  const logoDataUrl = await imageUrlToDataUrl("/receipts/logo.png");
  renderHost.innerHTML = logoDataUrl ? html.replace('src="/receipts/logo.png"', `src="${logoDataUrl}"`) : html;
  document.body.appendChild(renderHost);

  try {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const canvas = await html2canvas(renderHost, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: 794,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imageHeight = (canvas.height * pdfWidth) / canvas.width;

    let remainingHeight = imageHeight;
    let position = 0;
    pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imageHeight, undefined, "FAST");
    remainingHeight -= pdfHeight;

    while (remainingHeight > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, imageHeight, undefined, "FAST");
      remainingHeight -= pdfHeight;
    }

    pdf.save(fileName);
  } finally {
    document.body.removeChild(renderHost);
  }
}

export async function exportOfficialFinancialReportToPDF(payload: OfficialFinancialReportExportPayload) {
  const validation = validateOfficialReportExportPayload(payload);
  if (!validation.valid) {
    throw new Error(`Official report export is missing audit fields: ${validation.errors.join(", ")}`);
  }

  const metadata = normalizeOfficialReportMetadata(payload.metadata);
  const reportHtml = buildOfficialFinancialReportHtml({ ...payload, metadata });
  await exportOfficialHtmlToPDF(reportHtml, buildOfficialReportFileName(metadata, "pdf"));
}

export async function exportOfficialReportDocumentToPDF(payload: OfficialReportDocumentPayload) {
  const validation = validateOfficialReportExportPayload({
    metadata: payload.metadata,
    columns: [{ header: "Report Content", key: "content" }],
    rows: [{ content: " " }],
  });
  if (!validation.valid) {
    throw new Error(`Official report export is missing audit fields: ${validation.errors.join(", ")}`);
  }

  const metadata = normalizeOfficialReportMetadata(payload.metadata);
  const reportHtml = buildOfficialReportDocumentHtml({ ...payload, metadata });
  await exportOfficialHtmlToPDF(reportHtml, buildOfficialReportFileName(metadata, "pdf"));
}
