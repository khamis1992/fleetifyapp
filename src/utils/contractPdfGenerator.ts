import { formatDateInGregorian } from './dateFormatter'
import { escapeHtml, sanitizeDocumentHtmlToFragment } from './htmlSanitizer'

export interface ContractPdfData {
  contract_number: string
  contract_type: string
  customer_name: string
  vehicle_info?: string
  start_date: string
  end_date: string
  contract_amount: number
  monthly_amount: number
  terms?: string
  customer_signature?: string
  company_signature?: string
  company_name: string
  created_date: string
  condition_report?: any
}

export const generateContractPdf = async (contractData: ContractPdfData): Promise<Blob> => {
  // Lazy load jsPDF and html2canvas
  const jsPDF = (await import('jspdf')).default;
  const html2canvas = (await import('html2canvas')).default;

  const contractHtml = generateContractHtml(contractData)

  // Create a temporary container
  const container = document.createElement('div');
  container.replaceChildren(sanitizeDocumentHtmlToFragment(contractHtml));
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  try {
    // Convert to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    // Get image data
    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // Create PDF
    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageHeight = 297; // A4 height in mm

    let heightLeft = imgHeight;
    let position = 0;

    // Add image to PDF
    doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      doc.addPage();
      doc.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Return as blob
    const pdfBlob = doc.output('blob');
    return pdfBlob;

  } finally {
    // Clean up
    document.body.removeChild(container);
  }
}

export const generateContractHtml = (data: ContractPdfData): string => {
  const contractType = escapeHtml(getContractTypeInArabic(data.contract_type));
  const customerSignature = getSafeImageSource(data.customer_signature);
  const companySignature = getSafeImageSource(data.company_signature);

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>عقد رقم ${escapeHtml(data.contract_number)}</title>
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          background: white;
          padding: 20px;
          direction: rtl;
          text-align: right;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border: 2px solid #e5e7eb;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 20px;
        }
        
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 10px;
        }
        
        .contract-title {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .contract-number {
          font-size: 16px;
          color: #666;
        }
        
        .section {
          margin-bottom: 25px;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 15px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .info-item {
          padding: 10px;
          background: #f9fafb;
          border-right: 4px solid #2563eb;
        }
        
        .info-label {
          font-weight: bold;
          color: #374151;
          margin-bottom: 5px;
        }
        
        .info-value {
          color: #111827;
        }
        
        .terms-section {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        
        .signature-section {
          margin-top: 40px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
        }
        
        .signature-box {
          text-align: center;
          padding: 20px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
        }
        
        .signature-image {
          max-width: 200px;
          max-height: 100px;
          margin: 10px 0;
          border: 1px solid #e5e7eb;
        }
        
        .signature-line {
          border-top: 2px solid #333;
          width: 200px;
          margin: 20px auto;
        }
        
        .signature-label {
          font-weight: bold;
          margin-top: 10px;
        }
        
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }
        
        .amount-highlight {
          background: #fef3c7;
          padding: 10px;
          border-radius: 6px;
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          color: #92400e;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="company-name">${escapeHtml(data.company_name)}</div>
          <div class="contract-title">عقد ${contractType}</div>
          <div class="contract-number">رقم العقد: ${escapeHtml(data.contract_number)}</div>
        </div>

        <div class="section">
          <div class="section-title">معلومات العقد</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">نوع العقد</div>
              <div class="info-value">${contractType}</div>
            </div>
            <div class="info-item">
              <div class="info-label">تاريخ الإنشاء</div>
              <div class="info-value">${escapeHtml(data.created_date)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">تاريخ البداية</div>
              <div class="info-value">${escapeHtml(formatDateInGregorian(data.start_date))}</div>
            </div>
            <div class="info-item">
              <div class="info-label">تاريخ النهاية</div>
              <div class="info-value">${escapeHtml(formatDateInGregorian(data.end_date))}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">معلومات العميل</div>
          <div class="info-item">
            <div class="info-label">اسم العميل</div>
            <div class="info-value">${escapeHtml(data.customer_name)}</div>
          </div>
        </div>

        ${data.vehicle_info ? `
        <div class="section">
          <div class="section-title">معلومات المركبة</div>
          <div class="info-item">
            <div class="info-label">تفاصيل المركبة</div>
            <div class="info-value">${escapeHtml(data.vehicle_info)}</div>
          </div>
        </div>
        ` : ''}

        ${data.condition_report ? `
        <div class="section">
          <div class="section-title">تقرير فحص المركبة</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">الحالة العامة</div>
              <div class="info-value">${escapeHtml(getConditionInArabic(data.condition_report.overall_condition))}</div>
            </div>
            <div class="info-item">
              <div class="info-label">قراءة العداد</div>
              <div class="info-value">${data.condition_report.mileage_reading?.toLocaleString() || 0} كم</div>
            </div>
            <div class="info-item">
              <div class="info-label">مستوى الوقود</div>
              <div class="info-value">${data.condition_report.fuel_level || 100}%</div>
            </div>
            <div class="info-item">
              <div class="info-label">تاريخ الفحص</div>
              <div class="info-value">${escapeHtml(formatDateInGregorian(data.condition_report.created_at))}</div>
            </div>
          </div>
          ${data.condition_report.notes ? `
            <div class="info-item">
              <div class="info-label">ملاحظات الفحص</div>
              <div class="info-value">${escapeHtml(data.condition_report.notes)}</div>
            </div>
          ` : ''}
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">التفاصيل المالية</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">المبلغ الإجمالي</div>
              <div class="info-value">${data.contract_amount.toFixed(2)} ر.ق</div>
            </div>
            <div class="info-item">
              <div class="info-label">المبلغ الشهري</div>
              <div class="info-value">${data.monthly_amount.toFixed(2)} ر.ق</div>
            </div>
          </div>
          <div class="amount-highlight">
            إجمالي قيمة العقد: ${data.contract_amount.toFixed(2)} ر.ق
          </div>
        </div>

        ${data.terms ? `
        <div class="section">
          <div class="section-title">الشروط والأحكام</div>
          <div class="terms-section">
            ${escapeHtml(data.terms).replace(/\n/g, '<br>')}
          </div>
        </div>
        ` : ''}

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-label">توقيع العميل</div>
            ${customerSignature ?
              `<img src="${escapeHtml(customerSignature)}" alt="توقيع العميل" class="signature-image" />` :
              '<div class="signature-line"></div>'
            }
            <div>الطرف الأول</div>
          </div>
          
          <div class="signature-box">
            <div class="signature-label">توقيع ممثل الشركة</div>
            ${companySignature ?
              `<img src="${escapeHtml(companySignature)}" alt="توقيع الشركة" class="signature-image" />` :
              '<div class="signature-line"></div>'
            }
            <div>الطرف الثاني</div>
          </div>
        </div>

        <div class="footer">
          تم إنشاء هذا العقد بتاريخ ${escapeHtml(data.created_date)}
        </div>
      </div>
    </body>
    </html>
  `
}

const getContractTypeInArabic = (type: string): string => {
  const types: Record<string, string> = {
    'rental': 'إيجار',
    'daily_rental': 'إيجار يومي',
    'weekly_rental': 'إيجار أسبوعي',
    'monthly_rental': 'إيجار شهري',
    'yearly_rental': 'إيجار سنوي',
    'rent_to_own': 'تأجير منتهي بالتمليك'
  }
  return types[type] || type
}

const getConditionInArabic = (condition: string): string => {
  const conditions: Record<string, string> = {
    'excellent': 'ممتازة',
    'good': 'جيدة',
    'fair': 'مقبولة',
    'poor': 'ضعيفة',
    'damaged': 'متضررة'
  }
  return conditions[condition] || condition
}

const getSafeImageSource = (source?: string): string | null => {
  if (!source) return null;

  try {
    const url = new URL(source, window.location.origin);
    if (url.protocol === 'data:') {
      return /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(source) ? source : null;
    }
    return ['https:', 'http:', 'blob:'].includes(url.protocol) ? source : null;
  } catch {
    return null;
  }
}
