import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useVendors, useDeleteVendor, useVendorCategories, type Vendor } from "@/hooks/useFinance"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Building, Plus, Search, Eye, Edit, Trash2, Phone, Mail, Star, TrendingUp } from "lucide-react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { VendorForm } from "@/components/finance/VendorForm"
import { VendorDetailsDialog } from "@/components/finance/VendorDetailsDialog"
import { HelpIcon } from '@/components/help/HelpIcon';

const Vendors = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)

  const { data: vendors, isLoading, error } = useVendors()
  const { data: categories } = useVendorCategories()
  const deleteVendor = useDeleteVendor()

  const filteredVendors = vendors?.filter(vendor => {
    const matchesSearch = vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = selectedCategory === "all" || vendor.category_id === selectedCategory

    return matchesSearch && matchesCategory
  }) || []

  // Calculate stats
  const activeVendors = vendors?.filter(v => v.is_active).length || 0
  const vendorsByCategory = selectedCategory === "all"
    ? vendors?.length || 0
    : vendors?.filter(v => v.category_id === selectedCategory).length || 0
  const totalCategories = categories?.length || 0

  const handleViewVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setIsDetailsDialogOpen(true)
  }

  const handleEditVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setIsEditDialogOpen(true)
  }

  const handleDeleteVendor = async (vendor: Vendor) => {
    try {
      await deleteVendor.mutateAsync(vendor.id)
    } catch (error) {
      console.error("Error deleting vendor:", error)
    }
  }

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false)
  }

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false)
    setSelectedVendor(null)
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
            <BreadcrumbPage>الموردين</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl text-white">
            <Building className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">الموردين</h1>
              <HelpIcon topic="accountTypes" />
            </div>
            <p className="text-muted-foreground">إدارة بيانات الموردين والحسابات</p>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              مورد جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة مورد جديد</DialogTitle>
              <DialogDescription>
                قم بإدخال بيانات المورد الجديد
              </DialogDescription>
            </DialogHeader>
            <VendorForm onSuccess={handleCreateSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الموردين</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors?.length || 0}</div>
            <p className="text-xs text-muted-foreground">{activeVendors} مورد نشط</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">التصنيفات</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground">
              {vendorsByCategory} مورد في التصنيف الحالي
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">المبالغ المستحقة</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.000 د.ك</div>
            <p className="text-xs text-muted-foreground">إجمالي المديونية</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">متوسط الأداء</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">غير محسوب بعد</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="البحث بالاسم أو جهة الاتصال أو البريد الإلكتروني..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="اختر التصنيف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التصنيفات</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.category_name_ar || category.category_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الموردين</CardTitle>
          <CardDescription>
            إجمالي {filteredVendors.length} مورد
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
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-8">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد موردين</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم المورد</TableHead>
                  <TableHead>جهة الاتصال</TableHead>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>الرصيد</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        {vendor.vendor_name}
                      </div>
                    </TableCell>
                    <TableCell>{vendor.contact_person || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {vendor.email && (
                          <>
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {vendor.email}
                          </>
                        )}
                        {!vendor.email && '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {vendor.phone && (
                          <>
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            {vendor.phone}
                          </>
                        )}
                        {!vendor.phone && '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {vendor.current_balance.toFixed(3)} د.ك
                    </TableCell>
                    <TableCell>
                      <Badge variant={vendor.is_active ? "default" : "secondary"}>
                        {vendor.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewVendor(vendor)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>عرض التفاصيل</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditVendor(vendor)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>تعديل</TooltipContent>
                          </Tooltip>

                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>حذف</TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف المورد "{vendor.vendor_name}"؟ 
                                  هذا الإجراء سيؤدي إلى إلغاء تفعيل المورد ولا يمكن التراجع عنه.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteVendor(vendor)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل المورد</DialogTitle>
            <DialogDescription>
              قم بتعديل بيانات المورد
            </DialogDescription>
          </DialogHeader>
          {selectedVendor && (
            <VendorForm vendor={selectedVendor} onSuccess={handleEditSuccess} />
          )}
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <VendorDetailsDialog
        vendor={selectedVendor}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
      />
    </div>
  )
}

export default Vendors