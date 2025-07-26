import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAvailableVehicles, useCreateVehicleMaintenance, VehicleMaintenance } from "@/hooks/useVehicles"
import { useCostCenters } from "@/hooks/useCostCenters"
import { useAuth } from "@/contexts/AuthContext"

interface MaintenanceFormProps {
  maintenance?: VehicleMaintenance
  vehicleId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MaintenanceForm({ maintenance, vehicleId, open, onOpenChange }: MaintenanceFormProps) {
  const { user } = useAuth()
  const { data: vehicles } = useAvailableVehicles()
  const { data: costCenters } = useCostCenters()
  const createMaintenance = useCreateVehicleMaintenance()
  
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
      })
    }
  }, [maintenance, form])

  const onSubmit = async (data: any) => {
    try {
      const maintenanceData = {
        ...data,
        company_id: user?.user_metadata?.company_id,
        estimated_cost: data.estimated_cost ? parseFloat(data.estimated_cost) : 0,
        parts_replaced: data.parts_replaced ? data.parts_replaced.split(",").map((p: string) => p.trim()) : [],
        created_by: user?.id,
        status: "pending" as const,
      }

      await createMaintenance.mutateAsync(maintenanceData)
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error("Error creating maintenance:", error)
    }
  }

  // Get default maintenance cost center
  const maintenanceCostCenter = costCenters?.find(c => c.center_code === 'MAINTENANCE_OPS')

  useEffect(() => {
    if (maintenanceCostCenter && !form.getValues('cost_center_id')) {
      form.setValue('cost_center_id', maintenanceCostCenter.id)
    }
  }, [maintenanceCostCenter, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {maintenance ? "تعديل الصيانة" : "جدولة الصيانة"}
          </DialogTitle>
          <DialogDescription>
            {maintenance ? "تحديث معلومات الصيانة" : "جدولة صيانة جديدة لمركبة"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>تفاصيل الصيانة</CardTitle>
                <CardDescription>المعلومات الأساسية حول الصيانة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="vehicle_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المركبة *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!vehicleId}>
                        <FormControl>
                          <SelectTrigger>
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
                        <FormLabel>نوع الصيانة *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
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
                        <FormLabel>الأولوية</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
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
                      <FormLabel>الوصف *</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="وصف أعمال الصيانة المطلوبة..."
                          rows={3}
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
                        <FormLabel>التاريخ المحدد</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
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
                        <FormLabel>التكلفة المقدرة (د.ك)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>مزود الخدمة</CardTitle>
                <CardDescription>معلومات حول مزود الخدمة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="service_provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>مزود الخدمة</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="اسم الشركة أو الميكانيكي" />
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
                        <FormLabel>معلومات التواصل</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="رقم الهاتف أو البريد الإلكتروني" />
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
                      <FormLabel>القطع المراد استبدالها</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="اذكر القطع مفصولة بفواصل" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>معلومات إضافية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ملاحظات إضافية</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="أي ملاحظات إضافية أو تعليمات خاصة..."
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={createMaintenance.isPending}
              >
                {createMaintenance.isPending ? "جاري الجدولة..." : "جدولة الصيانة"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}