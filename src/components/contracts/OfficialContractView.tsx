/**
 * مكون عرض العقد الرسمي لشركة العراف
 * يستخدم عقد العراف القانوني الكامل مع بيانات حقيقية
 * مُحسّن للطباعة على ورق A4
 */

import React, { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Eye, Download } from 'lucide-react';
import { OfficialContractLetterDocument } from './OfficialContractLetterDocument';
import type { PaymentSchedule } from '@/types/payment-schedules';
import type { VehicleInspection } from '@/hooks/useVehicleInspections';
import '@/styles/print-contract.css';

interface OfficialContractViewProps {
  contract: any;
  paymentSchedules?: PaymentSchedule[];
  checkInInspection?: VehicleInspection | null;
  checkOutInspection?: VehicleInspection | null;
}

export const OfficialContractView: React.FC<OfficialContractViewProps> = ({
  contract,
  paymentSchedules = [],
  checkInInspection = null,
  checkOutInspection = null,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  // طباعة العقد بطريقة محسنة
  const handlePrint = useCallback(() => {
    if (!printRef.current) return;

    // إنشاء نافذة طباعة جديدة
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    // محتوى HTML للطباعة
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>عقد إيجار سيارة - ${contract.contract_number || ''}</title>
        <link rel="icon" href="${window.location.origin}/uploads/7453c280-3175-4ccf-a73b-24921ec5990b.png" type="image/png">
        <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          /* إعدادات الصفحة للطباعة */
          @page {
            size: A4 portrait;
            margin: 2cm 1.5cm;
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Amiri', 'Traditional Arabic', 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.8;
            color: #000;
            background: white;
            direction: rtl;
            text-align: right;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-container {
            max-width: 21cm;
            margin: 0 auto;
            padding: 0;
            background: white;
          }

          /* رأس العقد */
          .header {
            text-align: center;
            padding: 1.5rem 0 2rem 0;
            border-bottom: 2px solid #000;
            margin-bottom: 2rem;
          }

          .company-name {
            font-size: 18pt;
            font-weight: 700;
            margin-bottom: 0.5rem;
          }

          .company-details {
            font-size: 11pt;
            line-height: 1.6;
            margin-top: 0.5rem;
          }

          /* العنوان الرئيسي */
          h1 {
            font-size: 22pt;
            font-weight: 700;
            text-align: center;
            margin: 2.5rem 0 1.5rem 0;
            text-decoration: underline;
          }

          /* مرجع العقد */
          .contract-ref {
            text-align: center;
            font-family: 'Courier New', monospace;
            font-size: 12pt;
            margin: 1.5rem 0;
            line-height: 1.8;
          }

          /* صندوق الطرف */
          .party-box {
            border: 2px solid #000;
            padding: 1.2rem;
            margin: 1.5rem 0;
            page-break-inside: avoid;
          }

          .party-title {
            font-weight: 700;
            font-size: 15pt;
            margin-bottom: 1rem;
            text-decoration: underline;
          }

          .party-info {
            line-height: 2.0;
            padding-right: 1rem;
          }

          /* المادة */
          .article {
            margin: 2rem 0 2.5rem 0;
            page-break-inside: avoid;
          }

          .article-title {
            font-weight: 700;
            font-size: 14pt;
            margin-bottom: 1rem;
            text-decoration: underline;
          }

          .article-content {
            line-height: 2.0;
            text-align: justify;
          }

          .article-content p {
            margin-bottom: 1rem;
          }

          /* البنود الفرعية */
          .sub-article {
            margin: 1rem 0 1rem 2rem;
            line-height: 2.0;
          }

          .sub-number {
            font-weight: 700;
            display: inline-block;
            min-width: 3rem;
          }

          /* القوائم */
          ul, ol {
            margin: 0.5rem 0 1rem 3rem;
            line-height: 2.0;
          }

          li {
            margin-bottom: 0.5rem;
          }

          /* الجداول */
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
            page-break-inside: avoid;
          }

          table th, table td {
            border: 1px solid #000;
            padding: 0.6rem;
            text-align: right;
            line-height: 1.6;
          }

          table th {
            font-weight: 700;
            background: #f5f5f5;
          }

          .total-row {
            font-weight: 700;
            border-top: 2px solid #000;
          }

          /* صندوق البند */
          .clause-box {
            border: 2px solid #000;
            padding: 1rem;
            margin: 1rem 0;
            page-break-inside: avoid;
          }

          /* المرجع القانوني */
          .legal-ref {
            font-style: italic;
            font-size: 11pt;
          }

          /* الإقرارات */
          .declarations {
            margin: 2rem 0;
            page-break-inside: avoid;
          }

          .declaration-title {
            font-weight: 700;
            font-size: 15pt;
            text-align: center;
            margin-bottom: 1.5rem;
            text-decoration: underline;
          }

          .declaration-item {
            margin: 1rem 0;
            padding-right: 2rem;
            line-height: 2.0;
          }

          .declaration-item::before {
            content: "☐  ";
            font-size: 16pt;
            margin-left: 0.5rem;
          }

          /* التوقيعات */
          .signatures {
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 2px solid #000;
            page-break-inside: avoid;
          }

          .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3rem;
            margin-top: 2rem;
          }

          .signature-box {
            text-align: center;
            min-height: 180px;
          }

          .signature-title {
            font-weight: 700;
            font-size: 14pt;
            margin-bottom: 3rem;
            text-decoration: underline;
          }

          .signature-line {
            border-top: 1px solid #000;
            margin: 0 auto;
            width: 80%;
            padding-top: 0.5rem;
          }

          .stamp-box {
            width: 120px;
            height: 120px;
            border: 2px dashed #666;
            margin: 1rem auto;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10pt;
            color: #666;
          }

          /* التذييل */
          .footer {
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid #000;
            text-align: center;
            font-size: 10pt;
            line-height: 1.6;
          }

          /* فاصل الصفحات */
          .page-break {
            page-break-after: always;
            height: 0;
            margin: 0;
            padding: 0;
          }

          /* منع القطع */
          .avoid-break {
            page-break-inside: avoid;
          }

          /* محاذاة النص */
          .text-center {
            text-align: center;
          }

          .font-bold {
            font-weight: 700;
          }

          .underline {
            text-decoration: underline;
          }

          /* أنماط الطباعة */
          @media print {
            body {
              margin: 0;
              padding: 0;
            }

            .print-container {
              width: 100%;
              max-width: none;
            }

            .page-break {
              page-break-after: always !important;
              break-after: page !important;
            }

            .avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${printRef.current.innerHTML}
        </div>
        <script>
          // طباعة تلقائية بعد تحميل المحتوى
          window.onload = function() {
            setTimeout(function() {
    window.print();
              window.onafterprint = function() {
                window.close();
              };
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  }, [contract]);

  // معاينة الطباعة
  const handlePreview = useCallback(() => {
    if (!printRef.current) return;

    const previewWindow = window.open('', '_blank', 'width=900,height=700');
    if (!previewWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للمعاينة');
      return;
    }

    const previewContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>معاينة العقد - ${contract.contract_number || ''}</title>
        <link rel="icon" href="${window.location.origin}/uploads/7453c280-3175-4ccf-a73b-24921ec5990b.png" type="image/png">
        <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body {
            background: #f0f0f0;
            margin: 0;
            padding: 20px;
            font-family: 'Amiri', serif;
          }
          .preview-header {
            background: #1a1a1a;
            color: white;
            padding: 15px 20px;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 100;
          }
          .preview-header h3 {
            margin: 0;
          }
          .preview-header button {
            background: #e85a4f;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
          }
          .preview-header button:hover {
            background: #d64a3f;
          }
          .preview-content {
            margin-top: 80px;
            display: flex;
            justify-content: center;
          }
          .page-container {
            background: white;
            width: 21cm;
            min-height: 29.7cm;
            padding: 2cm 1.5cm;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          }
        </style>
      </head>
      <body>
        <div class="preview-header">
          <h3>معاينة العقد - A4</h3>
          <button onclick="window.print()">🖨️ طباعة</button>
        </div>
        <div class="preview-content">
          <div class="page-container">
            ${printRef.current.innerHTML}
          </div>
        </div>
      </body>
      </html>
    `;

    previewWindow.document.write(previewContent);
    previewWindow.document.close();
  }, [contract]);

  return (
    <div className="space-y-4">
      {/* شريط أدوات الطباعة */}
      <Card className="no-print bg-gradient-to-r from-neutral-50 to-neutral-100 border-neutral-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                <Printer className="h-5 w-5 text-coral-600" />
              </div>
              <div>
                <span className="text-lg font-bold text-neutral-900">العقد الرسمي</span>
                <p className="text-sm text-neutral-500 font-normal">شركة العراف لتأجير السيارات</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handlePreview}
                variant="outline"
                size="sm"
                className="gap-2 border-neutral-300 hover:border-coral-400 hover:text-coral-600"
              >
                <Eye className="h-4 w-4" />
                معاينة
              </Button>
            <Button
              onClick={handlePrint}
              size="sm"
                className="gap-2 bg-rose-500 hover:bg-coral-600 text-white shadow-lg shadow-rose-500/30"
            >
              <Printer className="h-4 w-4" />
                طباعة A4
            </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* محتوى العقد للطباعة */}
      <div ref={printRef} className="print-container">
      <OfficialContractLetterDocument
        contract={contract}
        paymentSchedules={paymentSchedules}
        checkInInspection={checkInInspection}
        checkOutInspection={checkOutInspection}
      />
      </div>
    </div>
  );
};

export default OfficialContractView;
