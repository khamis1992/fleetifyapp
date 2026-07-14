import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NumberDisplay } from '@/components/ui/NumberDisplay';
import { formatCustomerName } from '@/utils/formatCustomerName';
import {
  FileText,
  Calendar,
  DollarSign,
  User,
  Car,
  Building2,
  Edit,
  Download,
  Printer,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  FileEdit
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ContractDocuments } from './ContractDocuments';
import { PayInvoiceDialog } from '@/components/finance/PayInvoiceDialog';
import { InvoicePreviewDialog } from '@/components/finance/InvoicePreviewDialog';
import { LateFinesTab } from './LateFinesTab';
import { VehicleCheckInOut } from '@/components/vehicles/VehicleCheckInOut';
import { useVehicleInspections } from '@/hooks/useVehicleInspections';
import { OfficialContractView } from './OfficialContractView';
import { toast } from 'sonner';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import type { Contract } from '@/types/contracts';
import type { Invoice } from '@/types/finance.types';
import type { Database } from '@/integrations/supabase/types';

type ContractUpdate = Database['public']['Tables']['contracts']['Update'];
type InvoiceRow = Database['public']['Tables']['invoices']['Row'];

const normalizeInvoice = (invoice: InvoiceRow): Invoice => {
  const paymentStatus = invoice.payment_status === 'paid'
    ? 'paid'
    : ['partial', 'partially_paid'].includes(invoice.payment_status)
      ? 'partial'
      : 'unpaid';
  const invoiceStatus = ['draft', 'sent', 'paid', 'overdue', 'cancelled'].includes(invoice.status)
    ? invoice.status as Invoice['status']
    : 'draft';
  const invoiceType = ['sales', 'purchase', 'service'].includes(invoice.invoice_type)
    ? invoice.invoice_type as Invoice['invoice_type']
    : 'service';

  return {
    id: invoice.id,
    company_id: invoice.company_id,
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date ?? undefined,
    customer_id: invoice.customer_id ?? undefined,
    vendor_id: invoice.vendor_id ?? undefined,
    cost_center_id: invoice.cost_center_id ?? undefined,
    fixed_asset_id: invoice.fixed_asset_id ?? undefined,
    invoice_type: invoiceType,
    subtotal: invoice.subtotal,
    tax_amount: invoice.tax_amount ?? 0,
    discount_amount: invoice.discount_amount ?? 0,
    total_amount: invoice.total_amount,
    paid_amount: invoice.paid_amount ?? 0,
    balance_due: invoice.balance_due ?? Math.max(0, invoice.total_amount - (invoice.paid_amount ?? 0)),
    currency: invoice.currency ?? 'QAR',
    status: invoiceStatus,
    payment_status: paymentStatus,
    notes: invoice.notes ?? undefined,
    terms: invoice.terms ?? undefined,
    journal_entry_id: invoice.journal_entry_id ?? undefined,
    created_by: invoice.created_by ?? undefined,
    created_at: invoice.created_at,
    updated_at: invoice.updated_at,
  };
};

const getContractTypeLabel = (type: Contract['contract_type']) => ({
  rental: 'إيجار',
  daily_rental: 'إيجار يومي',
  weekly_rental: 'إيجار أسبوعي',
  monthly_rental: 'إيجار شهري',
  yearly_rental: 'إيجار سنوي',
  rent_to_own: 'إيجار منتهي بالتملك',
}[type] ?? type);

// SECURITY FIX: Added proper types to replace 'any'
interface VehicleConditionReportData {
  [key: string]: unknown;
}

interface ContractDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract;
  onEdit?: (contract: Contract) => void;
  onCreateInvoice?: (contract: Contract) => void;
  onAmendContract?: (contract: Contract) => void;
}

export const ContractDetailsDialog: React.FC<ContractDetailsDialogProps> = ({
  open,
  onOpenChange,
  contract,
  onEdit,
  onCreateInvoice,
  onAmendContract
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editData, setEditData] = React.useState<ContractUpdate>({});
  const { formatCurrency, currency } = useCurrencyFormatter();

  // Payment and preview dialog state
  const [selectedInvoice, setSelectedInvoice] = React.useState<Invoice | null>(null);
  const [isPayDialogOpen, setIsPayDialogOpen] = React.useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = React.useState(false);

  // Invoice generation state
  const [isGeneratingInvoices, setIsGeneratingInvoices] = React.useState(false);

  // Update editData when contract changes
  React.useEffect(() => {
    if (contract) {
      setEditData({
        contract_type: contract.contract_type,
        start_date: contract.start_date,
        end_date: contract.end_date,
        contract_amount: contract.contract_amount,
        monthly_amount: contract.monthly_amount,
        description: contract.description,
        terms: contract.terms,
      });
    }
  }, [contract]);

  // Fetch related data
  const { data: customer } = useQuery({
    queryKey: ['customer', contract?.customer_id],
    queryFn: async () => {
      if (!contract?.customer_id) return null;
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('id', contract.customer_id)
        .eq('company_id', contract.company_id)
        .single();
      return data;
    },
    enabled: !!contract?.customer_id
  });

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', contract?.vehicle_id],
    queryFn: async () => {
      // Log for debugging
      console.log('🔍 [VEHICLE_FETCH] Fetching vehicle data for contract:', {
        contractId: contract?.id,
        vehicleId: contract?.vehicle_id,
        hasVehicleId: !!contract?.vehicle_id
      });
      
      if (!contract?.vehicle_id) {
        console.log('⚠️ [VEHICLE_FETCH] No vehicle_id found in contract');
        return null;
      }
      
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', contract.vehicle_id)
        .eq('company_id', contract.company_id)
        .single();
      
      if (error) {
        console.error('❌ [VEHICLE_FETCH] Error fetching vehicle:', error);
        return null;
      }
      
      console.log('✅ [VEHICLE_FETCH] Successfully fetched vehicle:', data);
      return data;
    },
    enabled: !!contract?.vehicle_id
  });

  const { data: chartOfAccount } = useQuery({
    queryKey: ['chart-of-account', contract?.account_id],
    queryFn: async () => {
      if (!contract?.account_id) return null;
      const { data } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('id', contract.account_id)
        .eq('company_id', contract.company_id)
        .single();
      return data;
    },
    enabled: !!contract?.account_id
  });

  const { data: invoices, refetch: refetchInvoices } = useQuery({
    queryKey: ['contract-invoices', contract?.id],
    queryFn: async () => {
      if (!contract?.id) return [];
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('contract_id', contract.id)
        .eq('company_id', contract.company_id)
        .neq('status', 'cancelled')  // استبعاد الفواتير الملغاة
        .order('created_at', { ascending: false });
      return (data || []).map(normalizeInvoice);
    },
    enabled: !!contract?.id
  });

  // Fetch vehicle inspections
  const { data: inspections, refetch: refetchInspections } = useVehicleInspections({
    contractId: contract?.id || '',
    enabled: !!contract?.id && !!contract?.vehicle_id
  });

  // Get check-in and check-out inspections
  const checkInInspection = inspections?.find((i) => i.inspection_type === 'check_in');
  const checkOutInspection = inspections?.find((i) => i.inspection_type === 'check_out');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'draft': return <Clock className="h-4 w-4" />;
      case 'expired': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  // Handlers for invoice actions
  const handleInvoicePreview = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPreviewDialogOpen(true);
  };

  const handleInvoicePay = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPayDialogOpen(true);
  };

  const handleInvoiceEdit = (invoice: Invoice) => {
    console.log("Edit invoice:", invoice);
  };

  const handleInvoiceDelete = (invoice: Invoice) => {
    console.log("Delete invoice:", invoice);
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('contracts')
        .update(editData)
        .eq('id', contract.id)
        .eq('company_id', contract.company_id);

      if (error) throw error;

      toast.success('تم تحديث العقد بنجاح');
      setIsEditing(false);
      onEdit?.({
        ...contract,
        ...editData,
        contract_type: (editData.contract_type ?? contract.contract_type) as Contract['contract_type'],
        status: contract.status,
      });
    } catch (error) {
      console.error('Error updating contract:', error);
      toast.error('حدث خطأ في تحديث العقد');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Create contract export data
    const exportData = {
      contract_number: contract.contract_number,
      customer_name: formatCustomerName(customer),
      contract_type: contract.contract_type,
      start_date: contract.start_date,
      end_date: contract.end_date,
      contract_amount: contract.contract_amount,
      monthly_amount: contract.monthly_amount,
      status: contract.status,
      vehicle_plate: vehicle?.plate_number,
      account: chartOfAccount ? `${chartOfAccount.account_code} - ${chartOfAccount.account_name}` : null
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `contract_${contract.contract_number}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleGenerateInvoicesFromPayments = async () => {
    if (!contract?.id) return;
    
    setIsGeneratingInvoices(true);
    
    try {
      const { backfillInvoicesForContract } = await import('@/utils/createInvoiceForPayment');
      const result = await backfillInvoicesForContract(contract.id, contract.company_id);
      
      if (result.success) {
        if (result.created > 0) {
          toast.success(`تم إنشاء ${result.created} فاتورة بنجاح`);
        } else {
          toast.info('لا توجد مدفوعات تحتاج إلى فواتير');
        }
        
        if (result.errors.length > 0) {
          console.error('Invoice generation errors:', result.errors);
        }
        
        // Refresh invoices data
        await refetchInvoices();
      } else {
        toast.error('فشل في إنشاء الفواتير');
      }
    } catch (error) {
      console.error('Error generating invoices:', error);
      toast.error('حدث خطأ أثناء إنشاء الفواتير');
    } finally {
      setIsGeneratingInvoices(false);
    }
  };

  // Enhanced vehicle data handling - use contract.vehicle if available, otherwise fetch separately
  const vehicleData = React.useMemo(() => {
    // First check if vehicle data is already embedded in the contract
    if (contract?.vehicle) {
      return contract.vehicle;
    }

    // Then check if we have fetched vehicle data
    if (vehicle) {
      return vehicle;
    }

    // Check for direct vehicle properties on contract (from contracts table)
    if (contract?.license_plate || contract?.make || contract?.model) {
      return {
        id: contract.vehicle_id,
        plate_number: contract.license_plate,
        make: contract.make,
        model: contract.model,
        year: contract.year,
        status: contract.vehicle_status || 'active'
      };
    }

    // Finally, check if only vehicle_id exists (backward compatibility)
    if (contract?.vehicle_id) {
      return {
        id: contract.vehicle_id,
        plate_number: contract.vehicle?.plate_number || contract.license_plate,
        make: contract.make,
        model: contract.model,
        year: contract.year,
        status: contract.vehicle_status || 'active'
      };
    }

    return null;
  }, [contract, vehicle]);

  // Log contract data for debugging
  React.useEffect(() => {
    if (contract) {
      console.log('🔍 [CONTRACT_DETAILS] Contract data received:', {
        id: contract.id,
        contract_number: contract.contract_number,
        vehicle_id: contract.vehicle_id,
        hasVehicle: !!contract.vehicle,
        vehicle: contract.vehicle,
        // Direct vehicle fields
        license_plate: contract.license_plate,
        make: contract.make,
        model: contract.model,
        year: contract.year,
        vehicle_status: contract.vehicle_status,
        // Check if any vehicle data exists
        hasAnyVehicleData: !!(contract.vehicle_id || contract.license_plate || contract.make || contract.model)
      });

      // Log the actual vehicle data that will be displayed
      console.log('🚗 [CONTRACT_DETAILS] Vehicle data to display:', vehicleData);
    }
  }, [contract, vehicleData]);

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              تفاصيل العقد رقم <NumberDisplay value={contract.contract_number} className="inline" />
            </DialogTitle>
            <div className="flex gap-2">
              {contract.status === 'active' && onAmendContract && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onAmendContract(contract)}
                  className="border-blue-500 text-blue-700 hover:bg-blue-50"
                >
                  <FileEdit className="h-4 w-4 mr-2" />
                  تعديل العقد
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                طباعة
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                تصدير
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                <Edit className="h-4 w-4 mr-2" />
                {isEditing ? 'إلغاء التعديل' : 'تعديل'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-1" dir="rtl">
            <TabsTrigger value="details">التفاصيل</TabsTrigger>
            <TabsTrigger value="official-contract" className="gap-1 bg-primary/10 border border-primary/20">
              <FileText className="h-4 w-4" />
              العقد الرسمي
            </TabsTrigger>
            <TabsTrigger value="invoices">الفواتير</TabsTrigger>
            <TabsTrigger value="check-in" className="relative">
              استلام المركبة
              {checkInInspection && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="check-out" className="relative">
              تسليم المركبة
              {checkOutInspection && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="fines">الغرامات والتأخيرات</TabsTrigger>
            <TabsTrigger value="timeline">التاريخ</TabsTrigger>
            <TabsTrigger value="documents">المستندات</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="rtl">
              {/* Contract Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    معلومات العقد
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between" dir="rtl">
                    <span className="text-sm text-muted-foreground">حالة العقد</span>
                    <Badge className={getStatusColor(contract.status)}>
                      {getStatusIcon(contract.status)}
                      <span className="ml-1">
                        {contract.status === 'active' ? 'نشط' :
                         contract.status === 'draft' ? 'مسودة' :
                         contract.status === 'expired' ? 'منتهي' :
                         contract.status === 'suspended' ? 'معلق' :
                         contract.status === 'cancelled' ? 'ملغي' : contract.status}
                      </span>
                    </Badge>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <Label>نوع العقد</Label>
                        <Input
                          value={editData.contract_type || contract.contract_type || ''}
                          onChange={(e) => setEditData({...editData, contract_type: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>تاريخ البداية</Label>
                        <Input
                          type="date"
                          value={editData.start_date || contract.start_date || ''}
                          onChange={(e) => setEditData({...editData, start_date: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>تاريخ النهاية</Label>
                        <Input
                          type="date"
                          value={editData.end_date || contract.end_date || ''}
                          onChange={(e) => setEditData({...editData, end_date: e.target.value})}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between" dir="rtl">
                        <span className="text-sm text-muted-foreground">نوع العقد</span>
                        <span className="font-medium">
                          {getContractTypeLabel(contract.contract_type)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between" dir="rtl">
                        <span className="text-sm text-muted-foreground">تاريخ البداية</span>
                        <span className="font-medium">
                          {new Date(contract.start_date).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between" dir="rtl">
                        <span className="text-sm text-muted-foreground">تاريخ النهاية</span>
                        <span className="font-medium">
                          {new Date(contract.end_date).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between" dir="rtl">
                        <span className="text-sm text-muted-foreground">مدة العقد</span>
                        <span className="font-medium">
                          {Math.ceil((new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24))} يوم
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Financial Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    المعلومات المالية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <Label>قيمة العقد ({currency})</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={editData.contract_amount !== undefined ? editData.contract_amount : (contract?.contract_amount || 0)}
                          onChange={(e) => setEditData({...editData, contract_amount: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <Label>المبلغ الشهري ({currency})</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={editData.monthly_amount !== undefined ? editData.monthly_amount : (contract?.monthly_amount || 0)}
                          onChange={(e) => setEditData({...editData, monthly_amount: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between" dir="rtl">
                        <span className="text-sm text-muted-foreground">قيمة العقد</span>
                        <span className="font-bold text-2xl text-primary">
                          {formatCurrency(contract.contract_amount ?? 0)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between" dir="rtl">
                        <span className="text-sm text-muted-foreground">المبلغ الشهري</span>
                        <span className="font-medium">
                          {formatCurrency(contract.monthly_amount ?? 0)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between" dir="rtl">
                        <span className="text-sm text-muted-foreground">المبلغ المدفوع</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency((contract.total_paid || 0), { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between" dir="rtl">
                        <span className="text-sm text-muted-foreground">المبلغ المتبقي</span>
                        <span className="font-medium text-orange-600">
                          {formatCurrency((contract.balance_due || (contract.contract_amount - (contract.total_paid || 0))), { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Customer Information */}
              {customer && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      معلومات العميل
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">اسم العميل</span>
                      <span className="font-medium">
                        {formatCustomerName(customer)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">نوع العميل</span>
                      <span className="font-medium">
                        {customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">رقم الهاتف</span>
                      <span className="font-medium" dir="ltr">{customer.phone}</span>
                    </div>
                    
                    {customer.email && (
                      <div className="flex items-center justify-between" dir="rtl">
                        <span className="text-sm text-muted-foreground">البريد الإلكتروني</span>
                        <span className="font-medium">{customer.email}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Account Information */}
              {chartOfAccount && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      معلومات الحساب
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">رقم الحساب</span>
                      <span className="font-medium">{chartOfAccount.account_code}</span>
                    </div>
                    
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">اسم الحساب</span>
                      <span className="font-medium">{chartOfAccount.account_name}</span>
                    </div>
                    
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">نوع الحساب</span>
                      <span className="font-medium">{chartOfAccount.account_type}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Vehicle Information - Always show if there's ANY vehicle-related data */}
              {(contract?.vehicle_id || contract?.license_plate || contract?.make || contract?.model || vehicleData) ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      معلومات المركبة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">رقم اللوحة</span>
                      <span className="font-medium">
                        {vehicleData?.plate_number || contract.license_plate || 'غير محدد'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">نوع المركبة</span>
                      <span className="font-medium">
                        {(vehicleData?.make || contract?.make || '') + ' ' + (vehicleData?.model || contract?.model || '') || 'غير محدد'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">سنة الصنع</span>
                      <span className="font-medium">
                        {vehicleData?.year || contract?.year || 'غير محدد'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between" dir="rtl">
                      <span className="text-sm text-muted-foreground">حالة المركبة</span>
                      <Badge variant="outline">
                        {vehicleData?.status || contract?.vehicle_status || 'غير محدد'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                // If no vehicle data, show a placeholder card for better UX
                <Card className="opacity-60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      معلومات المركبة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-4">
                      لا توجد معلومات مركبة مرتبطة بهذا العقد
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Description and Terms */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>وصف العقد</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editData.description ?? contract.description ?? ''}
                      onChange={(e) => setEditData({...editData, description: e.target.value})}
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {contract.description || 'لا يوجد وصف'}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>شروط العقد</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editData.terms ?? contract.terms ?? ''}
                      onChange={(e) => setEditData({...editData, terms: e.target.value})}
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {contract.terms || 'لا توجد شروط محددة'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleSave}>
                  حفظ التغييرات
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">فواتير العقد</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGenerateInvoicesFromPayments}
                  disabled={isGeneratingInvoices}
                >
                  {isGeneratingInvoices ? (
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  إنشاء فواتير من المدفوعات
                </Button>
                <Button onClick={() => onCreateInvoice?.(contract)}>
                  <Plus className="h-4 w-4 mr-2" />
                  إنشاء فاتورة جديدة
                </Button>
              </div>
            </div>

            {invoices && invoices.length > 0 ? (
              <div className="space-y-4">
                {invoices.map((invoice) => {
                  const canPay = invoice.payment_status === 'unpaid' || invoice.payment_status === 'partial';
                  
                  const getPaymentStatusBadge = (paymentStatus: string) => {
                    const statusConfig = {
                      paid: { label: 'مدفوعة', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
                      unpaid: { label: 'غير مدفوعة', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
                      partial: { label: 'مدفوعة جزئياً', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
                      overdue: { label: 'متأخرة', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' }
                    };
                    
                    const config = statusConfig[paymentStatus as keyof typeof statusConfig] || 
                                   { label: paymentStatus, className: 'bg-slate-100 text-slate-800 hover:bg-slate-100' };
                    
                    return (
                      <Badge className={config.className}>
                        {config.label}
                      </Badge>
                    );
                  };

                  return (
                    <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          {/* Left side - Actions */}
                          <div className="flex items-center gap-2">
                            {/* Pay button - only show for unpaid/partial invoices */}
                            {canPay && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleInvoicePay(invoice)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <DollarSign className="h-4 w-4 ml-1" />
                                دفع الآن
                              </Button>
                            )}
                            
                            {/* Action buttons */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleInvoicePreview(invoice)}
                              title="عرض الفاتورة"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleInvoiceEdit(invoice)}
                              title="تعديل الفاتورة"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleInvoiceDelete(invoice)}
                              title="حذف الفاتورة"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Right side - Invoice details */}
                          <div className="flex-1 space-y-2 mr-4">
                            <div className="flex items-center gap-3 justify-end">
                              {getPaymentStatusBadge(invoice.payment_status)}
                              <h3 className="font-semibold text-lg">فاتورة رقم {invoice.invoice_number}</h3>
                            </div>
                            
                            <div className="flex items-center gap-6 text-sm text-muted-foreground justify-end">
                              <span>تاريخ الإنشاء: {new Date(invoice.invoice_date || invoice.created_at).toLocaleDateString('en-GB')}</span>
                              {invoice.due_date && (
                                <span>تاريخ الاستحقاق: {new Date(invoice.due_date).toLocaleDateString('en-GB')}</span>
                              )}
                              <span className="font-semibold">{formatCurrency(invoice.total_amount)}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد فواتير بعد</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    ابدأ في إنشاء أول فاتورة لهذا العقد
                  </p>
                  <Button onClick={() => onCreateInvoice?.(contract)}>
                    <Plus className="h-4 w-4 mr-2" />
                    إنشاء فاتورة جديدة
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="check-in" className="space-y-4">
            {!contract?.vehicle_id ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    لا توجد مركبة مرتبطة بهذا العقد
                  </p>
                </CardContent>
              </Card>
            ) : checkInInspection ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>تقرير استلام المركبة</CardTitle>
                    <Badge variant="default">تم الاستلام</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">مستوى الوقود</p>
                      <p className="text-2xl font-bold">{checkInInspection.fuel_level}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">قراءة العداد</p>
                      <p className="text-2xl font-bold">{checkInInspection.odometer_reading?.toLocaleString()} كم</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">تقييم النظافة</p>
                      <p className="text-2xl font-bold">{checkInInspection.cleanliness_rating}/5 ⭐</p>
                    </div>
                  </div>
                  {checkInInspection.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">ملاحظات</p>
                      <p className="text-sm whitespace-pre-wrap">{checkInInspection.notes}</p>
                    </div>
                  )}
                  {checkInInspection.photo_urls && checkInInspection.photo_urls.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">الصور</p>
                      <div className="grid grid-cols-4 gap-2">
                        {checkInInspection.photo_urls.map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`صورة ${index + 1}`}
                            className="rounded-md w-full h-32 object-cover cursor-pointer hover:opacity-80"
                            onClick={() => window.open(url, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    تاريخ الاستلام: {new Date(checkInInspection.inspection_date).toLocaleString('en-US')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <VehicleCheckInOut
                contractId={contract.id}
                vehicleId={contract.vehicle_id}
                type="check_in"
                onComplete={() => {
                  refetchInspections();
                  toast.success('تم تسجيل استلام المركبة بنجاح');
                }}
                onCancel={() => {
                  // Optional: close dialog or switch tab
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="check-out" className="space-y-4">
            {!contract?.vehicle_id ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    لا توجد مركبة مرتبطة بهذا العقد
                  </p>
                </CardContent>
              </Card>
            ) : !checkInInspection ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    يجب إتمام استلام المركبة أولاً قبل التسليم
                  </p>
                </CardContent>
              </Card>
            ) : checkOutInspection ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>تقرير تسليم المركبة</CardTitle>
                    <Badge variant="secondary">تم التسليم</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">مستوى الوقود</p>
                      <p className="text-2xl font-bold">{checkOutInspection.fuel_level ?? 0}%</p>
                      {checkInInspection && (checkOutInspection.fuel_level ?? 0) < (checkInInspection.fuel_level ?? 0) && (
                        <Badge variant="destructive" className="mt-1">
                          نقص {(checkInInspection.fuel_level ?? 0) - (checkOutInspection.fuel_level ?? 0)}%
                        </Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">قراءة العداد</p>
                      <p className="text-2xl font-bold">{checkOutInspection.odometer_reading?.toLocaleString()} كم</p>
                      {checkInInspection && checkInInspection.odometer_reading && checkOutInspection.odometer_reading && (
                        <Badge variant="outline" className="mt-1">
                          مسافة: {(checkOutInspection.odometer_reading - checkInInspection.odometer_reading).toLocaleString()} كم
                        </Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">تقييم النظافة</p>
                      <p className="text-2xl font-bold">{checkOutInspection.cleanliness_rating}/5 ⭐</p>
                    </div>
                  </div>
                  {checkOutInspection.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">ملاحظات</p>
                      <p className="text-sm whitespace-pre-wrap">{checkOutInspection.notes}</p>
                    </div>
                  )}
                  {checkOutInspection.photo_urls && checkOutInspection.photo_urls.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">الصور</p>
                      <div className="grid grid-cols-4 gap-2">
                        {checkOutInspection.photo_urls.map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`صورة ${index + 1}`}
                            className="rounded-md w-full h-32 object-cover cursor-pointer hover:opacity-80"
                            onClick={() => window.open(url, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    تاريخ التسليم: {new Date(checkOutInspection.inspection_date).toLocaleString('en-US')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <VehicleCheckInOut
                contractId={contract.id}
                vehicleId={contract.vehicle_id}
                type="check_out"
                onComplete={() => {
                  refetchInspections();
                  toast.success('تم تسجيل تسليم المركبة بنجاح');
                }}
                onCancel={() => {
                  // Optional: close dialog or switch tab
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>تاريخ العقد</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <div>
                      <p className="font-medium">إنشاء العقد</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(contract.created_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <div>
                      <p className="font-medium">بداية العقد</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(contract.start_date).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                    <div>
                      <p className="font-medium">نهاية العقد</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(contract.end_date).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fines" className="space-y-4">
            <LateFinesTab contract={contract} />
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <ContractDocuments contractId={contract.id} />
          </TabsContent>

          {/* Official Contract Tab */}
          <TabsContent value="official-contract" className="space-y-4">
            <OfficialContractView
              contract={{ ...contract, customer, vehicle: vehicleData }}
            />
          </TabsContent>
        </Tabs>

        {/* Payment Dialog */}
        {selectedInvoice && (
          <PayInvoiceDialog
            open={isPayDialogOpen}
            onOpenChange={setIsPayDialogOpen}
            invoice={selectedInvoice}
            onPaymentCreated={() => {
              setIsPayDialogOpen(false);
              setSelectedInvoice(null);
            }}
          />
        )}

        {/* Invoice Preview Dialog - Using Professional Template */}
        {selectedInvoice && (
          <InvoicePreviewDialog
            open={isPreviewDialogOpen}
            onOpenChange={setIsPreviewDialogOpen}
            invoice={selectedInvoice}
            customerName={formatCustomerName(customer)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
