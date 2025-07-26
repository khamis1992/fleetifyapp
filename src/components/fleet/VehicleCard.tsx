import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Car, MoreVertical, Wrench, Edit, Trash2, Eye } from "lucide-react"
import { Vehicle } from "@/hooks/useVehicles"
import { VehicleDetailsDialog } from "./VehicleDetailsDialog"
import { VehicleForm } from "./VehicleForm"

interface VehicleCardProps {
  vehicle: Vehicle
}

const statusColors = {
  available: "bg-green-100 text-green-800",
  rented: "bg-blue-100 text-blue-800", 
  maintenance: "bg-yellow-100 text-yellow-800",
  out_of_service: "bg-red-100 text-red-800",
  reserved: "bg-purple-100 text-purple-800"
}

const statusLabels = {
  available: "Available",
  rented: "Rented",
  maintenance: "Maintenance", 
  out_of_service: "Out of Service",
  reserved: "Reserved"
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
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowEditForm(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Vehicle
                  </DropdownMenuItem>
                  {status === 'available' && (
                    <DropdownMenuItem>
                      <Wrench className="h-4 w-4 mr-2" />
                      Schedule Maintenance
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deactivate
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
            Year: {vehicle.year} • Color: {vehicle.color}
          </div>
          
          {vehicle.current_mileage && (
            <div className="text-sm text-muted-foreground">
              Mileage: {vehicle.current_mileage?.toLocaleString()} km
            </div>
          )}
          
          {vehicle.last_maintenance_date && (
            <div className="text-sm text-muted-foreground">
              Last Service: {new Date(vehicle.last_maintenance_date).toLocaleDateString()}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-3">
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-muted-foreground">
              {vehicle.daily_rate && `${vehicle.daily_rate} KWD/day`}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDetails(true)}
            >
              View Details
            </Button>
          </div>
        </CardFooter>
      </Card>

      <VehicleDetailsDialog 
        vehicle={vehicle}
        open={showDetails}
        onOpenChange={setShowDetails}
      />
      
      <VehicleForm 
        vehicle={vehicle}
        open={showEditForm}
        onOpenChange={setShowEditForm}
      />
    </>
  )
}