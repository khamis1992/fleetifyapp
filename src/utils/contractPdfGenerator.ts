import html2pdf from 'html2pdf.js'

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
}

export const generateContractPdf = async (contractData: ContractPdfData): Promise<Blob> => {
  const contractHtml = generateContractHtml(contractData)
  
  const options = {
    margin: [10, 10, 10, 10],
    filename: `contract-${contractData.contract_number}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      letterRendering: true
    },
    jsPDF: { 
      unit: 'mm', 
      format: 'a4', 
      orientation: 'portrait',
      putOnlyUsedFonts: true
    }
  }

  const pdfBlob = await html2pdf()
    .set(options)
    .from(contractHtml)
    .outputPdf('blob')

  return pdfBlob
}

const generateContractHtml = (data: ContractPdfData): string => {
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>عقد رقم ${data.contract_number}</title>
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
          <div class="company-name">${data.company_name}</div>
          <div class="contract-title">عقد ${getContractTypeInArabic(data.contract_type)}</div>
          <div class="contract-number">رقم العقد: ${data.contract_number}</div>
        </div>

        <div class="section">
          <div class="section-title">معلومات العقد</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">نوع العقد</div>
              <div class="info-value">${getContractTypeInArabic(data.contract_type)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">تاريخ الإنشاء</div>
              <div class="info-value">${data.created_date}</div>
            </div>
            <div class="info-item">
              <div class="info-label">تاريخ البداية</div>
              <div class="info-value">${data.start_date}</div>
            </div>
            <div class="info-item">
              <div class="info-label">تاريخ النهاية</div>
              <div class="info-value">${data.end_date}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">معلومات العميل</div>
          <div class="info-item">
            <div class="info-label">اسم العميل</div>
            <div class="info-value">${data.customer_name}</div>
          </div>
        </div>

        ${data.vehicle_info ? `
        <div class="section">
          <div class="section-title">معلومات المركبة</div>
          <div class="info-item">
            <div class="info-label">تفاصيل المركبة</div>
            <div class="info-value">${data.vehicle_info}</div>
          </div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">التفاصيل المالية</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">المبلغ الإجمالي</div>
              <div class="info-value">${data.contract_amount.toFixed(3)} د.ك</div>
            </div>
            <div class="info-item">
              <div class="info-label">المبلغ الشهري</div>
              <div class="info-value">${data.monthly_amount.toFixed(3)} د.ك</div>
            </div>
          </div>
          <div class="amount-highlight">
            إجمالي قيمة العقد: ${data.contract_amount.toFixed(3)} د.ك
          </div>
        </div>

        ${data.terms ? `
        <div class="section">
          <div class="section-title">الشروط والأحكام</div>
          <div class="terms-section">
            ${data.terms.replace(/\n/g, '<br>')}
          </div>
        </div>
        ` : ''}

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-label">توقيع العميل</div>
            ${data.customer_signature ? 
              `<img src="${data.customer_signature}" alt="توقيع العميل" class="signature-image" />` :
              '<div class="signature-line"></div>'
            }
            <div>الطرف الأول</div>
          </div>
          
          <div class="signature-box">
            <div class="signature-label">توقيع ممثل الشركة</div>
            ${data.company_signature ? 
              `<img src="${data.company_signature}" alt="توقيع الشركة" class="signature-image" />` :
              '<div class="signature-line"></div>'
            }
            <div>الطرف الثاني</div>
          </div>
        </div>

        <div class="footer">
          تم إنشاء هذا العقد بتاريخ ${data.created_date}
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