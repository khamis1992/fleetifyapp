import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Printer, 
  FileText, 
  Banknote, 
  CreditCard,
  Building,
  User
} from "lucide-react";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { EnhancedPaymentData } from "@/schemas/payment.schema";

interface CashReceiptVoucherProps {
  payment?: EnhancedPaymentData;
  onPrint?: () => void;
  className?: string;
}

export const CashReceiptVoucher: React.FC<CashReceiptVoucherProps> = ({
  payment,
  onPrint,
  className = ""
}) => {
  const { formatCurrency } = useCurrencyFormatter();
  const [isCheque, setIsCheque] = useState(payment?.payment_method === 'check');
  const [amountInWords, setAmountInWords] = useState("");
  
  // Convert amount to words in Arabic
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
    
    // Function to convert a number less than 1000 to words
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
          return `${arabicOnes[unit]} و ${arabicTens[ten]}`;
        }
      } else {
        const hundred = Math.floor(num / 100);
        const remainder = num % 100;
        if (remainder === 0) {
          return arabicHundreds[hundred];
        } else {
          return `${arabicHundreds[hundred]} و ${convertLessThanThousand(remainder)}`;
        }
      }
    };
    
    // Convert the integer part
    let result = "";
    
    if (intAmount < 1000) {
      result = convertLessThanThousand(intAmount);
    } else {
      // For simplicity, we'll handle up to thousands
      const thousands = Math.floor(intAmount / 1000);
      const remainder = intAmount % 1000;
      
      if (thousands > 0) {
        let thousandWord = "";
        if (thousands === 1) {
          thousandWord = "ألف";
        } else if (thousands === 2) {
          thousandWord = "ألفان";
        } else if (thousands > 2 && thousands < 11) {
          thousandWord = `${arabicOnes[thousands]} آلاف`;
        } else {
          thousandWord = `${convertLessThanThousand(thousands)} ألف";
        }
        
        result = thousandWord;
        if (remainder > 0) {
          result += ` و ${convertLessThanThousand(remainder)}`;
        }
      } else {
        result = convertLessThanThousand(remainder);
      }
    }
    
    // Add currency
    result += " ريال قطري";
    
    // Add decimal part if exists
    if (decimal > 0) {
      result += ` و ${decimal} درهم`;
    }
    
    result += " فقط لا غير";
    
    return result;
  };

  useEffect(() => {
    if (payment?.amount) {
      setAmountInWords(convertAmountToWords(payment.amount));
    }
  }, [payment?.amount]);

  const togglePaymentMethod = (value: string) => {
    setIsCheque(value === 'check');
  };

  return (
    <Card className={`w-full max-w-4xl mx-auto bg-white shadow-lg border-2 border-gray-800 ${className}`}>
      {/* Header Section */}
      <CardHeader className="bg-[#004d40] text-white p-6 flex justify-between items-center flex-wrap">
        <div className="space-y-1 text-left rtl:text-right">
          <h1 className="text-4xl font-black tracking-tighter">AL ARRAF</h1>
          <h2 className="text-2xl font-bold">العراف لتأجير السيارات ذ.م.م</h2>
          <p className="text-sm font-light">CAR RENTAL L.L.C</p>
          <div className="text-xs font-mono mt-2 pt-1 border-t border-white/30">C.R: 146832 | DOHA-QATAR</div>
        </div>
        <div className="text-left rtl:text-right pt-4 sm:pt-0 flex flex-col items-start rtl:items-end">
          <h1 className="text-3xl font-extrabold tracking-tight">سند قبض</h1>
          <h2 className="text-xl font-light">Receipt Voucher</h2>
          <div className="mt-4 p-2 bg-white text-[#004d40] rounded-lg text-center">
            <span className="text-sm font-medium block">رقم | NO.</span>
            <span className="text-2xl font-extrabold block">
              {payment?.payment_number || "00000"}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Date Input */}
        <div className="flex justify-end mb-6">
          <div className="w-full sm:w-1/3">
            <Label className="block text-sm font-medium text-gray-600 mb-1">التاريخ | Date</Label>
            <div className="relative">
              <Input
                type="date"
                value={payment?.payment_date || new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-lg p-2 text-base text-center font-medium"
                readOnly
              />
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Client & Sum Received */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            <Label className="md:col-span-2 text-base font-medium text-gray-700 flex items-center gap-2">
              <User className="h-5 w-5" />
              استلمنا من السيد / السادة | Received From Mr. / M/s.
            </Label>
            <Input
              type="text"
              value={payment?.customer_id ? "Customer Name" : ""}
              placeholder="اسم العميل"
              className="md:col-span-3 w-full border-b border-gray-400 p-1 text-lg font-bold text-[#004d40] focus:border-[#004d40] focus:ring-0 bg-white"
              readOnly
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            <Label className="md:col-span-2 text-base font-medium text-gray-700">مبلغ وقدره ( ريال قطري ) | The Sum of (Q.Rls.)</Label>
            <Input
              type="text"
              value={amountInWords}
              placeholder="بالأحرف - مثال: ثلاثة آلاف ريال قطري فقط لا غير"
              className="md:col-span-3 w-full border-b border-gray-400 p-1 text-lg font-bold text-[#004d40] focus:border-[#004d40] focus:ring-0 bg-white"
              readOnly
            />
          </div>
        </div>

        {/* Payment Details (Cash/Cheque) */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label className="block text-sm font-medium text-gray-600 mb-2">طريقة الدفع | Payment Method</Label>
            <RadioGroup 
              defaultValue={payment?.payment_method || "cash"} 
              onValueChange={togglePaymentMethod}
              className="flex space-x-4 space-x-reverse"
            >
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="cash" id="cash" className="text-[#004d40]" />
                <Label htmlFor="cash" className="flex items-center space-x-2 space-x-reverse text-base font-medium cursor-pointer">
                  <Banknote className="h-5 w-5" />
                  <span>نقداً | By Cash</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="check" id="check" className="text-[#004d40]" />
                <Label htmlFor="check" className="flex items-center space-x-2 space-x-reverse text-base font-medium cursor-pointer">
                  <CreditCard className="h-5 w-5" />
                  <span>شيك | By Cheque</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Cheque Details (Hidden by default) */}
          <div className={`space-y-3 transition duration-300 ${isCheque ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div>
              <Label className="block text-xs font-medium text-gray-500 mb-1">شيك رقم | Cheque No.</Label>
              <Input
                type="text"
                value={payment?.check_number || ""}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm text-center"
                readOnly
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="block text-xs font-medium text-gray-500 mb-1">على بنك | On Bank</Label>
                <div className="relative">
                  <Input
                    type="text"
                    value={payment?.bank_account || ""}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm text-center"
                    readOnly
                  />
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div>
                <Label className="block text-xs font-medium text-gray-500 mb-1">تاريخ الاستحقاق | Due Date</Label>
                <Input
                  type="date"
                  value={""}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm text-center"
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>

        {/* Amount and Being For */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Label className="block text-sm font-medium text-gray-600 mb-1">وذلك عن | Being for</Label>
            <Textarea
              value={payment?.notes || "إيجار شهر"}
              rows={3}
              placeholder="تفاصيل سبب القبض (إيجار شهر، دفع دفعة مقدمة...)"
              className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none"
              readOnly
            />
          </div>

          <div className="md:col-span-1 space-y-3">
            <Label className="block text-sm font-medium text-gray-600 mb-1 text-center">المبلغ | Amount</Label>
            <div className="flex justify-between items-center text-xl p-3 rounded-lg border-2 border-[#004d40] bg-[#004d40]/5">
              <span className="font-extrabold text-[#004d40]">
                {payment?.amount ? formatCurrency(payment.amount) : "0.00"}
              </span>
              <Badge className="font-bold text-[#004d40] text-2xl bg-white">QR</Badge>
            </div>
            <div className="flex justify-around text-xs font-medium text-gray-500">
              <Badge variant="default" className="px-2 py-1 rounded-lg bg-[#004d40] text-white">ريال QR</Badge>
              <Badge variant="outline" className="px-2 py-1 rounded-lg border border-gray-300 text-gray-500">درهم Dh</Badge>
            </div>
          </div>
        </div>

        {/* Signature Lines */}
        <div className="mt-10 grid grid-cols-3 gap-10">
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2 text-sm text-gray-500">توقيع المستلم | Receiver Sign.</div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2 text-sm text-gray-500">توقيع المحاسب | Accountant's Sign.</div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2 text-sm text-gray-500">توقيع المدير | Manager's Sign.</div>
          </div>
        </div>
      </CardContent>

      {/* Footer Contact Info */}
      <CardFooter className="bg-gray-800 text-white p-4 text-xs text-center">
        <div className="max-w-xl mx-auto space-y-1">
          <p>P. O. Box: 9022 - Lusail City, Doha, Qatar | Marina twin Tower Block A-31th Floor</p>
          <div className="flex justify-center space-x-4 space-x-reverse">
            <span>alaraf.online</span>
            <span>|</span>
            <span>info@alaraf.com</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};