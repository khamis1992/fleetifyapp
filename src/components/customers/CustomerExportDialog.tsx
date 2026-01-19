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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

type ExportFormat = 'csv' | 'excel' | 'pdf';
type FilterOption = 'all' | 'active_contracts' | 'traffic_violations' | 'both' | 'deficiencies_only';

const CustomerExportDialog: React.FC<CustomerExportDialogProps> = ({
  open,
  onOpenChange,
  companyId,
  filters,
}) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
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
        await exportToPDF(customersToExport, contractsMap, violationsMap);
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

  const exportToPDF = async (
    customers: Customer[],
    contractsMap: Map<string, any[]>,
    violationsMap: Map<string, any[]>
  ) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // إعداد الخط
    doc.setFont('helvetica');

    // العنوان الرئيسي
    doc.setFillColor(13, 148, 136); // Teal color
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Customers Deficiency Report', pageWidth / 2, 12, { align: 'center' });
    doc.setFontSize(12);
    doc.text('تقرير نواقص العملاء', pageWidth / 2, 20, { align: 'center' });

    // معلومات التقرير
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(10);
    const filterText = filterOption === 'all' ? 'All Customers' :
      filterOption === 'active_contracts' ? 'Customers with Active Contracts' :
      filterOption === 'traffic_violations' ? 'Customers with Traffic Violations' :
      filterOption === 'deficiencies_only' ? 'Customers with Deficiencies Only' :
      'Customers with Active Contracts or Traffic Violations';
    doc.text(`Filter: ${filterText}`, 15, 35);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - 60, 35);
    doc.text(`Total Customers: ${customers.length}`, 15, 42);

    // إعداد البيانات للجدول
    let customersWithMissingData = 0;
    let customersWithViolationsCount = 0;

    const tableData = customers.map((customer, index) => {
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

      return [
        (index + 1).toString(),
        customer.customer_code || '-',
        customerName || '-',
        customer.customer_type === 'individual' ? 'Individual' : 'Corporate',
        customer.phone || '-',
        customer.national_id || '-',
        contracts.length.toString(),
        customerViolations.length.toString(),
        totalViolationsAmount > 0 ? totalViolationsAmount.toLocaleString() : '-',
        hasMissingData ? missingFields.join(', ') : 'Complete',
        invalidFields.length > 0 ? invalidFields.join(', ') : '-',
      ];
    });

    // إنشاء الجدول
    autoTable(doc, {
      startY: 50,
      head: [[
        '#',
        'Code',
        'Name',
        'Type',
        'Phone',
        'National ID',
        'Contracts',
        'Violations',
        'Violations Total',
        'Missing Data',
        'Format Errors',
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [13, 148, 136],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8,
      },
      styles: {
        font: 'helvetica',
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 18 },
        2: { cellWidth: 40, halign: 'left' },
        3: { cellWidth: 18 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 15 },
        7: { cellWidth: 15 },
        8: { cellWidth: 20 },
        9: { cellWidth: 45, halign: 'left' },
        10: { cellWidth: 40, halign: 'left' },
      },
      didParseCell: (data) => {
        // تلوين خلايا البيانات الناقصة
        if (data.section === 'body') {
          const missingDataCol = 9;
          const formatErrorsCol = 10;
          
          if (data.column.index === missingDataCol) {
            const cellText = data.cell.text.join('');
            if (cellText !== 'Complete') {
              data.cell.styles.fillColor = [254, 226, 226]; // Red background
              data.cell.styles.textColor = [220, 38, 38]; // Red text
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.fillColor = [220, 252, 231]; // Green background
              data.cell.styles.textColor = [22, 163, 74]; // Green text
            }
          }
          
          if (data.column.index === formatErrorsCol) {
            const cellText = data.cell.text.join('');
            if (cellText !== '-') {
              data.cell.styles.fillColor = [254, 243, 199]; // Yellow background
              data.cell.styles.textColor = [180, 83, 9]; // Amber text
              data.cell.styles.fontStyle = 'bold';
            }
          }

          // تلوين عمود المخالفات
          if (data.column.index === 7 || data.column.index === 8) {
            const cellText = data.cell.text.join('');
            if (cellText !== '0' && cellText !== '-') {
              data.cell.styles.fillColor = [254, 243, 199];
              data.cell.styles.textColor = [180, 83, 9];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      },
      didDrawPage: (data) => {
        // إضافة رقم الصفحة
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      },
    });

    // إضافة صفحة الملخص
    doc.addPage();
    
    // عنوان الملخص
    doc.setFillColor(13, 148, 136);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Report Summary', pageWidth / 2, 12, { align: 'center' });
    doc.text('ملخص التقرير', pageWidth / 2, 20, { align: 'center' });

    // بطاقات الملخص
    const summaryY = 40;
    const cardWidth = 60;
    const cardHeight = 35;
    const cardSpacing = 15;
    const startX = (pageWidth - (4 * cardWidth + 3 * cardSpacing)) / 2;

    // بطاقة إجمالي العملاء
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(startX, summaryY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);
    doc.text('Total Customers', startX + cardWidth / 2, summaryY + 10, { align: 'center' });
    doc.setTextColor(13, 148, 136);
    doc.setFontSize(20);
    doc.text(customers.length.toString(), startX + cardWidth / 2, summaryY + 25, { align: 'center' });

    // بطاقة البيانات الناقصة
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(startX + cardWidth + cardSpacing, summaryY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);
    doc.text('Missing Data', startX + cardWidth + cardSpacing + cardWidth / 2, summaryY + 10, { align: 'center' });
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(20);
    doc.text(customersWithMissingData.toString(), startX + cardWidth + cardSpacing + cardWidth / 2, summaryY + 25, { align: 'center' });

    // بطاقة العملاء المكتملين
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(startX + 2 * (cardWidth + cardSpacing), summaryY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);
    doc.text('Complete Data', startX + 2 * (cardWidth + cardSpacing) + cardWidth / 2, summaryY + 10, { align: 'center' });
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(20);
    doc.text((customers.length - customersWithMissingData).toString(), startX + 2 * (cardWidth + cardSpacing) + cardWidth / 2, summaryY + 25, { align: 'center' });

    // بطاقة المخالفات
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(startX + 3 * (cardWidth + cardSpacing), summaryY, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(10);
    doc.text('With Violations', startX + 3 * (cardWidth + cardSpacing) + cardWidth / 2, summaryY + 10, { align: 'center' });
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(20);
    doc.text(customersWithViolationsCount.toString(), startX + 3 * (cardWidth + cardSpacing) + cardWidth / 2, summaryY + 25, { align: 'center' });

    // دليل الألوان
    const legendY = summaryY + cardHeight + 30;
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text('Color Legend:', 15, legendY);

    const legendItems = [
      { color: [254, 226, 226], text: 'Red = Missing Data', textColor: [220, 38, 38] },
      { color: [254, 243, 199], text: 'Yellow = Format Errors / Violations', textColor: [180, 83, 9] },
      { color: [220, 252, 231], text: 'Green = Complete Data', textColor: [22, 163, 74] },
    ];

    legendItems.forEach((item, index) => {
      const itemY = legendY + 12 + (index * 12);
      doc.setFillColor(item.color[0], item.color[1], item.color[2]);
      doc.roundedRect(15, itemY - 4, 8, 8, 1, 1, 'F');
      doc.setTextColor(item.textColor[0], item.textColor[1], item.textColor[2]);
      doc.setFontSize(10);
      doc.text(item.text, 28, itemY + 2);
    });

    // حفظ الملف
    doc.save(`customers_deficiency_report_${new Date().toISOString().split('T')[0]}.pdf`);
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
                  value="pdf"
                  id="pdf"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="pdf"
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl border-2 border-slate-200 p-4 cursor-pointer transition-all",
                    "hover:border-red-300 hover:bg-red-50/50",
                    exportFormat === 'pdf' && "border-red-500 bg-red-50"
                  )}
                >
                  <Printer className={cn(
                    "w-8 h-8 mb-2",
                    exportFormat === 'pdf' ? "text-red-600" : "text-slate-400"
                  )} />
                  <span className="font-medium">PDF</span>
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
                  <span className="font-medium">Excel</span>
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
            {exportFormat === 'pdf' && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Printer className="w-3 h-3" />
                  تقرير PDF يتضمن صفحة ملخص مع إحصائيات وجدول بيانات ملون
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
