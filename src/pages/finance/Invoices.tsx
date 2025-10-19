import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Pagination } from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Receipt, Plus, Search, Filter, Eye, Edit, Trash2, Building2, Package, BarChart3, Camera } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { InvoiceForm } from "@/components/finance/InvoiceForm"
import { InvoiceIntegrationPanel } from "@/components/finance/InvoiceIntegrationPanel"
import { InvoicePreviewDialog } from "@/components/finance/InvoicePreviewDialog"
import { InvoiceEditDialog } from "@/components/finance/InvoiceEditDialog"
import { PayInvoiceDialog } from "@/components/finance/PayInvoiceDialog"
import { EnhancedInvoiceActions } from "@/components/finance/EnhancedInvoiceActions"
import { DepartmentIntegrationSummary } from "@/components/finance/DepartmentIntegrationSummary"
import { HelpIcon } from '@/components/help/HelpIcon';
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess"

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
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

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

      return invoiceId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', companyId] })
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

  const filteredInvoices = invoices?.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || invoice.status === filterStatus
    const matchesType = filterType === "all" || invoice.invoice_type === filterType
    const matchesCostCenter = filterCostCenter === "all" || invoice.cost_center_id === filterCostCenter
    return matchesSearch && matchesStatus && matchesType && matchesCostCenter
  }) || []

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
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            إنشاء فاتورة جديدة
          </Button>
        </div>
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
                {costCenters?.map(center => (
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
                  {filteredInvoices.map((invoice) => (
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
                              {costCenters?.find(c => c.id === invoice.cost_center_id)?.center_name_ar || costCenters?.find(c => c.id === invoice.cost_center_id)?.center_name || 'غير محدد'}
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
                        {invoice.total_amount.toFixed(3)} د.ك
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
    </div>
  )
}

export default Invoices