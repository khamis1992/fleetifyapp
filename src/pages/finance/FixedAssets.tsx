import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Building, Plus, Calculator, TrendingDown, Settings, Search, Package, Eye, Edit, Trash2, TestTube } from "lucide-react"
import { useFixedAssets, useCreateFixedAsset, useUpdateFixedAsset, useDeleteFixedAsset, useChartOfAccounts, FixedAsset } from "@/hooks/useFinance"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { HelpIcon } from '@/components/help/HelpIcon';
import { financialHelpContent } from '@/data/helpContent';

const FixedAssets = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null)

  const { data: fixedAssets, isLoading, error } = useFixedAssets()
  const { data: accounts } = useChartOfAccounts()
  const createFixedAsset = useCreateFixedAsset()
  const updateFixedAsset = useUpdateFixedAsset()
  const deleteFixedAsset = useDeleteFixedAsset()

  const [newAsset, setNewAsset] = useState<Partial<FixedAsset>>({
    asset_code: '',
    asset_name: '',
    asset_name_ar: '',
    category: '',
    serial_number: '',
    location: '',
    purchase_date: '',
    purchase_cost: 0,
    salvage_value: 0,
    useful_life_years: 5,
    depreciation_method: 'straight_line',
    condition_status: 'good',
    notes: ''
  })

  const handleCreateAsset = async () => {
    if (!newAsset.asset_code || !newAsset.asset_name || !newAsset.purchase_date) return

    await createFixedAsset.mutateAsync({
      asset_code: newAsset.asset_code!,
      asset_name: newAsset.asset_name!,
      asset_name_ar: newAsset.asset_name_ar,
      category: newAsset.category!,
      serial_number: newAsset.serial_number,
      location: newAsset.location,
      purchase_date: newAsset.purchase_date!,
      purchase_cost: newAsset.purchase_cost!,
      salvage_value: newAsset.salvage_value,
      useful_life_years: newAsset.useful_life_years!,
      depreciation_method: newAsset.depreciation_method,
      condition_status: newAsset.condition_status,
      notes: newAsset.notes
    })

    setNewAsset({
      asset_code: '',
      asset_name: '',
      asset_name_ar: '',
      category: '',
      serial_number: '',
      location: '',
      purchase_date: '',
      purchase_cost: 0,
      salvage_value: 0,
      useful_life_years: 5,
      depreciation_method: 'straight_line',
      condition_status: 'good',
      notes: ''
    })
    setIsCreateDialogOpen(false)
  }

  const handleEditAsset = async () => {
    if (!selectedAsset || !newAsset.asset_code || !newAsset.asset_name || !newAsset.purchase_date) return

    await updateFixedAsset.mutateAsync({
      id: selectedAsset.id,
      asset_code: newAsset.asset_code!,
      asset_name: newAsset.asset_name!,
      asset_name_ar: newAsset.asset_name_ar,
      category: newAsset.category!,
      serial_number: newAsset.serial_number,
      location: newAsset.location,
      purchase_date: newAsset.purchase_date!,
      purchase_cost: newAsset.purchase_cost!,
      salvage_value: newAsset.salvage_value,
      useful_life_years: newAsset.useful_life_years!,
      depreciation_method: newAsset.depreciation_method,
      condition_status: newAsset.condition_status,
      notes: newAsset.notes
    })

    setIsEditDialogOpen(false)
    setSelectedAsset(null)
  }

  const handleViewAsset = (asset: FixedAsset) => {
    setSelectedAsset(asset)
    setIsViewDialogOpen(true)
  }

  const handleEditClick = (asset: FixedAsset) => {
    setSelectedAsset(asset)
    setNewAsset({
      asset_code: asset.asset_code,
      asset_name: asset.asset_name,
      asset_name_ar: asset.asset_name_ar || '',
      category: asset.category,
      serial_number: asset.serial_number || '',
      location: asset.location || '',
      purchase_date: asset.purchase_date,
      purchase_cost: asset.purchase_cost,
      salvage_value: asset.salvage_value || 0,
      useful_life_years: asset.useful_life_years,
      depreciation_method: asset.depreciation_method,
      condition_status: asset.condition_status,
      notes: asset.notes || ''
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteAsset = async (assetId: string) => {
    await deleteFixedAsset.mutateAsync(assetId)
  }

  const fillSampleData = () => {
    const sampleAssets = [
      {
        asset_code: 'FA001',
        asset_name: 'كمبيوتر محمول HP EliteBook',
        asset_name_ar: 'كمبيوتر محمول',
        category: 'equipment',
        serial_number: 'HP2024001',
        location: 'مكتب الإدارة',
        purchase_date: '2024-01-15',
        purchase_cost: 800,
        salvage_value: 100,
        useful_life_years: 5,
        depreciation_method: 'straight_line' as const,
        condition_status: 'excellent' as const,
        notes: 'جهاز للاستخدام الإداري'
      },
      {
        asset_code: 'FA002', 
        asset_name: 'طابعة ليزر Canon',
        asset_name_ar: 'طابعة ليزر',
        category: 'equipment',
        serial_number: 'CN2024002',
        location: 'قسم الموارد البشرية',
        purchase_date: '2024-02-01',
        purchase_cost: 450,
        salvage_value: 50,
        useful_life_years: 7,
        depreciation_method: 'straight_line' as const,
        condition_status: 'good' as const,
        notes: 'طابعة عالية الجودة'
      },
      {
        asset_code: 'FA003',
        asset_name: 'مكتب إداري خشبي',
        asset_name_ar: 'مكتب إداري',
        category: 'furniture',
        serial_number: 'DESK2024003',
        location: 'مكتب المدير العام',
        purchase_date: '2024-01-10',
        purchase_cost: 1200,
        salvage_value: 200,
        useful_life_years: 10,
        depreciation_method: 'straight_line' as const,
        condition_status: 'excellent' as const,
        notes: 'مكتب تنفيذي فاخر'
      }
    ]
    
    const randomAsset = sampleAssets[Math.floor(Math.random() * sampleAssets.length)]
    setNewAsset(randomAsset)
  }

  const filteredAssets = fixedAssets?.filter(asset => {
    const matchesSearch = asset.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.asset_code.includes(searchTerm)
    const matchesCategory = filterCategory === "all" || asset.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const assetCategories = [...new Set(fixedAssets?.map(asset => asset.category) || [])]
  
  const totalAssets = fixedAssets?.length || 0
  const totalValue = fixedAssets?.reduce((sum, asset) => sum + (asset.purchase_cost || 0), 0) || 0
  const totalDepreciation = fixedAssets?.reduce((sum, asset) => sum + (asset.accumulated_depreciation || 0), 0) || 0
  const totalBookValue = fixedAssets?.reduce((sum, asset) => sum + (asset.book_value || 0), 0) || 0

  const assetAccounts = accounts?.filter(account => 
    account.account_type === 'assets' && 
    (account.account_name.includes('Asset') || account.account_name.includes('أصول'))
  )

  const depreciationAccounts = accounts?.filter(account => 
    account.account_type === 'assets' && 
    (account.account_name.includes('Depreciation') || account.account_name.includes('إهلاك'))
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-destructive">
        حدث خطأ في تحميل البيانات
      </div>
    )
  }

  return (
      <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/finance">المالية</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>الأصول الثابتة</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">الأصول الثابتة</h1>
            <HelpIcon
              title={financialHelpContent.fixedAssets.title}
              content={financialHelpContent.fixedAssets.content}
              examples={financialHelpContent.fixedAssets.examples}
              size="md"
            />
          </div>
          <p className="text-muted-foreground">إدارة الأصول والإهلاك والصيانة</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              أصل جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إنشاء أصل ثابت جديد</DialogTitle>
              <DialogDescription>
                أدخل تفاصيل الأصل الثابت الجديد
                <div className="mt-2">
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    onClick={fillSampleData}
                    className="text-xs"
                  >
                    <TestTube className="h-3 w-3 mr-1" />
                    ملء بيانات تجريبية
                  </Button>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assetCode">رمز الأصل *</Label>
                <Input
                  id="assetCode"
                  value={newAsset.asset_code}
                  onChange={(e) => setNewAsset({ ...newAsset, asset_code: e.target.value })}
                  placeholder="FA001"
                />
              </div>
              <div>
                <Label htmlFor="assetName">اسم الأصل *</Label>
                <Input
                  id="assetName"
                  value={newAsset.asset_name}
                  onChange={(e) => setNewAsset({ ...newAsset, asset_name: e.target.value })}
                  placeholder="اسم الأصل"
                />
              </div>
              <div>
                <Label htmlFor="assetNameAr">الاسم بالعربية</Label>
                <Input
                  id="assetNameAr"
                  value={newAsset.asset_name_ar}
                  onChange={(e) => setNewAsset({ ...newAsset, asset_name_ar: e.target.value })}
                  placeholder="الاسم بالعربية"
                />
              </div>
              <div>
                <Label htmlFor="category">الفئة *</Label>
                <Select value={newAsset.category} onValueChange={(value) => setNewAsset({ ...newAsset, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buildings">المباني والإنشاءات</SelectItem>
                    <SelectItem value="equipment">المعدات والآلات</SelectItem>
                    <SelectItem value="furniture">الأثاث والتجهيزات</SelectItem>
                    <SelectItem value="vehicles">المركبات والنقل</SelectItem>
                    <SelectItem value="software">البرمجيات</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="serialNumber">الرقم التسلسلي</Label>
                <Input
                  id="serialNumber"
                  value={newAsset.serial_number}
                  onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                  placeholder="الرقم التسلسلي"
                />
              </div>
              <div>
                <Label htmlFor="location">الموقع</Label>
                <Input
                  id="location"
                  value={newAsset.location}
                  onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                  placeholder="موقع الأصل"
                />
              </div>
              <div>
                <Label htmlFor="purchaseDate">تاريخ الشراء *</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={newAsset.purchase_date}
                  onChange={(e) => setNewAsset({ ...newAsset, purchase_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="purchaseCost">تكلفة الشراء *</Label>
                <Input
                  id="purchaseCost"
                  type="number"
                  value={newAsset.purchase_cost}
                  onChange={(e) => setNewAsset({ ...newAsset, purchase_cost: Number(e.target.value) })}
                  placeholder="0.000"
                />
              </div>
              <div>
                <Label htmlFor="salvageValue">القيمة التخريدية</Label>
                <Input
                  id="salvageValue"
                  type="number"
                  value={newAsset.salvage_value}
                  onChange={(e) => setNewAsset({ ...newAsset, salvage_value: Number(e.target.value) })}
                  placeholder="0.000"
                />
              </div>
              <div>
                <Label htmlFor="usefulLife">العمر الإنتاجي (سنوات) *</Label>
                <Input
                  id="usefulLife"
                  type="number"
                  value={newAsset.useful_life_years}
                  onChange={(e) => setNewAsset({ ...newAsset, useful_life_years: Number(e.target.value) })}
                  placeholder="5"
                />
              </div>
              <div>
                <Label htmlFor="depreciationMethod">طريقة الإهلاك</Label>
                <Select value={newAsset.depreciation_method} onValueChange={(value: unknown) => setNewAsset({ ...newAsset, depreciation_method: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الطريقة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight_line">القسط الثابت</SelectItem>
                    <SelectItem value="declining_balance">الرصيد المتناقص</SelectItem>
                    <SelectItem value="units_of_production">وحدات الإنتاج</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="condition">حالة الأصل</Label>
                <Select value={newAsset.condition_status} onValueChange={(value: unknown) => setNewAsset({ ...newAsset, condition_status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">ممتازة</SelectItem>
                    <SelectItem value="good">جيدة</SelectItem>
                    <SelectItem value="fair">متوسطة</SelectItem>
                    <SelectItem value="poor">ضعيفة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={newAsset.notes}
                  onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })}
                  placeholder="ملاحظات إضافية"
                />
              </div>
              <div className="col-span-2">
                <Button onClick={handleCreateAsset} className="w-full" disabled={createFixedAsset.isPending}>
                  {createFixedAsset.isPending ? "جاري الإنشاء..." : "إنشاء الأصل"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأصول</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssets}</div>
            <p className="text-xs text-muted-foreground">أصل ثابت</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">القيمة الإجمالية</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalValue.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">قيمة الشراء</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإهلاك المتراكم</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalDepreciation.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">إهلاك تراكمي</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">القيمة الدفترية</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalBookValue.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">القيمة الحالية</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>قائمة الأصول الثابتة</CardTitle>
              <CardDescription>جميع الأصول الثابتة المسجلة في النظام</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في الأصول..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="جميع الفئات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  {assetCategories.filter(category => category && category.trim() !== '').map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رمز الأصل</TableHead>
                <TableHead>اسم الأصل</TableHead>
                <TableHead>الفئة</TableHead>
                <TableHead>تاريخ الشراء</TableHead>
                <TableHead>تكلفة الشراء</TableHead>
                <TableHead>الإهلاك المتراكم</TableHead>
                <TableHead>القيمة الدفترية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets?.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.asset_code}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{asset.asset_name}</div>
                      {asset.asset_name_ar && (
                        <div className="text-sm text-muted-foreground">{asset.asset_name_ar}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{asset.category}</TableCell>
                  <TableCell>{new Date(asset.purchase_date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell>{asset.purchase_cost.toFixed(3)} د.ك</TableCell>
                  <TableCell className="text-orange-600">
                    {(asset.accumulated_depreciation || 0).toFixed(3)} د.ك
                  </TableCell>
                  <TableCell className="text-green-600">
                    {asset.book_value.toFixed(3)} د.ك
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      asset.condition_status === 'excellent' ? 'default' :
                      asset.condition_status === 'good' ? 'secondary' :
                      asset.condition_status === 'fair' ? 'outline' : 'destructive'
                    }>
                      {asset.condition_status === 'excellent' ? 'ممتازة' :
                       asset.condition_status === 'good' ? 'جيدة' :
                       asset.condition_status === 'fair' ? 'متوسطة' : 'ضعيفة'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleViewAsset(asset)}
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
                            onClick={() => handleEditClick(asset)}
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
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
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
                              هل أنت متأكد من حذف الأصل "{asset.asset_name}"؟ لن يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteAsset(asset.id)}
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
          {filteredAssets?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد أصول ثابتة
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Asset Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل الأصل الثابت</DialogTitle>
            <DialogDescription>معلومات تفصيلية عن الأصل</DialogDescription>
          </DialogHeader>
          {selectedAsset && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>رمز الأصل</Label>
                <p className="text-sm font-medium">{selectedAsset.asset_code}</p>
              </div>
              <div>
                <Label>اسم الأصل</Label>
                <p className="text-sm font-medium">{selectedAsset.asset_name}</p>
              </div>
              {selectedAsset.asset_name_ar && (
                <div>
                  <Label>الاسم بالعربية</Label>
                  <p className="text-sm font-medium">{selectedAsset.asset_name_ar}</p>
                </div>
              )}
              <div>
                <Label>الفئة</Label>
                <p className="text-sm font-medium">{selectedAsset.category}</p>
              </div>
              {selectedAsset.serial_number && (
                <div>
                  <Label>الرقم التسلسلي</Label>
                  <p className="text-sm font-medium">{selectedAsset.serial_number}</p>
                </div>
              )}
              {selectedAsset.location && (
                <div>
                  <Label>الموقع</Label>
                  <p className="text-sm font-medium">{selectedAsset.location}</p>
                </div>
              )}
              <div>
                <Label>تاريخ الشراء</Label>
                <p className="text-sm font-medium">{new Date(selectedAsset.purchase_date).toLocaleDateString('en-GB')}</p>
              </div>
              <div>
                <Label>تكلفة الشراء</Label>
                <p className="text-sm font-medium">{selectedAsset.purchase_cost.toFixed(3)} د.ك</p>
              </div>
              <div>
                <Label>القيمة التخريدية</Label>
                <p className="text-sm font-medium">{(selectedAsset.salvage_value || 0).toFixed(3)} د.ك</p>
              </div>
              <div>
                <Label>العمر الإنتاجي</Label>
                <p className="text-sm font-medium">{selectedAsset.useful_life_years} سنوات</p>
              </div>
              <div>
                <Label>طريقة الإهلاك</Label>
                <p className="text-sm font-medium">
                  {selectedAsset.depreciation_method === 'straight_line' ? 'القسط الثابت' :
                   selectedAsset.depreciation_method === 'declining_balance' ? 'الرصيد المتناقص' : 'وحدات الإنتاج'}
                </p>
              </div>
              <div>
                <Label>حالة الأصل</Label>
                <Badge variant={
                  selectedAsset.condition_status === 'excellent' ? 'default' :
                  selectedAsset.condition_status === 'good' ? 'secondary' :
                  selectedAsset.condition_status === 'fair' ? 'outline' : 'destructive'
                }>
                  {selectedAsset.condition_status === 'excellent' ? 'ممتازة' :
                   selectedAsset.condition_status === 'good' ? 'جيدة' :
                   selectedAsset.condition_status === 'fair' ? 'متوسطة' : 'ضعيفة'}
                </Badge>
              </div>
              <div>
                <Label>الإهلاك المتراكم</Label>
                <p className="text-sm font-medium text-orange-600">{(selectedAsset.accumulated_depreciation || 0).toFixed(3)} د.ك</p>
              </div>
              <div>
                <Label>القيمة الدفترية</Label>
                <p className="text-sm font-medium text-green-600">{selectedAsset.book_value.toFixed(3)} د.ك</p>
              </div>
              {selectedAsset.notes && (
                <div className="col-span-2">
                  <Label>ملاحظات</Label>
                  <p className="text-sm">{selectedAsset.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Asset Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل الأصل الثابت</DialogTitle>
            <DialogDescription>تحديث معلومات الأصل الثابت</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="editAssetCode">رمز الأصل *</Label>
              <Input
                id="editAssetCode"
                value={newAsset.asset_code}
                onChange={(e) => setNewAsset({ ...newAsset, asset_code: e.target.value })}
                placeholder="FA001"
              />
            </div>
            <div>
              <Label htmlFor="editAssetName">اسم الأصل *</Label>
              <Input
                id="editAssetName"
                value={newAsset.asset_name}
                onChange={(e) => setNewAsset({ ...newAsset, asset_name: e.target.value })}
                placeholder="اسم الأصل"
              />
            </div>
            <div>
              <Label htmlFor="editAssetNameAr">الاسم بالعربية</Label>
              <Input
                id="editAssetNameAr"
                value={newAsset.asset_name_ar}
                onChange={(e) => setNewAsset({ ...newAsset, asset_name_ar: e.target.value })}
                placeholder="الاسم بالعربية"
              />
            </div>
            <div>
              <Label htmlFor="editCategory">الفئة *</Label>
              <Select value={newAsset.category} onValueChange={(value) => setNewAsset({ ...newAsset, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buildings">المباني والإنشاءات</SelectItem>
                  <SelectItem value="equipment">المعدات والآلات</SelectItem>
                  <SelectItem value="furniture">الأثاث والتجهيزات</SelectItem>
                  <SelectItem value="vehicles">المركبات والنقل</SelectItem>
                  <SelectItem value="software">البرمجيات</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editSerialNumber">الرقم التسلسلي</Label>
              <Input
                id="editSerialNumber"
                value={newAsset.serial_number}
                onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                placeholder="الرقم التسلسلي"
              />
            </div>
            <div>
              <Label htmlFor="editLocation">الموقع</Label>
              <Input
                id="editLocation"
                value={newAsset.location}
                onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                placeholder="موقع الأصل"
              />
            </div>
            <div>
              <Label htmlFor="editPurchaseDate">تاريخ الشراء *</Label>
              <Input
                id="editPurchaseDate"
                type="date"
                value={newAsset.purchase_date}
                onChange={(e) => setNewAsset({ ...newAsset, purchase_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editPurchaseCost">تكلفة الشراء *</Label>
              <Input
                id="editPurchaseCost"
                type="number"
                value={newAsset.purchase_cost}
                onChange={(e) => setNewAsset({ ...newAsset, purchase_cost: Number(e.target.value) })}
                placeholder="0.000"
              />
            </div>
            <div>
              <Label htmlFor="editSalvageValue">القيمة التخريدية</Label>
              <Input
                id="editSalvageValue"
                type="number"
                value={newAsset.salvage_value}
                onChange={(e) => setNewAsset({ ...newAsset, salvage_value: Number(e.target.value) })}
                placeholder="0.000"
              />
            </div>
            <div>
              <Label htmlFor="editUsefulLife">العمر الإنتاجي (سنوات) *</Label>
              <Input
                id="editUsefulLife"
                type="number"
                value={newAsset.useful_life_years}
                onChange={(e) => setNewAsset({ ...newAsset, useful_life_years: Number(e.target.value) })}
                placeholder="5"
              />
            </div>
            <div>
              <Label htmlFor="editDepreciationMethod">طريقة الإهلاك</Label>
              <Select value={newAsset.depreciation_method} onValueChange={(value: unknown) => setNewAsset({ ...newAsset, depreciation_method: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الطريقة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="straight_line">القسط الثابت</SelectItem>
                  <SelectItem value="declining_balance">الرصيد المتناقص</SelectItem>
                  <SelectItem value="units_of_production">وحدات الإنتاج</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editCondition">حالة الأصل</Label>
              <Select value={newAsset.condition_status} onValueChange={(value: unknown) => setNewAsset({ ...newAsset, condition_status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">ممتازة</SelectItem>
                  <SelectItem value="good">جيدة</SelectItem>
                  <SelectItem value="fair">متوسطة</SelectItem>
                  <SelectItem value="poor">ضعيفة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="editNotes">ملاحظات</Label>
              <Textarea
                id="editNotes"
                value={newAsset.notes}
                onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })}
                placeholder="ملاحظات إضافية"
              />
            </div>
            <div className="col-span-2">
              <Button onClick={handleEditAsset} className="w-full" disabled={updateFixedAsset.isPending}>
                {updateFixedAsset.isPending ? "جاري التحديث..." : "تحديث الأصل"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
  )
}

export default FixedAssets