import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { ContractPdfData } from '@/utils/contractPdfGenerator';
import { formatDateInGregorian, formatDateForDocument } from '@/utils/dateFormatter';
import { ContractVehicleConditionReport } from './ContractVehicleConditionReport';

interface ContractHtmlViewerProps {
  contractData: ContractPdfData;
  conditionReportData?: any;
  className?: string;
}

const getContractTypeInArabic = (type: string): string => {
  const types: Record<string, string> = {
    'rental': 'إيجار',
    'daily_rental': 'إيجار يومي',
    'weekly_rental': 'إيجار أسبوعي',
    'monthly_rental': 'إيجار شهري',
    'yearly_rental': 'إيجار سنوي',
    'rent_to_own': 'تأجير منتهي بالتمليك'
  };
  return types[type] || type;
};

export const ContractHtmlViewer: React.FC<ContractHtmlViewerProps> = ({ 
  contractData, 
  conditionReportData,
  className = "" 
}) => {
  const handlePrint = () => {
    // اختيار فقط محتوى العقد للطباعة
    const printContent = document.getElementById('contract-print-content');
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html lang="ar" dir="rtl">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>عقد رقم ${contractData.contract_number}</title>
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
                font-size: 14px;
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
                page-break-inside: avoid;
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
                page-break-inside: avoid;
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
              
              @media print {
                body {
                  padding: 0;
                  font-size: 12px;
                }
                .container {
                  border: none;
                  padding: 20px;
                }
                .no-print {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  const handleSaveAsPdf = async () => {
    const { generateContractPdf } = await import('@/utils/contractPdfGenerator');
    try {
      const pdfBlob = await generateContractPdf(contractData);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contract-${contractData.contract_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div className={`contract-html-viewer ${className}`}>
      {/* أزرار التحكم */}
      <div className="no-print flex justify-center gap-4 mb-6 print:hidden">
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          طباعة العقد
        </Button>
        <Button onClick={handleSaveAsPdf} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          حفظ كـ PDF
        </Button>
      </div>

      {/* محتوى العقد */}
      <div id="contract-print-content">
        <div className="container max-w-4xl mx-auto bg-white border-2 border-gray-200 p-8">
          <div className="header text-center mb-8 border-b-2 border-blue-600 pb-5">
            <div className="company-name text-2xl font-bold text-blue-600 mb-3">
              {contractData.company_name}
            </div>
            <div className="contract-title text-xl font-bold mb-3">
              عقد {getContractTypeInArabic(contractData.contract_type)}
            </div>
            <div className="contract-number text-gray-600">
              رقم العقد: {contractData.contract_number}
            </div>
          </div>

          <div className="section mb-6">
            <div className="section-title text-lg font-bold text-blue-600 mb-4 border-b border-gray-200 pb-2">
              معلومات العقد
            </div>
            <div className="info-grid grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="info-item p-3 bg-gray-50 border-r-4 border-blue-600">
                <div className="info-label font-bold text-gray-700 mb-1">نوع العقد</div>
                <div className="info-value text-gray-900">
                  {getContractTypeInArabic(contractData.contract_type)}
                </div>
              </div>
              <div className="info-item p-3 bg-gray-50 border-r-4 border-blue-600">
                <div className="info-label font-bold text-gray-700 mb-1">تاريخ الإنشاء</div>
                <div className="info-value text-gray-900">{contractData.created_date}</div>
              </div>
              <div className="info-item p-3 bg-gray-50 border-r-4 border-blue-600">
                <div className="info-label font-bold text-gray-700 mb-1">تاريخ البداية</div>
                <div className="info-value text-gray-900">{formatDateInGregorian(contractData.start_date)}</div>
              </div>
              <div className="info-item p-3 bg-gray-50 border-r-4 border-blue-600">
                <div className="info-label font-bold text-gray-700 mb-1">تاريخ النهاية</div>
                <div className="info-value text-gray-900">{formatDateInGregorian(contractData.end_date)}</div>
              </div>
            </div>
          </div>

          <div className="section mb-6">
            <div className="section-title text-lg font-bold text-blue-600 mb-4 border-b border-gray-200 pb-2">
              معلومات العميل
            </div>
            <div className="info-item p-3 bg-gray-50 border-r-4 border-blue-600">
              <div className="info-label font-bold text-gray-700 mb-1">اسم العميل</div>
              <div className="info-value text-gray-900">{contractData.customer_name}</div>
            </div>
          </div>

          {contractData.vehicle_info && (
            <div className="section mb-6">
              <div className="section-title text-lg font-bold text-blue-600 mb-4 border-b border-gray-200 pb-2">
                معلومات المركبة
              </div>
              <div className="info-item p-3 bg-gray-50 border-r-4 border-blue-600">
                <div className="info-label font-bold text-gray-700 mb-1">تفاصيل المركبة</div>
                <div className="info-value text-gray-900">{contractData.vehicle_info}</div>
              </div>
            </div>
          )}

          {/* تقرير فحص المركبة */}
          {conditionReportData && (
            <div className="section mb-6">
              <div className="section-title text-lg font-bold text-blue-600 mb-4 border-b border-gray-200 pb-2">
                تقرير فحص المركبة
              </div>
              <ContractVehicleConditionReport 
                conditionData={conditionReportData}
                vehicleInfo={contractData.vehicle_info}
              />
            </div>
          )}

          <div className="section mb-6">
            <div className="section-title text-lg font-bold text-blue-600 mb-4 border-b border-gray-200 pb-2">
              التفاصيل المالية
            </div>
            <div className="info-grid grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="info-item p-3 bg-gray-50 border-r-4 border-blue-600">
                <div className="info-label font-bold text-gray-700 mb-1">المبلغ الإجمالي</div>
                <div className="info-value text-gray-900">
                  {contractData.contract_amount.toFixed(3)} د.ك
                </div>
              </div>
              <div className="info-item p-3 bg-gray-50 border-r-4 border-blue-600">
                <div className="info-label font-bold text-gray-700 mb-1">المبلغ الشهري</div>
                <div className="info-value text-gray-900">
                  {contractData.monthly_amount.toFixed(3)} د.ك
                </div>
              </div>
            </div>
            <div className="amount-highlight bg-amber-100 p-4 rounded-lg text-center text-lg font-bold text-amber-800">
              إجمالي قيمة العقد: {contractData.contract_amount.toFixed(3)} د.ك
            </div>
          </div>

          {contractData.terms && (
            <div className="section mb-6">
              <div className="section-title text-lg font-bold text-blue-600 mb-4 border-b border-gray-200 pb-2">
                الشروط والأحكام
              </div>
              <div className="terms-section bg-gray-50 p-5 rounded-lg">
                <div 
                  className="whitespace-pre-line"
                  dangerouslySetInnerHTML={{ 
                    __html: contractData.terms.replace(/\n/g, '<br>') 
                  }}
                />
              </div>
            </div>
          )}

          <div className="signature-section grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
            <div className="signature-box text-center p-5 border-2 border-gray-200 rounded-lg">
              <div className="signature-label font-bold mb-3">توقيع العميل</div>
              {contractData.customer_signature ? (
                <img 
                  src={contractData.customer_signature} 
                  alt="توقيع العميل" 
                  className="signature-image max-w-48 max-h-24 mx-auto my-3 border border-gray-200"
                />
              ) : (
                <div className="signature-line border-t-2 border-gray-800 w-48 mx-auto my-5"></div>
              )}
              <div className="text-sm text-gray-600">الطرف الأول</div>
            </div>
            
            <div className="signature-box text-center p-5 border-2 border-gray-200 rounded-lg">
              <div className="signature-label font-bold mb-3">توقيع ممثل الشركة</div>
              {contractData.company_signature ? (
                <img 
                  src={contractData.company_signature} 
                  alt="توقيع الشركة" 
                  className="signature-image max-w-48 max-h-24 mx-auto my-3 border border-gray-200"
                />
              ) : (
                <div className="signature-line border-t-2 border-gray-800 w-48 mx-auto my-5"></div>
              )}
              <div className="text-sm text-gray-600">الطرف الثاني</div>
            </div>
          </div>

          <div className="footer mt-10 text-center text-sm text-gray-600 border-t border-gray-200 pt-5">
            تم إنشاء هذا العقد بتاريخ {contractData.created_date}
          </div>
        </div>
      </div>
    </div>
  );
};