import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Vehicle } from "@/hooks/useVehicles"
import { Car, Wrench, FileText, DollarSign, Calendar, Gauge, Edit } from "lucide-react"
import { VehicleInsurancePanel } from "@/components/fleet/VehicleInsurancePanel"
import { VehicleDocumentsPanel } from "@/components/fleet/VehicleDocumentsPanel"
import { VehiclePricingPanel } from "@/components/fleet/VehiclePricingPanel"

interface VehicleDetailsDialogProps {
  vehicle: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (vehicle: Vehicle) => void
}

const statusColors = {
  available: "bg-green-100 text-green-800",
  rented: "bg-blue-100 text-blue-800", 
  maintenance: "bg-yellow-100 text-yellow-800",
  out_of_service: "bg-red-100 text-red-800",
  reserved: "bg-purple-100 text-purple-800"
}

const statusLabels = {
  available: "متاحة",
  rented: "مؤجرة",
  maintenance: "قيد الصيانة", 
  out_of_service: "خارج الخدمة",
  reserved: "محجوزة"
}

export function VehicleDetailsDialog({ vehicle, open, onOpenChange, onEdit }: VehicleDetailsDialogProps) {
  const status = vehicle.status || 'available'

  const handleDocumentAdd = (document: any) => {
    // Handle document addition logic
    console.log('Document added:', document)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                {vehicle.plate_number} - {vehicle.make} {vehicle.model}
              </DialogTitle>
              <DialogDescription>
                تفاصيل ومعلومات المركبة
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusColors[status]}>
                {statusLabels[status]}
              </Badge>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(vehicle)}>
                  <Edit className="h-4 w-4 mr-2" />
                  تعديل
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="documents">الوثائق</TabsTrigger>
            <TabsTrigger value="insurance">التأمين</TabsTrigger>
            <TabsTrigger value="pricing">التسعير</TabsTrigger>
            <TabsTrigger value="financial">المالية</TabsTrigger>
            <TabsTrigger value="specifications">المواصفات</TabsTrigger>
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    المعلومات الأساسية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">رقم اللوحة:</span>
                    <span className="font-medium">{vehicle.plate_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الشركة المصنعة:</span>
                    <span className="font-medium">{vehicle.make}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الطراز:</span>
                    <span className="font-medium">{vehicle.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">السنة:</span>
                    <span className="font-medium">{vehicle.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">اللون:</span>
                    <span className="font-medium">{vehicle.color || 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الحالة:</span>
                    <Badge className={statusColors[status]} variant="secondary">
                      {statusLabels[status]}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    المعلومات التشغيلية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المسافة المقطوعة الحالية:</span>
                    <span className="font-medium">
                      {vehicle.current_mileage ? `${vehicle.current_mileage.toLocaleString()} كم` : 'غير مسجلة'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">مسافة آخر صيانة:</span>
                    <span className="font-medium">
                      {vehicle.last_service_mileage ? `${vehicle.last_service_mileage.toLocaleString()} كم` : 'غير مسجلة'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الصيانة التالية:</span>
                    <span className="font-medium">
                      {vehicle.next_service_mileage ? `${vehicle.next_service_mileage.toLocaleString()} كم` : 'غير محددة'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">آخر صيانة:</span>
                    <span className="font-medium">
                      {vehicle.last_maintenance_date 
                        ? new Date(vehicle.last_maintenance_date).toLocaleDateString() 
                        : 'لا يوجد سجل'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  معلومات التسعير
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {vehicle.daily_rate ? `${vehicle.daily_rate} KWD` : 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">التعرفة اليومية</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {vehicle.weekly_rate ? `${vehicle.weekly_rate} د.ك` : 'غ/م'}
                    </div>
                    <div className="text-sm text-muted-foreground">التعرفة الأسبوعية</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {vehicle.monthly_rate ? `${vehicle.monthly_rate} د.ك` : 'غ/م'}
                    </div>
                    <div className="text-sm text-muted-foreground">التعرفة الشهرية</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {vehicle.deposit_amount ? `${vehicle.deposit_amount} د.ك` : 'غ/م'}
                    </div>
                    <div className="text-sm text-muted-foreground">التأمين</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {vehicle.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>ملاحظات</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{vehicle.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="specifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>المواصفات الفنية</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold">Engine & Performance</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VIN:</span>
                      <span className="font-medium">{vehicle.vin || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Engine Number:</span>
                      <span className="font-medium">{vehicle.engine_number || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transmission:</span>
                      <span className="font-medium capitalize">{vehicle.transmission || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fuel Type:</span>
                      <span className="font-medium capitalize">{vehicle.fuel_type || 'Not specified'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Physical Attributes</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Body Type:</span>
                      <span className="font-medium">{vehicle.body_type || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Seating Capacity:</span>
                      <span className="font-medium">{vehicle.seating_capacity || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Registration:</span>
                      <span className="font-medium">{vehicle.registration_number || 'Not specified'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Information</CardTitle>
                <CardDescription>Purchase details and depreciation</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold">Purchase Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Purchase Date:</span>
                      <span className="font-medium">
                        {vehicle.purchase_date 
                          ? new Date(vehicle.purchase_date).toLocaleDateString() 
                          : 'Not specified'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Purchase Cost:</span>
                      <span className="font-medium">
                        {vehicle.purchase_cost ? `${vehicle.purchase_cost} KWD` : 'Not specified'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Useful Life:</span>
                      <span className="font-medium">
                        {vehicle.useful_life_years ? `${vehicle.useful_life_years} years` : 'Not specified'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Residual Value:</span>
                      <span className="font-medium">
                        {vehicle.residual_value ? `${vehicle.residual_value} KWD` : 'Not specified'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Depreciation Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Method:</span>
                      <span className="font-medium capitalize">
                        {vehicle.depreciation_method?.replace('_', ' ') || 'Not specified'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Annual Rate:</span>
                      <span className="font-medium">
                        {vehicle.annual_depreciation_rate ? `${vehicle.annual_depreciation_rate} KWD` : 'Not calculated'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Accumulated:</span>
                      <span className="font-medium">
                        {vehicle.accumulated_depreciation ? `${vehicle.accumulated_depreciation} KWD` : '0 KWD'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Book Value:</span>
                      <span className="font-medium">
                        {vehicle.book_value ? `${vehicle.book_value} KWD` : 'Not calculated'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <VehiclePricingPanel vehicleId={vehicle.id} />
          </TabsContent>

          <TabsContent value="insurance" className="space-y-4">
            <VehicleInsurancePanel vehicleId={vehicle.id} />
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <VehicleDocumentsPanel 
              vehicleId={vehicle.id}
              onDocumentAdd={handleDocumentAdd}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}