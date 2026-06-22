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
  Printer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useFleetifyTranslation } from "@/hooks/useTranslation";
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

type ExportFormat = 'csv' | 'excel' | 'html';
type FilterOption = 'all' | 'active_contracts' | 'traffic_violations' | 'both' | 'deficiencies_only';

const CustomerExportDialog: React.FC<CustomerExportDialogProps> = ({
  open,
  onOpenChange,
  companyId,
  filters,
}) => 
 {
  const { t } = useFleetifyTranslation("ui");
  const [exportFormat, setExportFormat] = useState<ExportFormat>('html');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [isExporting, setIsExporting] = useState(false);

  // جلب العملاء مع العقود السارية
  const {
   data: customersWithActiveContracts = [] } = useQuery({
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
      } else if (filterOption === 'deficiencies_only') {
        // فلترة العملاء الذين لديهم نواقص أو أخطاء فقط
        customersToExport = customersToExport.filter(c => {
          const missingFields = getMissingFields(c);
          const invalidFields = getInvalidFields(c);
          return missingFields.length > 0 || invalidFields.length > 0;
        });
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
      } else if (exportFormat === 'excel') {
        await exportToExcel(customersToExport, contractsMap, violationsMap);
      } else {
        await exportToHTML(customersToExport, contractsMap, violationsMap);
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
        ? `${customer.first_name || customer.first_name_ar || ''} ${customer.last_name || customer.last_name_ar || ''}`.trim()
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
        ? `${customer.first_name || customer.first_name_ar || ''} ${customer.last_name || customer.last_name_ar || ''}`.trim()
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

  const exportToHTML = async (
    customers: Customer[],
    contractsMap: Map<string, any[]>,
    violationsMap: Map<string, any[]>
  ) => {
    const currentDate = new Date().toLocaleDateString('ar-QA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const filterText = filterOption === 'all' ? 'جميع العملاء' :
      filterOption === 'active_contracts' ? 'العملاء مع عقود سارية' :
      filterOption === 'traffic_violations' ? 'العملاء مع مخالفات مرورية' :
      filterOption === 'deficiencies_only' ? 'العملاء مع نواقص فقط' :
      'العملاء مع عقود سارية أو مخالفات';

    let customersWithMissingData = 0;
    let customersWithViolationsCount = 0;

    const tableRows = customers.map((customer, index) => {
      const customerName = customer.customer_type === 'individual'
        ? `${customer.first_name || customer.first_name_ar || ''} ${customer.last_name || customer.last_name_ar || ''}`.trim()
        : customer.company_name_ar || customer.company_name || '';

      const contracts = contractsMap.get(customer.id) || [];
      const customerViolations = violationsMap.get(customer.id) || [];
      const totalViolationsAmount = customerViolations.reduce((sum, v) => sum + (v.amount || 0), 0);
      
      const missingFields = getMissingFields(customer);
      const invalidFields = getInvalidFields(customer);
      const hasMissingData = missingFields.length > 0;
      const hasViolations = customerViolations.length > 0;
      const hasInvalidData = invalidFields.length > 0;
      
      if (hasMissingData) customersWithMissingData++;
      if (hasViolations) customersWithViolationsCount++;

      const rowClass = hasMissingData ? 'row-missing' : '';
      const missingClass = hasMissingData ? 'cell-missing' : 'cell-complete';
      const violationsClass = hasViolations ? 'cell-warning' : '';
      const invalidClass = hasInvalidData ? 'cell-warning' : '';

      return `
        <tr class="${rowClass}">
          <td>${index + 1}</td>
          <td>${customer.customer_code || '-'}</td>
          <td class="text-right">${customerName || '-'}</td>
          <td>${customer.customer_type === 'individual' ? 'فرد' : 'شركة'}</td>
          <td dir="ltr">${customer.phone || '-'}</td>
          <td dir="ltr">${customer.national_id || '-'}</td>
          <td class="${violationsClass}">${contracts.length}</td>
          <td class="${violationsClass}">${customerViolations.length}</td>
          <td class="${violationsClass}">${totalViolationsAmount > 0 ? totalViolationsAmount.toLocaleString() : '-'}</td>
          <td class="${missingClass}">${hasMissingData ? missingFields.join('، ') : '✓ مكتمل'}</td>
          <td class="${invalidClass}">${invalidFields.length > 0 ? invalidFields.join('، ') : '-'}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تقرير نواقص العملاء</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Cairo', sans-serif;
            padding: 20px;
            background: #fff;
            color: #1a1a2e;
            max-width: 297mm;
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
            color: #0d9488;
            margin-bottom: 5px;
        }
        
        .report-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 8px;
            font-size: 14px;
        }
        
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .summary-card {
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }
        
        .summary-card.total { background: #f1f5f9; }
        .summary-card.missing { background: #fee2e2; }
        .summary-card.complete { background: #dcfce7; }
        .summary-card.violations { background: #fef3c7; }
        
        .summary-card .label {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 8px;
        }
        
        .summary-card .value {
            font-size: 28px;
            font-weight: 700;
        }
        
        .summary-card.total .value { color: #0d9488; }
        .summary-card.missing .value { color: #dc2626; }
        .summary-card.complete .value { color: #16a34a; }
        .summary-card.violations .value { color: #b45309; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 20px;
        }
        
        th {
            background: #0d9488;
            color: white;
            padding: 12px 8px;
            text-align: center;
            font-weight: 600;
        }
        
        td {
            padding: 10px 8px;
            border-bottom: 1px solid #e2e8f0;
            text-align: center;
        }
        
        tr:nth-child(even) {
            background: #f8fafc;
        }
        
        tr:hover {
            background: #f1f5f9;
        }
        
        .row-missing {
            background: #fef2f2 !important;
        }
        
        .cell-missing {
            color: #dc2626;
            font-weight: 600;
        }
        
        .cell-complete {
            color: #16a34a;
            font-weight: 600;
        }
        
        .cell-warning {
            color: #b45309;
            font-weight: 600;
            background: #fef3c7;
        }
        
        .text-right {
            text-align: right;
        }
        
        .legend {
            margin-top: 30px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 8px;
        }
        
        .legend-title {
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .legend-items {
            display: flex;
            gap: 30px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .legend-color {
            width: 16px;
            height: 16px;
            border-radius: 4px;
        }
        
        .legend-color.red { background: #fee2e2; }
        .legend-color.yellow { background: #fef3c7; }
        .legend-color.green { background: #dcfce7; }
        
        .print-btn {
            display: block;
            margin: 20px auto;
            padding: 12px 24px;
            background: #0d9488;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            font-family: 'Cairo', sans-serif;
        }
        
        .print-btn:hover {
            background: #0f766e;
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #64748b;
        }
        
        @media print {
            .print-btn { display: none; }
            body { padding: 0; }
            .summary-cards { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">🖨️ طباعة التقرير</button>

    <div class="header">
        <div class="company-name">شركة العراف لتأجير السيارات</div>
        <div class="report-title">تقرير نواقص العملاء</div>
        <div>تاريخ التقرير: ${currentDate}</div>
    </div>

    <div class="report-info">
        <div><strong>الفلتر:</strong> ${filterText}</div>
        <div><strong>إجمالي العملاء:</strong> ${customers.length}</div>
        <div><strong>تاريخ الإنشاء:</strong> ${new Date().toLocaleDateString('en-GB')}</div>
    </div>

    <div class="summary-cards">
        <div class="summary-card total">
            <div class="label">إجمالي العملاء</div>
            <div class="value">${customers.length}</div>
        </div>
        <div class="summary-card missing">
            <div class="label">بيانات ناقصة</div>
            <div class="value">${customersWithMissingData}</div>
        </div>
        <div class="summary-card complete">
            <div class="label">بيانات مكتملة</div>
            <div class="value">${customers.length - customersWithMissingData}</div>
        </div>
        <div class="summary-card violations">
            <div class="label">لديهم مخالفات</div>
            <div class="value">${customersWithViolationsCount}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>كود العميل</th>
                <th>الاسم</th>
                <th>النوع</th>
                <th>الهاتف</th>
                <th>رقم الهوية</th>
                <th>العقود</th>
                <th>المخالفات</th>
                <th>إجمالي المخالفات</th>
                <th>البيانات الناقصة</th>
                <th>أخطاء التنسيق</th>
            </tr>
        </thead>
        <tbody>
            ${tableRows}
        </tbody>
    </table>

    <div class="legend">
        <div class="legend-title">دليل الألوان:</div>
        <div class="legend-items">
            <div class="legend-item">
                <div class="legend-color red"></div>
                <span>أحمر = بيانات ناقصة</span>
            </div>
            <div class="legend-item">
                <div class="legend-color yellow"></div>
                <span>أصفر = أخطاء تنسيق / مخالفات</span>
            </div>
            <div class="legend-item">
                <div class="legend-color green"></div>
                <span>أخضر = بيانات مكتملة</span>
            </div>
        </div>
    </div>

    <div class="footer">
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

  const filterLabels = {
    all: 'جميع العملاء',
    active_contracts: 'العملاء مع عقود سارية',
    traffic_violations: 'العملاء مع مخالفات مرورية',
    both: 'العملاء مع عقود سارية أو مخالفات',
    deficiencies_only: 'العملاء مع نواقص أو أخطاء فقط',
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
              className="grid grid-cols-3 gap-3"
            >
              <div>
                <RadioGroupItem
                  value="html"
                  id="html"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="html"
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 p-4 cursor-pointer transition-all",
                    "hover:border-teal-300 hover:bg-teal-50/50",
                    exportFormat === 'html' && "border-teal-500 bg-teal-50"
                  )}
                >
                  <Printer className={cn(
                    "w-8 h-8 mb-2",
                    exportFormat === 'html' ? "text-teal-600" : "text-slate-400"
                  )} />
                  <span className="font-medium">HTML</span>
                  <span className="text-xs text-slate-500 text-center">تقرير للطباعة</span>
                </Label>
              </div>
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
                  <span className="font-medium">{t("excel")}</span>
                  <span className="text-xs text-slate-500 text-center">تقرير مفصل</span>
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
                  <span className="text-xs text-slate-500 text-center">ملف نصي</span>
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
              <div className="flex items-center space-x-3 space-x-reverse">
                <RadioGroupItem value="deficiencies_only" id="deficiencies_only" />
                <Label htmlFor="deficiencies_only" className="flex items-center gap-2 cursor-pointer">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  العملاء مع نواقص أو أخطاء فقط
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    تقرير النواقص
                  </span>
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
            {exportFormat === 'html' && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Printer className="w-3 h-3" />
                  تقرير HTML يفتح في نافذة جديدة مع إحصائيات وجدول بيانات ملون وإمكانية الطباعة
                </p>
              </div>
            )}
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
