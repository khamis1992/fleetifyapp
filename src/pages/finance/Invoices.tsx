import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useInvoices, useCostCenters, useFixedAssets } from "@/hooks/useFinance"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Receipt, Plus, Search, Filter, Eye, Edit, Trash2, Building2, Package, BarChart3 } from "lucide-react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { InvoiceForm } from "@/components/finance/InvoiceForm"
import { InvoiceIntegrationPanel } from "@/components/finance/InvoiceIntegrationPanel"

const Invoices = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [filterCostCenter, setFilterCostCenter] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [showIntegrationPanel, setShowIntegrationPanel] = useState(false)

  const { data: invoices, isLoading, error } = useInvoices()
  const { data: costCenters } = useCostCenters()
  const { data: fixedAssets } = useFixedAssets()

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
            <h1 className="text-2xl font-bold">الفواتير</h1>
            <p className="text-muted-foreground">إدارة فواتير المبيعات والمشتريات</p>
          </div>
        </div>
        <InvoiceForm 
          open={isCreateDialogOpen} 
          onOpenChange={setIsCreateDialogOpen}
          type="sales"
        />
      </div>

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
                    {center.center_name}
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
        <InvoiceIntegrationPanel 
          invoiceId={selectedInvoice?.id}
          costCenterId={selectedInvoice?.cost_center_id}
          fixedAssetId={selectedInvoice?.fixed_asset_id}
        />
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
                            {costCenters?.find(c => c.id === invoice.cost_center_id)?.center_name || 'غير محدد'}
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
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {invoice.fixed_asset_id && (
                          <Button variant="ghost" size="sm" title="مرتبطة بأصل ثابت">
                            <Package className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Invoices