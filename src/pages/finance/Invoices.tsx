import { useState, useMemo, lazy, Suspense } from "react"
import { PageCustomizer } from "@/components/PageCustomizer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useInvoices } from "@/hooks/finance/useInvoices"
import { useFixedAssets } from "@/hooks/useFinance"
import { useCostCenters } from "@/hooks/useCostCenters"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Receipt, Plus, Search, Filter, Eye, Edit, Trash2, Building2, Package, BarChart3, Camera, CheckCircle, AlertTriangle, MessageSquare, AlertCircle, TrendingDown, Clock, Zap, Calendar, Loader2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { InvoiceForm } from "@/components/finance/InvoiceForm"
import { InvoiceIntegrationPanel } from "@/components/finance/InvoiceIntegrationPanel"
import { InvoicePreviewDialog } from "@/components/finance/InvoicePreviewDialog"
import { InvoiceEditDialog } from "@/components/finance/InvoiceEditDialog"
import { PayInvoiceDialog } from "@/components/finance/PayInvoiceDialog"
import { EnhancedInvoiceActions } from "@/components/finance/EnhancedInvoiceActions"
import { DepartmentIntegrationSummary } from "@/components/finance/DepartmentIntegrationSummary"
import { InvoiceApprovalWorkflow } from "@/components/invoices/InvoiceApprovalWorkflow"
import { HelpIcon } from '@/components/help/HelpIcon';
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { createAuditLog } from "@/hooks/useAuditLog"
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess"

// Auto Invoice Generation Tab
const AutoInvoiceGenerationTab = lazy(() => import("@/components/finance/AutoInvoiceGenerationTab"))
const FixMissingInvoices = lazy(() => import("@/components/finance/FixMissingInvoices"))

const Invoices = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { companyId } = useUnifiedCompanyAccess()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [filterCostCenter, setFilterCostCenter] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<any>(null)
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [showIntegrationPanel, setShowIntegrationPanel] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null)
  const [showApprovalWorkflow, setShowApprovalWorkflow] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [activeTab, setActiveTab] = useState("invoices")

  // Build filters with pagination
  const filters = useMemo(() => ({
    type: filterType !== "all" ? filterType : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
    page,
    pageSize
  }), [filterType, filterStatus, page, pageSize])

  const { data: invoicesResponse, isLoading, error } = useInvoices(filters)
  const { data: costCenters } = useCostCenters()
  const { data: fixedAssets } = useFixedAssets()

  // Fetch all invoices for statistics (without pagination)
  const { data: allInvoicesForStats } = useInvoices({ pageSize: 999999 })

  // Extract invoices and pagination from response
  const invoices = useMemo(() => {
    if (!invoicesResponse) return [];
    if (Array.isArray(invoicesResponse)) return invoicesResponse;
    if (invoicesResponse && typeof invoicesResponse === 'object' && 'data' in invoicesResponse) {
      return Array.isArray(invoicesResponse.data) ? invoicesResponse.data : [];
    }
    return [];
  }, [invoicesResponse]);

  const paginationInfo = useMemo(() => {
    if (invoicesResponse && typeof invoicesResponse === 'object' && 'pagination' in invoicesResponse) {
      return invoicesResponse.pagination;
    }
    return undefined;
  }, [invoicesResponse]);

  // Delete invoice mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      // Get invoice details before deletion for audit log
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('invoice_number, invoice_type, total_amount, payment_status, customer_id, customers(first_name, last_name, company_name)')
        .eq('id', invoiceId)
        .single()
      
      // Check if invoice has related payments
      const { data: payments } = await supabase
        .from('payments')
        .select('id')
        .eq('invoice_id', invoiceId)
        .limit(1)

      if (payments && payments.length > 0) {
        throw new Error('لا يمكن حذف الفاتورة لأنها مرتبطة بدفعات. يرجى حذف الدفعات أولاً.')
      }

      // Check if invoice has journal entry
      const { data: invoice } = await supabase
        .from('invoices')
        .select('journal_entry_id')
        .eq('id', invoiceId)
        .single()

      if (invoice?.journal_entry_id) {
        throw new Error('لا يمكن حذف الفاتورة لأنها مرتبطة بقيد محاسبي. يرجى عكس القيد أولاً.')
      }

      // Delete invoice items first
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoiceId)

      if (itemsError) throw itemsError

      // Delete invoice
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)

      if (error) throw error

      return { invoiceId, invoiceData }
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', companyId] })
      
      // Log audit trail
      const customerName = result.invoiceData?.customers
        ? result.invoiceData.customers.company_name || 
          `${result.invoiceData.customers.first_name} ${result.invoiceData.customers.last_name}`
        : 'Unknown'
      
      await createAuditLog(
        'DELETE',
        'invoice',
        result.invoiceId,
        result.invoiceData?.invoice_number,
        {
          old_values: {
            invoice_number: result.invoiceData?.invoice_number,
            invoice_type: result.invoiceData?.invoice_type,
            total_amount: result.invoiceData?.total_amount,
            payment_status: result.invoiceData?.payment_status,
            customer_name: customerName,
          },
          changes_summary: `Deleted invoice ${result.invoiceData?.invoice_number}`,
          severity: 'high',
        }
      )
      
      toast.success('تم حذف الفاتورة بنجاح')
      setDeleteDialogOpen(false)
      setInvoiceToDelete(null)
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل حذف الفاتورة')
    }
  })

  const handleDeleteInvoice = (invoice: any) => {
    setInvoiceToDelete(invoice)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (invoiceToDelete) {
      deleteInvoiceMutation.mutate(invoiceToDelete.id)
    }
  }

  const filteredInvoices = useMemo(() => {
    try {
      if (!Array.isArray(invoices)) return [];
      
      return invoices.filter(invoice => {
        if (!invoice) return false;
        
        const matchesSearch = invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
        const matchesStatus = filterStatus === "all" || invoice.status === filterStatus;
        const matchesType = filterType === "all" || invoice.invoice_type === filterType;
        const matchesCostCenter = filterCostCenter === "all" || invoice.cost_center_id === filterCostCenter;
        return matchesSearch && matchesStatus && matchesType && matchesCostCenter;
      });
    } catch (error) {
      console.error('Error filtering invoices:', error);
      return [];
    }
  }, [invoices, searchTerm, filterStatus, filterType, filterCostCenter]);

  // Calculate statistics from all invoices
  const statistics = useMemo(() => {
    try {
      const allInvoices = Array.isArray(allInvoicesForStats) 
        ? allInvoicesForStats 
        : allInvoicesForStats?.data || [];

      if (!Array.isArray(allInvoices)) {
        return {
          totalRevenue: 0,
          pendingCount: 0,
          draftCount: 0,
          underReviewCount: 0,
          activeCount: 0
        };
      }

      const totalRevenue = allInvoices.reduce((sum, inv) => {
        return sum + (inv?.total_amount || 0);
      }, 0);

      const pendingCount = allInvoices.filter(inv => inv?.status === 'pending').length;
      const draftCount = allInvoices.filter(inv => inv?.status === 'draft').length;
      const underReviewCount = allInvoices.filter(inv => inv?.status === 'under_review').length;
      const activeCount = allInvoices.filter(inv => inv?.status === 'paid').length;

      return {
        totalRevenue,
        pendingCount,
        draftCount,
        underReviewCount,
        activeCount
      };
    } catch (error) {
      console.error('Error calculating invoice statistics:', error);
      return {
        totalRevenue: 0,
        pendingCount: 0,
        draftCount: 0,
        underReviewCount: 0,
        activeCount: 0
      };
    }
  }, [allInvoicesForStats]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'مدفوعة'
      case 'pending': return 'معلقة'
      case 'overdue': return 'متأخرة'
      case 'cancelled': return 'ملغاة'
      default: return status
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sales': return 'مبيعات'
      case 'purchase': return 'مشتريات'
      case 'service': return 'خدمات'
      default: return type
    }
  }

  return (
    <PageCustomizer
      pageId="invoices-page"
      title="Invoices"
      titleAr="الفواتير"
    >
      <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/finance">النظام المالي</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>الفواتير</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">الفواتير</h1>
              <HelpIcon topic="debitCredit" />
            </div>
            <p className="text-muted-foreground">إدارة فواتير المبيعات والمشتريات</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate('/finance/invoices/scan')}
            variant="outline"
            className="gap-2"
          >
            <Camera className="h-4 w-4" />
            مسح فاتورة قديمة
          </Button>
          {selectedInvoice && selectedInvoice.total_amount > 1000 && (
            <Button 
              onClick={() => setShowApprovalWorkflow(true)}
              variant="outline"
              className="border-blue-500 text-blue-700 hover:bg-blue-50 gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              اعتماد الفاتورة
            </Button>
          )}
          <Button 
            onClick={() => navigate('/collections')}
            variant="outline"
            className="border-purple-500 text-purple-700 hover:bg-purple-50 gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            التذكيرات
          </Button>
          <Button 
            onClick={() => navigate('/collections?tab=late-fees')}
            variant="outline"
            className="border-red-500 text-red-700 hover:bg-red-50 gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            الغرامات
          </Button>
          <Button 
            onClick={() => navigate('/collections?tab=disputes')}
            variant="outline"
            className="border-orange-500 text-orange-700 hover:bg-orange-50 gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            نزاع
          </Button>
          <Button 
            onClick={() => navigate('/collections?tab=ar-aging')}
            variant="outline"
            className="border-green-500 text-green-700 hover:bg-green-50 gap-2"
          >
            <TrendingDown className="h-4 w-4" />
            أعمار الذمم
          </Button>
          <Button 
            onClick={() => navigate('/collections?tab=payment-tracking')}
            variant="outline"
            className="border-blue-600 text-blue-600 hover:bg-blue-50 gap-2"
          >
            <Clock className="h-4 w-4" />
            تتبع الدفعات
          </Button>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            إنشاء فاتورة جديدة
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="invoices" className="gap-2">
            <Receipt className="h-4 w-4" />
            قائمة الفواتير
          </TabsTrigger>
          <TabsTrigger value="auto-generation" className="gap-2">
            <Zap className="h-4 w-4" />
            التوليد التلقائي
          </TabsTrigger>
          <TabsTrigger value="fix-missing" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            إصلاح المفقود
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Invoices List */}
        <TabsContent value="invoices" className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الإيرادات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">QAR {statistics.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        {/* Pending Invoices */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">العقود المعلقة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.pendingCount}</div>
          </CardContent>
        </Card>

        {/* Draft Invoices */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">مسودات العقود</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.draftCount}</div>
          </CardContent>
        </Card>

        {/* Under Review */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">قيد المراجعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.underReviewCount}</div>
          </CardContent>
        </Card>

        {/* Active Invoices */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">العقود النشطة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.activeCount}</div>
          </CardContent>
        </Card>
      </div>

      <InvoiceForm 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
        type="sales"
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">البحث والفلتر</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="البحث برقم الفاتورة أو اسم العميل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="حالة الفاتورة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">معلقة</SelectItem>
                <SelectItem value="paid">مدفوعة</SelectItem>
                <SelectItem value="overdue">متأخرة</SelectItem>
                <SelectItem value="cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="نوع الفاتورة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="sales">مبيعات</SelectItem>
                <SelectItem value="purchase">مشتريات</SelectItem>
                <SelectItem value="service">خدمات</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCostCenter} onValueChange={setFilterCostCenter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="مركز التكلفة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المراكز</SelectItem>
                {Array.isArray(costCenters) && costCenters.map(center => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.center_name_ar || center.center_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => setShowIntegrationPanel(!showIntegrationPanel)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              لوحة التكامل
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* لوحة التكامل */}
      {showIntegrationPanel && (
        <div className="space-y-6">
          <InvoiceIntegrationPanel 
            invoiceId={selectedInvoice?.id}
            costCenterId={selectedInvoice?.cost_center_id}
            fixedAssetId={selectedInvoice?.fixed_asset_id}
            customerId={selectedInvoice?.customer_id}
            contractId={selectedInvoice?.contract_id}
            vehicleId={selectedInvoice?.vehicle_id}
          />
          <DepartmentIntegrationSummary />
        </div>
      )}

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الفواتير</CardTitle>
          <CardDescription>
            إجمالي {filteredInvoices.length} فاتورة
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive">حدث خطأ في تحميل البيانات</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد فواتير</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الفاتورة</TableHead>
                    <TableHead>العميل/المورد</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>مركز التكلفة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(filteredInvoices) && filteredInvoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className={selectedInvoice?.id === invoice.id ? "bg-muted" : ""}
                    >
                      <TableCell className="font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getTypeLabel(invoice.invoice_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invoice.cost_center_id ? (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span className="text-sm">
                              {Array.isArray(costCenters) ? (costCenters.find(c => c.id === invoice.cost_center_id)?.center_name_ar || costCenters.find(c => c.id === invoice.cost_center_id)?.center_name || 'غير محدد') : 'غير محدد'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">غير محدد</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.invoice_date).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell>
                        {invoice.total_amount.toFixed(3)} ر.ق
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>
                          {getStatusLabel(invoice.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                         <EnhancedInvoiceActions
                           invoice={invoice}
                           onPreview={() => {
                             setSelectedInvoice(invoice);
                             setIsPreviewOpen(true);
                           }}
                           onEdit={() => {
                             setEditingInvoice(invoice);
                           }}
                           onDelete={() => handleDeleteInvoice(invoice)}
                           onPay={() => {
                             setSelectedInvoice(invoice);
                             setShowPayDialog(true);
                           }}
                         />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {paginationInfo && paginationInfo.totalPages > 1 && (
                <div className="mt-6 border-t pt-4">
                  <Pagination
                    currentPage={paginationInfo.page}
                    totalPages={paginationInfo.totalPages}
                    totalItems={paginationInfo.totalCount}
                    pageSize={paginationInfo.pageSize}
                    onPageChange={(newPage) => setPage(newPage)}
                    onPageSizeChange={(newPageSize) => {
                      setPageSize(newPageSize)
                      setPage(1) // Reset to first page when changing page size
                    }}
                    showPageSize={true}
                    showTotalItems={true}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Invoice Preview Dialog */}
      <InvoicePreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        invoice={selectedInvoice}
      />

      {/* Invoice Approval Workflow Dialog */}
      <InvoiceApprovalWorkflow
        invoice={selectedInvoice}
        open={showApprovalWorkflow}
        onOpenChange={setShowApprovalWorkflow}
        onApproved={(invoiceId) => {
          queryClient.invalidateQueries({ queryKey: ['invoices', companyId] })
          toast.success('تم اعتماد الفاتورة بنجاح')
          setShowApprovalWorkflow(false)
        }}
        onRejected={(invoiceId) => {
          queryClient.invalidateQueries({ queryKey: ['invoices', companyId] })
          toast.success('تم رفض الفاتورة')
          setShowApprovalWorkflow(false)
        }}
      />

      {/* Invoice Edit Dialog */}
      <InvoiceEditDialog
        open={!!editingInvoice}
        onOpenChange={(open) => !open && setEditingInvoice(null)}
        invoice={editingInvoice}
        onSave={(updatedInvoice) => {
          console.log('Invoice updated:', updatedInvoice);
          setEditingInvoice(null);
        }}
      />

      {/* Pay Invoice Dialog */}
      {selectedInvoice && (
        <PayInvoiceDialog
          open={showPayDialog}
          onOpenChange={setShowPayDialog}
          invoice={selectedInvoice}
          onPaymentCreated={() => {
            setShowPayDialog(false);
            setSelectedInvoice(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الفاتورة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الفاتورة رقم <strong>{invoiceToDelete?.invoice_number}</strong>؟
              <br />
              <br />
              <span className="text-destructive font-medium">
                هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الفاتورة وجميع بنودها نهائياً.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteInvoiceMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteInvoiceMutation.isPending ? 'جاري الحذف...' : 'حذف الفاتورة'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </TabsContent>

        {/* Tab 2: Auto Generation */}
        <TabsContent value="auto-generation" className="space-y-6">
          <Suspense fallback={
            <Card>
              <CardContent className="py-12">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-muted-foreground">جاري التحميل...</span>
                </div>
              </CardContent>
            </Card>
          }>
            <AutoInvoiceGenerationTab />
          </Suspense>
        </TabsContent>

        {/* Tab 3: Fix Missing Invoices */}
        <TabsContent value="fix-missing" className="space-y-6">
          <Suspense fallback={
            <Card>
              <CardContent className="py-12">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-muted-foreground">جاري التحميل...</span>
                </div>
              </CardContent>
            </Card>
          }>
            <FixMissingInvoices />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
    </PageCustomizer>
  )
}

export default Invoices