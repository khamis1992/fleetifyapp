import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Printer, Download } from "lucide-react";
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

/**
 * Unified Printable Document Component
 * مكون موحد لطباعة المستندات (سندات القبض، الفواتير، الإيصالات)
 * 
 * Features:
 * - Professional design matching Al Arraf branding
 * - Support for receipts, invoices, and vouchers
 * - Arabic number-to-words conversion
 * - Print and PDF export functionality
 * - Consistent styling across all document types
 */

export interface PrintableDocumentData {
  // Document type and basic info
  type: 'receipt' | 'invoice' | 'voucher';
  documentNumber: string;
  date: string;
  
  // Company information
  company?: {
    name_ar?: string;
    name_en?: string;
    cr_number?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  
  // Customer information
  customer: {
    name: string;
    phone?: string;
    id_number?: string;
    vehicle_number?: string;
  };
  
  // Payment/Invoice details
  amount: number;
  currency?: string;
  paymentMethod?: 'cash' | 'check' | 'bank_transfer' | 'credit_card' | 'other';
  
  // For checks
  checkDetails?: {
    checkNumber?: string;
    bankName?: string;
    dueDate?: string;
  };
  
  // Line items (for invoices)
  items?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    total: number;
  }>;
  
  // Breakdown (for receipts)
  breakdown?: {
    rentAmount?: number;
    fineAmount?: number;
    otherCharges?: number;
  };
  
  // Additional info
  notes?: string;
  reference?: string;
  month?: string;
}

interface UnifiedPrintableDocumentProps {
  data: PrintableDocumentData;
  onPrint?: () => void;
  className?: string;
}

export const UnifiedPrintableDocument: React.FC<UnifiedPrintableDocumentProps> = ({
  data,
  onPrint,
  className = ""
}) => {
  const [amountInWords, setAmountInWords] = useState("");

  // Convert amount to Arabic words
  const convertAmountToWords = (amount: number): string => {
    const arabicOnes = [
      "", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة",
      "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", 
      "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"
    ];
    
    const arabicTens = [
      "", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"
    ];
    
    const arabicHundreds = [
      "", "مائة", "مئتان", "ثلاثمائة", "أربعمائة", "خمسمائة", 
      "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"
    ];
    
    if (amount === 0) return "صفر ريال قطري فقط";
    
    const intAmount = Math.floor(amount);
    const decimal = Math.round((amount - intAmount) * 100);
    
    const convertLessThanThousand = (num: number): string => {
      if (num === 0) return "";
      
      if (num < 20) {
        return arabicOnes[num];
      } else if (num < 100) {
        const ten = Math.floor(num / 10);
        const unit = num % 10;
        if (unit === 0) {
          return arabicTens[ten];
        } else {
          return arabicOnes[unit] + " و " + arabicTens[ten];
        }
      } else {
        const hundred = Math.floor(num / 100);
        const remainder = num % 100;
        if (remainder === 0) {
          return arabicHundreds[hundred];
        } else {
          return arabicHundreds[hundred] + " و " + convertLessThanThousand(remainder);
        }
      }
    };
    
    let result = "";
    
    if (intAmount < 1000) {
      result = convertLessThanThousand(intAmount);
    } else {
      const thousands = Math.floor(intAmount / 1000);
      const remainder = intAmount % 1000;
      
      if (thousands > 0) {
        let thousandWord = "";
        if (thousands === 1) {
          thousandWord = "ألف";
        } else if (thousands === 2) {
          thousandWord = "ألفان";
        } else if (thousands > 2 && thousands < 11) {
          thousandWord = arabicOnes[thousands] + " آلاف";
        } else {
          thousandWord = convertLessThanThousand(thousands) + " ألف";
        }
        
        result = thousandWord;
        if (remainder > 0) {
          result += " و " + convertLessThanThousand(remainder);
        }
      } else {
        result = convertLessThanThousand(intAmount);
      }
    }
    
    result += " ريال قطري";
    
    if (decimal > 0) {
      result += " و " + decimal + " درهم";
    }
    
    result += " فقط لا غير";
    
    return result;
  };

  useEffect(() => {
    setAmountInWords(convertAmountToWords(data.amount || 0));
  }, [data.amount]);

  const handlePrint = () => {
    window.print();
    onPrint?.();
  };

  // Get document title based on type
  const getDocumentTitle = () => {
    switch (data.type) {
      case 'receipt':
        return { ar: 'إيصال دفع', en: 'Payment Receipt' };
      case 'invoice':
        return { ar: 'فاتورة', en: 'Invoice' };
      case 'voucher':
        return { ar: 'سند قبض', en: 'Receipt Voucher' };
      default:
        return { ar: 'مستند', en: 'Document' };
    }
  };

  const documentTitle = getDocumentTitle();
  const currency = data.currency || 'QAR';

  // Get payment method in Arabic
  const getPaymentMethodArabic = (method?: string) => {
    switch (method) {
      case 'cash':
        return 'نقداً';
      case 'check':
        return 'شيك';
      case 'bank_transfer':
        return 'تحويل بنكي';
      case 'credit_card':
        return 'بطاقة ائتمان';
      default:
        return 'غير محدد';
    }
  };

  return (
    <div className={className}>
      {/* Print buttons - hidden when printing */}
      <div className="no-print flex justify-end gap-2 mb-4">
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          طباعة
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          تحميل PDF
        </Button>
      </div>

      <Card className="w-full max-w-4xl mx-auto bg-white shadow-lg border-2 border-slate-800 print:shadow-none print:border-0">
        {/* Header Section */}
        <CardHeader className="bg-[#004d40] text-white p-6 print:p-4">
          <div className="flex justify-between items-start flex-wrap gap-4">
            {/* Company Info */}
            <div className="space-y-1 text-left rtl:text-right">
              <h1 className="text-4xl font-black tracking-tighter">AL ARRAF</h1>
              <h2 className="text-2xl font-bold">
                {data.company?.name_ar || 'العراف لتأجير السيارات ذ.م.م'}
              </h2>
              <p className="text-sm font-light">
                {data.company?.name_en || 'CAR RENTAL L.L.C'}
              </p>
              <div className="text-xs font-mono mt-2 pt-1 border-t border-white/30">
                C.R: {data.company?.cr_number || '146832'} | DOHA-QATAR
              </div>
            </div>

            {/* Document Type & Number */}
            <div className="text-left rtl:text-right flex flex-col items-start rtl:items-end">
              <h1 className="text-3xl font-extrabold tracking-tight">{documentTitle.ar}</h1>
              <h2 className="text-xl font-light">{documentTitle.en}</h2>
              <div className="mt-4 p-2 bg-white text-[#004d40] rounded-lg text-center min-w-[120px]">
                <span className="text-sm font-medium block">رقم | NO.</span>
                <span className="text-2xl font-extrabold block">
                  {data.documentNumber}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 print:p-4">
          {/* Date */}
          <div className="flex justify-end mb-6">
            <div className="text-center">
              <div className="text-sm font-medium text-slate-600 mb-1">التاريخ | Date</div>
              <div className="text-lg font-bold text-[#004d40]">
                {format(new Date(data.date), 'dd MMMM yyyy', { locale: ar })}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Customer Information */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
              <div className="md:col-span-2 text-base font-medium text-slate-700">
                {data.type === 'voucher' 
                  ? 'استلمنا من السيد / السادة | Received From'
                  : 'اسم العميل | Customer Name'
                }
              </div>
              <div className="md:col-span-3 text-lg font-bold text-[#004d40] border-b-2 border-slate-300 pb-1">
                {data.customer.name}
              </div>
            </div>

            {data.customer.phone && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                <div className="md:col-span-2 text-base font-medium text-slate-700">
                  رقم الجوال | Phone Number
                </div>
                <div className="md:col-span-3 text-lg font-bold text-[#004d40] border-b-2 border-slate-300 pb-1">
                  {data.customer.phone}
                </div>
              </div>
            )}

            {data.customer.vehicle_number && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                <div className="md:col-span-2 text-base font-medium text-slate-700">
                  رقم المركبة | Vehicle Number
                </div>
                <div className="md:col-span-3 text-lg font-bold text-[#004d40] border-b-2 border-slate-300 pb-1">
                  {data.customer.vehicle_number}
                </div>
              </div>
            )}

            {data.month && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                <div className="md:col-span-2 text-base font-medium text-slate-700">
                  الشهر | Month
                </div>
                <div className="md:col-span-3 text-lg font-bold text-[#004d40] border-b-2 border-slate-300 pb-1">
                  {data.month}
                </div>
              </div>
            )}

            {/* Amount in Words */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
              <div className="md:col-span-2 text-base font-medium text-slate-700">
                مبلغ وقدره | The Sum of
              </div>
              <div className="md:col-span-3 text-lg font-bold text-[#004d40] border-b-2 border-slate-300 pb-1">
                {amountInWords}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Payment Method */}
          {data.paymentMethod && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-medium text-slate-600 mb-2">
                    طريقة الدفع | Payment Method
                  </div>
                  <div className="text-lg font-bold text-[#004d40]">
                    {getPaymentMethodArabic(data.paymentMethod)}
                  </div>
                </div>

                {/* Check Details */}
                {data.paymentMethod === 'check' && data.checkDetails && (
                  <div className="space-y-2">
                    {data.checkDetails.checkNumber && (
                      <div>
                        <span className="text-xs text-slate-500">شيك رقم | Cheque No.: </span>
                        <span className="font-bold">{data.checkDetails.checkNumber}</span>
                      </div>
                    )}
                    {data.checkDetails.bankName && (
                      <div>
                        <span className="text-xs text-slate-500">على بنك | On Bank: </span>
                        <span className="font-bold">{data.checkDetails.bankName}</span>
                      </div>
                    )}
                    {data.checkDetails.dueDate && (
                      <div>
                        <span className="text-xs text-slate-500">تاريخ الاستحقاق | Due Date: </span>
                        <span className="font-bold">
                          {format(new Date(data.checkDetails.dueDate), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Items (for invoices) */}
          {data.items && data.items.length > 0 && (
            <div className="mb-6">
              <table className="w-full border border-slate-300">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-300 p-2 text-right">البيان | Description</th>
                    <th className="border border-slate-300 p-2 text-center">الكمية | Qty</th>
                    <th className="border border-slate-300 p-2 text-center">السعر | Price</th>
                    <th className="border border-slate-300 p-2 text-center">المجموع | Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-slate-300 p-2">{item.description}</td>
                      <td className="border border-slate-300 p-2 text-center">{item.quantity || 1}</td>
                      <td className="border border-slate-300 p-2 text-center">
                        {(item.unitPrice || item.total || 0).toLocaleString('en-US')}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-bold">
                        {(item.total || 0).toLocaleString('en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Breakdown (for receipts) */}
          {data.breakdown && (
            <div className="mb-6 space-y-2">
              {data.breakdown.rentAmount !== undefined && (
                <div className="flex justify-between items-center p-2 border-b">
                  <span className="text-slate-700">الإيجار الشهري | Monthly Rent</span>
                  <span className="font-bold">{data.breakdown.rentAmount.toLocaleString('en-US')} {currency}</span>
                </div>
              )}
              {data.breakdown.fineAmount !== undefined && data.breakdown.fineAmount > 0 && (
                <div className="flex justify-between items-center p-2 border-b bg-red-50">
                  <span className="text-red-700">غرامة التأخير | Late Fine</span>
                  <span className="font-bold text-red-700">
                    {data.breakdown.fineAmount.toLocaleString('en-US')} {currency}
                  </span>
                </div>
              )}
              {data.breakdown.otherCharges !== undefined && data.breakdown.otherCharges > 0 && (
                <div className="flex justify-between items-center p-2 border-b">
                  <span className="text-slate-700">رسوم أخرى | Other Charges</span>
                  <span className="font-bold">{data.breakdown.otherCharges.toLocaleString('en-US')} {currency}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {data.notes && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="text-sm font-medium text-slate-600 mb-2">
                وذلك عن | Being for
              </div>
              <div className="text-base text-slate-800">
                {data.notes}
              </div>
            </div>
          )}

          {/* Total Amount */}
          <div className="mt-6 p-4 bg-[#004d40]/5 border-2 border-[#004d40] rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-slate-700">
                المبلغ الإجمالي | Total Amount
              </span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-extrabold text-[#004d40]">
                  {(data.amount || 0).toLocaleString('en-US')}
                </span>
                <Badge className="text-xl font-bold bg-[#004d40] text-white px-3 py-1">
                  {currency}
                </Badge>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-10 grid grid-cols-3 gap-10 print:mt-20">
            <div className="text-center">
              <div className="border-t-2 border-slate-400 pt-2 mt-16 text-sm text-slate-600">
                توقيع المستلم | Receiver Sign.
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-slate-400 pt-2 mt-16 text-sm text-slate-600">
                توقيع المحاسب | Accountant's Sign.
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-slate-400 pt-2 mt-16 text-sm text-slate-600">
                توقيع المدير | Manager's Sign.
              </div>
            </div>
          </div>
        </CardContent>

        {/* Footer */}
        <CardFooter className="bg-slate-800 text-white p-4 text-xs text-center print:p-2">
          <div className="max-w-xl mx-auto space-y-1">
            <p>
              {data.company?.address || 'P. O. Box: 9022 - Lusail City, Doha, Qatar | Marina twin Tower Block A-31th Floor'}
            </p>
            <div className="flex justify-center gap-4">
              <span>{data.company?.email || 'info@alaraf.com'}</span>
              <span>|</span>
              <span>alaraf.online</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              تم الطباعة بتاريخ: {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}
            </p>
          </div>
        </CardFooter>
      </Card>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          @page {
            margin: 1cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default UnifiedPrintableDocument;
