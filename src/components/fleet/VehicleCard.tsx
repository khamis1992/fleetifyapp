import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Car, MoreVertical, Wrench, Edit, Trash2, Eye } from "lucide-react"
import { Vehicle } from "@/hooks/useVehicles"
import { EnhancedVehicleDetailsDialog } from "./EnhancedVehicleDetailsDialog"
import { VehicleForm } from "./VehicleForm"

interface VehicleCardProps {
  vehicle: Vehicle
}

const statusColors = {
  available: "bg-green-100 text-green-800",
  rented: "bg-blue-100 text-blue-800", 
  maintenance: "bg-yellow-100 text-yellow-800",
  out_of_service: "bg-red-100 text-red-800",
  reserved: "bg-purple-100 text-purple-800",
  accident: "bg-red-100 text-red-800",
  stolen: "bg-slate-100 text-slate-800",
  police_station: "bg-amber-100 text-amber-800"
}

const statusLabels = {
  available: "متاحة",
  rented: "مؤجرة",
  maintenance: "قيد الصيانة", 
  out_of_service: "خارج الخدمة",
  reserved: "محجوزة",
  accident: "حادث",
  stolen: "مسروقة",
  police_station: "في المخفر"
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)

  const status = vehicle.status || 'available'

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Car className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{vehicle.plate_number}</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={statusColors[status]}>
                {statusLabels[status]}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
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
        
        <CardContent className="space-y-2">
          <div className="text-lg font-semibold">
            {vehicle.make} {vehicle.model}
          </div>
          <div className="text-sm text-muted-foreground">
            السنة: {vehicle.year} • اللون: {vehicle.color}
          </div>
          
          {vehicle.current_mileage && (
            <div className="text-sm text-muted-foreground">
              المسافة المقطوعة: {vehicle.current_mileage?.toLocaleString()} كم
            </div>
          )}
          
          {vehicle.last_maintenance_date && (
            <div className="text-sm text-muted-foreground">
              آخر صيانة: {new Date(vehicle.last_maintenance_date).toLocaleDateString()}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-3">
          <div className="flex justify-between items-center w-full">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">
                {vehicle.daily_rate && `${vehicle.daily_rate} KWD/day`}
              </div>
              {vehicle.minimum_rental_price && vehicle.enforce_minimum_price && (
                <div className="text-xs text-orange-600 font-medium">
                  حد أدنى: {vehicle.minimum_rental_price} د.ك
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDetails(true)}
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
        onEdit={() => setShowEditForm(true)}
      />
      
      <VehicleForm 
        vehicle={vehicle}
        open={showEditForm}
        onOpenChange={setShowEditForm}
      />
    </>
  )
}