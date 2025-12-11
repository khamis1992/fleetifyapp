import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Car, MoreVertical, Wrench, Edit, Trash2, Eye, Calendar, Fuel, Settings } from 'lucide-react';
import { Vehicle } from '@/hooks/useVehicles';
import { VehicleForm } from './VehicleForm';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface VehicleListItemProps {
  vehicle: Vehicle;
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
};

const statusLabels = {
  available: "متاحة",
  rented: "مؤجرة",
  maintenance: "قيد الصيانة", 
  out_of_service: "خارج الخدمة",
  reserved: "محجوزة",
  reserved_employee: "محجوزة لموظف",
  accident: "حادث",
  stolen: "مسروقة",
  police_station: "في المخفر"
};

export function VehicleListItem({ vehicle }: VehicleListItemProps) {
  const navigate = useNavigate();
  const [showEditForm, setShowEditForm] = useState(false);

  const status = vehicle.status || 'available';
  const { formatCurrency } = useCurrencyFormatter();

  const handleViewDetails = () => {
    navigate(`/fleet/vehicles/${vehicle.id}`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleDateString('ar-SA');
  };

  const isMaintenanceDue = () => {
    if (!vehicle.next_service_due) return false;
    const dueDate = new Date(vehicle.next_service_due);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  const isInsuranceExpiring = () => {
    if (!vehicle.insurance_expiry) return false;
    const expiryDate = new Date(vehicle.insurance_expiry);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Vehicle Info */}
            <div className="flex items-center space-x-4 flex-1">
              <div className="flex items-center space-x-2">
                <Car className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold text-lg">{vehicle.plate_number}</span>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="font-medium">{vehicle.make} {vehicle.model}</div>
                  <div className="text-sm text-muted-foreground">
                    {vehicle.year} • {vehicle.color}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Settings className="h-3 w-3 mr-1" />
                    {vehicle.current_mileage?.toLocaleString() || 0} كم
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Fuel className="h-3 w-3 mr-1" />
                    {vehicle.fuel_type || 'غير محدد'}
                  </div>
                </div>

                <div className="space-y-1">
                  {vehicle.daily_rate && (
                    <div className="text-sm font-medium">
                      {formatCurrency(vehicle.daily_rate)}/يوم
                    </div>
                  )}
                  {vehicle.minimum_rental_price && vehicle.enforce_minimum_price && (
                    <div className="text-xs text-orange-600">
                      حد أدنى: {formatCurrency(vehicle.minimum_rental_price)}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  {vehicle.last_maintenance_date && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      آخر صيانة: {formatDate(vehicle.last_maintenance_date)}
                    </div>
                  )}
                  {vehicle.insurance_expiry && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      تأمين: {formatDate(vehicle.insurance_expiry)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status and Actions */}
            <div className="flex items-center space-x-3">
              {/* Warning Badges */}
              <div className="flex flex-col space-y-1">
                {isMaintenanceDue() && (
                  <Badge variant="destructive" className="text-xs">
                    <Wrench className="h-3 w-3 mr-1" />
                    صيانة مستحقة
                  </Badge>
                )}
                {isInsuranceExpiring() && (
                  <Badge variant="destructive" className="text-xs">
                    تأمين منتهي
                  </Badge>
                )}
              </div>

              {/* Status Badge */}
              <Badge className={statusColors[status]}>
                {statusLabels[status]}
              </Badge>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleViewDetails}>
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

              {/* View Details Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewDetails}
              >
                عرض التفاصيل
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <VehicleForm 
        vehicle={vehicle}
        open={showEditForm}
        onOpenChange={setShowEditForm}
      />
    </>
  );
}