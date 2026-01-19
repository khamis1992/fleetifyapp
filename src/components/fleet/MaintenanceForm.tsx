import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/NumberInput"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useAvailableVehiclesForMaintenance } from "@/hooks/useMaintenanceVehicles"
import { useCreateVehicleMaintenance, useUpdateVehicleMaintenance, VehicleMaintenance } from "@/hooks/useVehicles"
import { useScheduleMaintenanceStatus } from "@/hooks/useVehicleStatusIntegration"
import { useCostCenters } from "@/hooks/useCostCenters"
import { useAuth } from "@/contexts/AuthContext"
import { 
  Car, Wrench, Zap, FileText, Calendar, DollarSign, 
  CreditCard, Building, Phone, Building2, X, Check
} from "lucide-react"
import { cn } from "@/lib/utils"
import "./MaintenanceForm.css"

interface MaintenanceFormProps {
  maintenance?: VehicleMaintenance
  vehicleId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MaintenanceForm({ maintenance, vehicleId, open, onOpenChange }: MaintenanceFormProps) {
  const { user } = useAuth()
  const { data: vehicles } = useAvailableVehiclesForMaintenance()
  const { data: costCenters } = useCostCenters()
  const createMaintenance = useCreateVehicleMaintenance()
  const updateMaintenance = useUpdateVehicleMaintenance()
  const scheduleMaintenanceStatus = useScheduleMaintenanceStatus()
  const [moveToMaintenance, setMoveToMaintenance] = useState(true)
  
  const form = useForm({
    defaultValues: {
      vehicle_id: vehicleId || "",
      maintenance_type: "",
      description: "",
      priority: "medium",
      scheduled_date: "",
      estimated_cost: "",
      service_provider: "",
      service_provider_contact: "",
      parts_replaced: "",
      cost_center_id: "",
      notes: "",
      tax_amount: "",
      payment_method: "cash",
      invoice_number: "",
    }
  })

  useEffect(() => {
    if (maintenance) {
      form.reset({
        vehicle_id: maintenance.vehicle_id,
        maintenance_type: maintenance.maintenance_type,
        description: maintenance.description,
        priority: maintenance.priority,
        scheduled_date: maintenance.scheduled_date || "",
        estimated_cost: maintenance.estimated_cost?.toString() || "",
        service_provider: maintenance.service_provider || "",
        service_provider_contact: maintenance.service_provider_contact || "",
        parts_replaced: maintenance.parts_replaced?.join(", ") || "",
        cost_center_id: maintenance.cost_center_id || "",
        notes: maintenance.notes || "",
        tax_amount: (maintenance as any).tax_amount?.toString() || "",
        payment_method: (maintenance as any).payment_method || "cash",
        invoice_number: (maintenance as any).invoice_number || "",
      })
      // If maintenance exists and is in_progress, vehicle is already in maintenance
      setMoveToMaintenance(maintenance.status === 'in_progress')
    } else if (vehicleId) {
      form.reset({
        ...form.getValues(),
        vehicle_id: vehicleId
      })
    }
  }, [maintenance, vehicleId, form])

  useEffect(() => {
    if (!open) {
      form.reset()
      setMoveToMaintenance(true)
    }
  }, [open, form])

  const onSubmit = async (data: any) => {
    try {
      const maintenanceData = {
        ...data,
        company_id: user?.profile?.company_id || user?.company?.id || '',
        estimated_cost: data.estimated_cost ? parseFloat(data.estimated_cost) : 0,
        tax_amount: data.tax_amount ? parseFloat(data.tax_amount) : 0,
        parts_replaced: data.parts_replaced ? data.parts_replaced.split(",").map((p: string) => p.trim()) : [],
        created_by: user?.id,
      }

      // Update existing maintenance
      if (maintenance?.id) {
        const updatedData = {
          ...maintenanceData,
          status: maintenance.status, // Keep existing status
        }
        
        await updateMaintenance.mutateAsync({
          id: maintenance.id,
          ...updatedData
        })
        
        // Only update vehicle status if it changed and moveToMaintenance is true
        if (moveToMaintenance && data.vehicle_id && maintenance.status !== 'in_progress') {
          try {
            await scheduleMaintenanceStatus.mutateAsync({ 
              vehicleId: data.vehicle_id, 
              maintenanceId: maintenance.id 
            });
          } catch (statusError) {
            console.warn('Failed to update vehicle status:', statusError);
          }
        }
        
        onOpenChange(false)
        form.reset()
        return
      }

      // Create new maintenance
      // Set initial status based on moveToMaintenance flag
      const initialStatus = moveToMaintenance ? 'in_progress' : 'pending'
      
      const maintenanceResult = await createMaintenance.mutateAsync({
        ...maintenanceData,
        status: initialStatus,
      })
      
      if (moveToMaintenance && data.vehicle_id) {
        try {
          await scheduleMaintenanceStatus.mutateAsync({ 
            vehicleId: data.vehicle_id, 
            maintenanceId: maintenanceResult.id 
          });
        } catch (statusError) {
          console.warn('Failed to update vehicle status, but maintenance was created:', statusError);
        }
      }
      
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error("Error saving maintenance:", error)
    }
  }

  const maintenanceCostCenter = costCenters?.find(c => c.center_code === 'MAINTENANCE_OPS')

  useEffect(() => {
    if (maintenanceCostCenter && !form.getValues('cost_center_id')) {
      form.setValue('cost_center_id', maintenanceCostCenter.id)
    }
  }, [maintenanceCostCenter, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="maintenance-form-dialog max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="dialog-header-gradient text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="icon-wrapper bg-white/20 p-3 rounded-lg">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {maintenance ? "تعديل الصيانة" : "جدولة الصيانة"}
                </h2>
                <p className="text-sm opacity-90 mt-1">
                  {maintenance ? "تحديث معلومات الصيانة" : "جدولة صيانة جديدة لمركبة"}
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="btn-close p-2 rounded-lg hover:bg-white/20 transition-all duration-200 hover:rotate-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-4">
            {/* Step 1: Basic Information */}
            <div className="step-card bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="step-number w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-sm">
                    1
                  </span>
                  <h3 className="text-lg font-bold">المعلومات الأساسية</h3>
                </div>
                <span className="text-xs text-slate-500">1/4</span>
              </div>

              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="vehicle_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-semibold">
                        <Car className="w-5 h-5 text-red-600" />
                        <span>المركبة *</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!vehicleId}>
                        <FormControl>
                          <SelectTrigger className="form-select h-11">
                            <SelectValue placeholder="اختر المركبة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vehicles?.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maintenance_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <Wrench className="w-5 h-5 text-red-600" />
                          <span>نوع الصيانة *</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="form-select h-11">
                              <SelectValue placeholder="اختر النوع" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="routine">صيانة دورية</SelectItem>
                            <SelectItem value="oil_change">تغيير زيت</SelectItem>
                            <SelectItem value="tire_service">خدمة الإطارات</SelectItem>
                            <SelectItem value="brake_service">خدمة الفرامل</SelectItem>
                            <SelectItem value="engine_repair">إصلاح المحرك</SelectItem>
                            <SelectItem value="transmission">خدمة ناقل الحركة</SelectItem>
                            <SelectItem value="electrical">إصلاح كهربائي</SelectItem>
                            <SelectItem value="body_work">أعمال الهيكل</SelectItem>
                            <SelectItem value="inspection">فحص</SelectItem>
                            <SelectItem value="emergency">إصلاح طارئ</SelectItem>
                            <SelectItem value="other">أخرى</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <Zap className="w-5 h-5 text-red-600" />
                          <span>الأولوية</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="form-select h-11">
                              <SelectValue placeholder="اختر الأولوية" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">منخفضة</SelectItem>
                            <SelectItem value="medium">متوسطة</SelectItem>
                            <SelectItem value="high">عالية</SelectItem>
                            <SelectItem value="urgent">عاجلة</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-semibold">
                        <FileText className="w-5 h-5 text-red-600" />
                        <span>الوصف *</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="وصف أعمال الصيانة المطلوبة..."
                          rows={3}
                          className="form-textarea min-h-[80px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="scheduled_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <Calendar className="w-5 h-5 text-red-600" />
                          <span>التاريخ المحدد</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type="date" className="form-input h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estimated_cost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <DollarSign className="w-5 h-5 text-red-600" />
                          <span>التكلفة المقدرة (د.ك)</span>
                        </FormLabel>
                        <FormControl>
                          <NumberInput {...field} step="0.001" placeholder="0.000" className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Financial Information */}
            <div className="step-card bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="step-number w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-sm">
                    2
                  </span>
                  <h3 className="text-lg font-bold">المعلومات المالية</h3>
                </div>
                <span className="text-xs text-slate-500">2/4</span>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tax_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <DollarSign className="w-5 h-5 text-red-600" />
                          <span>مبلغ الضريبة (د.ك)</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            step="0.001" 
                            placeholder="0.000"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            className="form-input h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payment_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <CreditCard className="w-5 h-5 text-red-600" />
                          <span>طريقة الدفع</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="form-select h-11">
                              <SelectValue placeholder="اختر طريقة الدفع" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cash">نقد</SelectItem>
                            <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                            <SelectItem value="check">شيك</SelectItem>
                            <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="invoice_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-semibold">
                        <FileText className="w-5 h-5 text-red-600" />
                        <span>رقم الفاتورة</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="رقم الفاتورة من مزود الخدمة" className="form-input h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Step 3: Service Provider */}
            <div className="step-card bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="step-number w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-sm">
                    3
                  </span>
                  <h3 className="text-lg font-bold">مزود الخدمة</h3>
                </div>
                <span className="text-xs text-slate-500">3/4</span>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="service_provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <Building className="w-5 h-5 text-red-600" />
                          <span>مزود الخدمة</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="اسم الشركة أو الميكانيكي" className="form-input h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="service_provider_contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 font-semibold">
                          <Phone className="w-5 h-5 text-red-600" />
                          <span>معلومات التواصل</span>
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="رقم الهاتف أو البريد الإلكتروني" className="form-input h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="parts_replaced"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-semibold">
                        <Wrench className="w-5 h-5 text-red-600" />
                        <span>القطع المراد استبدالها</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="اذكر القطع مفصولة بفواصل" className="form-input h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Step 4: Additional Settings */}
            <div className="step-card bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="step-number w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-sm">
                    4
                  </span>
                  <h3 className="text-lg font-bold">إعدادات إضافية</h3>
                </div>
                <span className="text-xs text-slate-500">4/4</span>
              </div>

              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="cost_center_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-semibold">
                        <Building2 className="w-5 h-5 text-red-600" />
                        <span>مركز التكلفة</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="form-select h-11">
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

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 font-semibold">
                        <FileText className="w-5 h-5 text-red-600" />
                        <span>ملاحظات إضافية</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="أي ملاحظات إضافية أو تعليمات خاصة..."
                          rows={3}
                          className="form-textarea min-h-[80px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="checkbox-wrapper flex items-start gap-3 p-4 rounded-lg border border-orange-200 bg-orange-50">
                  <Checkbox
                    id="moveToMaintenance"
                    checked={moveToMaintenance}
                    onCheckedChange={(checked) => setMoveToMaintenance(checked as boolean)}
                    className="mt-1"
                  />
                  <label htmlFor="moveToMaintenance" className="flex-1 cursor-pointer">
                    <div className="font-semibold text-slate-900 mb-1">
                      نقل المركبة إلى قسم الصيانة تلقائياً
                    </div>
                    <div className="text-xs text-slate-600">
                      عند تفعيل هذا الخيار، ستختفي المركبة من قائمة الأسطول وتظهر في قسم الصيانة حتى انتهاء الصيانة
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="px-6"
              >
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={createMaintenance.isPending || updateMaintenance.isPending}
                className="btn-primary bg-red-600 hover:bg-red-700 text-white px-6 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {createMaintenance.isPending || updateMaintenance.isPending 
                  ? (maintenance ? "جاري التحديث..." : "جاري الجدولة...") 
                  : (maintenance ? "تحديث الصيانة" : "جدولة الصيانة")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}