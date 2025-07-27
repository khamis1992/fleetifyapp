import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Car, MoreVertical, Wrench, Edit, Trash2, Eye, DollarSign, Shield, AlertTriangle, Calendar } from "lucide-react"
import { Vehicle } from "@/hooks/useVehicles"
import { EnhancedVehicleDetailsDialog } from "./EnhancedVehicleDetailsDialog"
import { EnhancedVehicleForm } from "./EnhancedVehicleForm"

interface VehicleCardProps {
  vehicle: Vehicle
}

const statusColors = {
  available: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  rented: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", 
  maintenance: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  out_of_service: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  reserved: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
}

const statusLabels = {
  available: "متاحة",
  rented: "مؤجرة",
  maintenance: "قيد الصيانة", 
  out_of_service: "خارج الخدمة",
  reserved: "محجوزة"
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)

  const status = vehicle.status || 'available'

  // Check for upcoming expirations
  const insuranceExpiringSoon = vehicle.insurance_end_date && 
    new Date(vehicle.insurance_end_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  
  const registrationExpiringSoon = vehicle.registration_expiry && 
    new Date(vehicle.registration_expiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const hasFinancialData = vehicle.purchase_cost || vehicle.total_operating_cost

  return (
    <>
      <Card className="hover:shadow-lg transition-all duration-200 relative overflow-hidden">
        {/* Status indicator bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          status === 'available' ? 'bg-green-500' : 
          status === 'rented' ? 'bg-blue-500' : 
          status === 'maintenance' ? 'bg-yellow-500' : 
          'bg-red-500'
        }`} />

        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Car className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg font-bold">{vehicle.plate_number}</CardTitle>
              {vehicle.vehicle_group_id && (
                <div className="w-3 h-3 rounded-full bg-primary/60" />
              )}
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              {(insuranceExpiringSoon || registrationExpiringSoon) && (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
              <Badge className={statusColors[status]}>
                {statusLabels[status]}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowDetails(true)}>
                    <Eye className="h-4 w-4 mr-2" />
                    عرض التفاصيل
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowEditForm(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    تعديل المركبة
                  </DropdownMenuItem>
                  {status === 'available' && (
                    <DropdownMenuItem>
                      <Wrench className="h-4 w-4 mr-2" />
                      جدولة الصيانة
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    إلغاء التفعيل
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          <div className="text-lg font-semibold text-foreground">
            {vehicle.make} {vehicle.model}
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div>السنة: {vehicle.year}</div>
            <div>اللون: {vehicle.color || 'غير محدد'}</div>
          </div>
          
          {vehicle.odometer_reading && (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Car className="h-3 w-3" />
              المسافة: {vehicle.odometer_reading?.toLocaleString()} كم
            </div>
          )}

          {/* Financial Information */}
          {hasFinancialData && (
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium">
                <DollarSign className="h-3 w-3" />
                المعلومات المالية
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {vehicle.purchase_cost && (
                  <div>
                    <span className="text-muted-foreground">تكلفة الشراء:</span>
                    <div className="font-medium">{vehicle.purchase_cost.toFixed(3)} د.ك</div>
                  </div>
                )}
                {vehicle.total_operating_cost && (
                  <div>
                    <span className="text-muted-foreground">التكاليف التشغيلية:</span>
                    <div className="font-medium text-orange-600">
                      {vehicle.total_operating_cost.toFixed(3)} د.ك
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Insurance and Registration Status */}
          <div className="flex flex-wrap gap-2">
            {vehicle.insurance_end_date && (
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                insuranceExpiringSoon ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
              }`}>
                <Shield className="h-3 w-3" />
                <span>التأمين: {new Date(vehicle.insurance_end_date).toLocaleDateString()}</span>
              </div>
            )}
            
            {vehicle.registration_expiry && (
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                registrationExpiringSoon ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
              }`}>
                <Calendar className="h-3 w-3" />
                <span>التسجيل: {new Date(vehicle.registration_expiry).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Technical Specs */}
          {(vehicle.fuel_type || vehicle.transmission_type || vehicle.seating_capacity) && (
            <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
              {vehicle.fuel_type && (
                <span className="bg-muted px-2 py-1 rounded">
                  {vehicle.fuel_type === 'gasoline' ? 'بنزين' : 
                   vehicle.fuel_type === 'diesel' ? 'ديزل' : 
                   vehicle.fuel_type === 'hybrid' ? 'هجين' : 
                   vehicle.fuel_type === 'electric' ? 'كهربائي' : vehicle.fuel_type}
                </span>
              )}
              {vehicle.transmission_type && (
                <span className="bg-muted px-2 py-1 rounded">
                  {vehicle.transmission_type === 'automatic' ? 'أوتوماتيك' : 
                   vehicle.transmission_type === 'manual' ? 'يدوي' : vehicle.transmission_type}
                </span>
              )}
              {vehicle.seating_capacity && (
                <span className="bg-muted px-2 py-1 rounded">
                  {vehicle.seating_capacity} مقعد
                </span>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-3 border-t">
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-muted-foreground">
              {vehicle.daily_rate && `${vehicle.daily_rate} د.ك/يوم`}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDetails(true)}
              className="hover:bg-primary hover:text-primary-foreground"
            >
              عرض التفاصيل
            </Button>
          </div>
        </CardFooter>
      </Card>

      <EnhancedVehicleDetailsDialog 
        vehicle={vehicle}
        open={showDetails}
        onOpenChange={setShowDetails}
      />
      
      <EnhancedVehicleForm 
        vehicle={vehicle}
        open={showEditForm}
        onOpenChange={setShowEditForm}
      />
    </>
  )
}