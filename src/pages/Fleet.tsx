import { useState } from "react"
import { Plus, Car, AlertTriangle, TrendingUp, Wrench, FileText, Layers3, Calculator, Upload } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { VehicleForm } from "@/components/fleet/VehicleForm"
import { VehicleCard } from "@/components/fleet/VehicleCard"
import { VehicleGroupManagement } from "@/components/fleet/VehicleGroupManagement"
import { VehicleCSVUpload } from "@/components/fleet/VehicleCSVUpload"
import { useVehicles } from "@/hooks/useVehicles"
import { useAuth } from "@/contexts/AuthContext"

export default function Fleet() {
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [showGroupManagement, setShowGroupManagement] = useState(false)
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  
  const { user } = useAuth()
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles()

  const availableVehicles = vehicles?.filter(v => v.status === 'available') || []
  const rentedVehicles = vehicles?.filter(v => v.status === 'rented') || []
  const maintenanceVehicles = vehicles?.filter(v => v.status === 'maintenance') || []
  const outOfServiceVehicles = vehicles?.filter(v => !['available', 'rented', 'maintenance'].includes(String(v.status))) || []

  if (vehiclesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة الأسطول</h1>
          <p className="text-muted-foreground">
            إدارة أسطول المركبات والصيانة والعمليات
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/fleet/financial-analysis">
            <Button variant="outline" size="sm">
              <Calculator className="h-4 w-4 mr-2" />
              التحليل المالي
            </Button>
          </Link>
          <Dialog open={showGroupManagement} onOpenChange={setShowGroupManagement}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Layers3 className="h-4 w-4 mr-2" />
                مجموعات المركبات
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>إدارة مجموعات المركبات</DialogTitle>
              </DialogHeader>
              {user?.profile?.company_id && (
                <VehicleGroupManagement companyId={user.profile.company_id} />
              )}
            </DialogContent>
          </Dialog>
          {user?.roles?.includes('super_admin') && (
            <Button variant="outline" size="sm" onClick={() => setShowCSVUpload(true)}>
              <Upload className="h-4 w-4 mr-2" />
              رفع CSV
            </Button>
          )}
          <Button onClick={() => setShowVehicleForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            إضافة مركبة
          </Button>
        </div>
      </div>

      {/* Fleet Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المركبات المتاحة</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableVehicles.length}</div>
            <p className="text-xs text-muted-foreground">
              جاهزة للإيجار
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المركبات المؤجرة</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{rentedVehicles.length}</div>
            <p className="text-xs text-muted-foreground">
              حالياً تحت العقد
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد الصيانة</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{maintenanceVehicles.length}</div>
            <p className="text-xs text-muted-foreground">
              يتم صيانتها
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">خارج الخدمة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfServiceVehicles.length}</div>
            <p className="text-xs text-muted-foreground">
              تحتاج لإنتباه
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Status Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedVehicle === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedVehicle(null)}
        >
          الكل ({vehicles?.length || 0})
        </Button>
        <Button
          variant={selectedVehicle === "available" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedVehicle("available")}
        >
          متاحة ({availableVehicles.length})
        </Button>
        <Button
          variant={selectedVehicle === "rented" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedVehicle("rented")}
        >
          مؤجرة ({rentedVehicles.length})
        </Button>
        <Button
          variant={selectedVehicle === "maintenance" ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedVehicle("maintenance")}
        >
          قيد الصيانة ({maintenanceVehicles.length})
        </Button>
      </div>

      {/* Vehicle Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vehicles
          ?.filter(vehicle => !selectedVehicle || vehicle.status === selectedVehicle)
          ?.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
      </div>

      {vehicles?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا توجد مركبات بعد</h3>
            <p className="text-muted-foreground text-center mb-4">
              ابدأ في بناء أسطولك عن طريق إضافة أول مركبة
            </p>
            <Button onClick={() => setShowVehicleForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              إضافة مركبة
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Vehicle Form Dialog */}
      {showVehicleForm && (
        <VehicleForm 
          open={showVehicleForm} 
          onOpenChange={setShowVehicleForm}
        />
      )}

      {/* Vehicle CSV Upload Dialog */}
      <VehicleCSVUpload
        open={showCSVUpload}
        onOpenChange={setShowCSVUpload}
        onUploadComplete={() => {
          setShowCSVUpload(false)
          // Refresh vehicle list - the query will automatically refetch
        }}
      />
    </div>
  )
}