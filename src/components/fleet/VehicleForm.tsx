import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/NumberInput"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Vehicle, useCreateVehicle, useUpdateVehicle } from "@/hooks/useVehicles"
import { useEntryAllowedAccounts } from "@/hooks/useEntryAllowedAccounts"
import { useCostCenters } from "@/hooks/useCostCenters"
import { AccountLevelBadge } from "@/components/finance/AccountLevelBadge"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { useFixedAssetByCode } from "@/hooks/useFixedAssetByCode"

interface VehicleFormProps {
  vehicle?: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VehicleForm({ vehicle, open, onOpenChange }: VehicleFormProps) {
  const { user } = useAuth()
  const { data: entryAllowedAccounts, isLoading: accountsLoading } = useEntryAllowedAccounts()
  const { data: costCenters, isLoading: costCentersLoading } = useCostCenters()
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [assetCodeInput, setAssetCodeInput] = useState("")
  
  // Log when component receives props
  useEffect(() => {
    console.log('🔧 [VehicleForm] Props changed:', { open, vehicle: vehicle ? { id: vehicle.id, plate_number: vehicle.plate_number } : null });
  }, [open, vehicle]);
  
  // Fixed asset lookup
  const { data: fixedAsset, isLoading: assetLoading, error: assetError } = useFixedAssetByCode(assetCodeInput)
  
  // Form submission state
  // Removed backup state as it was causing value handling issues
  
  const form = useForm({
    defaultValues: {
      // Basic Information
      plate_number: "",
      make: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      vin: "",
      
      // Technical Information
      engine_number: "",
      fuel_capacity: "",
      transmission_type: "automatic",
      drive_type: "front_wheel",
      vehicle_category: "sedan",
      fuel_type: "gasoline",
      seating_capacity: 5,
      vehicle_condition: "excellent",
      
      // Registration & Documentation
      registration_date: "",
      registration_expiry: "",
      next_service_due: "",
      warranty_start_date: "",
      warranty_end_date: "",
      
      // Location & Tracking
      current_location: "",
      gps_tracking_device: "",
      
      // Ownership Information
      ownership_status: "owned",
      lease_start_date: "",
      lease_end_date: "",
      monthly_lease_amount: "",
      lease_company: "",
      
      // Financial Information
      purchase_date: "",
      purchase_cost: "",
      useful_life_years: 10,
      residual_value: "",
      depreciation_method: "straight_line",
      
      // Operational Information
      current_mileage: "",
      daily_rate: "",
      weekly_rate: "",
      monthly_rate: "",
      deposit_amount: "",
      minimum_rental_price: "",
      minimum_daily_rate: "",
      minimum_weekly_rate: "",
      minimum_monthly_rate: "",
      enforce_minimum_price: false,
      status: "available",
      
      // Enhanced Fields
      purchase_source: "",
      asset_code: "",
      fixed_asset_id: "",
      asset_classification: "vehicle",
      financing_type: "cash",
      loan_amount: "",
      monthly_payment: "",
      warranty_expiry: "",
      service_interval_km: 10000,
      last_service_date: "",
      fuel_card_number: "",
      gps_device_id: "",
      
      // Additional Information
      notes: "",
      cost_center_id: "",
    }
  })

  useEffect(() => {
    if (vehicle) {
      form.reset({
        plate_number: vehicle.plate_number,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color || "",
        vin: vehicle.vin || "",
        engine_number: vehicle.engine_number || "",
        fuel_capacity: vehicle.fuel_capacity?.toString() || "",
        transmission_type: vehicle.transmission_type || "automatic",
        drive_type: vehicle.drive_type || "front_wheel",
        vehicle_category: vehicle.vehicle_category || "sedan",
        fuel_type: vehicle.fuel_type || "gasoline",
        seating_capacity: vehicle.seating_capacity || 5,
        vehicle_condition: vehicle.vehicle_condition || "excellent",
        registration_date: vehicle.registration_date || "",
        registration_expiry: vehicle.registration_expiry || "",
        next_service_due: vehicle.next_service_due || "",
        warranty_start_date: vehicle.warranty_start_date || "",
        warranty_end_date: vehicle.warranty_end_date || "",
        current_location: vehicle.current_location || "",
        gps_tracking_device: vehicle.gps_tracking_device || "",
        ownership_status: vehicle.ownership_status || "owned",
        lease_start_date: vehicle.lease_start_date || "",
        lease_end_date: vehicle.lease_end_date || "",
        monthly_lease_amount: vehicle.monthly_lease_amount?.toString() || "",
        lease_company: vehicle.lease_company || "",
        purchase_date: vehicle.purchase_date || "",
        purchase_cost: vehicle.purchase_cost?.toString() || "",
        useful_life_years: vehicle.useful_life_years || 10,
        residual_value: vehicle.residual_value?.toString() || "",
        depreciation_method: vehicle.depreciation_method || "straight_line",
        current_mileage: vehicle.current_mileage?.toString() || "",
        daily_rate: vehicle.daily_rate?.toString() || "",
        weekly_rate: vehicle.weekly_rate?.toString() || "",
        monthly_rate: vehicle.monthly_rate?.toString() || "",
        deposit_amount: vehicle.deposit_amount?.toString() || "",
        minimum_rental_price: vehicle.minimum_rental_price?.toString() || "",
        minimum_daily_rate: vehicle.minimum_daily_rate?.toString() || "",
        minimum_weekly_rate: vehicle.minimum_weekly_rate?.toString() || "",
        minimum_monthly_rate: vehicle.minimum_monthly_rate?.toString() || "",
        enforce_minimum_price: vehicle.enforce_minimum_price || false,
        status: vehicle.status || "available",
        notes: vehicle.notes || "",
        cost_center_id: vehicle.cost_center_id || "",
        fixed_asset_id: vehicle.fixed_asset_id || "",
      })
    }
  }, [vehicle, form])

  // Reset form when dialog closes and reopens for new vehicle
  useEffect(() => {
    if (open && !vehicle) {
      // Only reset if the form has been used before (has dirty fields)
      const formValues = form.getValues()
      const hasBeenUsed = Object.values(formValues).some(value => 
        value !== "" && value !== null && value !== undefined && 
        value !== new Date().getFullYear() && value !== 5 && value !== 10
      )
      if (hasBeenUsed) {
        form.reset()
        setAssetCodeInput("")
      }
    }
  }, [open, vehicle, form])

  // Auto-fill vehicle data when fixed asset is found
  useEffect(() => {
    if (fixedAsset && fixedAsset.category === 'vehicles') {
      // Auto-fill form with asset data
      form.setValue('make', fixedAsset.asset_name || form.getValues('make'))
      if (fixedAsset.purchase_date) {
        form.setValue('purchase_date', fixedAsset.purchase_date)
      }
      if (fixedAsset.purchase_cost) {
        form.setValue('purchase_cost', fixedAsset.purchase_cost.toString())
      }
      if (fixedAsset.salvage_value) {
        form.setValue('residual_value', fixedAsset.salvage_value.toString())
      }
      if (fixedAsset.useful_life_years) {
        form.setValue('useful_life_years', fixedAsset.useful_life_years)
      }
      if (fixedAsset.depreciation_method) {
        form.setValue('depreciation_method', fixedAsset.depreciation_method)
      }
      if (fixedAsset.location) {
        form.setValue('current_location', fixedAsset.location)
      }
      form.setValue('asset_code', fixedAsset.asset_code)
      form.setValue('fixed_asset_id', fixedAsset.id)
      
      toast({
        title: "تم العثور على الأصل",
        description: `تم ربط المركبة بالأصل الثابت: ${fixedAsset.asset_name}`,
      })
    } else if (fixedAsset && fixedAsset.category !== 'vehicles') {
      toast({
        title: "خطأ في نوع الأصل",
        description: "هذا الأصل ليس من فئة المركبات",
        variant: "destructive",
      })
      setAssetCodeInput("")
    } else if (assetCodeInput && assetError) {
      toast({
        title: "لم يتم العثور على الأصل",
        description: "رقم الأصل غير موجود أو غير نشط",
        variant: "destructive",
      })
    }
  }, [fixedAsset, assetError, form, toast, assetCodeInput])

  // Handle asset code input change
  const handleAssetCodeChange = (value: string) => {
    setAssetCodeInput(value.trim())
    if (!value.trim()) {
      // Clear asset-related fields when asset code is cleared
      form.setValue('fixed_asset_id', '')
      form.setValue('asset_code', '')
    }
  }

  // Fill dummy data function
  const fillDummyData = () => {
    const currentYear = new Date().getFullYear()
    const randomId = Math.floor(Math.random() * 1000)
    
    const dummyData = {
      // Basic Information
      plate_number: `أ ب ج ${1000 + randomId}`,
      make: "تويوتا",
      model: "كامري",
      year: currentYear - Math.floor(Math.random() * 5), // Random year within last 5 years
      color: "أبيض",
      vin: `JH4DB1540NS${String(randomId).padStart(6, '0')}`,
      
      // Technical Information
      engine_number: `ENG${String(randomId).padStart(8, '0')}`,
      fuel_capacity: "65",
      transmission_type: "automatic",
      drive_type: "front_wheel",
      vehicle_category: "sedan",
      fuel_type: "gasoline",
      seating_capacity: 5,
      vehicle_condition: "excellent",
      
      // Registration & Documentation
      registration_date: "2023-01-15",
      registration_expiry: "2025-01-15",
      next_service_due: "2024-12-31",
      warranty_start_date: "2023-01-15",
      warranty_end_date: "2026-01-15",
      
      // Location & Tracking
      current_location: "الرياض - مكتب الشركة الرئيسي",
      gps_tracking_device: `GPS${String(randomId).padStart(6, '0')}`,
      
      // Ownership Information
      ownership_status: "owned",
      lease_start_date: "",
      lease_end_date: "",
      monthly_lease_amount: "",
      lease_company: "",
      
      // Financial Information
      purchase_date: "2023-01-15",
      purchase_cost: "85000",
      useful_life_years: 10,
      residual_value: "25000",
      depreciation_method: "straight_line",
      
      // Operational Information
      current_mileage: String(10000 + randomId * 10),
      daily_rate: "150",
      weekly_rate: "900",
      monthly_rate: "3000",
      deposit_amount: "2000",
      minimum_rental_price: "120",
      enforce_minimum_price: true,
      status: "available",
      
      // Enhanced Fields
      purchase_source: "معرض السيارات الرئيسي",
      asset_code: `VEH-${String(randomId).padStart(4, '0')}`,
      asset_classification: "vehicle",
      financing_type: "cash",
      loan_amount: "",
      monthly_payment: "",
      warranty_expiry: "2026-01-15",
      service_interval_km: 10000,
      last_service_date: "2024-06-15",
      fuel_card_number: `FC${String(randomId).padStart(8, '0')}`,
      gps_device_id: `GPS${String(randomId).padStart(6, '0')}`,
      
      // Additional Information
      notes: "مركبة جديدة في حالة ممتازة، تم شراؤها من معرض معتمد مع ضمان شامل.",
      cost_center_id: "",
      fixed_asset_id: "",
    }
    
    // Fill form with dummy data
    Object.entries(dummyData).forEach(([key, value]) => {
      form.setValue(key as any, value)
    })
    
    // Show success message
    toast({
      title: "تم تعبئة البيانات",
      description: "تم ملء النموذج ببيانات تجريبية. يمكنك تعديلها حسب الحاجة.",
    })
  }

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    console.log("🚀 [VEHICLE_FORM] Starting form submission");
    console.log("📋 [VEHICLE_FORM] Form data received:", data);
    console.log("🔄 [VEHICLE_FORM] Form values from react-hook-form:", form.getValues());
    
    try {
      // Use form data directly - no backup logic needed
      const finalData = {
        ...data,
        // Ensure model and color have proper string values
        model: data.model || "",
        color: data.color || ""
      };
      
      console.log("🔧 [VEHICLE_FORM] Final data prepared:", finalData);
      
      // Validate required fields
      if (!finalData.plate_number || !finalData.plate_number.trim()) {
        throw new Error("رقم اللوحة مطلوب");
      }
      
      if (!finalData.make || !finalData.make.trim()) {
        throw new Error("الشركة المصنعة مطلوبة");
      }
      
      if (!finalData.model || !finalData.model.trim()) {
        throw new Error("الطراز مطلوب");
      }
      
      if (!finalData.year || isNaN(parseInt(finalData.year))) {
        throw new Error("السنة مطلوبة ويجب أن تكون رقماً صحيحاً");
      }
      
      // Check if user has valid company_id
      const companyId = user?.profile?.company_id || user?.company?.id;
      console.log("🏢 [VEHICLE_FORM] Company ID:", companyId);
      console.log("🧑 [VEHICLE_FORM] User data:", { 
        userId: user?.id, 
        profileCompanyId: user?.profile?.company_id,
        companyId: user?.company?.id,
        roles: user?.roles 
      });
      
      if (!companyId) {
        console.error("❌ [VEHICLE_FORM] No company ID found for user");
        throw new Error("لا يمكن إنشاء المركبة. معرف الشركة غير موجود.");
      }

      // Check if user has permission to create vehicles
      if (!user) {
        console.error("❌ [VEHICLE_FORM] No user found");
        throw new Error("يجب تسجيل الدخول لإنشاء مركبة.");
      }

      // Show progress feedback
      toast({
        title: "جاري المعالجة",
        description: vehicle ? "جاري تحديث المركبة..." : "جاري إنشاء المركبة الجديدة...",
      })

      // Prepare vehicle data with proper type conversions and defaults
      const vehicleData = {
        // Required fields
        plate_number: finalData.plate_number.trim(),
        make: finalData.make.trim(),
        model: finalData.model.trim(),
        year: parseInt(finalData.year),
        company_id: companyId,
        is_active: true,
        status: finalData.status || "available",
        
        // Optional fields with defaults
        color: finalData.color?.trim() || null,
        vin: finalData.vin?.trim() || null,
        engine_number: finalData.engine_number?.trim() || null,
        transmission_type: finalData.transmission_type || "automatic",
        body_type: finalData.body_type?.trim() || null,
        fuel_type: finalData.fuel_type || "gasoline",
        seating_capacity: finalData.seating_capacity ? parseInt(finalData.seating_capacity) : 5,
        
        // Date fields
        purchase_date: finalData.purchase_date || null,
        
        // Numeric fields (nullable)
        purchase_cost: finalData.purchase_cost ? parseFloat(finalData.purchase_cost) : null,
        useful_life_years: finalData.useful_life_years ? parseInt(finalData.useful_life_years) : 10,
        residual_value: finalData.residual_value ? parseFloat(finalData.residual_value) : null,
        current_mileage: finalData.current_mileage ? parseFloat(finalData.current_mileage) : null,
        daily_rate: finalData.daily_rate ? parseFloat(finalData.daily_rate) : null,
        weekly_rate: finalData.weekly_rate ? parseFloat(finalData.weekly_rate) : null,
        monthly_rate: finalData.monthly_rate ? parseFloat(finalData.monthly_rate) : null,
        deposit_amount: finalData.deposit_amount ? parseFloat(finalData.deposit_amount) : null,
        minimum_rental_price: finalData.minimum_rental_price ? parseFloat(finalData.minimum_rental_price) : null,
        enforce_minimum_price: finalData.enforce_minimum_price || false,
        
        // Additional fields
        notes: finalData.notes?.trim() || null,
        cost_center_id: finalData.cost_center_id || null,
        depreciation_method: finalData.depreciation_method || "straight_line",
        salvage_value: finalData.salvage_value ? parseFloat(finalData.salvage_value) : null,
        fixed_asset_id: finalData.fixed_asset_id || null,
      }

      console.log("📤 [VEHICLE_FORM] Prepared vehicle data:", vehicleData);

      // Validate numeric ranges
      if (vehicleData.year < 1990 || vehicleData.year > new Date().getFullYear() + 1) {
        throw new Error("السنة يجب أن تكون بين 1990 و " + (new Date().getFullYear() + 1));
      }
      
      if (vehicleData.seating_capacity < 1 || vehicleData.seating_capacity > 50) {
        throw new Error("عدد المقاعد يجب أن يكون بين 1 و 50");
      }

      let result;
      if (vehicle && vehicle.id) {
        console.log("✏️ [VEHICLE_FORM] Updating existing vehicle:", vehicle.id);
        result = await updateVehicle.mutateAsync({ id: vehicle.id, ...vehicleData })
      } else {
        console.log("➕ [VEHICLE_FORM] Creating new vehicle");
        result = await createVehicle.mutateAsync(vehicleData)
      }
      
      console.log("✅ [VEHICLE_FORM] Vehicle operation completed successfully. Result:", result);
      
      // Wait a moment before closing to ensure data is saved
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reset form and close dialog
      form.reset()
      setAssetCodeInput("")
      onOpenChange(false)
      
      // Show success message
      toast({
        title: "نجاح",
        description: vehicle ? "تم تحديث المركبة بنجاح" : "تم إنشاء المركبة الجديدة بنجاح",
      })
      
    } catch (error) {
      console.error("❌ [VEHICLE_FORM] Error saving vehicle:", error);
      
      // Provide specific error messages using toast instead of alert
      let errorMessage = "حدث خطأ أثناء حفظ المركبة";
      
      if (error instanceof Error) {
        // Check for specific database errors
        if (error.message.includes("duplicate") || error.message.includes("unique")) {
          errorMessage = "رقم اللوحة موجود مسبقاً. يرجى استخدام رقم لوحة مختلف.";
        } else if (error.message.includes("foreign key") || error.message.includes("violates")) {
          errorMessage = "خطأ في البيانات المرجعية. يرجى التحقق من صحة البيانات.";
        } else if (error.message.includes("not null") || error.message.includes("required")) {
          errorMessage = "هناك حقول مطلوبة لم يتم ملؤها. يرجى التحقق من جميع الحقول.";
        } else if (error.message.includes("permission") || error.message.includes("denied")) {
          errorMessage = "ليس لديك صلاحية لتنفيذ هذا الإجراء.";
        } else {
          errorMessage = error.message;
        }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="text-right">
            {vehicle ? "تعديل المركبة" : "إضافة مركبة جديدة"}
          </DialogTitle>
          <DialogDescription className="text-right">
            {vehicle ? "تحديث معلومات المركبة" : "إضافة مركبة جديدة إلى الأسطول"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 vehicle-form-content" dir="rtl">
            <Tabs defaultValue="basic" className="w-full" dir="rtl">
              <TabsList className="grid w-full grid-cols-5" dir="rtl">
                <TabsTrigger value="basic">الأساسية</TabsTrigger>
                <TabsTrigger value="technical">التقنية</TabsTrigger>
                <TabsTrigger value="financial">المالية</TabsTrigger>
                <TabsTrigger value="operational">التشغيلية</TabsTrigger>
                <TabsTrigger value="additional">إضافية</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4" dir="rtl">
                <Card>
                  <CardHeader className="text-right">
                    <CardTitle className="text-right">المعلومات الأساسية للمركبة</CardTitle>
                    <CardDescription className="text-right">التفاصيل الأساسية حول المركبة</CardDescription>
                  </CardHeader>
                   <CardContent className="space-y-4" dir="rtl">
                      {/* Fixed Asset Linking Section */}
                      <div className="bg-muted/30 p-4 rounded-lg border-2 border-dashed border-primary/20">
                        <h4 className="text-sm font-medium text-right mb-3 text-primary">ربط بالأصول الثابتة</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="text-right">
                            <label className="text-sm font-medium">رقم الأصل الثابت</label>
                            <div className="relative mt-1">
                              <Input
                                value={assetCodeInput}
                                onChange={(e) => handleAssetCodeChange(e.target.value)}
                                placeholder="أدخل رقم الأصل لجلب البيانات تلقائياً"
                                className="text-right"
                                dir="rtl"
                              />
                              {assetLoading && (
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                  <LoadingSpinner size="sm" />
                                </div>
                              )}
                            </div>
                            {fixedAsset && (
                              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-right">
                                <p className="text-sm text-green-800">
                                  ✓ تم العثور على: {fixedAsset.asset_name}
                                </p>
                                {fixedAsset.location && (
                                  <p className="text-xs text-green-600">الموقع: {fixedAsset.location}</p>
                                )}
                              </div>
                            )}
                            {assetCodeInput && !fixedAsset && !assetLoading && (
                              <p className="text-sm text-red-600 mt-1 text-right">
                                لم يتم العثور على أصل ثابت بهذا الرقم
                              </p>
                            )}
                          </div>
                          
                          <FormField
                            control={form.control}
                            name="asset_code"
                            render={({ field }) => (
                              <FormItem className="text-right">
                                <FormLabel className="text-right">رمز الأصل (تلقائي)</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="سيتم ملؤه تلقائياً" className="text-right bg-muted" readOnly dir="rtl" />
                                </FormControl>
                                <FormMessage className="text-right" />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="make"
                          render={({ field }) => (
                             <FormItem className="text-right">
                               <FormLabel className="text-right">الماركة/الشركة المصنعة *</FormLabel>
                               <FormControl>
                                 <Input {...field} placeholder="مثال: تويوتا" className="text-right" dir="rtl" />
                               </FormControl>
                               <FormMessage className="text-right" />
                             </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="model"
                          render={({ field }) => (
                             <FormItem className="text-right">
                               <FormLabel className="text-right">الطراز *</FormLabel>
                               <FormControl>
                                 <Input {...field} placeholder="مثال: كامري" className="text-right" dir="rtl" />
                               </FormControl>
                               <FormMessage className="text-right" />
                             </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="year"
                          render={({ field }) => (
                            <FormItem className="text-right">
                              <FormLabel className="text-right">السنة *</FormLabel>
                              <FormControl>
                                <NumberInput {...field} min="1990" max={new Date().getFullYear() + 1} />
                              </FormControl>
                              <FormMessage className="text-right" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                         control={form.control}
                         name="purchase_source"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>مصدر الشراء</FormLabel>
                             <FormControl>
                               <Input {...field} placeholder="مثال: وكالة، معرض، مزاد" />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                       
                       <FormField
                         control={form.control}
                         name="financing_type"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>نوع التمويل</FormLabel>
                             <FormControl>
                               <Select onValueChange={field.onChange} value={field.value}>
                                 <SelectTrigger>
                                   <SelectValue placeholder="اختر نوع التمويل" />
                                 </SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="cash">نقدي</SelectItem>
                                   <SelectItem value="loan">قرض</SelectItem>
                                   <SelectItem value="lease">إيجار تمويلي</SelectItem>
                                   <SelectItem value="installment">تقسيط</SelectItem>
                                 </SelectContent>
                               </Select>
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                        />
                      </div>
                      
                      {/* Hidden field for fixed asset ID */}
                      <FormField
                        control={form.control}
                        name="fixed_asset_id"
                        render={({ field }) => (
                          <input type="hidden" {...field} />
                        )}
                      />

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="plate_number"
                          render={({ field }) => (
                            <FormItem className="text-right">
                              <FormLabel className="text-right">رقم اللوحة *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="أدخل رقم اللوحة" className="text-right" dir="rtl" />
                              </FormControl>
                              <FormMessage className="text-right" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="color"
                          render={({ field }) => (
                            <FormItem className="text-right">
                              <FormLabel className="text-right">اللون</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="مثال: أبيض" className="text-right" dir="rtl" />
                              </FormControl>
                              <FormMessage className="text-right" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="vin"
                          render={({ field }) => (
                            <FormItem className="text-right">
                              <FormLabel className="text-right">رقم الهيكل (VIN)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="رقم تعريف المركبة" className="text-right" dir="rtl" />
                              </FormControl>
                              <FormMessage className="text-right" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="engine_number"
                          render={({ field }) => (
                            <FormItem className="text-right">
                              <FormLabel className="text-right">رقم المحرك</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="رقم المحرك" className="text-right" dir="rtl" />
                              </FormControl>
                              <FormMessage className="text-right" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="transmission_type"
                          render={({ field }) => (
                            <FormItem className="text-right">
                              <FormLabel className="text-right">ناقل الحركة</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="text-right" dir="rtl">
                                    <SelectValue placeholder="اختر ناقل الحركة" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="automatic">أوتوماتيك</SelectItem>
                                  <SelectItem value="manual">يدوي</SelectItem>
                                  <SelectItem value="cvt">CVT</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-right" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="fuel_type"
                          render={({ field }) => (
                            <FormItem className="text-right">
                              <FormLabel className="text-right">نوع الوقود</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="text-right" dir="rtl">
                                    <SelectValue placeholder="اختر نوع الوقود" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="gasoline">بنزين</SelectItem>
                                  <SelectItem value="diesel">ديزل</SelectItem>
                                  <SelectItem value="hybrid">هجين</SelectItem>
                                  <SelectItem value="electric">كهربائي</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-right" />
                            </FormItem>
                          )}
                        />
                      </div>

                    <FormField
                      control={form.control}
                      name="vehicle_category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>فئة المركبة</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الفئة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="sedan">سيدان</SelectItem>
                              <SelectItem value="suv">SUV</SelectItem>
                              <SelectItem value="hatchback">هاتشباك</SelectItem>
                              <SelectItem value="coupe">كوبيه</SelectItem>
                              <SelectItem value="convertible">قابل للطي</SelectItem>
                              <SelectItem value="pickup">بيك أب</SelectItem>
                              <SelectItem value="van">فان</SelectItem>
                              <SelectItem value="truck">شاحنة</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fuel_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نوع الوقود</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر نوع الوقود" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="gasoline">بنزين</SelectItem>
                              <SelectItem value="diesel">ديزل</SelectItem>
                              <SelectItem value="hybrid">هجين</SelectItem>
                              <SelectItem value="electric">كهربائي</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="seating_capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>عدد المقاعد</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="2" max="50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="technical" className="space-y-4" dir="rtl">
                <Card>
                  <CardHeader className="text-right">
                    <CardTitle className="text-right">المواصفات التقنية المتقدمة</CardTitle>
                    <CardDescription className="text-right">تفاصيل تقنية وتسجيل المركبة</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
                     <FormField
                      control={form.control}
                      name="fuel_capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>سعة خزان الوقود (لتر)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.1" placeholder="60" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="drive_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نوع الدفع</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر نوع الدفع" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="front_wheel">دفع أمامي</SelectItem>
                              <SelectItem value="rear_wheel">دفع خلفي</SelectItem>
                              <SelectItem value="all_wheel">دفع رباعي</SelectItem>
                              <SelectItem value="four_wheel">رباعي</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vehicle_condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>حالة المركبة</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الحالة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="excellent">ممتازة</SelectItem>
                              <SelectItem value="very_good">جيدة جداً</SelectItem>
                              <SelectItem value="good">جيدة</SelectItem>
                              <SelectItem value="fair">مقبولة</SelectItem>
                              <SelectItem value="poor">ضعيفة</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="registration_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاريخ التسجيل</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="registration_expiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>انتهاء صلاحية التسجيل</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="next_service_due"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاريخ الصيانة القادمة</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="current_location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الموقع الحالي</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="مثال: مواقف الشركة" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gps_tracking_device"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>جهاز تتبع GPS</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="رقم/نوع جهاز التتبع" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ownership_status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>حالة الملكية</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر حالة الملكية" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="owned">مملوكة</SelectItem>
                              <SelectItem value="leased">مؤجرة</SelectItem>
                              <SelectItem value="financed">ممولة</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch('ownership_status') === 'leased' && (
                      <>
                        <FormField
                          control={form.control}
                          name="lease_company"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>شركة التأجير</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="اسم شركة التأجير" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="monthly_lease_amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>القسط الشهري (د.ك)</FormLabel>
                              <FormControl>
                                <Input {...field} type="number" step="0.01" placeholder="0.00" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lease_start_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>بداية التأجير</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lease_end_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>نهاية التأجير</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    <FormField
                      control={form.control}
                      name="warranty_start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>بداية الضمان</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="warranty_end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نهاية الضمان</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4" dir="rtl">
                <Card>
                  <CardHeader className="text-right">
                    <CardTitle className="text-right">المعلومات المالية</CardTitle>
                    <CardDescription className="text-right">تفاصيل الشراء ومعلومات الإهلاك</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
                    <FormField
                      control={form.control}
                      name="purchase_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاريخ الشراء</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="purchase_cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تكلفة الشراء (د.ك)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="useful_life_years"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>العمر الإنتاجي (بالسنوات)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="1" max="50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="residual_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>القيمة المتبقية (د.ك)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="depreciation_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>طريقة الإهلاك</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الطريقة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="straight_line">القسط الثابت</SelectItem>
                              <SelectItem value="declining_balance">الرصيد المتناقص</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cost_center_id"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>مركز التكلفة</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between text-right",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value
                                    ? costCenters?.find(
                                        (center) => center.id === field.value
                                      )?.center_name_ar || costCenters?.find(
                                        (center) => center.id === field.value
                                      )?.center_name
                                    : "اختر مركز التكلفة"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput placeholder="ابحث عن مركز التكلفة..." className="text-right" />
                                <CommandList>
                                  <CommandEmpty>لا توجد مراكز تكلفة.</CommandEmpty>
                                  <CommandGroup>
                                    {(costCenters || []).map((center) => (
                                      <CommandItem
                                        key={center.id}
                                        value={`${center.center_name_ar || center.center_name} ${center.center_code}`}
                                        onSelect={() => {
                                          field.onChange(center.id)
                                        }}
                                        className="text-right"
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            center.id === field.value
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                        {center.center_name_ar || center.center_name} ({center.center_code})
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                     />
                  </CardContent>
                </Card>
                
                {/* Enhanced Financial Integration Status */}
                {vehicle && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        حالة التكامل المالي
                        {vehicle.fixed_asset_id && (
                          <Badge variant="secondary" className="text-xs">
                            مربوط بسجل الأصول الثابتة
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        حالة ربط المركبة مع الأنظمة المالية الأخرى
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Fixed Asset Integration */}
                        <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {vehicle.fixed_asset_id ? (
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            ) : (
                              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                            )}
                            <div>
                              <p className="font-medium">سجل الأصول الثابتة</p>
                              <p className="text-sm text-muted-foreground">
                                {vehicle.fixed_asset_id 
                                  ? "مربوط بسجل الأصول الثابتة" 
                                  : "غير مربوط (أضف تكلفة الشراء للربط)"}
                              </p>
                            </div>
                          </div>
                          {vehicle.fixed_asset_id && (
                            <Badge variant="outline" className="text-xs">
                              ID: {vehicle.fixed_asset_id.slice(-8)}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Journal Entry Integration */}
                        <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {vehicle.journal_entry_id ? (
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            ) : (
                              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                            )}
                            <div>
                              <p className="font-medium">دفتر اليومية العام</p>
                              <p className="text-sm text-muted-foreground">
                                {vehicle.journal_entry_id 
                                  ? "مسجل قيد الشراء في دفتر اليومية" 
                                  : "لم يتم تسجيل قيد الشراء"}
                              </p>
                            </div>
                          </div>
                          {vehicle.journal_entry_id && (
                            <Badge variant="outline" className="text-xs">
                              Entry: {vehicle.journal_entry_id.slice(-8)}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Cost Center Integration */}
                        <div className="flex items-center justify-between p-3 bg-secondary/10 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {vehicle.cost_center_id ? (
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            ) : (
                              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                            )}
                            <div>
                              <p className="font-medium">مركز التكلفة</p>
                              <p className="text-sm text-muted-foreground">
                                {vehicle.cost_center_id 
                                  ? "مخصص لمركز تكلفة" 
                                  : "غير مخصص لمركز تكلفة"}
                              </p>
                            </div>
                          </div>
                          {vehicle.cost_center_id && (
                            <Badge variant="outline" className="text-xs">
                              Cost Center
                            </Badge>
                          )}
                        </div>
                        
                        {/* Depreciation Status */}
                        {vehicle.purchase_cost && vehicle.useful_life_years && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="font-medium text-blue-900">معلومات الإهلاك</p>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                              <div>
                                <span className="text-blue-700">الإهلاك الشهري:</span>
                                <span className="font-medium"> {
                                  ((vehicle.purchase_cost - (vehicle.salvage_value || 0)) / (vehicle.useful_life_years * 12)).toFixed(3)
                                } د.ك</span>
                              </div>
                              <div>
                                <span className="text-blue-700">الإهلاك السنوي:</span>
                                <span className="font-medium"> {
                                  ((vehicle.purchase_cost - (vehicle.salvage_value || 0)) / vehicle.useful_life_years).toFixed(3)
                                } د.ك</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="operational" className="space-y-4" dir="rtl">
                <Card>
                  <CardHeader className="text-right">
                    <CardTitle className="text-right">المعلومات التشغيلية</CardTitle>
                    <CardDescription className="text-right">المسافة المقطوعة والتسعير والحالة التشغيلية</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4" dir="rtl">
                    <FormField
                      control={form.control}
                      name="current_mileage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>المسافة المقطوعة الحالية (كم)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.1" placeholder="0" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الحالة</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الحالة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="available">متاحة</SelectItem>
                              <SelectItem value="rented">مؤجرة</SelectItem>
                              <SelectItem value="maintenance">قيد الصيانة</SelectItem>
                              <SelectItem value="out_of_service">خارج الخدمة</SelectItem>
                              <SelectItem value="reserved">محجوزة</SelectItem>
                              <SelectItem value="accident">حادث</SelectItem>
                              <SelectItem value="stolen">مسروقة</SelectItem>
                              <SelectItem value="police_station">في المخفر</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="daily_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>التعرفة اليومية (د.ك)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="weekly_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>التعرفة الأسبوعية (د.ك)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="monthly_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>التعرفة الشهرية (د.ك)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deposit_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>التأمين (د.ك)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="text-right">
                    <CardTitle className="text-right">إعدادات الحد الأدنى للأسعار</CardTitle>
                    <CardDescription className="text-right">تحديد الحد الأدنى للأسعار لكل فترة إيجار وإنفاذها</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4" dir="rtl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="minimum_daily_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الحد الأدنى للسعر اليومي (د.ك)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="minimum_weekly_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الحد الأدنى للسعر الأسبوعي (د.ك)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="minimum_monthly_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الحد الأدنى للسعر الشهري (د.ك)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="minimum_rental_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الحد الأدنى العام (د.ك)</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" />
                            </FormControl>
                            <div className="text-xs text-muted-foreground">
                              يُستخدم في حالة عدم تحديد حد أدنى للفترة المحددة
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="enforce_minimum_price"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                فرض الحد الأدنى للأسعار
                              </FormLabel>
                              <div className="text-sm text-muted-foreground">
                                منع إنشاء عقود بسعر أقل من الحد الأدنى المحدد
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="additional" className="space-y-4" dir="rtl">
                <Card>
                  <CardHeader className="text-right">
                    <CardTitle className="text-right">معلومات إضافية</CardTitle>
                    <CardDescription className="text-right">ملاحظات وتفاصيل أخرى</CardDescription>
                  </CardHeader>
                  <CardContent dir="rtl">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ملاحظات</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="ملاحظات إضافية حول المركبة..."
                              rows={4}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between items-center" dir="rtl">
              {/* Dummy data button - only show when adding new vehicle */}
              {!vehicle && (
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={fillDummyData}
                  disabled={isSubmitting || createVehicle.isPending || updateVehicle.isPending}
                  className="flex items-center gap-2"
                >
                  تعبئة بيانات تجريبية
                </Button>
              )}
              
              <div className="flex space-x-2 rtl:space-x-reverse">
                <Button 
                  type="submit" 
                  disabled={isSubmitting || createVehicle.isPending || updateVehicle.isPending}
                  className="min-w-[120px]"
                >
                  {isSubmitting || createVehicle.isPending || updateVehicle.isPending ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      جاري الحفظ...
                    </div>
                  ) : (
                    vehicle ? "حفظ التغييرات" : "حفظ المركبة"
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting || createVehicle.isPending || updateVehicle.isPending}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}