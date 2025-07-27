import { useState } from "react"
import { Plus, Search, Filter, Download, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { EnhancedVehicleForm } from "@/components/fleet/EnhancedVehicleForm"
import { VehicleCard } from "@/components/fleet/VehicleCard"
import { useVehicles } from "@/hooks/useVehicles"
import { useDebounce } from "@/hooks/useDebounce"

export function VehicleManagementPanel() {
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("plate_number")
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles()

  // Filter and sort vehicles
  const filteredVehicles = vehicles?.filter(vehicle => {
    const matchesSearch = !debouncedSearchTerm || 
      vehicle.plate_number.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      vehicle.make.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter
    const matchesCategory = categoryFilter === "all" || vehicle.category_id === categoryFilter
    
    return matchesSearch && matchesStatus && matchesCategory
  }).sort((a, b) => {
    switch (sortBy) {
      case 'plate_number':
        return a.plate_number.localeCompare(b.plate_number)
      case 'make':
        return a.make.localeCompare(b.make)
      case 'year':
        return (b.year || 0) - (a.year || 0)
      case 'daily_rate':
        return (b.daily_rate || 0) - (a.daily_rate || 0)
      default:
        return 0
    }
  }) || []

  const statusCounts = {
    all: vehicles?.length || 0,
    available: vehicles?.filter(v => v.status === 'available').length || 0,
    rented: vehicles?.filter(v => v.status === 'rented').length || 0,
    maintenance: vehicles?.filter(v => v.status === 'maintenance').length || 0,
    out_of_service: vehicles?.filter(v => v.status === 'out_of_service').length || 0,
  }

  if (vehiclesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Management Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">إدارة المركبات</h2>
          <p className="text-muted-foreground">
            إدارة وتتبع جميع مركبات الأسطول
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            استيراد
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            تصدير
          </Button>
          <Button onClick={() => setShowVehicleForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            إضافة مركبة
          </Button>
        </div>
      </div>

      {/* Quick Status Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card 
            key={status}
            className={`cursor-pointer transition-all duration-200 ${
              statusFilter === status ? 'ring-2 ring-primary' : 'hover:shadow-md'
            }`}
            onClick={() => setStatusFilter(status)}
          >
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-muted-foreground">
                  {status === 'all' ? 'الكل' :
                   status === 'available' ? 'متاحة' :
                   status === 'rented' ? 'مؤجرة' :
                   status === 'maintenance' ? 'صيانة' :
                   'خارج الخدمة'}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            البحث والتصفية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث برقم اللوحة، الماركة، أو الموديل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="حالة المركبة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="available">متاحة</SelectItem>
                <SelectItem value="rented">مؤجرة</SelectItem>
                <SelectItem value="maintenance">قيد الصيانة</SelectItem>
                <SelectItem value="out_of_service">خارج الخدمة</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="الفئة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                <SelectItem value="sedan">سيدان</SelectItem>
                <SelectItem value="suv">SUV</SelectItem>
                <SelectItem value="hatchback">هاتشباك</SelectItem>
                <SelectItem value="pickup">بيك اب</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="ترتيب حسب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="plate_number">رقم اللوحة</SelectItem>
                <SelectItem value="make">الماركة</SelectItem>
                <SelectItem value="year">السنة</SelectItem>
                <SelectItem value="daily_rate">السعر اليومي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            عرض {filteredVehicles.length} من {vehicles?.length || 0} مركبة
          </span>
          {statusFilter !== "all" && (
            <Badge variant="secondary">
              {statusFilter === 'available' ? 'متاحة' :
               statusFilter === 'rented' ? 'مؤجرة' :
               statusFilter === 'maintenance' ? 'صيانة' :
               'خارج الخدمة'}
            </Badge>
          )}
        </div>
      </div>

      {/* Vehicle Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredVehicles.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))}
      </div>

      {filteredVehicles.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد مركبات</h3>
            <p className="text-muted-foreground text-center mb-4">
              {vehicles?.length === 0 
                ? "لا توجد مركبات في الأسطول بعد" 
                : "لا توجد مركبات تطابق معايير البحث"
              }
            </p>
            {vehicles?.length === 0 && (
              <Button onClick={() => setShowVehicleForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                إضافة أول مركبة
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vehicle Form Dialog */}
      {showVehicleForm && (
        <EnhancedVehicleForm 
          open={showVehicleForm} 
          onOpenChange={setShowVehicleForm}
        />
      )}
    </div>
  )
}