/**
 * صفحة العملاء - تصميم احترافي SaaS
 * مستوحى من منصات مثل Linear و Stripe و Vercel
 * تصميم نظيف، متطور، مع تسلسل هرمي ممتاز للطباعة
 *
 * @component CustomersPageRedesigned
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCustomers, useCustomerCount } from '@/hooks/useEnhancedCustomers';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Customer, CustomerFilters } from '@/types/customer';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Search,
  Plus,
  Users,
  Building2,
  Phone,
  Mail,
  ChevronRight,
  ChevronLeft,
  Star,
  FileText,
  Upload,
  UserPlus,
  AlertCircle,
  RefreshCw,
  LayoutGrid,
  Columns,
  Crown,
  MoreVertical,
  Eye,
  Edit3,
  Trash2,
  Download,
  IdCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  EnhancedCustomerDialog,
  CustomerCSVUpload,
  CustomerSplitView,
} from '@/components/customers';
import CustomerExportDialog from '@/components/customers/CustomerExportDialog';
import CustomerDocumentDistributionDialog from '@/components/customers/CustomerDocumentDistributionDialog';

// ===== Professional Stat Card =====
interface ProStatCardProps {
  value: number | string;
  label: string;
  description: string;
  icon: React.ElementType;
  delay: number;
}

const ProStatCard: React.FC<ProStatCardProps> = ({ value, label, description, icon: Icon, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    className="relative bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-500/30 transition-all duration-300"
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
        <p className="text-sm font-medium text-slate-900 mt-1">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20">
        <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
      </div>
    </div>
    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
  </motion.div>
);

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
  index: number;
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
  index,
}) => {
  const getCustomerName = () => {
    if (customer.customer_type === 'individual') {
      const arName = `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim();
      const enName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
      return arName || enName || 'غير محدد';
    }
    return customer.company_name_ar || customer.company_name || 'غير محدد';
  };

  const getInitials = () => {
    const name = getCustomerName();
    if (name === 'غير محدد') return '؟';
    const parts = name.split(' ').filter(n => n.length > 0);
    return parts.slice(0, 2).map(n => n[0]).join('');
  };

  const getAvatarColor = () => {
    const colors = [
      'bg-sky-100 text-sky-700',
      'bg-indigo-100 text-indigo-700',
      'bg-violet-100 text-violet-700',
      'bg-purple-100 text-purple-700',
      'bg-fuchsia-100 text-fuchsia-700',
      'bg-pink-100 text-pink-700',
      'bg-rose-100 text-rose-700',
      'bg-orange-100 text-orange-700',
      'bg-amber-100 text-amber-700',
      'bg-emerald-100 text-emerald-700',
      'bg-teal-100 text-teal-700',
      'bg-cyan-100 text-cyan-700',
    ];
    return colors[index % colors.length];
  };

  const avatarColor = getAvatarColor();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="group relative bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-5 shadow-sm hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-500/30 transition-all duration-300 cursor-pointer"
      onClick={onView}
    >
      {/* VIP Badge */}
      {customer.is_vip && (
        <div className="absolute top-4 right-4">
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 gap-1">
            <Crown className="w-3 h-3" />
            VIP
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <Avatar className={cn("w-10 h-10", avatarColor.split(' ')[0])}>
          <AvatarFallback className={cn("text-sm font-medium", avatarColor)}>
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-neutral-900 truncate group-hover:text-coral-600 transition-colors">
            {getCustomerName()}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs px-2 py-0 h-5">
              {customer.customer_type === 'individual' ? (
                <><Users className="w-3 h-3 ml-1" /> فرد</>
              ) : (
                <><Building2 className="w-3 h-3 ml-1" /> شركة</>
              )}
            </Badge>
            {customer.is_active && (
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            )}
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <Mail className="w-3.5 h-3.5 flex-shrink-0 text-neutral-400" />
          <span className="truncate">{customer.email || '-'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <Phone className="w-3.5 h-3.5 flex-shrink-0 text-neutral-400" />
          <span className="font-mono truncate" dir="ltr">{customer.phone || '-'}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t">
        <div className="flex items-center gap-1.5 text-sm">
          <FileText className="w-4 h-4 text-neutral-400" />
          <span className="font-medium text-neutral-900">{contractCount}</span>
          <span className="text-neutral-500">عقود</span>
        </div>

        {contractCount === 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickRent();
            }}
            className="text-xs font-medium text-coral-600 hover:text-coral-700 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            إنشاء عقد
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }} className="gap-2">
              <Eye className="w-4 h-4" />
              عرض التفاصيل
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="gap-2">
                <Edit3 className="w-4 h-4" />
                تعديل
              </DropdownMenuItem>
            )}
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="gap-2 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
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
const exportCustomersToExcel = async (
  customers: Customer[],
  companyId: string,
  filters: CustomerFilters,
  supabaseClient: any
) => {
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

    if (filters.customer_type && filters.customer_type !== 'all') {
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
  const queryClient = useQueryClient();
  const { companyId, isAuthenticating } = useUnifiedCompanyAccess();
  const { hasPermission } = useRolePermissions();

  const canEdit = hasPermission('edit_customers');
  const canDelete = hasPermission('delete_customers');

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
  const { data: individualCount = 0 } = useCustomerCount({ customer_type: 'individual', includeInactive: false });
  const { data: corporateCount = 0 } = useCustomerCount({ customer_type: 'corporate', includeInactive: false });
  const vipCount = customers.filter(c => c.is_vip).length;

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

  // Delete mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id')
        .eq('customer_id', customerId)
        .limit(1);
      if (contracts && contracts.length > 0) {
        throw new Error('لا يمكن حذف العميل لأنه مرتبط بعقود');
      }
      const { error } = await supabase.from('customers').delete().eq('id', customerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', companyId] });
      toast.success('تم حذف العميل بنجاح');
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل حذف العميل');
    }
  });

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteCustomerMutation.mutate(customerToDelete.id);
    }
  };

  // Loading state
  if (isAuthenticating || !companyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-teal-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20">
                <Users className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  العملاء
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  إدارة بيانات العملاء
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center bg-slate-100/80 backdrop-blur rounded-2xl p-1 border border-slate-200/50">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200",
                    viewMode === 'grid'
                      ? 'bg-white shadow-sm text-slate-900'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <LayoutGrid className="w-4 h-4 ml-1" />
                  شبكة
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200",
                    viewMode === 'split'
                      ? 'bg-white shadow-sm text-slate-900'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Columns className="w-4 h-4 ml-1" />
                  مقسم
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCSVUpload(true)}
                className="gap-2 border-slate-200/50 hover:border-teal-500/30 hover:bg-teal-50"
              >
                <Upload className="w-4 h-4" />
                استيراد
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportDialog(true)}
                disabled={isLoading}
                className="gap-2 border-slate-200/50 hover:border-teal-500/30 hover:bg-teal-50"
              >
                <Download className="w-4 h-4" />
                تصدير
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDocumentDistribution(true)}
                disabled={isLoading}
                className="gap-2 border-slate-200/50 hover:border-teal-500/30 hover:bg-teal-50"
              >
                <IdCard className="w-4 h-4" />
                توزيع البطاقات
              </Button>

              <Button
                size="sm"
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white gap-2 shadow-lg shadow-teal-500/20"
              >
                <UserPlus className="w-4 h-4" />
                إضافة عميل
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProStatCard
            value={totalCustomersInDB}
            label="إجمالي العملاء"
            description="النشطين"
            icon={Users}
            delay={0}
          />
          <ProStatCard
            value={individualCount}
            label="الأفراد"
            description="نشطين"
            icon={UserPlus}
            delay={0.1}
          />
          <ProStatCard
            value={corporateCount}
            label="الشركات"
            description="نشطين"
            icon={Building2}
            delay={0.2}
          />
        </div>

        {/* Search & Filters Bar */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-4 shadow-sm hover:border-teal-500/30 transition-all duration-300">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="بحث بالاسم، الهاتف، أو البريد..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-10 pr-10 text-sm bg-white/50 border-slate-200/50 focus:border-teal-500/50"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
                >
                  <Plus className="w-3 h-3 text-slate-400 rotate-45" />
                </button>
              )}
            </div>

            {/* Type Filter */}
            <Select value={customerType} onValueChange={(v: any) => { setCustomerType(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-10 w-full lg:w-40">
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
              <SelectTrigger className="h-10 w-full lg:w-40">
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
        {viewMode === 'split' ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-48 bg-white rounded-xl border animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-12 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">خطأ في التحميل</h3>
            <p className="text-sm text-slate-500 mb-6">
              {error instanceof Error ? error.message : 'حدث خطأ غير متوقع'}
            </p>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="gap-2 border-slate-200/50 hover:border-teal-500/30 hover:bg-teal-50"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </Button>
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500/10 to-teal-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-teal-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">لا توجد عملاء</h3>
            <p className="text-sm text-slate-500 mb-6">
              ابدأ بإضافة عملاء جدد للنظام
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-lg shadow-teal-500/20"
            >
              <UserPlus className="w-4 h-4 ml-2" />
              إضافة عميل
            </Button>
          </div>
        ) : (
          <>
            {/* Results Count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                <span className="font-medium text-slate-900">{customers.length}</span> من{' '}
                <span className="font-medium text-slate-900">{totalCustomersInDB}</span> عميل
              </p>
            </div>

            {/* Customer Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {customers.map((customer, index) => (
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
                  index={index}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-4">
                <p className="text-sm text-slate-500">
                  صفحة <span className="font-medium text-slate-900">{currentPage}</span> من{' '}
                  <span className="font-medium text-slate-900">{totalPages}</span>
                </p>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-9 border-slate-200/50 hover:border-teal-500/30 hover:bg-teal-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "h-9 w-9",
                        currentPage === page
                          ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700"
                          : "hover:bg-slate-100"
                      )}
                    >
                      {page}
                    </Button>
                  ))}
                  {totalPages > 5 && (
                    <>
                      <span className="px-2 text-slate-400">...</span>
                      <Button
                        variant={currentPage === totalPages ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className={cn(
                          "h-9 w-9",
                          currentPage === totalPages
                            ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700"
                            : "hover:bg-slate-100"
                        )}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-9 border-slate-200/50 hover:border-teal-500/30 hover:bg-teal-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
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
    </div>
  );
};

export default CustomersPageRedesigned;
