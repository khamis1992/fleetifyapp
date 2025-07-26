import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Vehicle, useCreateVehicle, useUpdateVehicle } from "@/hooks/useVehicles"
import { useCostCenters } from "@/hooks/useCostCenters"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"

interface VehicleFormProps {
  vehicle?: Vehicle
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VehicleForm({ vehicle, open, onOpenChange }: VehicleFormProps) {
  const { user } = useAuth()
  const { data: costCenters } = useCostCenters()
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Backup state for problematic input fields
  const [modelBackup, setModelBackup] = useState("")
  const [colorBackup, setColorBackup] = useState("")
  
  const form = useForm({
    defaultValues: {
      // Basic Information
      plate_number: "",
      make: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      vin: "",
      engine_number: "",
      transmission: "automatic",
      body_type: "",
      fuel_type: "gasoline",
      seating_capacity: 5,
      
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
      status: "available",
      
      // Additional Information
      notes: "",
      cost_center_id: "",
    }
  })

  useEffect(() => {
    if (vehicle) {
      setModelBackup(vehicle.model || "")
      setColorBackup(vehicle.color || "")
      form.reset({
        plate_number: vehicle.plate_number,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color || "",
        vin: vehicle.vin || "",
        engine_number: vehicle.engine_number || "",
        transmission: vehicle.transmission || "automatic",
        body_type: vehicle.body_type || "",
        fuel_type: vehicle.fuel_type || "gasoline",
        seating_capacity: vehicle.seating_capacity || 5,
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
        status: vehicle.status || "available",
        notes: vehicle.notes || "",
        cost_center_id: vehicle.cost_center_id || "",
      })
    } else {
      setModelBackup("")
      setColorBackup("")
      form.reset()
    }
  }, [vehicle, form])


  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    console.log("🚀 [VEHICLE_FORM] Starting form submission");
    console.log("📋 [VEHICLE_FORM] Form data received:", data);
    console.log("🔄 [VEHICLE_FORM] Form values from react-hook-form:", form.getValues());
    console.log("💾 [VEHICLE_FORM] Backup states - Model:", modelBackup, "Color:", colorBackup);
    
    try {
      // Use backup values if form values are empty
      const finalData = {
        ...data,
        model: data.model || modelBackup || "",
        color: data.color || colorBackup || ""
      };
      
      console.log("🔧 [VEHICLE_FORM] Final data after backup merge:", finalData);
      
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
        transmission: finalData.transmission || "automatic",
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
        
        // Additional fields
        notes: finalData.notes?.trim() || null,
        cost_center_id: finalData.cost_center_id || null,
        depreciation_method: finalData.depreciation_method || "straight_line",
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
      if (vehicle) {
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
      setModelBackup("")
      setColorBackup("")
      onOpenChange(false)
      
      // Force refetch vehicles data
      setTimeout(() => {
        console.log("🔄 [VEHICLE_FORM] Forcing data refresh...");
        window.location.reload();
      }, 1000);
      
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {vehicle ? "تعديل المركبة" : "إضافة مركبة جديدة"}
          </DialogTitle>
          <DialogDescription>
            {vehicle ? "تحديث معلومات المركبة" : "إضافة مركبة جديدة إلى الأسطول"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">المعلومات الأساسية</TabsTrigger>
                <TabsTrigger value="financial">المالية</TabsTrigger>
                <TabsTrigger value="operational">التشغيلية</TabsTrigger>
                <TabsTrigger value="additional">إضافية</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>المعلومات الأساسية للمركبة</CardTitle>
                    <CardDescription>التفاصيل الأساسية حول المركبة</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="plate_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم اللوحة *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="أدخل رقم اللوحة" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="make"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الشركة المصنعة *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="مثال: تويوتا" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => {
                        
                        return (
                          <FormItem>
                            <FormLabel>الطراز *</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="مثال: كامري"
                                value={field.value || modelBackup}
                                 onChange={(e) => {
                                   setModelBackup(e.target.value)
                                   field.onChange(e)
                                 }}
                                 onBlur={field.onBlur}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>السنة *</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="1990" max={new Date().getFullYear() + 1} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اللون</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="مثال: أبيض"
                              value={field.value || colorBackup}
                              onChange={(e) => {
                                setColorBackup(e.target.value)
                                field.onChange(e)
                              }}
                              onBlur={field.onBlur}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="vin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم الهيكل</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="رقم تعريف المركبة" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="engine_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم المحرك</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="رقم المحرك" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="transmission"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ناقل الحركة</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر ناقل الحركة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="automatic">أوتوماتيك</SelectItem>
                              <SelectItem value="manual">يدوي</SelectItem>
                              <SelectItem value="cvt">CVT</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="body_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نوع الهيكل</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="مثال: سيدان، SUV، هاتشباك" />
                          </FormControl>
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

              <TabsContent value="financial" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>المعلومات المالية</CardTitle>
                    <CardDescription>تفاصيل الشراء ومعلومات الإهلاك</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <FormItem>
                          <FormLabel>مركز التكلفة</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر مركز التكلفة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {costCenters?.map((center) => (
                                <SelectItem key={center.id} value={center.id}>
                                  {center.center_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="operational" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>المعلومات التشغيلية</CardTitle>
                    <CardDescription>المسافة المقطوعة والتسعير والحالة التشغيلية</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </TabsContent>

              <TabsContent value="additional" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>معلومات إضافية</CardTitle>
                    <CardDescription>ملاحظات وتفاصيل أخرى</CardDescription>
                  </CardHeader>
                  <CardContent>
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

            <div className="flex justify-end space-x-2 rtl:space-x-reverse">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || createVehicle.isPending || updateVehicle.isPending}
              >
                إلغاء
              </Button>
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
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}