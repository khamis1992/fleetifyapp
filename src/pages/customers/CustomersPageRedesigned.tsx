import { OperationsWorkspace, OperationsMetric } from '@/components/operations/OperationsWorkspace';
import { pageNumbers } from '@/components/operations/operationsPresentation';
/**
 * صفحة العملاء - تصميم احترافي SaaS
 * مستوحى من منصات مثل Linear و Stripe و Vercel
 * تصميم نظيف، متطور، مع تسلسل هرمي ممتاز للطباعة
 *
 * @component CustomersPageRedesigned
 */

/**
 * صفحة العملاء - تصميم احترافي SaaS
 * مستوحى من منصات مثل Linear و Stripe و Vercel
 * تصميم نظيف، متطور، مع تسلسل هرمي ممتاز للطباعة
 *
 * @component CustomersPageRedesigned
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCustomers, useCustomerCount, useDeleteCustomer } from '@/hooks/useEnhancedCustomers';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Customer, CustomerFilters } from '@/types/customer';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Search, Plus, Users, Building2, Phone, Mail, ChevronRight, ChevronLeft, FileText, Upload, UserPlus, AlertCircle, RefreshCw, LayoutGrid, Columns, Crown, MoreVertical, Eye, Edit3, Trash2, Download, IdCard, Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';



import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EnhancedCustomerDialog, CustomerCSVUpload, CustomerSplitView } from '@/components/customers';
import CustomerExportDialog from '@/components/customers/CustomerExportDialog';
import CustomerDocumentDistributionDialog from '@/components/customers/CustomerDocumentDistributionDialog';


// ===== Professional Customer Card =====
interface ProCustomerCardProps {
  customer: Customer;
  contractCount: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onQuickRent: () => void;
  canEdit: boolean;
  canDelete: boolean;
  navigate: any; // Add navigate prop
}

const ProCustomerCard: React.FC<ProCustomerCardProps> = ({
  customer,
  contractCount,
  onView,
  onEdit,
  onDelete,
  onQuickRent,
  canEdit,
  canDelete,
  navigate,
}) => {
  const name = customer.customer_type === 'individual'
    ? [customer.first_name_ar || customer.first_name, customer.last_name_ar || customer.last_name].filter(Boolean).join(' ') || 'عميل غير محدد'
    : customer.company_name_ar || customer.company_name || 'جهة غير محددة';
  const initials = name.split(' ').slice(0,2).map(part => part[0]).join('');
  return <article className="opw-customer-card">
    <div className="opw-customer-top"><div className="opw-avatar" aria-hidden="true">{initials}</div><div className="opw-customer-name">
      <button onClick={onView} title={name}>{name}</button><p>{customer.customer_type === 'individual' ? 'عميل فرد' : 'عميل شركة'}<span>·</span>{customer.is_active ? 'نشط' : 'غير نشط'}{customer.is_vip && <span className="opw-vip"><Crown size={11}/>مميز</span>}</p>
    </div><DropdownMenu dir="rtl"><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label={'إجراءات العميل ' + name}><MoreVertical size={17}/></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end"><DropdownMenuItem onClick={onView}><Eye size={15}/>عرض الملف</DropdownMenuItem>
      {canEdit && <DropdownMenuItem onClick={onEdit}><Edit3 size={15}/>تعديل البيانات</DropdownMenuItem>}
      <DropdownMenuItem onClick={onQuickRent}><Plus size={15}/>إنشاء عقد</DropdownMenuItem><DropdownMenuSeparator/>
      <DropdownMenuItem onClick={() => { const contract = customer.contracts?.find((item: any) => item.status === 'active'); if (contract) navigate('/legal/lawsuit/prepare/' + contract.id); else toast.error('لا يوجد عقد نشط لهذا العميل'); }}><Gavel size={15}/>تجهيز دعوى</DropdownMenuItem>
      {canDelete && <><DropdownMenuSeparator/><DropdownMenuItem onClick={onDelete} className="text-red-600"><Trash2 size={15}/>حذف العميل</DropdownMenuItem></>}
      </DropdownMenuContent></DropdownMenu></div>
    <div className="opw-customer-contact"><div><Phone size={15}/><span dir="ltr">{customer.phone || 'الهاتف غير مسجل'}</span></div><div><Mail size={15}/><span>{customer.email || 'البريد غير مسجل'}</span></div></div>
    <footer><span className="opw-contract-count"><FileText size={15}/><b>{contractCount}</b>عقود</span><Button onClick={onView} variant="outline" size="sm">فتح الملف <ChevronLeft size={14}/></Button></footer>
  </article>;
};

// ===== التحقق من صحة رقم الهوية (11 رقم) =====
const isValidNationalId = (nationalId: string | null | undefined): boolean => {
  if (!nationalId) return false;
  const cleaned = nationalId.replace(/\D/g, ''); // إزالة أي شيء غير الأرقام
  return cleaned.length === 11;
};

// ===== التحقق من صحة رقم الجوال (8 أرقام أو 11 مع كود الدولة 974) =====
const isValidPhone = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, ''); // إزالة أي شيء غير الأرقام
  // 8 أرقام (رقم محلي قطري)
  if (cleaned.length === 8) return true;
  // 11 رقم مع كود الدولة 974
  if (cleaned.length === 11 && cleaned.startsWith('974')) return true;
  // 12 رقم مع + أو 00
  if (cleaned.length === 12 && cleaned.startsWith('00974')) return true;
  return false;
};

// ===== تحديد المعلومات الناقصة للعميل =====
const getMissingFields = (customer: Customer): string[] => {
  const missing: string[] = [];
  
  if (customer.customer_type === 'individual') {
    // للأفراد
    if (!customer.first_name_ar && !customer.first_name) missing.push('الاسم');
    if (!customer.last_name_ar && !customer.last_name) missing.push('اسم العائلة');
    if (!customer.national_id) missing.push('رقم الهوية');
  } else {
    // للشركات
    if (!customer.company_name_ar && !customer.company_name) missing.push('اسم الشركة');
  }
  
  // حقول مشتركة
  if (!customer.phone) missing.push('رقم الهاتف');
  if (!customer.email) missing.push('البريد الإلكتروني');
  if (!customer.address) missing.push('العنوان');
  
  return missing;
};

// ===== تحديد الحقول ذات الأخطاء (تنسيق خاطئ) =====
const getInvalidFields = (customer: Customer): string[] => {
  const invalid: string[] = [];
  
  // التحقق من رقم الهوية (يجب أن يكون 11 رقم)
  if (customer.national_id && !isValidNationalId(customer.national_id)) {
    invalid.push('رقم الهوية (يجب 11 رقم)');
  }
  
  // التحقق من رقم الجوال
  if (customer.phone && !isValidPhone(customer.phone)) {
    invalid.push('رقم الجوال (يجب 8 أرقام أو 974XXXXXXXX)');
  }
  
  return invalid;
};

// ===== Excel Export Helper with Missing Data Highlighting =====
const _exportCustomersToExcel = async (
  _customers: Customer[],
  companyId: string,
  filters: CustomerFilters,
  supabaseClient: any
): Promise<void> => {
  if (!companyId) {
    toast.error('لا يمكن تصدير البيانات - لا يوجد معرف الشركة');
    return;
  }

  try {
    toast.loading('جاري تحضير البيانات للتصدير...');

    // Import ExcelJS dynamically
    const ExcelJS = await import('exceljs');
    
    // Build query to fetch ALL customers matching filters (no pagination)
    let query = supabaseClient
      .from('customers')
      .select('*')
      .eq('company_id', companyId);

    // Apply filters
    if (!filters.includeInactive) {
      query = query.eq('is_active', true);
    }

    if (filters.customer_type) {
      query = query.eq('customer_type', filters.customer_type);
    }

    // Search filter
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

    // Order results
    query = query.order('created_at', { ascending: false });

    const { data: allCustomers, error } = await query;

    if (error) throw error;

    const customersToExport = allCustomers || [];

    if (!customersToExport.length) {
      toast.dismiss();
      toast.error('لا يوجد عملاء لتصديرهم');
      return;
    }

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Fleetify';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('العملاء', {
      views: [{ rightToLeft: true }]
    });

    // Define columns
    worksheet.columns = [
      { header: 'كود العميل', key: 'code', width: 15 },
      { header: 'الاسم (عربي)', key: 'name_ar', width: 25 },
      { header: 'الاسم (إنجليزي)', key: 'name_en', width: 25 },
      { header: 'اسم الشركة (عربي)', key: 'company_ar', width: 25 },
      { header: 'اسم الشركة (إنجليزي)', key: 'company_en', width: 25 },
      { header: 'نوع العميل', key: 'type', width: 12 },
      { header: 'الهاتف', key: 'phone', width: 18 },
      { header: 'البريد الإلكتروني', key: 'email', width: 30 },
      { header: 'رقم الهوية', key: 'national_id', width: 18 },
      { header: 'العنوان', key: 'address', width: 35 },
      { header: 'الحالة', key: 'status', width: 10 },
      { header: 'عميل VIP', key: 'vip', width: 10 },
      { header: 'تاريخ الإنشاء', key: 'created_at', width: 15 },
      { header: 'المعلومات الناقصة', key: 'missing', width: 35 },
      { header: 'ملاحظات (أخطاء التنسيق)', key: 'notes', width: 45 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // Count customers with issues
    let customersWithMissingData = 0;
    let customersWithInvalidData = 0;

    // Add data rows
    customersToExport.forEach((customer: Customer) => {
      const missingFields = getMissingFields(customer);
      const invalidFields = getInvalidFields(customer);
      const hasMissingData = missingFields.length > 0;
      const hasInvalidData = invalidFields.length > 0;
      
      if (hasMissingData) customersWithMissingData++;
      if (hasInvalidData) customersWithInvalidData++;

      const row = worksheet.addRow({
        code: customer.customer_code || '',
        name_ar: customer.customer_type === 'individual'
          ? `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim()
          : '',
        name_en: customer.customer_type === 'individual'
          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
          : '',
        company_ar: customer.company_name_ar || '',
        company_en: customer.company_name || '',
        type: customer.customer_type === 'individual' ? 'فرد' : 'شركة',
        phone: customer.phone || '',
        email: customer.email || '',
        national_id: customer.national_id || '',
        address: customer.address || '',
        status: customer.is_active ? 'نشط' : 'غير نشط',
        vip: customer.is_vip ? 'نعم' : 'لا',
        created_at: customer.created_at ? new Date(customer.created_at).toLocaleDateString('ar-SA') : '',
        missing: hasMissingData ? missingFields.join('، ') : '✓ مكتمل',
        notes: hasInvalidData ? invalidFields.join('، ') : '',
      });

      // تلوين خلية رقم الهوية باللون الأصفر إذا كان التنسيق خاطئ
      if (customer.national_id && !isValidNationalId(customer.national_id)) {
        const nationalIdCell = row.getCell('national_id');
        nationalIdCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF3C7' } // Light yellow background
        };
        nationalIdCell.font = { bold: true, color: { argb: 'FFB45309' } }; // Orange/amber text
      }

      // تلوين خلية رقم الجوال باللون الأصفر إذا كان التنسيق خاطئ
      if (customer.phone && !isValidPhone(customer.phone)) {
        const phoneCell = row.getCell('phone');
        phoneCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF3C7' } // Light yellow background
        };
        phoneCell.font = { bold: true, color: { argb: 'FFB45309' } }; // Orange/amber text
      }

      // Highlight row with missing data in red
      if (hasMissingData) {
        row.eachCell((cell, colNumber) => {
          // لا نغير لون خلايا الهاتف والهوية إذا كانت صفراء
          const phoneColNum = 7;
          const nationalIdColNum = 9;
          if (colNumber === phoneColNum && customer.phone && !isValidPhone(customer.phone)) return;
          if (colNumber === nationalIdColNum && customer.national_id && !isValidNationalId(customer.national_id)) return;
          
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' } // Light red background
          };
          cell.font = { color: { argb: 'FFDC2626' } }; // Red text
        });
        
        // Make missing column bold
        const missingCell = row.getCell('missing');
        missingCell.font = { bold: true, color: { argb: 'FFDC2626' } };
      } else {
        // Green for complete data
        const missingCell = row.getCell('missing');
        missingCell.font = { color: { argb: 'FF16A34A' } }; // Green text
      }

      // تلوين عمود الملاحظات باللون الأصفر إذا كان هناك أخطاء تنسيق
      if (hasInvalidData) {
        const notesCell = row.getCell('notes');
        notesCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF3C7' } // Light yellow background
        };
        notesCell.font = { bold: true, color: { argb: 'FFB45309' } }; // Orange/amber text
      }

      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    });

    // Add summary row at the end
    worksheet.addRow({});
    const summaryRow = worksheet.addRow({
      code: 'ملخص:',
      name_ar: `إجمالي العملاء: ${customersToExport.length}`,
      name_en: `عملاء مكتملين: ${customersToExport.length - customersWithMissingData}`,
      company_ar: `بيانات ناقصة: ${customersWithMissingData}`,
      company_en: `أخطاء تنسيق: ${customersWithInvalidData}`,
    });
    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' }
    };

    // Add legend row
    const legendRow = worksheet.addRow({
      code: 'دليل الألوان:',
      name_ar: '🔴 أحمر = بيانات ناقصة',
      name_en: '🟡 أصفر = تنسيق خاطئ',
      company_ar: '🟢 أخضر = مكتمل',
    });
    legendRow.font = { italic: true };

    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.dismiss();
    
    if (customersWithMissingData > 0) {
      toast.success(
        `تم تصدير ${customersToExport.length} عميل - ${customersWithMissingData} عميل لديهم بيانات ناقصة (محددين باللون الأحمر)`,
        { duration: 5000 }
      );
    } else {
      toast.success(`تم تصدير ${customersToExport.length} عميل - جميع البيانات مكتملة`);
    }
  } catch (error: any) {
    toast.dismiss();
    console.error('Export error:', error);
    toast.error(error.message || 'فشل تصدير البيانات');
  }
};

// ===== Main Component =====
const CustomersPageRedesigned: React.FC = () => {
  const navigate = useNavigate();
  const deleteCustomerMutation = useDeleteCustomer();
  const { companyId, isAuthenticating } = useUnifiedCompanyAccess();
  const { hasPermission } = useRolePermissions();

  const canEdit = hasPermission('edit_customers' as any);
  const canDelete = hasPermission('delete_customers' as any);

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [customerType, setCustomerType] = useState<'all' | 'individual' | 'corporate'>('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'split'>('grid');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showDocumentDistribution, setShowDocumentDistribution] = useState(false);

  // Filters
  const filters: CustomerFilters = {
    search: searchTerm || undefined,
    customer_type: customerType === 'all' ? undefined : customerType,
    includeInactive,
    page: currentPage,
    pageSize,
  };

  // Queries
  const { data: customersResult, isLoading, error, refetch } = useCustomers(filters);

  const customers = useMemo(() => {
    if (customersResult && typeof customersResult === 'object' && 'data' in customersResult) {
      return Array.isArray(customersResult.data) ? customersResult.data : [];
    }
    if (Array.isArray(customersResult)) {
      return customersResult;
    }
    return [];
  }, [customersResult]);

  const totalCustomersInDB = useMemo(() => {
    if (customersResult && typeof customersResult === 'object' && 'total' in customersResult) {
      return customersResult.total || 0;
    }
    return customers.length;
  }, [customersResult, customers.length]);

  // Contract counts
  const { data: contractCountsData } = useQuery({
    queryKey: ['customer-contract-counts', customers.map(c => c.id).join(','), companyId],
    queryFn: async () => {
      if (!customers.length || !companyId) return {};
      const customerIds = customers.map(c => c.id);
      const { data, error } = await supabase
        .from('contracts')
        .select('customer_id')
        .eq('company_id', companyId)
        .in('customer_id', customerIds);
      if (error) return {};
      const counts: Record<string, number> = {};
      customerIds.forEach(id => counts[id] = 0);
      data?.forEach(c => {
        if (c.customer_id) counts[c.customer_id] = (counts[c.customer_id] || 0) + 1;
      });
      return counts;
    },
    enabled: customers.length > 0 && !!companyId,
    staleTime: 60 * 1000,
  });

  // Counts
  const { data: individualCount } = useCustomerCount({ customer_type: 'individual', includeInactive: false });
  const { data: corporateCount } = useCustomerCount({ customer_type: 'corporate', includeInactive: false });


  const totalPages = Math.ceil(totalCustomersInDB / pageSize);

  // Handlers
  const handleViewCustomer = useCallback((customer: Customer) => {
    navigate(`/customers/${customer.id}`);
  }, [navigate]);

  const handleEditCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setShowEditDialog(true);
  }, []);

  const handleQuickRent = useCallback((customer: Customer) => {
    navigate('/contracts', {
      state: { selectedCustomerId: customer.id, autoOpen: true }
    });
  }, [navigate]);

  const handleDeleteCustomer = useCallback((customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteCustomerMutation.mutate(customerToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setCustomerToDelete(null);
        },
      });
    }
  };

  // Loading state
  if (isAuthenticating || !companyId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8FB]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-teal-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <OperationsWorkspace section="customers" actions={<>
      <Button className="opw-primary" onClick={() => setShowCreateDialog(true)}><UserPlus size={17}/>إضافة عميل</Button>
      <DropdownMenu dir="rtl"><DropdownMenuTrigger asChild><Button className="opw-secondary" variant="outline"><MoreVertical size={16}/>أدوات العملاء</Button></DropdownMenuTrigger><DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setShowCSVUpload(true)}><Upload size={15}/>استيراد العملاء</DropdownMenuItem>
        <DropdownMenuItem disabled={isLoading} onClick={() => setShowExportDialog(true)}><Download size={15}/>تصدير العملاء</DropdownMenuItem>
        <DropdownMenuItem disabled={isLoading} onClick={() => setShowDocumentDistribution(true)}><IdCard size={15}/>توزيع بطاقات الهوية</DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu>
      <Button className="opw-secondary" variant="outline" onClick={() => { void refetch(); }} disabled={isLoading}><RefreshCw size={16}/>تحديث</Button>
    </>}>
      {/* Main Content */}
      <div className="space-y-5">

        <div className="opw-metrics opw-metrics-three">
          <OperationsMetric label="نتائج الدليل" value={isLoading || error ? '—' : totalCustomersInDB} hint="حسب البحث والحالة والنوع المحدد" icon={Users}/>
          <OperationsMetric label="الأفراد النشطون" value={individualCount ?? '—'} hint="جميع العملاء الأفراد النشطين" icon={UserPlus}/>
          <OperationsMetric label="الشركات النشطة" value={corporateCount ?? '—'} hint="جميع حسابات الشركات النشطة" icon={Building2}/>
        </div>
        <div className="opw-toolbar"><div><h2>ملفات العملاء</h2><p>ابحث عن العميل أو افتح ملفه لمراجعة العقود والمستندات.</p></div><div className="opw-view-toggle" role="group" aria-label="طريقة عرض العملاء">
          <button aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')}><LayoutGrid size={16}/>بطاقات</button>
          <button aria-pressed={viewMode === 'split'} onClick={() => setViewMode('split')}><Columns size={16}/>عرض مقسم</button>
        </div></div>
        {/* Search & Filters Bar */}
        <div className="opw-searchbar">
          <div className="flex w-full flex-col gap-3 lg:flex-row">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A96A8]" />
              <Input
                  aria-label="البحث في دليل العملاء" placeholder="بحث بالاسم، الهاتف، أو البريد..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-11 rounded-xl border-[#D8E1EC] bg-[#FCFDFE] pr-10 text-sm focus:border-[#173A63]"
              />
              {searchTerm && (
                <button
                  aria-label="مسح البحث" onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-[#EEF5FB]"
                >
                  <Plus className="h-3 w-3 rotate-45 text-[#8A96A8]" />
                </button>
              )}
            </div>

            {/* Type Filter */}
            <Select value={customerType} onValueChange={(v: any) => { setCustomerType(v); setCurrentPage(1); }}>
              <SelectTrigger aria-label="نوع العميل" className="h-11 w-full rounded-xl border-[#D8E1EC] bg-[#FCFDFE] lg:w-44">
                <SelectValue placeholder="النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="individual">أفراد</SelectItem>
                <SelectItem value="corporate">شركات</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={includeInactive ? "all" : "active"} onValueChange={(v) => { setIncludeInactive(v === "all"); setCurrentPage(1); }}>
              <SelectTrigger aria-label="حالة العميل" className="h-11 w-full rounded-xl border-[#D8E1EC] bg-[#FCFDFE] lg:w-44">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">نشط فقط</SelectItem>
                <SelectItem value="all">جميع الحالات</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Customer Grid or Split View */}
        {error ? (
          <div role="alert" className="rounded-lg border border-[#DDE5EF] bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-red-50">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">خطأ في التحميل</h3>
            <p className="text-sm text-slate-500 mb-6">
              {error instanceof Error ? error.message : 'حدث خطأ غير متوقع'}
            </p>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="gap-2 border-[#D8E1EC] hover:border-[#173A63] hover:bg-[#EEF5FB]"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </Button>
          </div>
        ) : viewMode === 'split' ? (
          <CustomerSplitView
            customers={customers}
            isLoading={isLoading}
            companyId={companyId}
            onEditCustomer={handleEditCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        ) : isLoading ? (
          <div className="opw-customers-grid">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-lg border border-[#DDE5EF] bg-white" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="rounded-lg border border-[#DDE5EF] bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[#EEF5FB]">
              <Users className="h-8 w-8 text-[#173A63]" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">لا يوجد عملاء مطابقون</h3>
            <p className="text-sm text-slate-500 mb-6">
              {searchTerm || customerType !== 'all' ? 'جرّب تغيير البحث أو نوع العميل.' : 'ابدأ بإضافة عميل جديد إلى الدليل.'}
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="min-h-[44px] bg-[#173A63] text-white shadow-sm hover:bg-[#173A63]/90"
            >
              <UserPlus className="w-4 h-4 ml-2" />
              إضافة عميل
            </Button>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="flex items-center justify-between rounded-lg border border-[#DDE5EF] bg-white px-4 py-3 shadow-sm">
              <p className="text-sm text-[#6A7688]">
                <span className="font-medium text-slate-900">{customers.length}</span> من{' '}
                <span className="font-medium text-slate-900">{totalCustomersInDB}</span> عميل
              </p>
            </div>

            {/* Customer Grid */}
            <div className="opw-customers-grid">
              {customers.map((customer) => (
                <ProCustomerCard
                  key={customer.id}
                  customer={customer}
                  contractCount={contractCountsData?.[customer.id] || 0}
                  onView={() => handleViewCustomer(customer)}
                  onEdit={() => handleEditCustomer(customer)}
                  onDelete={() => handleDeleteCustomer(customer)}
                  onQuickRent={() => handleQuickRent(customer)}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  navigate={navigate}
                />
              ))}
            </div>

          </>
        )}
            {/* Pagination */}
            {!error && !isLoading && totalPages > 1 && (
              <div className="opw-pagination rounded-xl border border-border">
                <p className="text-sm text-[#6A7688]">
                  صفحة <span className="font-medium text-slate-900">{currentPage}</span> من{' '}
                  <span className="font-medium text-slate-900">{totalPages}</span>
                </p>

                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    variant="outline"
                    size="default"
                    aria-label="الصفحة السابقة" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="min-h-[44px] border-[#D8E1EC] hover:border-[#173A63] hover:bg-[#EEF5FB]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>

                  {pageNumbers(currentPage, totalPages).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "ghost"}
                      size="default"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "min-h-[44px] min-w-[44px]",
                        currentPage === page
                          ? "bg-[#173A63] text-white hover:bg-[#173A63]/90"
                          : "hover:bg-[#EEF5FB]"
                      )}
                    >
                      {page}
                    </Button>
                  ))}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="px-2 text-slate-400">...</span>
                      <Button
                        variant={currentPage === totalPages ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className={cn(
                          "h-9 w-9",
                          currentPage === totalPages
                            ? "bg-[#173A63] text-white hover:bg-[#173A63]/90"
                            : "hover:bg-[#EEF5FB]"
                        )}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}

                  <Button
                    variant="outline"
                    size="default"
                    aria-label="الصفحة التالية" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="min-h-[44px] border-[#D8E1EC] hover:border-[#173A63] hover:bg-[#EEF5FB]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
      </div>

      {/* Dialogs */}
      <EnhancedCustomerDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <EnhancedCustomerDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        editingCustomer={selectedCustomer}
      />

      <CustomerCSVUpload
        open={showCSVUpload}
        onOpenChange={setShowCSVUpload}
        onUploadComplete={() => {
          refetch();
          toast.success('تم رفع الملف بنجاح');
        }}
      />

      <CustomerExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        companyId={companyId!}
        filters={filters}
      />

      <CustomerDocumentDistributionDialog
        open={showDocumentDistribution}
        onOpenChange={setShowDocumentDistribution}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteCustomerMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteCustomerMutation.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OperationsWorkspace>
  );
};

export default CustomersPageRedesigned;
