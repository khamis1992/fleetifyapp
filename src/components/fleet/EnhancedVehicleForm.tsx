import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CalendarIcon, DollarSign, Car, FileText, Shield, Wrench, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useAuth } from "@/contexts/AuthContext"
import { useCreateVehicle, useUpdateVehicle, useVehicleGroups, useVendors, Vehicle } from "@/hooks/useVehicles"
import { useCostCenters } from "@/hooks/useCostCenters"
import { Checkbox } from "@/components/ui/checkbox"

interface VehicleFormProps {
  vehicle?: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
}

const FUEL_TYPES = [
  { value: 'gasoline', label: 'بنزين', labelEn: 'Gasoline' },
  { value: 'diesel', label: 'ديزل', labelEn: 'Diesel' },
  { value: 'hybrid', label: 'هجين', labelEn: 'Hybrid' },
  { value: 'electric', label: 'كهربائي', labelEn: 'Electric' },
  { value: 'lpg', label: 'غاز', labelEn: 'LPG' }
]

const TRANSMISSION_TYPES = [
  { value: 'manual', label: 'يدوي', labelEn: 'Manual' },
  { value: 'automatic', label: 'أوتوماتيك', labelEn: 'Automatic' },
  { value: 'cvt', label: 'CVT', labelEn: 'CVT' }
]

const SAFETY_FEATURES = [
  { value: 'abs', label: 'نظام منع انغلاق المكابح (ABS)' },
  { value: 'airbags', label: 'وسائد هوائية' },
  { value: 'esp', label: 'نظام التحكم الإلكتروني (ESP)' },
  { value: 'cruise_control', label: 'نظام تثبيت السرعة' },
  { value: 'parking_sensors', label: 'مساعد إيقاف السيارة' },
  { value: 'backup_camera', label: 'كاميرا خلفية' },
  { value: 'blind_spot', label: 'مراقب النقطة العمياء' }
]

const ADDITIONAL_FEATURES = [
  { value: 'gps', label: 'نظام الملاحة GPS' },
  { value: 'bluetooth', label: 'بلوتوث' },
  { value: 'ac', label: 'تكييف هواء' },
  { value: 'leather_seats', label: 'مقاعد جلدية' },
  { value: 'sunroof', label: 'فتحة سقف' },
  { value: 'heated_seats', label: 'مقاعد مدفئة' },
  { value: 'keyless_entry', label: 'دخول بدون مفتاح' }
]

export function EnhancedVehicleForm({ vehicle, open, onOpenChange }: VehicleFormProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedSafetyFeatures, setSelectedSafetyFeatures] = useState<string[]>([])
  const [selectedAdditionalFeatures, setSelectedAdditionalFeatures] = useState<string[]>([])

  const createVehicleMutation = useCreateVehicle()
  const updateVehicleMutation = useUpdateVehicle()
  const { data: vehicleGroups } = useVehicleGroups()
  const { data: vendors } = useVendors()
  const { data: costCenters } = useCostCenters()

  const form = useForm({
    defaultValues: {
      // Basic Information
      plate_number: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      color: '',
      vin: '',
      status: 'available',
      vehicle_group_id: '',
      
      // Technical Specifications
      fuel_type: 'gasoline',
      fuel_capacity: '',
      engine_size: '',
      transmission_type: 'automatic',
      seating_capacity: '',
      cargo_capacity: '',
      vehicle_weight: '',
      
      // Financial Information
      purchase_cost: '',
      purchase_date: '',
      purchase_invoice_number: '',
      vendor_id: '',
      depreciation_rate: '20',
      useful_life_years: '5',
      residual_value: '',
      cost_center_id: '',
      
      // Insurance Details
      insurance_provider: '',
      insurance_policy_number: '',
      insurance_premium_amount: '',
      insurance_start_date: '',
      insurance_end_date: '',
      
      // Registration & Legal
      registration_fees: '',
      registration_date: '',
      registration_expiry: '',
      
      // Warranty Information
      warranty_provider: '',
      warranty_start_date: '',
      warranty_end_date: '',
      
      // Additional Information
      location: '',
      notes: '',
      odometer_reading: ''
    }
  })

  // Reset form when vehicle data changes
  useEffect(() => {
    if (vehicle) {
      // Populate form with existing vehicle data
      form.reset({
        plate_number: vehicle.plate_number || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year || new Date().getFullYear(),
        color: vehicle.color || '',
        vin: vehicle.vin || '',
        status: vehicle.status || 'available',
        vehicle_group_id: vehicle.vehicle_group_id || '',
        
        fuel_type: vehicle.fuel_type || 'gasoline',
        fuel_capacity: vehicle.fuel_capacity?.toString() || '',
        engine_size: vehicle.engine_size || '',
        transmission_type: vehicle.transmission_type || 'automatic',
        seating_capacity: vehicle.seating_capacity?.toString() || '',
        cargo_capacity: vehicle.cargo_capacity?.toString() || '',
        vehicle_weight: vehicle.vehicle_weight?.toString() || '',
        
        purchase_cost: vehicle.purchase_cost?.toString() || '',
        purchase_date: vehicle.purchase_date || '',
        purchase_invoice_number: vehicle.purchase_invoice_number || '',
        vendor_id: vehicle.vendor_id || '',
        depreciation_rate: vehicle.depreciation_rate?.toString() || '20',
        useful_life_years: vehicle.useful_life_years?.toString() || '5',
        residual_value: vehicle.residual_value?.toString() || '',
        cost_center_id: vehicle.cost_center_id || '',
        
        insurance_provider: vehicle.insurance_provider || '',
        insurance_policy_number: vehicle.insurance_policy_number || '',
        insurance_premium_amount: vehicle.insurance_premium_amount?.toString() || '',
        insurance_start_date: vehicle.insurance_start_date || '',
        insurance_end_date: vehicle.insurance_end_date || '',
        
        registration_fees: vehicle.registration_fees?.toString() || '',
        registration_date: vehicle.registration_date || '',
        registration_expiry: vehicle.registration_expiry || '',
        
        warranty_provider: vehicle.warranty_provider || '',
        warranty_start_date: vehicle.warranty_start_date || '',
        warranty_end_date: vehicle.warranty_end_date || '',
        
        location: vehicle.location || '',
        notes: vehicle.notes || '',
        odometer_reading: vehicle.odometer_reading?.toString() || ''
      })
      
      setSelectedSafetyFeatures(vehicle.safety_features || [])
      setSelectedAdditionalFeatures(vehicle.additional_features || [])
    } else {
      // Reset form for new vehicle
      form.reset()
      setSelectedSafetyFeatures([])
      setSelectedAdditionalFeatures([])
    }
  }, [vehicle, form])

  const onSubmit = async (data: any) => {
    console.log("🚗 [EnhancedVehicleForm] Form submission started")
    console.log("📋 [EnhancedVehicleForm] Form data:", data)
    
    setIsSubmitting(true)

    try {
      // Validation
      const errors: string[] = []
      
      if (!data.plate_number?.trim()) {
        errors.push('رقم اللوحة مطلوب')
      }
      
      if (!data.make?.trim()) {
        errors.push('الشركة المصنعة مطلوبة')
      }
      
      if (!data.model?.trim()) {
        errors.push('الطراز مطلوب')
      }
      
      if (!data.year || data.year < 1900 || data.year > new Date().getFullYear() + 2) {
        errors.push('سنة الصنع غير صحيحة')
      }

      if (errors.length > 0) {
        toast({
          title: "خطأ في البيانات",
          description: errors.join('\n'),
          variant: "destructive",
        })
        return
      }

      // Prepare vehicle data with proper type conversions
      const vehicleData = {
        company_id: user?.profile?.company_id || user?.company?.id,
        plate_number: data.plate_number.trim(),
        make: data.make.trim(),
        model: data.model.trim(),
        year: parseInt(data.year),
        color: data.color?.trim() || null,
        vin: data.vin?.trim() || null,
        status: data.status,
        vehicle_group_id: data.vehicle_group_id || null,
        
        // Technical specifications
        fuel_type: data.fuel_type,
        fuel_capacity: data.fuel_capacity ? parseFloat(data.fuel_capacity) : null,
        engine_size: data.engine_size?.trim() || null,
        transmission_type: data.transmission_type,
        seating_capacity: data.seating_capacity ? parseInt(data.seating_capacity) : null,
        cargo_capacity: data.cargo_capacity ? parseFloat(data.cargo_capacity) : null,
        vehicle_weight: data.vehicle_weight ? parseFloat(data.vehicle_weight) : null,
        safety_features: selectedSafetyFeatures,
        additional_features: selectedAdditionalFeatures,
        
        // Financial information
        purchase_cost: data.purchase_cost ? parseFloat(data.purchase_cost) : null,
        purchase_date: data.purchase_date || null,
        purchase_invoice_number: data.purchase_invoice_number?.trim() || null,
        vendor_id: data.vendor_id || null,
        depreciation_rate: data.depreciation_rate ? parseFloat(data.depreciation_rate) : 20,
        useful_life_years: data.useful_life_years ? parseInt(data.useful_life_years) : 5,
        residual_value: data.residual_value ? parseFloat(data.residual_value) : null,
        cost_center_id: data.cost_center_id || null,
        
        // Insurance
        insurance_provider: data.insurance_provider?.trim() || null,
        insurance_policy_number: data.insurance_policy_number?.trim() || null,
        insurance_premium_amount: data.insurance_premium_amount ? parseFloat(data.insurance_premium_amount) : null,
        insurance_start_date: data.insurance_start_date || null,
        insurance_end_date: data.insurance_end_date || null,
        
        // Registration
        registration_fees: data.registration_fees ? parseFloat(data.registration_fees) : null,
        registration_date: data.registration_date || null,
        registration_expiry: data.registration_expiry || null,
        
        // Warranty
        warranty_provider: data.warranty_provider?.trim() || null,
        warranty_start_date: data.warranty_start_date || null,
        warranty_end_date: data.warranty_end_date || null,
        
        // Additional
        location: data.location?.trim() || null,
        notes: data.notes?.trim() || null,
        odometer_reading: data.odometer_reading ? parseInt(data.odometer_reading) : null,
        
        is_active: true
      }

      console.log("🔄 [EnhancedVehicleForm] Prepared vehicle data:", vehicleData)

      if (vehicle) {
        // Update existing vehicle
        await updateVehicleMutation.mutateAsync({ 
          id: vehicle.id, 
          ...vehicleData 
        })
        toast({
          title: "نجح",
          description: "تم تحديث المركبة بنجاح",
        })
      } else {
        // Create new vehicle
        await createVehicleMutation.mutateAsync(vehicleData)
        toast({
          title: "نجح",
          description: "تم إنشاء المركبة بنجاح وربطها بالنظام المالي",
        })
      }

      console.log("✅ [EnhancedVehicleForm] Operation completed successfully")
      onOpenChange(false)
      
      // Reset form for next use
      if (!vehicle) {
        form.reset()
        setSelectedSafetyFeatures([])
        setSelectedAdditionalFeatures([])
      }

    } catch (error) {
      console.error("❌ [EnhancedVehicleForm] Error in form submission:", error)
      
      let errorMessage = "حدث خطأ غير متوقع"
      
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSafetyFeatureChange = (feature: string, checked: boolean) => {
    if (checked) {
      setSelectedSafetyFeatures(prev => [...prev, feature])
    } else {
      setSelectedSafetyFeatures(prev => prev.filter(f => f !== feature))
    }
  }

  const handleAdditionalFeatureChange = (feature: string, checked: boolean) => {
    if (checked) {
      setSelectedAdditionalFeatures(prev => [...prev, feature])
    } else {
      setSelectedAdditionalFeatures(prev => prev.filter(f => f !== feature))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Car className="h-5 w-5" />
            {vehicle ? 'تعديل المركبة' : 'إضافة مركبة جديدة'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">المعلومات الأساسية</TabsTrigger>
              <TabsTrigger value="technical">المواصفات التقنية</TabsTrigger>
              <TabsTrigger value="financial">المعلومات المالية</TabsTrigger>
              <TabsTrigger value="insurance">التأمين والضمان</TabsTrigger>
              <TabsTrigger value="additional">معلومات إضافية</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    المعلومات الأساسية
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="plate_number">رقم اللوحة *</Label>
                    <Input
                      id="plate_number"
                      {...form.register('plate_number')}
                      placeholder="ABC-1234"
                      dir="ltr"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_group_id">مجموعة المركبة</Label>
                    <Select
                      value={form.watch('vehicle_group_id')}
                      onValueChange={(value) => form.setValue('vehicle_group_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر مجموعة المركبة" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleGroups?.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: group.group_color }}
                              />
                              {group.group_name_ar || group.group_name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="make">الشركة المصنعة *</Label>
                    <Input
                      id="make"
                      {...form.register('make')}
                      placeholder="تويوتا، نيسان، هوندا..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">الطراز *</Label>
                    <Input
                      id="model"
                      {...form.register('model')}
                      placeholder="كامري، التيما، أكورد..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">سنة الصنع *</Label>
                    <Input
                      id="year"
                      type="number"
                      {...form.register('year')}
                      min="1900"
                      max={new Date().getFullYear() + 2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">اللون</Label>
                    <Input
                      id="color"
                      {...form.register('color')}
                      placeholder="أبيض، أسود، فضي..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vin">رقم الهيكل (VIN)</Label>
                    <Input
                      id="vin"
                      {...form.register('vin')}
                      placeholder="17 رقم/حرف"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">الحالة</Label>
                    <Select
                      value={form.watch('status')}
                      onValueChange={(value) => form.setValue('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">متاحة</SelectItem>
                        <SelectItem value="rented">مؤجرة</SelectItem>
                        <SelectItem value="maintenance">قيد الصيانة</SelectItem>
                        <SelectItem value="out_of_service">خارج الخدمة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Technical Specifications Tab */}
            <TabsContent value="technical" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    المواصفات التقنية
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fuel_type">نوع الوقود</Label>
                    <Select
                      value={form.watch('fuel_type')}
                      onValueChange={(value) => form.setValue('fuel_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FUEL_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fuel_capacity">سعة خزان الوقود (لتر)</Label>
                    <Input
                      id="fuel_capacity"
                      type="number"
                      step="0.1"
                      {...form.register('fuel_capacity')}
                      placeholder="60"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="engine_size">حجم المحرك</Label>
                    <Input
                      id="engine_size"
                      {...form.register('engine_size')}
                      placeholder="2.0L، 1.6L..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transmission_type">نوع الناقل</Label>
                    <Select
                      value={form.watch('transmission_type')}
                      onValueChange={(value) => form.setValue('transmission_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSMISSION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seating_capacity">عدد المقاعد</Label>
                    <Input
                      id="seating_capacity"
                      type="number"
                      {...form.register('seating_capacity')}
                      placeholder="5"
                      min="1"
                      max="50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cargo_capacity">سعة الحمولة (كغ)</Label>
                    <Input
                      id="cargo_capacity"
                      type="number"
                      step="0.1"
                      {...form.register('cargo_capacity')}
                      placeholder="500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle_weight">وزن المركبة (كغ)</Label>
                    <Input
                      id="vehicle_weight"
                      type="number"
                      step="0.1"
                      {...form.register('vehicle_weight')}
                      placeholder="1500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="odometer_reading">قراءة العداد (كم)</Label>
                    <Input
                      id="odometer_reading"
                      type="number"
                      {...form.register('odometer_reading')}
                      placeholder="50000"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Safety Features */}
              <Card>
                <CardHeader>
                  <CardTitle>ميزات الأمان</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {SAFETY_FEATURES.map((feature) => (
                      <div key={feature.value} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id={`safety-${feature.value}`}
                          checked={selectedSafetyFeatures.includes(feature.value)}
                          onCheckedChange={(checked) => 
                            handleSafetyFeatureChange(feature.value, checked as boolean)
                          }
                        />
                        <Label htmlFor={`safety-${feature.value}`} className="text-sm">
                          {feature.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Additional Features */}
              <Card>
                <CardHeader>
                  <CardTitle>ميزات إضافية</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {ADDITIONAL_FEATURES.map((feature) => (
                      <div key={feature.value} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id={`additional-${feature.value}`}
                          checked={selectedAdditionalFeatures.includes(feature.value)}
                          onCheckedChange={(checked) => 
                            handleAdditionalFeatureChange(feature.value, checked as boolean)
                          }
                        />
                        <Label htmlFor={`additional-${feature.value}`} className="text-sm">
                          {feature.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Financial Information Tab */}
            <TabsContent value="financial" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    معلومات الشراء والتكلفة
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="purchase_cost">تكلفة الشراء (د.ك)</Label>
                    <Input
                      id="purchase_cost"
                      type="number"
                      step="0.001"
                      {...form.register('purchase_cost')}
                      placeholder="15000.000"
                    />
                    <p className="text-xs text-muted-foreground">
                      سيتم إنشاء قيد مالي تلقائياً عند الحفظ
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purchase_date">تاريخ الشراء</Label>
                    <Input
                      id="purchase_date"
                      type="date"
                      {...form.register('purchase_date')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purchase_invoice_number">رقم فاتورة الشراء</Label>
                    <Input
                      id="purchase_invoice_number"
                      {...form.register('purchase_invoice_number')}
                      placeholder="INV-2024-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vendor_id">المورد</Label>
                    <Select
                      value={form.watch('vendor_id')}
                      onValueChange={(value) => form.setValue('vendor_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المورد" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors?.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.vendor_name_ar || vendor.vendor_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cost_center_id">مركز التكلفة</Label>
                    <Select
                      value={form.watch('cost_center_id')}
                      onValueChange={(value) => form.setValue('cost_center_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر مركز التكلفة" />
                      </SelectTrigger>
                      <SelectContent>
                        {costCenters?.map((center) => (
                          <SelectItem key={center.id} value={center.id}>
                            {center.center_name_ar || center.center_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>معلومات الإهلاك</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="depreciation_rate">معدل الإهلاك السنوي (%)</Label>
                    <Input
                      id="depreciation_rate"
                      type="number"
                      step="0.1"
                      {...form.register('depreciation_rate')}
                      placeholder="20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="useful_life_years">العمر الإنتاجي (سنة)</Label>
                    <Input
                      id="useful_life_years"
                      type="number"
                      {...form.register('useful_life_years')}
                      placeholder="5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="residual_value">القيمة المتبقية (د.ك)</Label>
                    <Input
                      id="residual_value"
                      type="number"
                      step="0.001"
                      {...form.register('residual_value')}
                      placeholder="3000.000"
                    />
                  </div>
                </CardContent>
              </Card>

              {vehicle && (
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      ملخص التكاليف المحدث تلقائياً
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>إجمالي تكاليف الصيانة</Label>
                      <div className="text-lg font-semibold text-orange-600">
                        {vehicle.total_maintenance_cost?.toFixed(3) || '0.000'} د.ك
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>إجمالي تكاليف التأمين</Label>
                      <div className="text-lg font-semibold text-blue-600">
                        {vehicle.total_insurance_cost?.toFixed(3) || '0.000'} د.ك
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>إجمالي التكاليف التشغيلية</Label>
                      <div className="text-lg font-semibold text-primary">
                        {vehicle.total_operating_cost?.toFixed(3) || '0.000'} د.ك
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Insurance & Warranty Tab */}
            <TabsContent value="insurance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    معلومات التأمين
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="insurance_provider">شركة التأمين</Label>
                    <Input
                      id="insurance_provider"
                      {...form.register('insurance_provider')}
                      placeholder="الأهلي تكافل، ورقة..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="insurance_policy_number">رقم البوليصة</Label>
                    <Input
                      id="insurance_policy_number"
                      {...form.register('insurance_policy_number')}
                      placeholder="POL-2024-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="insurance_premium_amount">قسط التأمين السنوي (د.ك)</Label>
                    <Input
                      id="insurance_premium_amount"
                      type="number"
                      step="0.001"
                      {...form.register('insurance_premium_amount')}
                      placeholder="500.000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="insurance_start_date">تاريخ بداية التأمين</Label>
                    <Input
                      id="insurance_start_date"
                      type="date"
                      {...form.register('insurance_start_date')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="insurance_end_date">تاريخ انتهاء التأمين</Label>
                    <Input
                      id="insurance_end_date"
                      type="date"
                      {...form.register('insurance_end_date')}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>التسجيل والترخيص</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="registration_fees">رسوم التسجيل (د.ك)</Label>
                    <Input
                      id="registration_fees"
                      type="number"
                      step="0.001"
                      {...form.register('registration_fees')}
                      placeholder="50.000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registration_date">تاريخ التسجيل</Label>
                    <Input
                      id="registration_date"
                      type="date"
                      {...form.register('registration_date')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registration_expiry">تاريخ انتهاء التسجيل</Label>
                    <Input
                      id="registration_expiry"
                      type="date"
                      {...form.register('registration_expiry')}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>معلومات الضمان</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="warranty_provider">مقدم الضمان</Label>
                    <Input
                      id="warranty_provider"
                      {...form.register('warranty_provider')}
                      placeholder="الشركة المصنعة، الوكيل..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warranty_start_date">تاريخ بداية الضمان</Label>
                    <Input
                      id="warranty_start_date"
                      type="date"
                      {...form.register('warranty_start_date')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warranty_end_date">تاريخ انتهاء الضمان</Label>
                    <Input
                      id="warranty_end_date"
                      type="date"
                      {...form.register('warranty_end_date')}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Additional Information Tab */}
            <TabsContent value="additional" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    معلومات إضافية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">الموقع الحالي</Label>
                    <Input
                      id="location"
                      {...form.register('location')}
                      placeholder="المكتب الرئيسي، المستودع، الورشة..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">ملاحظات</Label>
                    <Textarea
                      id="notes"
                      {...form.register('notes')}
                      placeholder="أي ملاحظات إضافية حول المركبة..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Features Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>ملخص الميزات المختارة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedSafetyFeatures.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">ميزات الأمان:</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedSafetyFeatures.map((feature) => {
                          const featureData = SAFETY_FEATURES.find(f => f.value === feature)
                          return (
                            <Badge key={feature} variant="secondary">
                              {featureData?.label}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {selectedAdditionalFeatures.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">ميزات إضافية:</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedAdditionalFeatures.map((feature) => {
                          const featureData = ADDITIONAL_FEATURES.find(f => f.value === feature)
                          return (
                            <Badge key={feature} variant="outline">
                              {featureData?.label}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {selectedSafetyFeatures.length === 0 && selectedAdditionalFeatures.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      لم يتم اختيار أي ميزات إضافية بعد
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
              {vehicle ? 'تحديث المركبة' : 'إضافة المركبة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}