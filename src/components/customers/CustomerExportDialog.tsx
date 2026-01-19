/**
 * مكون حوار تصدير بيانات العملاء
 * يوفر خيارات لتصدير البيانات بتنسيقات مختلفة مع فلترة متقدمة
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Customer, CustomerFilters } from '@/types/customer';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Users,
  FileCheck,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  filters: CustomerFilters;
}

// ===== التحقق من صحة رقم الهوية (11 رقم) =====
const isValidNationalId = (nationalId: string | null | undefined): boolean => {
  if (!nationalId) return false;
  const cleaned = nationalId.replace(/\D/g, '');
  return cleaned.length === 11;
};

// ===== التحقق من صحة رقم الجوال =====
const isValidPhone = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 8) return true;
  if (cleaned.length === 11 && cleaned.startsWith('974')) return true;
  if (cleaned.length === 12 && cleaned.startsWith('00974')) return true;
  return false;
};

// ===== تحديد المعلومات الناقصة للعميل =====
const getMissingFields = (customer: Customer): string[] => {
  const missing: string[] = [];
  
  if (customer.customer_type === 'individual') {
    if (!customer.first_name_ar && !customer.first_name) missing.push('الاسم');
    if (!customer.last_name_ar && !customer.last_name) missing.push('اسم العائلة');
    if (!customer.national_id) missing.push('رقم الهوية');
  } else {
    if (!customer.company_name_ar && !customer.company_name) missing.push('اسم الشركة');
  }
  
  if (!customer.phone) missing.push('رقم الهاتف');
  if (!customer.email) missing.push('البريد الإلكتروني');
  if (!customer.address) missing.push('العنوان');
  
  return missing;
};

// ===== تحديد الحقول ذات الأخطاء =====
const getInvalidFields = (customer: Customer): string[] => {
  const invalid: string[] = [];
  
  if (customer.national_id && !isValidNationalId(customer.national_id)) {
    invalid.push('رقم الهوية (يجب 11 رقم)');
  }
  
  if (customer.phone && !isValidPhone(customer.phone)) {
    invalid.push('رقم الجوال (يجب 8 أرقام أو 974XXXXXXXX)');
  }
  
  return invalid;
};

type ExportFormat = 'csv' | 'excel';
type FilterOption = 'all' | 'active_contracts' | 'traffic_violations' | 'both';

const CustomerExportDialog: React.FC<CustomerExportDialogProps> = ({
  open,
  onOpenChange,
  companyId,
  filters,
}) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [isExporting, setIsExporting] = useState(false);

  // جلب العملاء مع العقود السارية
  const { data: customersWithActiveContracts = [] } = useQuery({
    queryKey: ['customers-with-active-contracts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('contracts')
        .select('customer_id')
        .eq('company_id', companyId)
        .eq('status', 'active');
      if (error) return [];
      return [...new Set(data?.map(c => c.customer_id) || [])];
    },
    enabled: open && !!companyId,
  });

  // جلب العملاء مع مخالفات مرورية
  const { data: customersWithViolations = [] } = useQuery({
    queryKey: ['customers-with-violations', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('traffic_violations')
        .select(`
          contract:contracts!contract_id(customer_id)
        `)
        .eq('company_id', companyId);
      if (error) return [];
      const customerIds = data
        ?.map(v => v.contract?.customer_id)
        .filter(Boolean) || [];
      return [...new Set(customerIds)];
    },
    enabled: open && !!companyId,
  });

  const handleExport = async () => {
    if (!companyId) {
      toast.error('لا يمكن تصدير البيانات - لا يوجد معرف الشركة');
      return;
    }

    setIsExporting(true);

    try {
      toast.loading('جاري تحضير البيانات للتصدير...');

      // جلب جميع العملاء
      let query = supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId);

      if (!filters.includeInactive) {
        query = query.eq('is_active', true);
      }

      if (filters.customer_type && filters.customer_type !== 'all') {
        query = query.eq('customer_type', filters.customer_type);
      }

      const searchText = filters.search || filters.searchTerm;
      if (searchText) {
        const searchWords = searchText.trim().split(/\s+/).filter((w: string) => w.length > 0);
        const primarySearchWord = searchWords[searchWords.length - 1];

        query = query.or(
          `first_name.ilike.%${primarySearchWord}%,` +
          `last_name.ilike.%${primarySearchWord}%,` +
          `first_name_ar.ilike.%${primarySearchWord}%,` +
          `last_name_ar.ilike.%${primarySearchWord}%,` +
          `company_name.ilike.%${searchText}%,` +
          `phone.ilike.%${searchText}%,` +
          `email.ilike.%${searchText}%,` +
          `customer_code.ilike.%${searchText}%`
        );
      }

      query = query.order('created_at', { ascending: false });

      const { data: allCustomers, error } = await query;

      if (error) throw error;

      let customersToExport = allCustomers || [];

      // تطبيق الفلترة
      if (filterOption === 'active_contracts') {
        customersToExport = customersToExport.filter(c => 
          customersWithActiveContracts.includes(c.id)
        );
      } else if (filterOption === 'traffic_violations') {
        customersToExport = customersToExport.filter(c => 
          customersWithViolations.includes(c.id)
        );
      } else if (filterOption === 'both') {
        customersToExport = customersToExport.filter(c => 
          customersWithActiveContracts.includes(c.id) || 
          customersWithViolations.includes(c.id)
        );
      }

      if (!customersToExport.length) {
        toast.dismiss();
        toast.error('لا يوجد عملاء مطابقين للفلاتر المحددة');
        setIsExporting(false);
        return;
      }

      // جلب تفاصيل العقود والمخالفات لكل عميل
      const customerIds = customersToExport.map(c => c.id);

      // جلب العقود السارية
      const { data: activeContracts } = await supabase
        .from('contracts')
        .select('customer_id, contract_number, start_date, end_date, vehicle_id, vehicles(plate_number, make, model)')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .in('customer_id', customerIds);

      // جلب المخالفات
      const { data: violations } = await supabase
        .from('traffic_violations')
        .select(`
          amount,
          violation_date,
          violation_type,
          status,
          contract:contracts!contract_id(customer_id)
        `)
        .eq('company_id', companyId);

      // إنشاء خريطة للبيانات
      const contractsMap = new Map<string, any[]>();
      activeContracts?.forEach(c => {
        if (!contractsMap.has(c.customer_id)) {
          contractsMap.set(c.customer_id, []);
        }
        contractsMap.get(c.customer_id)?.push(c);
      });

      const violationsMap = new Map<string, any[]>();
      violations?.forEach(v => {
        const customerId = v.contract?.customer_id;
        if (customerId && customerIds.includes(customerId)) {
          if (!violationsMap.has(customerId)) {
            violationsMap.set(customerId, []);
          }
          violationsMap.get(customerId)?.push(v);
        }
      });

      if (exportFormat === 'csv') {
        await exportToCSV(customersToExport, contractsMap, violationsMap);
      } else {
        await exportToExcel(customersToExport, contractsMap, violationsMap);
      }

      toast.dismiss();
      toast.success(`تم تصدير ${customersToExport.length} عميل بنجاح`);
      onOpenChange(false);
    } catch (error: any) {
      toast.dismiss();
      console.error('Export error:', error);
      toast.error(error.message || 'فشل تصدير البيانات');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = async (
    customers: Customer[],
    contractsMap: Map<string, any[]>,
    violationsMap: Map<string, any[]>
  ) => {
    const headers = [
      'كود العميل',
      'الاسم',
      'نوع العميل',
      'الهاتف',
      'البريد الإلكتروني',
      'رقم الهوية',
      'العنوان',
      'الحالة',
      'VIP',
      'عدد العقود السارية',
      'عدد المخالفات',
      'إجمالي المخالفات (ريال)',
      'البيانات الناقصة',
      'ملاحظات',
    ];

    const rows = customers.map(customer => {
      const customerName = customer.customer_type === 'individual'
        ? `${customer.first_name_ar || customer.first_name || ''} ${customer.last_name_ar || customer.last_name || ''}`.trim()
        : customer.company_name_ar || customer.company_name || '';

      const contracts = contractsMap.get(customer.id) || [];
      const customerViolations = violationsMap.get(customer.id) || [];
      const totalViolationsAmount = customerViolations.reduce((sum, v) => sum + (v.amount || 0), 0);
      
      const missingFields = getMissingFields(customer);
      const invalidFields = getInvalidFields(customer);

      return [
        customer.customer_code || '',
        customerName,
        customer.customer_type === 'individual' ? 'فرد' : 'شركة',
        customer.phone || '',
        customer.email || '',
        customer.national_id || '',
        customer.address || '',
        customer.is_active ? 'نشط' : 'غير نشط',
        customer.is_vip ? 'نعم' : 'لا',
        contracts.length.toString(),
        customerViolations.length.toString(),
        totalViolationsAmount.toString(),
        missingFields.length > 0 ? missingFields.join('، ') : '✓ مكتمل',
        invalidFields.length > 0 ? invalidFields.join('، ') : '',
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = async (
    customers: Customer[],
    contractsMap: Map<string, any[]>,
    violationsMap: Map<string, any[]>
  ) => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Fleetify';
    workbook.created = new Date();

    // ورقة العملاء الرئيسية
    const mainSheet = workbook.addWorksheet('تقرير العملاء', {
      views: [{ rightToLeft: true }]
    });

    mainSheet.columns = [
      { header: 'كود العميل', key: 'code', width: 15 },
      { header: 'الاسم', key: 'name', width: 30 },
      { header: 'نوع العميل', key: 'type', width: 12 },
      { header: 'الهاتف', key: 'phone', width: 18 },
      { header: 'البريد الإلكتروني', key: 'email', width: 30 },
      { header: 'رقم الهوية', key: 'national_id', width: 18 },
      { header: 'العنوان', key: 'address', width: 35 },
      { header: 'الحالة', key: 'status', width: 10 },
      { header: 'VIP', key: 'vip', width: 8 },
      { header: 'عدد العقود السارية', key: 'active_contracts', width: 18 },
      { header: 'عدد المخالفات', key: 'violations_count', width: 15 },
      { header: 'إجمالي المخالفات (ريال)', key: 'violations_total', width: 20 },
      { header: 'البيانات الناقصة', key: 'missing', width: 40 },
      { header: 'ملاحظات', key: 'notes', width: 45 },
    ];

    // تنسيق رأس الجدول
    const headerRow = mainSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D9488' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 28;

    let customersWithMissingData = 0;
    let customersWithViolationsCount = 0;

    customers.forEach(customer => {
      const customerName = customer.customer_type === 'individual'
        ? `${customer.first_name_ar || customer.first_name || ''} ${customer.last_name_ar || customer.last_name || ''}`.trim()
        : customer.company_name_ar || customer.company_name || '';

      const contracts = contractsMap.get(customer.id) || [];
      const customerViolations = violationsMap.get(customer.id) || [];
      const totalViolationsAmount = customerViolations.reduce((sum, v) => sum + (v.amount || 0), 0);
      
      const missingFields = getMissingFields(customer);
      const invalidFields = getInvalidFields(customer);
      const hasMissingData = missingFields.length > 0;
      const hasViolations = customerViolations.length > 0;
      
      if (hasMissingData) customersWithMissingData++;
      if (hasViolations) customersWithViolationsCount++;

      const row = mainSheet.addRow({
        code: customer.customer_code || '',
        name: customerName,
        type: customer.customer_type === 'individual' ? 'فرد' : 'شركة',
        phone: customer.phone || '',
        email: customer.email || '',
        national_id: customer.national_id || '',
        address: customer.address || '',
        status: customer.is_active ? 'نشط' : 'غير نشط',
        vip: customer.is_vip ? 'نعم' : 'لا',
        active_contracts: contracts.length,
        violations_count: customerViolations.length,
        violations_total: totalViolationsAmount,
        missing: hasMissingData ? missingFields.join('، ') : '✓ مكتمل',
        notes: invalidFields.length > 0 ? invalidFields.join('، ') : '',
      });

      // تلوين خلية رقم الهوية إذا كان التنسيق خاطئ
      if (customer.national_id && !isValidNationalId(customer.national_id)) {
        const nationalIdCell = row.getCell('national_id');
        nationalIdCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF3C7' }
        };
        nationalIdCell.font = { bold: true, color: { argb: 'FFB45309' } };
      }

      // تلوين خلية رقم الجوال إذا كان التنسيق خاطئ
      if (customer.phone && !isValidPhone(customer.phone)) {
        const phoneCell = row.getCell('phone');
        phoneCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF3C7' }
        };
        phoneCell.font = { bold: true, color: { argb: 'FFB45309' } };
      }

      // تلوين الصف بالكامل إذا كانت هناك بيانات ناقصة
      if (hasMissingData) {
        row.eachCell((cell, colNumber) => {
          const phoneColNum = 4;
          const nationalIdColNum = 6;
          if (colNumber === phoneColNum && customer.phone && !isValidPhone(customer.phone)) return;
          if (colNumber === nationalIdColNum && customer.national_id && !isValidNationalId(customer.national_id)) return;
          
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' }
          };
          cell.font = { color: { argb: 'FFDC2626' } };
        });
        
        const missingCell = row.getCell('missing');
        missingCell.font = { bold: true, color: { argb: 'FFDC2626' } };
      } else {
        const missingCell = row.getCell('missing');
        missingCell.font = { color: { argb: 'FF16A34A' } };
      }

      // تلوين عمود المخالفات إذا كانت هناك مخالفات
      if (hasViolations) {
        const violationsCell = row.getCell('violations_count');
        violationsCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF3C7' }
        };
        violationsCell.font = { bold: true, color: { argb: 'FFB45309' } };

        const totalCell = row.getCell('violations_total');
        totalCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF3C7' }
        };
        totalCell.font = { bold: true, color: { argb: 'FFB45309' } };
      }

      // إضافة حدود
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    // إضافة صف الملخص
    mainSheet.addRow({});
    const summaryRow = mainSheet.addRow({
      code: 'ملخص التقرير:',
      name: `إجمالي العملاء: ${customers.length}`,
      type: `بيانات ناقصة: ${customersWithMissingData}`,
      phone: `لديهم مخالفات: ${customersWithViolationsCount}`,
      email: `مكتملين: ${customers.length - customersWithMissingData}`,
    });
    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' }
    };

    // دليل الألوان
    const legendRow = mainSheet.addRow({
      code: 'دليل الألوان:',
      name: '🔴 أحمر = بيانات ناقصة',
      type: '🟡 أصفر = تنسيق خاطئ أو مخالفات',
      phone: '🟢 أخضر = مكتمل',
    });
    legendRow.font = { italic: true };

    // حفظ الملف
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filterLabels = {
    all: 'جميع العملاء',
    active_contracts: 'العملاء مع عقود سارية',
    traffic_violations: 'العملاء مع مخالفات مرورية',
    both: 'العملاء مع عقود سارية أو مخالفات',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Download className="w-5 h-5 text-teal-600" />
            تصدير بيانات العملاء
          </DialogTitle>
          <DialogDescription>
            اختر صيغة التصدير وخيارات الفلترة لإنشاء التقرير
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* اختيار صيغة التصدير */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              صيغة التصدير
            </Label>
            <RadioGroup
              value={exportFormat}
              onValueChange={(v) => setExportFormat(v as ExportFormat)}
              className="grid grid-cols-2 gap-3"
            >
              <div>
                <RadioGroupItem
                  value="excel"
                  id="excel"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="excel"
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 p-4 cursor-pointer transition-all",
                    "hover:border-teal-300 hover:bg-teal-50/50",
                    exportFormat === 'excel' && "border-teal-500 bg-teal-50"
                  )}
                >
                  <FileSpreadsheet className={cn(
                    "w-8 h-8 mb-2",
                    exportFormat === 'excel' ? "text-teal-600" : "text-slate-400"
                  )} />
                  <span className="font-medium">Excel</span>
                  <span className="text-xs text-slate-500">تقرير مفصل مع ألوان</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="csv"
                  id="csv"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="csv"
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 p-4 cursor-pointer transition-all",
                    "hover:border-teal-300 hover:bg-teal-50/50",
                    exportFormat === 'csv' && "border-teal-500 bg-teal-50"
                  )}
                >
                  <FileText className={cn(
                    "w-8 h-8 mb-2",
                    exportFormat === 'csv' ? "text-teal-600" : "text-slate-400"
                  )} />
                  <span className="font-medium">CSV</span>
                  <span className="text-xs text-slate-500">ملف نصي بسيط</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* خيارات الفلترة */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" />
              فلترة العملاء
            </Label>
            <RadioGroup
              value={filterOption}
              onValueChange={(v) => setFilterOption(v as FilterOption)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 space-x-reverse">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer">
                  <Users className="w-4 h-4 text-slate-500" />
                  جميع العملاء
                </Label>
              </div>
              <div className="flex items-center space-x-3 space-x-reverse">
                <RadioGroupItem value="active_contracts" id="active_contracts" />
                <Label htmlFor="active_contracts" className="flex items-center gap-2 cursor-pointer">
                  <FileCheck className="w-4 h-4 text-green-500" />
                  العملاء مع عقود سارية
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    {customersWithActiveContracts.length}
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 space-x-reverse">
                <RadioGroupItem value="traffic_violations" id="traffic_violations" />
                <Label htmlFor="traffic_violations" className="flex items-center gap-2 cursor-pointer">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  العملاء مع مخالفات مرورية
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {customersWithViolations.length}
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 space-x-reverse">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="flex items-center gap-2 cursor-pointer">
                  <Filter className="w-4 h-4 text-blue-500" />
                  عقود سارية أو مخالفات (كلاهما)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* معلومات التقرير */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-medium text-slate-900 mb-2">محتوى التقرير:</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• البيانات الأساسية للعميل (الاسم، الهاتف، البريد...)</li>
              <li>• عدد العقود السارية لكل عميل</li>
              <li>• عدد المخالفات المرورية وإجماليها</li>
              <li className="text-red-600">• البيانات الناقصة لكل عميل (مميزة باللون الأحمر)</li>
              <li className="text-amber-600">• أخطاء التنسيق (مميزة باللون الأصفر)</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري التصدير...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                تصدير التقرير
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerExportDialog;
