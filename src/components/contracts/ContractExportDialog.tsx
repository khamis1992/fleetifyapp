import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Calendar,
  Filter,
  Settings2,
  BarChart3,
  CheckCircle,
  X,
  Loader2,
  FileJson,
  TrendingUp,
  Users,
  Car,
  Banknote,
  Clock,
  Sparkles,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface ContractExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExportFormat = 'pdf' | 'excel' | 'json';

interface ExportOption {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const exportOptions: ExportOption[] = [
  {
    id: 'pdf',
    label: 'PDF',
    description: 'تقرير قابل للطباعة',
    icon: FileText,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 border-rose-200 hover:border-rose-400'
  },
  {
    id: 'excel',
    label: 'Excel',
    description: 'جدول بيانات CSV',
    icon: FileSpreadsheet,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'
  },
  {
    id: 'json',
    label: 'JSON',
    description: 'للمطورين والتكامل',
    icon: FileJson,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200 hover:border-amber-400'
  }
];

const statusOptions = [
  { value: 'active', label: 'نشط' },
  { value: 'under_legal_procedure', label: 'إجراء قانوني' },
  { value: 'cancelled', label: 'ملغي' },
  { value: 'expired', label: 'منتهي' },
  { value: 'draft', label: 'مسودة' },
  { value: 'under_review', label: 'قيد المراجعة' },
  { value: 'suspended', label: 'معلق' },
];

export const ContractExportDialog: React.FC<ContractExportDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { user } = useAuth();
  const [exportType, setExportType] = React.useState<ExportFormat>('pdf');
  const [dateRange, setDateRange] = React.useState('all');
  const { formatCurrency, currency } = useCurrencyFormatter();
  const [customStartDate, setCustomStartDate] = React.useState('');
  const [customEndDate, setCustomEndDate] = React.useState('');
  
  // Multi-select for statuses
  const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([]);
  const [statusesOpen, setStatusesOpen] = React.useState(false);

  const [contractType, setContractType] = React.useState('all');
  const [includeCustomer, setIncludeCustomer] = React.useState(true);
  const [includeFinancial, setIncludeFinancial] = React.useState(true);
  const [includeVehicle, setIncludeVehicle] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState<'format' | 'filters' | 'options'>('format');

  // Fetch contracts for export
  const { data: contracts, error, isLoading } = useQuery({
    queryKey: ['contracts-export', user?.profile?.company_id, selectedStatuses, contractType, dateRange, customStartDate, customEndDate],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];
      
      let baseQuery = supabase
        .from('contracts')
        .select(`
          *,
          customer:customers(first_name, last_name, company_name, customer_type, phone, email),
          vehicle:vehicles(plate_number, make, model, year),
          cost_center:cost_centers(center_name, center_code)
        `)
        .eq('company_id', user.profile.company_id);

      // Status Filter Logic (Multiple)
      if (selectedStatuses.length > 0) {
        baseQuery = baseQuery.in('status', selectedStatuses);
      }
      
      if (contractType !== 'all') {
        baseQuery = baseQuery.eq('contract_type', contractType);
      }

      if (dateRange === 'custom' && customStartDate && customEndDate) {
        baseQuery = baseQuery.gte('contract_date', customStartDate).lte('contract_date', customEndDate);
      } else if (dateRange === 'month') {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        baseQuery = baseQuery.gte('contract_date', startOfMonth.toISOString().split('T')[0]);
      } else if (dateRange === 'year') {
        const startOfYear = new Date();
        startOfYear.setMonth(0, 1);
        baseQuery = baseQuery.gte('contract_date', startOfYear.toISOString().split('T')[0]);
      }

      baseQuery = baseQuery.order('contract_date', { ascending: false });

      const allContracts: any[] = [];
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const batchQuery = baseQuery.range(offset, offset + batchSize - 1);
        const { data: batch, error: fetchError } = await batchQuery;

        if (fetchError) {
          console.error('Contract export query error:', fetchError);
          throw fetchError;
        }

        if (batch && batch.length > 0) {
          allContracts.push(...batch);
          offset += batchSize;
          hasMore = batch.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      
      return allContracts;
    },
    enabled: !!user?.profile?.company_id && open
  });

  React.useEffect(() => {
    if (error) {
      console.error('Contract export error:', error);
      toast.error('حدث خطأ أثناء جلب بيانات العقود');
    }
  }, [error]);

  // Statistics
  const stats = React.useMemo(() => {
    if (!contracts) return { total: 0, active: 0, legal: 0, totalValue: 0 };
    return {
      total: contracts.length,
      active: contracts.filter(c => c.status === 'active').length,
      legal: contracts.filter(c => c.status === 'under_legal_procedure').length,
      totalValue: contracts.reduce((sum, c) => sum + (c.contract_amount || 0), 0)
    };
  }, [contracts]);

  const toggleStatus = (value: string) => {
    setSelectedStatuses(current => {
      if (current.includes(value)) {
        return current.filter(item => item !== value);
      } else {
        return [...current, value];
      }
    });
  };

  const generatePDF = () => {
    if (!contracts || contracts.length === 0) {
      toast.error('لا توجد عقود للتصدير');
      return;
    }

    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <title>تقرير العقود - Fleetify</title>
          <link rel="icon" href="${window.location.origin}/uploads/7453c280-3175-4ccf-a73b-24921ec5990b.png" type="image/png">
          <link rel="shortcut icon" href="${window.location.origin}/uploads/7453c280-3175-4ccf-a73b-24921ec5990b.png" type="image/png">
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
              direction: rtl; 
              margin: 0;
              padding: 40px;
              background: linear-gradient(135deg, #f0fdfa 0%, #f8fafc 100%);
            }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { 
              background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
              color: white;
              padding: 30px;
              border-radius: 16px;
              margin-bottom: 30px;
              text-align: center;
            }
            .header h1 { margin: 0 0 10px; font-size: 28px; }
            .header p { margin: 5px 0; opacity: 0.9; }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .stat-card {
              background: white;
              padding: 20px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
              text-align: center;
            }
            .stat-value { font-size: 28px; font-weight: bold; color: #0d9488; }
            .stat-label { color: #64748b; font-size: 14px; margin-top: 5px; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            }
            th { 
              background: #0d9488; 
              color: white;
              padding: 15px;
              text-align: right;
              font-weight: 600;
            }
            td { 
              padding: 12px 15px;
              border-bottom: 1px solid #e2e8f0;
            }
            tr:nth-child(even) { background: #f8fafc; }
            tr:hover { background: #f0fdfa; }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 500;
            }
            .status-active { background: #d1fae5; color: #059669; }
            .status-legal { background: #fee2e2; color: #dc2626; }
            .status-cancelled { background: #f1f5f9; color: #64748b; }
            @media print { 
              body { padding: 20px; background: white; }
              .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 تقرير العقود</h1>
              <p>تاريخ التقرير: ${new Date().toLocaleDateString('ar-QA')}</p>
              <p>إجمالي العقود: ${contracts.length} عقد</p>
            </div>
            
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">إجمالي العقود</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${stats.active}</div>
                <div class="stat-label">العقود النشطة</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${stats.legal}</div>
                <div class="stat-label">إجراء قانوني</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${formatCurrency(stats.totalValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                <div class="stat-label">إجمالي القيمة</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>رقم العقد</th>
                  <th>الحالة</th>
                  ${includeCustomer ? '<th>العميل</th>' : ''}
                  <th>تاريخ البداية</th>
                  <th>تاريخ النهاية</th>
                  ${includeFinancial ? `<th>المبلغ</th>` : ''}
                  ${includeVehicle ? '<th>المركبة</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${contracts.map(contract => {
                  const statusClass = contract.status === 'active' ? 'status-active' : 
                                     contract.status === 'under_legal_procedure' ? 'status-legal' : 'status-cancelled';
                  const statusText = contract.status === 'active' ? 'نشط' :
                                    contract.status === 'under_legal_procedure' ? 'إجراء قانوني' :
                                    contract.status === 'cancelled' ? 'ملغي' :
                                    contract.status === 'expired' ? 'منتهي' : contract.status;
                  return `
                    <tr>
                      <td><strong>${contract.contract_number || 'غير محدد'}</strong></td>
                      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                      ${includeCustomer ? `<td>${(contract.customer as any)?.customer_type === 'individual' 
                        ? `${(contract.customer as any)?.first_name || ''} ${(contract.customer as any)?.last_name || ''}`.trim() || 'غير محدد'
                        : (contract.customer as any)?.company_name || 'غير محدد'}</td>` : ''}
                      <td>${contract.start_date ? new Date(contract.start_date).toLocaleDateString('ar-QA') : '-'}</td>
                      <td>${contract.end_date ? new Date(contract.end_date).toLocaleDateString('ar-QA') : '-'}</td>
                      ${includeFinancial ? `<td>${formatCurrency(contract.contract_amount || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>` : ''}
                      ${includeVehicle ? `<td>${(contract.vehicle as any)?.plate_number || '-'}</td>` : ''}
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('حدث خطأ أثناء إنشاء تقرير PDF');
    }
  };

  const generateExcel = () => {
    if (!contracts || contracts.length === 0) {
      toast.error('لا توجد عقود للتصدير');
      return;
    }

    try {
      const headers = [
        'رقم العقد',
        'الحالة',
        ...(includeCustomer ? ['العميل'] : []),
        'تاريخ البداية',
        'تاريخ النهاية',
        ...(includeFinancial ? [`المبلغ (${currency})`, `المبلغ الشهري (${currency})`] : []),
        ...(includeVehicle ? ['رقم اللوحة'] : [])
      ];

      const csvData = contracts.map(contract => [
        contract.contract_number || 'غير محدد',
        contract.status === 'active' ? 'نشط' :
        contract.status === 'under_legal_procedure' ? 'إجراء قانوني' :
        contract.status === 'cancelled' ? 'ملغي' :
        contract.status === 'expired' ? 'منتهي' : contract.status,
        ...(includeCustomer ? [
          (contract.customer as any)?.customer_type === 'individual' 
            ? `${(contract.customer as any)?.first_name || ''} ${(contract.customer as any)?.last_name || ''}`.trim() || 'غير محدد'
            : (contract.customer as any)?.company_name || 'غير محدد'
        ] : []),
        contract.start_date ? new Date(contract.start_date).toLocaleDateString('en-GB') : 'غير محدد',
        contract.end_date ? new Date(contract.end_date).toLocaleDateString('en-GB') : 'غير محدد',
        ...(includeFinancial ? [
          contract.contract_amount || 0,
          contract.monthly_amount || 0
        ] : []),
        ...(includeVehicle ? [(contract.vehicle as any)?.plate_number || 'لا يوجد'] : [])
      ]);

      const csvContent = [headers, ...csvData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', `contracts_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Excel generation error:', error);
      toast.error('حدث خطأ أثناء إنشاء تقرير Excel');
    }
  };

  const generateJSON = () => {
    if (!contracts || contracts.length === 0) {
      toast.error('لا توجد عقود للتصدير');
      return;
    }

    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        totalContracts: contracts.length,
        summary: stats,
        contracts: contracts.map(contract => ({
          id: contract.id,
          contractNumber: contract.contract_number,
          status: contract.status,
          startDate: contract.start_date,
          endDate: contract.end_date,
          ...(includeFinancial ? {
            amount: contract.contract_amount,
            monthlyAmount: contract.monthly_amount
          } : {}),
          ...(includeCustomer && contract.customer ? {
            customer: contract.customer
          } : {}),
          ...(includeVehicle && contract.vehicle ? {
            vehicle: contract.vehicle
          } : {})
        }))
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', `contracts_export_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('JSON generation error:', error);
      toast.error('حدث خطأ أثناء إنشاء ملف JSON');
    }
  };

  const handleExport = async () => {
    if (isLoading) {
      toast.error('جاري تحميل البيانات...');
      return;
    }
    
    if (!contracts || contracts.length === 0) {
      toast.error('لا توجد عقود للتصدير');
      return;
    }

    setIsExporting(true);
    
    try {
      if (exportType === 'pdf') {
        generatePDF();
      } else if (exportType === 'excel') {
        generateExcel();
      } else if (exportType === 'json') {
        generateJSON();
      }
      
      toast.success('تم تصدير التقرير بنجاح');
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('حدث خطأ أثناء التصدير');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFormat = exportOptions.find(o => o.id === exportType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-gradient-to-br from-slate-50 to-teal-50/30 border-0 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">تصدير تقرير العقود</h2>
                <p className="text-teal-100 text-sm">اختر التنسيق والفلاتر المناسبة</p>
              </div>
            </div>
            <button 
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-teal-100">إجمالي العقود</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{stats.active}</div>
              <div className="text-xs text-teal-100">نشط</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{stats.legal}</div>
              <div className="text-xs text-teal-100">إجراء قانوني</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <div className="text-lg font-bold">{formatCurrency(stats.totalValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              <div className="text-xs text-teal-100">القيمة</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Section Tabs */}
          <div className="flex gap-2 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50">
            {[
              { id: 'format', label: 'نوع الملف', icon: FileText },
              { id: 'filters', label: 'الفلاتر', icon: Filter },
              { id: 'options', label: 'الخيارات', icon: Settings2 }
            ].map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  activeSection === section.id
                    ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/20"
                    : "text-slate-600 hover:bg-slate-100/50"
                )}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </button>
            ))}
          </div>

          {/* Format Section */}
          <AnimatePresence mode="wait">
            {activeSection === 'format' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-3 gap-4"
              >
                {exportOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = exportType === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setExportType(option.id)}
                      className={cn(
                        "relative p-5 rounded-2xl border-2 transition-all duration-300",
                        isSelected 
                          ? "border-teal-500 bg-teal-50 shadow-lg shadow-teal-500/20" 
                          : `border-slate-200 bg-white hover:border-teal-300 hover:shadow-md`
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-3 left-3 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center mb-3 mx-auto transition-colors",
                        isSelected ? "bg-teal-500 text-white" : option.bgColor.split(' ')[0]
                      )}>
                        <Icon className={cn("w-6 h-6", isSelected ? "text-white" : option.color)} />
                      </div>
                      <h4 className="font-semibold text-slate-900">{option.label}</h4>
                      <p className="text-xs text-slate-500 mt-1">{option.description}</p>
                    </button>
                  );
                })}
              </motion.div>
            )}

            {/* Filters Section */}
            {activeSection === 'filters' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 p-4">
                    <Label className="flex items-center gap-2 text-slate-700 mb-3">
                      <Calendar className="w-4 h-4 text-teal-500" />
                      نطاق التاريخ
                    </Label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger className="bg-white/50 border-slate-200/50 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع التواريخ</SelectItem>
                        <SelectItem value="month">هذا الشهر</SelectItem>
                        <SelectItem value="year">هذا العام</SelectItem>
                        <SelectItem value="custom">تاريخ مخصص</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 p-4">
                    <Label className="flex items-center gap-2 text-slate-700 mb-3">
                      <BarChart3 className="w-4 h-4 text-teal-500" />
                      حالة العقد
                    </Label>
                    
                    {/* Multi-Select Status Filter */}
                    <Popover open={statusesOpen} onOpenChange={setStatusesOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={statusesOpen}
                          className="w-full justify-between bg-white/50 border-slate-200/50 rounded-xl h-10"
                        >
                          <span className="truncate">
                            {selectedStatuses.length === 0
                              ? "جميع الحالات"
                              : selectedStatuses.length === 1
                                ? statusOptions.find((status) => status.value === selectedStatuses[0])?.label
                                : `${selectedStatuses.length} حالات مختارة`}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="ابحث عن حالة..." />
                          <CommandList>
                            <CommandEmpty>لم يتم العثور على حالة.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => {
                                  setSelectedStatuses([]);
                                }}
                                className="cursor-pointer"
                              >
                                <div className={cn(
                                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                  selectedStatuses.length === 0
                                    ? "bg-primary text-primary-foreground"
                                    : "opacity-50 [&_svg]:invisible"
                                )}>
                                  <Check className={cn("h-4 w-4")} />
                                </div>
                                <span>جميع الحالات</span>
                              </CommandItem>
                              
                              {statusOptions.map((status) => (
                                <CommandItem
                                  key={status.value}
                                  onSelect={() => toggleStatus(status.value)}
                                  className="cursor-pointer"
                                >
                                  <div className={cn(
                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                    selectedStatuses.includes(status.value)
                                      ? "bg-primary text-primary-foreground"
                                      : "opacity-50 [&_svg]:invisible"
                                  )}>
                                    <Check className={cn("h-4 w-4")} />
                                  </div>
                                  <span>{status.label}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    
                    {/* Display Selected Statuses Tags */}
                    {selectedStatuses.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedStatuses.map(statusValue => {
                          const status = statusOptions.find(s => s.value === statusValue);
                          return (
                            <Badge key={statusValue} variant="secondary" className="px-2 py-0.5 text-xs">
                              {status?.label}
                              <button
                                className="mr-1 hover:text-red-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStatus(statusValue);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {dateRange === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 p-4">
                      <Label className="text-slate-700 mb-3 block">من تاريخ</Label>
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="bg-white/50 border-slate-200/50 rounded-xl"
                      />
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 p-4">
                      <Label className="text-slate-700 mb-3 block">إلى تاريخ</Label>
                      <Input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="bg-white/50 border-slate-200/50 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 p-4">
                  <Label className="flex items-center gap-2 text-slate-700 mb-3">
                    <FileText className="w-4 h-4 text-teal-500" />
                    نوع العقد
                  </Label>
                  <Select value={contractType} onValueChange={setContractType}>
                    <SelectTrigger className="bg-white/50 border-slate-200/50 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأنواع</SelectItem>
                      <SelectItem value="rental">إيجار</SelectItem>
                      <SelectItem value="service">خدمة</SelectItem>
                      <SelectItem value="maintenance">صيانة</SelectItem>
                      <SelectItem value="sales">مبيعات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}

            {/* Options Section */}
            {activeSection === 'options' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 p-4">
                  <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-teal-500" />
                    البيانات المضمنة في التقرير
                  </h4>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer transition-colors">
                      <Checkbox
                        checked={includeCustomer}
                        onCheckedChange={(checked) => setIncludeCustomer(checked === true)}
                        className="data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                      />
                      <Users className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-700">معلومات العميل</p>
                        <p className="text-xs text-slate-500">الاسم، رقم الهاتف، البريد الإلكتروني</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer transition-colors">
                      <Checkbox
                        checked={includeFinancial}
                        onCheckedChange={(checked) => setIncludeFinancial(checked === true)}
                        className="data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                      />
                      <Banknote className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-700">البيانات المالية</p>
                        <p className="text-xs text-slate-500">قيمة العقد، المبلغ الشهري</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer transition-colors">
                      <Checkbox
                        checked={includeVehicle}
                        onCheckedChange={(checked) => setIncludeVehicle(checked === true)}
                        className="data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                      />
                      <Car className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-700">معلومات المركبة</p>
                        <p className="text-xs text-slate-500">رقم اللوحة، الموديل، السنة</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Future Improvements Suggestion */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/50 p-4">
                  <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    مقترحات للتطوير المستقبلي
                  </h4>
                  <ul className="space-y-2 text-sm text-amber-700">
                    <li className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      جدولة التقارير التلقائية (يومي/أسبوعي/شهري)
                    </li>
                    <li className="flex items-center gap-2">
                      <TrendingUp className="w-3 h-3" />
                      إضافة رسوم بيانية ومخططات تحليلية
                    </li>
                    <li className="flex items-center gap-2">
                      <Users className="w-3 h-3" />
                      إرسال التقارير عبر البريد الإلكتروني
                    </li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedFormat && (
                <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm", selectedFormat.bgColor)}>
                  <selectedFormat.icon className={cn("w-4 h-4", selectedFormat.color)} />
                  <span className={selectedFormat.color}>{selectedFormat.label}</span>
                </div>
              )}
              <span className="text-sm text-slate-500">
                {isLoading ? 'جاري التحميل...' : `${stats.total} عقد جاهز للتصدير`}
              </span>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="rounded-xl border-slate-200/50 hover:bg-slate-100/50"
              >
                إلغاء
              </Button>
              <Button 
                onClick={handleExport} 
                disabled={isExporting || isLoading || !contracts?.length}
                className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-xl shadow-lg shadow-teal-500/20 min-w-[120px]"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    جاري التصدير...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 ml-2" />
                    تصدير
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};