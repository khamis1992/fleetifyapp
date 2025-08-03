import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, FileText, Settings, DollarSign, Activity } from "lucide-react";
import { Vehicle } from "@/hooks/useVehicles";
import { VehiclePricingPanel } from "./VehiclePricingPanel";
import { VehicleInsurancePanel } from "./VehicleInsurancePanel";
import { VehicleDocumentsPanel } from "./VehicleDocumentsPanel";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface EnhancedVehicleDetailsDialogProps {
  vehicle?: Vehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export function EnhancedVehicleDetailsDialog({ 
  vehicle, 
  open, 
  onOpenChange, 
  onEdit 
}: EnhancedVehicleDetailsDialogProps) {
  const [documents, setDocuments] = useState<any[]>([]);

  const handleDocumentAdd = (document: any) => {
    setDocuments(prev => [...prev, document]);
  };

  if (!vehicle) return null;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'rented':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_service':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'available':
        return 'متاحة';
      case 'rented':
        return 'مؤجرة';
      case 'maintenance':
        return 'قيد الصيانة';
      case 'out_of_service':
        return 'خارج الخدمة';
      case 'reserved':
        return 'محجوزة';
      default:
        return status || 'غير محدد';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">
                {vehicle.make} {vehicle.model} ({vehicle.year})
              </DialogTitle>
              <DialogDescription className="text-lg">
                رقم اللوحة: {vehicle.plate_number}
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(vehicle.status)}>
                {getStatusLabel(vehicle.status)}
              </Badge>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  تعديل
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="technical">تقنية</TabsTrigger>
            <TabsTrigger value="financial">مالية</TabsTrigger>
            <TabsTrigger value="pricing">التسعير</TabsTrigger>
            <TabsTrigger value="documents">الوثائق</TabsTrigger>
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">المعلومات الأساسية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
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
                  {vehicle.color && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">اللون:</span>
                      <span className="font-medium">{vehicle.color}</span>
                    </div>
                  )}
                  {vehicle.seating_capacity && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">عدد المقاعد:</span>
                      <span className="font-medium">{vehicle.seating_capacity}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">المواصفات التقنية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {vehicle.vin && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">رقم الهيكل:</span>
                      <span className="font-medium">{vehicle.vin}</span>
                    </div>
                  )}
                  {vehicle.engine_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">رقم المحرك:</span>
                      <span className="font-medium">{vehicle.engine_number}</span>
                    </div>
                  )}
                  {vehicle.transmission_type && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ناقل الحركة:</span>
                      <span className="font-medium">
                        {vehicle.transmission_type === 'automatic' ? 'أوتوماتيك' : 'يدوي'}
                      </span>
                    </div>
                  )}
                  {vehicle.fuel_type && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">نوع الوقود:</span>
                      <span className="font-medium">
                        {vehicle.fuel_type === 'gasoline' ? 'بنزين' : 
                         vehicle.fuel_type === 'diesel' ? 'ديزل' : 
                         vehicle.fuel_type === 'hybrid' ? 'هجين' : 'كهربائي'}
                      </span>
                    </div>
                  )}
                  {vehicle.current_mileage && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المسافة المقطوعة:</span>
                      <span className="font-medium">{vehicle.current_mileage} كم</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">التسعير</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {vehicle.daily_rate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">يومي:</span>
                      <span className="font-medium">{formatCurrency(vehicle.daily_rate)}</span>
                    </div>
                  )}
                  {vehicle.weekly_rate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">أسبوعي:</span>
                      <span className="font-medium">{formatCurrency(vehicle.weekly_rate)}</span>
                    </div>
                  )}
                  {vehicle.monthly_rate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">شهري:</span>
                      <span className="font-medium">{formatCurrency(vehicle.monthly_rate)}</span>
                    </div>
                  )}
                  {vehicle.deposit_amount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">التأمين:</span>
                      <span className="font-medium">{formatCurrency(vehicle.deposit_amount)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {vehicle.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">ملاحظات</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{vehicle.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="technical" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">المواصفات التقنية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {vehicle.chassis_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">رقم الشاسيه:</span>
                      <span className="font-medium">{vehicle.chassis_number}</span>
                    </div>
                  )}
                  {vehicle.fuel_capacity && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">سعة الخزان:</span>
                      <span className="font-medium">{vehicle.fuel_capacity} لتر</span>
                    </div>
                  )}
                  {vehicle.drive_type && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">نوع الدفع:</span>
                      <span className="font-medium">
                        {vehicle.drive_type === 'front_wheel' ? 'دفع أمامي' :
                         vehicle.drive_type === 'rear_wheel' ? 'دفع خلفي' :
                         vehicle.drive_type === 'all_wheel' ? 'دفع رباعي' : vehicle.drive_type}
                      </span>
                    </div>
                  )}
                  {vehicle.vehicle_condition && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">حالة المركبة:</span>
                      <span className="font-medium">
                        {vehicle.vehicle_condition === 'excellent' ? 'ممتازة' :
                         vehicle.vehicle_condition === 'very_good' ? 'جيدة جداً' :
                         vehicle.vehicle_condition === 'good' ? 'جيدة' :
                         vehicle.vehicle_condition === 'fair' ? 'مقبولة' : 'ضعيفة'}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">التواريخ المهمة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {vehicle.registration_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تاريخ التسجيل:</span>
                      <span className="font-medium">
                        {format(new Date(vehicle.registration_date), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  )}
                  {vehicle.registration_expiry && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">انتهاء التسجيل:</span>
                      <span className="font-medium">
                        {format(new Date(vehicle.registration_expiry), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  )}
                  {vehicle.inspection_due_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الفحص القادم:</span>
                      <span className="font-medium">
                        {format(new Date(vehicle.inspection_due_date), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  )}
                  {vehicle.current_location && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الموقع الحالي:</span>
                      <span className="font-medium">{vehicle.current_location}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">معلومات الشراء</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {vehicle.purchase_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تاريخ الشراء:</span>
                      <span className="font-medium">
                        {format(new Date(vehicle.purchase_date), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  )}
                  {vehicle.purchase_cost && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تكلفة الشراء:</span>
                      <span className="font-medium">{formatCurrency(vehicle.purchase_cost)}</span>
                    </div>
                  )}
                  {vehicle.useful_life_years && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">العمر الإنتاجي:</span>
                      <span className="font-medium">{vehicle.useful_life_years} سنة</span>
                    </div>
                  )}
                  {vehicle.residual_value && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">القيمة المتبقية:</span>
                      <span className="font-medium">{formatCurrency(vehicle.residual_value)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">معلومات الملكية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {vehicle.ownership_status && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">حالة الملكية:</span>
                      <span className="font-medium">
                        {vehicle.ownership_status === 'owned' ? 'مملوكة' :
                         vehicle.ownership_status === 'leased' ? 'مؤجرة' : 'ممولة'}
                      </span>
                    </div>
                  )}
                  {vehicle.lease_company && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">شركة التأجير:</span>
                      <span className="font-medium">{vehicle.lease_company}</span>
                    </div>
                  )}
                  {vehicle.monthly_lease_amount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">القسط الشهري:</span>
                      <span className="font-medium">{formatCurrency(vehicle.monthly_lease_amount)}</span>
                    </div>
                  )}
                  {vehicle.lease_start_date && vehicle.lease_end_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">فترة التأجير:</span>
                      <span className="font-medium">
                        {format(new Date(vehicle.lease_start_date), 'dd/MM/yyyy')} - 
                        {format(new Date(vehicle.lease_end_date), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <VehiclePricingPanel vehicleId={vehicle.id} />
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <VehicleDocumentsPanel 
              vehicleId={vehicle.id} 
              documents={documents}
              onDocumentAdd={handleDocumentAdd}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}