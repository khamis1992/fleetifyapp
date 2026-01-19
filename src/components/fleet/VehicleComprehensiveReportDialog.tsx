import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Printer, 
  Loader2, 
  Car, 
  AlertTriangle, 
  FileCheck,
  Gavel
} from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface VehicleComprehensiveReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
}

export const VehicleComprehensiveReportDialog: React.FC<VehicleComprehensiveReportDialogProps> = ({
  open,
  onOpenChange,
  vehicleId,
}) => {
  const { formatCurrency } = useCurrencyFormatter();

  // جلب بيانات المركبة
  const { data: vehicle, isLoading: loadingVehicle } = useQuery({
    queryKey: ['vehicle-report-details', vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!vehicleId,
  });

  // جلب العقود
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ['vehicle-report-contracts', vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          customers (
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name,
            company_name_ar,
            phone,
            national_id,
            country
          )
        `)
        .eq('vehicle_id', vehicleId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!vehicleId,
  });

  // جلب المخالفات (من جدول penalties للحصول على العلاقات)
  const { data: violations = [], isLoading: loadingViolations } = useQuery({
    queryKey: ['vehicle-report-violations', vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('penalties')
        .select(`
          *,
          customers (
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name,
            company_name_ar,
            phone
          ),
          contracts (
            contract_number
          )
        `)
        .eq('vehicle_id', vehicleId)
        .order('penalty_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!vehicleId,
  });

  const isLoading = loadingVehicle || loadingContracts || loadingViolations;

  const stats = useMemo(() => {
    const totalViolationsAmount = violations.reduce((sum, v) => sum + (v.amount || 0), 0);
    const unpaidViolationsAmount = violations
      .filter(v => v.payment_status !== 'paid')
      .reduce((sum, v) => sum + (v.amount || 0), 0);
    
    return {
      totalViolationsAmount,
      unpaidViolationsAmount,
      violationsCount: violations.length,
      contractsCount: contracts.length
    };
  }, [violations, contracts]);

  const getCustomerName = (customer: any) => {
    if (!customer) return 'غير محدد';
    const nameAr = customer.company_name_ar || `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim();
    if (nameAr) return nameAr;
    return customer.company_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير محدد';
  };

  const handleLegalAction = async (contract: any) => {
    try {
      const customerName = getCustomerName(contract.customers);
      const today = new Date().toLocaleDateString('ar-QA', { year: 'numeric', month: 'long', day: 'numeric' });
      
      // Generate reference number
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const random = Math.floor(Math.random() * 9000) + 1000;
      const refNumber = `ALR-TR/${year}/${month}/${random}`;

      const COMPANY_INFO = {
        name_ar: 'شركة العراف لتأجير السيارات',
        name_en: 'AL-ARAF CAR RENTAL L.L.C',
        logo: '/receipts/logo.png',
        address: 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
        phone: '+974 3141 1919',
        email: 'info@alaraf.qa',
        cr: '146832',
        authorized_signatory: 'أسامة أحمد البشرى',
        authorized_title: 'المخول بالتوقيع',
      };

      const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>طلب تحويل مخالفات - ${customerName}</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <style>
    @page {
      size: A4;
      margin: 15mm 20mm 20mm 20mm;
    }
    
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body { margin: 0; padding: 0; }
      .letter-container {
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
      }
    }
    
    body {
      font-family: 'Traditional Arabic', 'Times New Roman', 'Arial', serif;
      font-size: 14px;
      line-height: 1.8;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 20px;
      direction: rtl;
    }
    
    .letter-container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px 30px;
      background: #fff;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px double #1e3a5f;
      padding-bottom: 15px;
      margin-bottom: 15px;
    }
    
    .company-ar { flex: 1; text-align: right; }
    .company-ar h1 { color: #1e3a5f; margin: 0; font-size: 20px; font-weight: bold; }
    .company-ar p { color: #000; margin: 2px 0; font-size: 11px; }
    
    .logo-container { flex: 0 0 130px; text-align: center; padding: 0 15px; }
    .logo-container img { max-height: 70px; max-width: 120px; }
    
    .company-en { flex: 1; text-align: left; }
    .company-en h1 { color: #1e3a5f; margin: 0; font-size: 14px; font-weight: bold; }
    .company-en p { color: #000; margin: 2px 0; font-size: 10px; }
    
    .address-bar {
      text-align: center;
      color: #000;
      font-size: 10px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #ccc;
    }
    
    .ref-date {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      font-size: 13px;
      color: #000;
    }
    
    .subject-box {
      background: #1e3a5f;
      color: #fff;
      padding: 10px 15px;
      margin-bottom: 20px;
      font-size: 14px;
      text-align: center;
      font-weight: bold;
    }
    
    .info-box {
      background: #f5f5f5;
      padding: 10px 15px;
      margin-bottom: 15px;
      border-radius: 5px;
      border-right: 4px solid #1e3a5f;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      line-height: 1.4;
    }
    
    .info-label { font-weight: bold; color: #555; min-width: 100px; }
    
    .section {
      margin: 20px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .info-box {
      background: #f5f5f5;
      padding: 10px 15px;
      margin-bottom: 15px;
      border-radius: 5px;
      border-right: 4px solid #1e3a5f;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .signature-section {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      page-break-inside: avoid;
      break-inside: avoid;
    }
      <div class="info-row">
        <span class="info-label">إلى:</span>
        <span>السيد / رئيس نيابة المرور المحترم - الدوحة</span>
      </div>
      <div class="info-row">
        <span class="info-label">الموضوع:</span>
        <span>تحويل مخالفات مرورية</span>
      </div>
      <div class="info-row">
        <span class="info-label">المدعى عليه:</span>
        <span>${customerName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">الجنسية:</span>
        <span>${contract.customers?.country || 'غير محدد'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">رقم الهوية:</span>
        <span>${contract.customers?.national_id || '-'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">رقم الجوال:</span>
        <span dir="ltr">${contract.customers?.phone || '-'}</span>
      </div>
    </div>

    <!-- Section 1: المقدمة والوقائع -->
    <div class="section">
      <div class="section-title">أولاً: الوقائع</div>
      <div class="section-content">
        <p>
          تحية طيبة وبعد،،،
        </p>
        <p>
          نتقدم إلى سعادتكم بطلب تحويل المخالفات المرورية ضد الشخص المذكور أعلاه،
          والذي قام باستئجار مركبة من شركة العراف لتأجير السيارات بموجب العقد رقم <strong>(${contract.contract_number})</strong> المبرم بين الطرفين بتاريخ <strong>${contract.start_date ? new Date(contract.start_date).toLocaleDateString('ar-QA') : '-'}</strong>.
        </p>
        <p>
          علماً بأنه تم إرجاع المركبة بتاريخ <strong>${contract.end_date ? new Date(contract.end_date).toLocaleDateString('ar-QA') : 'لا يزال العقد سارياً'}</strong>،
          ولم يلتزم بسداد المخالفات المرورية المترتبة على استخدامه للمركبة،
          وقد حاولنا التواصل معه عدة مرات لسداد المستحقات ولكن دون استجابة.
        </p>
      </div>
    </div>

    <!-- Section 2: بيانات المركبة -->
    <div class="section">
      <div class="section-title">ثانياً: بيانات المركبة</div>
      <div class="section-content">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div><strong>نوع المركبة:</strong> ${vehicle?.make} ${vehicle?.model}</div>
          <div><strong>سنة الصنع:</strong> ${vehicle?.year}</div>
          <div><strong>رقم اللوحة:</strong> ${vehicle?.plate_number}</div>
          <div><strong>نوع اللوحة:</strong> خصوصي</div>
        </div>
      </div>
    </div>

    <!-- Section 3: المرفقات -->
    <div class="section">
      <div class="section-title">ثالثاً: المرفقات</div>
      <div class="section-content">
        <ul style="margin: 0; padding-right: 20px;">
          <li>صورة من عقد الإيجار</li>
          <li>صورة من البطاقة الشخصية للمستأجر</li>
          <li>كشف بالمخالفات المرورية</li>
        </ul>
      </div>
    </div>

    <!-- Section 4: الطلب الختامي -->
    <div class="section">
      <div class="section-title">رابعاً: الطلب</div>
      <div class="section-content">
        <p>
          لذا نرجو من سيادتكم التكرم بالموافقة على تحويل المخالفات المرورية إلى رقمه الشخصي <strong>(${contract.customers?.national_id || '-'})</strong>، واتخاذ الإجراءات القانونية اللازمة ضده.
        </p>
      </div>
    </div>

    <!-- الختام -->
    <div class="closing">
      <p>وتفضلوا بقبول فائق الاحترام والتقدير،،،</p>
    </div>
    
    <!-- التوقيع -->
    <div class="signature-section">
      <div class="stamp-area">
        <div class="stamp-circle">
          <span>مكان الختم</span>
        </div>
      </div>
      
      <div class="signatory">
        <p class="company-name">${COMPANY_INFO.name_ar}</p>
        <div class="line">
          <p class="name">${COMPANY_INFO.authorized_signatory}</p>
          <p class="title">${COMPANY_INFO.authorized_title}</p>
        </div>
      </div>
      
      <div class="sign-area">
        <div class="sign-line"></div>
        <span>التوقيع</span>
      </div>
    </div>
    
    <!-- الذيل -->
    <div class="footer">
      ${COMPANY_INFO.address}<br/>
      هاتف: ${COMPANY_INFO.phone} | البريد: ${COMPANY_INFO.email}
    </div>

  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Error generating legal request:', error);
      toast.error('حدث خطأ أثناء إنشاء الطلب');
    }
  };

  const generateHTMLReport = () => {
    if (!vehicle) return;

    const currentDate = new Date().toLocaleDateString('ar-QA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تقرير شامل للمركبة - ${vehicle.plate_number}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        
        body {
            font-family: 'Cairo', sans-serif;
            padding: 20px;
            background: #fff;
            color: #1a1a2e;
            max-width: 210mm;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f3f4f6;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: 700;
            color: #1a1a2e;
            margin-bottom: 10px;
        }
        
        .report-title {
            font-size: 20px;
            font-weight: 600;
            color: #f97316;
            margin-bottom: 5px;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: 700;
            background: #f8fafc;
            padding: 10px 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            border-right: 4px solid #f97316;
            display: flex;
            justify-content: space-between;
        }
        
        .vehicle-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .info-item {
            background: #fff;
            border: 1px solid #e2e8f0;
            padding: 10px;
            border-radius: 6px;
        }
        
        .info-label {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 4px;
        }
        
        .info-value {
            font-weight: 600;
            font-size: 14px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 10px;
        }
        
        th {
            background: #1a1a2e;
            color: white;
            padding: 10px;
            text-align: right;
        }
        
        td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
        }
        
        tr:nth-child(even) {
            background: #f8fafc;
        }
        
        .badge {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 600;
        }
        
        .badge-paid { background: #dcfce7; color: #166534; }
        .badge-unpaid { background: #fee2e2; color: #991b1b; }
        .badge-active { background: #dbeafe; color: #1e40af; }
        .badge-closed { background: #f3f4f6; color: #4b5563; }
        
        .total-box {
            background: #fff7ed;
            border: 1px solid #ffedd5;
            padding: 15px;
            border-radius: 8px;
            text-align: left;
            margin-top: 10px;
        }
        
        .print-btn {
            display: block;
            margin: 20px auto;
            padding: 10px 20px;
            background: #1a1a2e;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
        }
        
        @media print {
            .print-btn { display: none; }
            body { padding: 0; }
        }
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">طباعة التقرير</button>

    <div class="header">
        <div class="company-name">شركة العراف لتأجير السيارات</div>
        <div class="report-title">تقرير شامل للمركبة</div>
        <div>تاريخ التقرير: ${currentDate}</div>
    </div>

    <div class="section">
        <div class="section-title">بيانات المركبة</div>
        <div class="vehicle-grid">
            <div class="info-item">
                <div class="info-label">المركبة</div>
                <div class="info-value">${vehicle.make} ${vehicle.model} ${vehicle.year || ''}</div>
            </div>
            <div class="info-item">
                <div class="info-label">رقم اللوحة</div>
                <div class="info-value" style="font-family: monospace;">${vehicle.plate_number}</div>
            </div>
            <div class="info-item">
                <div class="info-label">رقم الهيكل (VIN)</div>
                <div class="info-value" style="font-family: monospace;">${vehicle.vin || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">اللون</div>
                <div class="info-value">${vehicle.color || '-'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">العداد الحالي</div>
                <div class="info-value">${vehicle.current_mileage?.toLocaleString()} كم</div>
            </div>
            <div class="info-item">
                <div class="info-label">الحالة</div>
                <div class="info-value">${vehicle.status === 'available' ? 'متاحة' : 'غير متاحة'}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">
            <span>المخالفات المرورية</span>
            <span>العدد: ${violations.length}</span>
        </div>
        ${violations.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>رقم المخالفة</th>
                    <th>التاريخ</th>
                    <th>نوع المخالفة</th>
                    <th>المبلغ</th>
                    <th>حالة الدفع</th>
                    <th>المسؤول (العميل)</th>
                    <th>رقم العقد</th>
                </tr>
            </thead>
            <tbody>
                ${violations.map(v => `
                <tr>
                    <td>${v.penalty_number || '-'}</td>
                    <td>${v.penalty_date ? new Date(v.penalty_date).toLocaleDateString('en-GB') : '-'}</td>
                    <td>${v.violation_type || v.reason || '-'}</td>
                    <td>${formatCurrency(v.amount || 0)}</td>
                    <td><span class="badge ${v.payment_status === 'paid' ? 'badge-paid' : 'badge-unpaid'}">${v.payment_status === 'paid' ? 'مسددة' : 'غير مسددة'}</span></td>
                    <td>${getCustomerName(v.customers)}</td>
                    <td>${v.contracts?.contract_number || '-'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="total-box">
            <strong>إجمالي المخالفات المستحقة:</strong> ${formatCurrency(stats.unpaidViolationsAmount)}
        </div>
        ` : '<p style="text-align: center; color: #666;">لا توجد مخالفات مسجلة لهذه المركبة</p>'}
    </div>

    <div class="section">
        <div class="section-title">
            <span>سجل العقود</span>
            <span>العدد: ${contracts.length}</span>
        </div>
        ${contracts.length > 0 ? `
        <table>
            <thead>
                <tr>
                    <th>رقم العقد</th>
                    <th>العميل</th>
                    <th>رقم الجوال</th>
                    <th>الرقم الشخصي</th>
                    <th>تاريخ البداية</th>
                    <th>تاريخ النهاية</th>
                    <th>المبلغ الشهري</th>
                </tr>
            </thead>
            <tbody>
                ${contracts.map(c => `
                <tr>
                    <td>${c.contract_number}</td>
                    <td>${getCustomerName(c.customers)}</td>
                    <td dir="ltr" style="text-align: right;">${c.customers?.phone || '-'}</td>
                    <td>${c.customers?.national_id || '-'}</td>
                    <td>${c.start_date ? new Date(c.start_date).toLocaleDateString('en-GB') : '-'}</td>
                    <td>${c.end_date ? new Date(c.end_date).toLocaleDateString('en-GB') : '-'}</td>
                    <td>${formatCurrency(c.monthly_amount || 0)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : '<p style="text-align: center; color: #666;">لا توجد عقود مسجلة لهذه المركبة</p>'}
    </div>

    <div style="margin-top: 50px; border-top: 1px solid #ddd; padding-top: 20px; display: flex; justify-content: space-between;">
        <div>توقيع الموظف المسؤول</div>
        <div>ختم الشركة</div>
    </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            تقرير شامل للمركبة
          </DialogTitle>
          <DialogDescription>
            يتضمن التقرير بيانات المركبة، المخالفات المرورية، والعقود المرتبطة
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2 text-slate-600">
                  <Car className="w-4 h-4" />
                  <span>المركبة</span>
                </div>
                <div className="font-bold text-lg">{vehicle?.make} {vehicle?.model}</div>
                <div className="text-sm text-slate-500">{vehicle?.plate_number}</div>
              </div>
              
              <div className="p-4 bg-slate-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2 text-slate-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>ملخص المخالفات</span>
                </div>
                <div className="font-bold text-lg text-red-600">{formatCurrency(stats.unpaidViolationsAmount)}</div>
                <div className="text-sm text-slate-500">مبالغ غير مسددة ({violations.length} مخالفة)</div>
              </div>
            </div>

            {/* Contracts List for Legal Action */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b font-medium text-sm flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                سجل العقود (اختر عقد لإنشاء طلب تحويل مخالفات)
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-right">رقم العقد</th>
                      <th className="px-4 py-2 text-right">العميل</th>
                      <th className="px-4 py-2 text-right">التاريخ</th>
                      <th className="px-4 py-2 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {contracts.map((contract) => (
                      <tr key={contract.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium">{contract.contract_number}</td>
                        <td className="px-4 py-2">{getCustomerName(contract.customers)}</td>
                        <td className="px-4 py-2 text-slate-500">
                          {contract.start_date ? new Date(contract.start_date).toLocaleDateString('en-GB') : '-'}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLegalAction(contract)}
                            title="إجراء قانوني (تحويل مخالفات)"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Gavel className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {contracts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                          لا توجد عقود مسجلة
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button onClick={() => onOpenChange(false)} variant="outline">
                إلغاء
              </Button>
              <Button onClick={generateHTMLReport} className="gap-2 bg-primary">
                <Printer className="w-4 h-4" />
                طباعة التقرير
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
