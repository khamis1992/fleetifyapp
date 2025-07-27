import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Vehicle } from "@/hooks/useVehicles"
import { 
  Car, Wrench, FileText, DollarSign, Calendar, Gauge, Shield, 
  AlertTriangle, Clock, TrendingUp, Settings, Info, Zap, Cog 
} from "lucide-react"
import { useState } from "react"
import { EnhancedVehicleForm } from "./EnhancedVehicleForm"

interface VehicleDetailsDialogProps {
  vehicle: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
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

export function EnhancedVehicleDetailsDialog({ vehicle, open, onOpenChange }: VehicleDetailsDialogProps) {
  const [showEditForm, setShowEditForm] = useState(false)
  const status = vehicle.status || 'available'

  // Check for upcoming expirations
  const insuranceExpiringSoon = vehicle.insurance_end_date && 
    new Date(vehicle.insurance_end_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  
  const registrationExpiringSoon = vehicle.registration_expiry && 
    new Date(vehicle.registration_expiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <Car className="h-6 w-6" />
                  {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  تفاصيل ومعلومات المركبة الشاملة
                </DialogDescription>
              </div>
              <div className="flex items-center gap-3">
                {(insuranceExpiringSoon || registrationExpiringSoon) && (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                )}
                <Badge className={statusColors[status]} variant="secondary">
                  {statusLabels[status]}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setShowEditForm(true)}>
                  تعديل المركبة
                </Button>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
              <TabsTrigger value="technical">المواصفات التقنية</TabsTrigger>
              <TabsTrigger value="financial">المعلومات المالية</TabsTrigger>
              <TabsTrigger value="insurance">التأمين والضمان</TabsTrigger>
              <TabsTrigger value="maintenance">الصيانة</TabsTrigger>
              <TabsTrigger value="documents">الوثائق</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Car className="h-5 w-5" />
                      المعلومات الأساسية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">رقم اللوحة:</span>
                      <span className="font-semibold">{vehicle.plate_number}</span>
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
                      <span className="text-muted-foreground">رقم الهيكل:</span>
                      <span className="font-medium text-xs">{vehicle.vin || 'غير محدد'}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Operational Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Gauge className="h-5 w-5" />
                      الحالة التشغيلية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الحالة الحالية:</span>
                      <Badge className={statusColors[status]} variant="secondary">
                        {statusLabels[status]}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">قراءة العداد:</span>
                      <span className="font-medium">
                        {vehicle.odometer_reading ? `${vehicle.odometer_reading.toLocaleString()} كم` : 'غير مسجلة'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الموقع الحالي:</span>
                      <span className="font-medium">{vehicle.location || 'غير محدد'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">آخر تحديث:</span>
                      <span className="font-medium text-xs">
                        {new Date(vehicle.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <DollarSign className="h-5 w-5" />
                      الملخص المالي
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تكلفة الشراء:</span>
                      <span className="font-semibold text-blue-600">
                        {vehicle.purchase_cost ? `${vehicle.purchase_cost.toFixed(3)} د.ك` : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تكاليف الصيانة:</span>
                      <span className="font-medium text-orange-600">
                        {vehicle.total_maintenance_cost?.toFixed(3) || '0.000'} د.ك
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تكاليف التأمين:</span>
                      <span className="font-medium text-purple-600">
                        {vehicle.total_insurance_cost?.toFixed(3) || '0.000'} د.ك
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">إجمالي التكاليف:</span>
                      <span className="font-bold text-primary">
                        {vehicle.total_operating_cost?.toFixed(3) || '0.000'} د.ك
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Alerts and Notifications */}
              {(insuranceExpiringSoon || registrationExpiringSoon) && (
                <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                      <AlertTriangle className="h-5 w-5" />
                      تنبيهات مهمة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {insuranceExpiringSoon && (
                      <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                        <Shield className="h-4 w-4" />
                        <span>ينتهي التأمين في {new Date(vehicle.insurance_end_date!).toLocaleDateString()}</span>
                      </div>
                    )}
                    {registrationExpiringSoon && (
                      <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                        <Calendar className="h-4 w-4" />
                        <span>ينتهي التسجيل في {new Date(vehicle.registration_expiry!).toLocaleDateString()}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Features Summary */}
              {(vehicle.safety_features?.length || vehicle.additional_features?.length) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      الميزات والمواصفات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {vehicle.safety_features?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <Shield className="h-4 w-4" />
                          ميزات الأمان
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {vehicle.safety_features.map((feature, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {vehicle.additional_features?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                          <Zap className="h-4 w-4" />
                          ميزات إضافية
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {vehicle.additional_features.map((feature, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {vehicle.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      ملاحظات
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{vehicle.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Technical Specifications */}
            <TabsContent value="technical" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cog className="h-5 w-5" />
                      المحرك والأداء
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">نوع الوقود:</span>
                      <span className="font-medium">
                        {vehicle.fuel_type === 'gasoline' ? 'بنزين' : 
                         vehicle.fuel_type === 'diesel' ? 'ديزل' : 
                         vehicle.fuel_type === 'hybrid' ? 'هجين' : 
                         vehicle.fuel_type === 'electric' ? 'كهربائي' : 
                         vehicle.fuel_type || 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">سعة الخزان:</span>
                      <span className="font-medium">
                        {vehicle.fuel_capacity ? `${vehicle.fuel_capacity} لتر` : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">حجم المحرك:</span>
                      <span className="font-medium">{vehicle.engine_size || 'غير محدد'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">نوع الناقل:</span>
                      <span className="font-medium">
                        {vehicle.transmission_type === 'automatic' ? 'أوتوماتيك' : 
                         vehicle.transmission_type === 'manual' ? 'يدوي' : 
                         vehicle.transmission_type || 'غير محدد'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      المواصفات الفيزيائية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">عدد المقاعد:</span>
                      <span className="font-medium">
                        {vehicle.seating_capacity ? `${vehicle.seating_capacity} مقعد` : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">سعة الحمولة:</span>
                      <span className="font-medium">
                        {vehicle.cargo_capacity ? `${vehicle.cargo_capacity} كغ` : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الوزن:</span>
                      <span className="font-medium">
                        {vehicle.vehicle_weight ? `${vehicle.vehicle_weight} كغ` : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المسافة المقطوعة:</span>
                      <span className="font-medium">
                        {vehicle.odometer_reading ? `${vehicle.odometer_reading.toLocaleString()} كم` : 'غير مسجلة'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Financial Information */}
            <TabsContent value="financial" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      معلومات الشراء
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تاريخ الشراء:</span>
                      <span className="font-medium">
                        {vehicle.purchase_date ? new Date(vehicle.purchase_date).toLocaleDateString() : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تكلفة الشراء:</span>
                      <span className="font-semibold text-blue-600">
                        {vehicle.purchase_cost ? `${vehicle.purchase_cost.toFixed(3)} د.ك` : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">رقم الفاتورة:</span>
                      <span className="font-medium">{vehicle.purchase_invoice_number || 'غير محدد'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">العمر الإنتاجي:</span>
                      <span className="font-medium">
                        {vehicle.useful_life_years ? `${vehicle.useful_life_years} سنة` : 'غير محدد'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      تفاصيل الإهلاك
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">معدل الإهلاك:</span>
                      <span className="font-medium">
                        {vehicle.depreciation_rate ? `${vehicle.depreciation_rate}%` : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">القيمة المتبقية:</span>
                      <span className="font-medium">
                        {vehicle.residual_value ? `${vehicle.residual_value.toFixed(3)} د.ك` : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">إهلاك متراكم:</span>
                      <span className="font-medium text-orange-600">
                        {vehicle.accumulated_depreciation ? `${vehicle.accumulated_depreciation.toFixed(3)} د.ك` : '0.000 د.ك'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">القيمة الدفترية:</span>
                      <span className="font-semibold text-green-600">
                        {vehicle.book_value ? `${vehicle.book_value.toFixed(3)} د.ك` : 'غير محسوبة'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cost Summary */}
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    ملخص التكاليف الإجمالية
                  </CardTitle>
                  <CardDescription>تحديث تلقائي للتكاليف</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-orange-600">
                        {vehicle.total_maintenance_cost?.toFixed(3) || '0.000'}
                      </div>
                      <div className="text-sm text-muted-foreground">تكاليف الصيانة (د.ك)</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-purple-600">
                        {vehicle.total_insurance_cost?.toFixed(3) || '0.000'}
                      </div>
                      <div className="text-sm text-muted-foreground">تكاليف التأمين (د.ك)</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-blue-600">
                        {vehicle.registration_fees?.toFixed(3) || '0.000'}
                      </div>
                      <div className="text-sm text-muted-foreground">رسوم التسجيل (د.ك)</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-primary">
                        {vehicle.total_operating_cost?.toFixed(3) || '0.000'}
                      </div>
                      <div className="text-sm text-muted-foreground">إجمالي التكاليف (د.ك)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Insurance & Warranty */}
            <TabsContent value="insurance" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      معلومات التأمين
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">شركة التأمين:</span>
                      <span className="font-medium">{vehicle.insurance_provider || 'غير محدد'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">رقم البوليصة:</span>
                      <span className="font-medium">{vehicle.insurance_policy_number || 'غير محدد'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">قسط التأمين:</span>
                      <span className="font-semibold">
                        {vehicle.insurance_premium_amount ? `${vehicle.insurance_premium_amount.toFixed(3)} د.ك` : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تاريخ البداية:</span>
                      <span className="font-medium">
                        {vehicle.insurance_start_date ? new Date(vehicle.insurance_start_date).toLocaleDateString() : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تاريخ الانتهاء:</span>
                      <span className={`font-medium ${insuranceExpiringSoon ? 'text-yellow-600' : ''}`}>
                        {vehicle.insurance_end_date ? new Date(vehicle.insurance_end_date).toLocaleDateString() : 'غير محدد'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      التسجيل والترخيص
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">رسوم التسجيل:</span>
                      <span className="font-medium">
                        {vehicle.registration_fees ? `${vehicle.registration_fees.toFixed(3)} د.ك` : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تاريخ التسجيل:</span>
                      <span className="font-medium">
                        {vehicle.registration_date ? new Date(vehicle.registration_date).toLocaleDateString() : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">انتهاء التسجيل:</span>
                      <span className={`font-medium ${registrationExpiringSoon ? 'text-yellow-600' : ''}`}>
                        {vehicle.registration_expiry ? new Date(vehicle.registration_expiry).toLocaleDateString() : 'غير محدد'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Warranty Information */}
              {(vehicle.warranty_provider || vehicle.warranty_start_date || vehicle.warranty_end_date) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      معلومات الضمان
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">مقدم الضمان:</span>
                      <span className="font-medium">{vehicle.warranty_provider || 'غير محدد'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تاريخ البداية:</span>
                      <span className="font-medium">
                        {vehicle.warranty_start_date ? new Date(vehicle.warranty_start_date).toLocaleDateString() : 'غير محدد'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تاريخ الانتهاء:</span>
                      <span className="font-medium">
                        {vehicle.warranty_end_date ? new Date(vehicle.warranty_end_date).toLocaleDateString() : 'غير محدد'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Maintenance */}
            <TabsContent value="maintenance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    تاريخ الصيانة
                  </CardTitle>
                  <CardDescription>سجل أعمال الصيانة والخدمة</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground py-12">
                    <Wrench className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">سيتم عرض تاريخ الصيانة هنا</p>
                    <p className="text-sm mt-2">هذه الميزة قيد التطوير</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents */}
            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    وثائق المركبة
                  </CardTitle>
                  <CardDescription>الوثائق والملفات المرتبطة بالمركبة</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center text-muted-foreground py-12">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">سيتم عرض الوثائق هنا</p>
                    <p className="text-sm mt-2">هذه الميزة قيد التطوير</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <EnhancedVehicleForm 
        vehicle={vehicle}
        open={showEditForm}
        onOpenChange={setShowEditForm}
      />
    </>
  )
}