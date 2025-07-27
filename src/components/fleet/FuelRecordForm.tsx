import { useState } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCreateFuelRecord, useUpdateFuelRecord } from "@/hooks/useFuelManagement"
import { useVehicles } from "@/hooks/useVehicles"
import type { FuelRecord } from "@/hooks/useFuelManagement"

interface FuelRecordFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fuelRecord?: FuelRecord
}

interface FormData {
  vehicle_id: string
  fuel_date: string
  fuel_station: string
  fuel_type: string
  quantity_liters: number
  cost_per_liter: number
  odometer_reading?: number
  receipt_number: string
  notes: string
}

export function FuelRecordForm({ open, onOpenChange, fuelRecord }: FuelRecordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { data: vehicles } = useVehicles()
  const createFuelRecord = useCreateFuelRecord()
  const updateFuelRecord = useUpdateFuelRecord()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: fuelRecord ? {
      vehicle_id: fuelRecord.vehicle_id,
      fuel_date: fuelRecord.fuel_date,
      fuel_station: fuelRecord.fuel_station || '',
      fuel_type: fuelRecord.fuel_type,
      quantity_liters: fuelRecord.quantity_liters,
      cost_per_liter: fuelRecord.cost_per_liter,
      odometer_reading: fuelRecord.odometer_reading,
      receipt_number: fuelRecord.receipt_number || '',
      notes: fuelRecord.notes || ''
    } : {
      fuel_date: new Date().toISOString().split('T')[0],
      fuel_type: 'gasoline',
      fuel_station: '',
      receipt_number: '',
      notes: ''
    }
  })

  const quantityLiters = watch('quantity_liters')
  const costPerLiter = watch('cost_per_liter')
  const totalCost = quantityLiters && costPerLiter ? quantityLiters * costPerLiter : 0

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const fuelRecordData = {
        ...data,
        total_cost: totalCost,
        quantity_liters: Number(data.quantity_liters),
        cost_per_liter: Number(data.cost_per_liter),
        odometer_reading: data.odometer_reading ? Number(data.odometer_reading) : undefined
      }

      if (fuelRecord) {
        await updateFuelRecord.mutateAsync({ id: fuelRecord.id, ...fuelRecordData })
      } else {
        await createFuelRecord.mutateAsync(fuelRecordData)
      }

      reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving fuel record:', error)
    }
    setIsSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {fuelRecord ? 'تعديل سجل الوقود' : 'إضافة سجل وقود جديد'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* اختيار المركبة */}
            <div className="space-y-2">
              <Label>المركبة *</Label>
              <Select
                value={watch('vehicle_id')}
                onValueChange={(value) => setValue('vehicle_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المركبة" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles?.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vehicle_id && (
                <p className="text-sm text-red-500">المركبة مطلوبة</p>
              )}
            </div>

            {/* تاريخ التعبئة */}
            <div className="space-y-2">
              <Label>تاريخ التعبئة *</Label>
              <Input
                type="date"
                {...register('fuel_date', { required: 'تاريخ التعبئة مطلوب' })}
              />
              {errors.fuel_date && (
                <p className="text-sm text-red-500">{errors.fuel_date.message}</p>
              )}
            </div>

            {/* محطة الوقود */}
            <div className="space-y-2">
              <Label>محطة الوقود</Label>
              <Input
                {...register('fuel_station')}
                placeholder="اسم محطة الوقود"
              />
            </div>

            {/* نوع الوقود */}
            <div className="space-y-2">
              <Label>نوع الوقود *</Label>
              <Select
                value={watch('fuel_type')}
                onValueChange={(value) => setValue('fuel_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gasoline">بنزين</SelectItem>
                  <SelectItem value="diesel">ديزل</SelectItem>
                  <SelectItem value="lpg">غاز</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* الكمية */}
            <div className="space-y-2">
              <Label>الكمية (لتر) *</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                {...register('quantity_liters', { 
                  required: 'الكمية مطلوبة',
                  min: { value: 0.1, message: 'الكمية يجب أن تكون أكبر من صفر' }
                })}
                placeholder="مثال: 50.5"
              />
              {errors.quantity_liters && (
                <p className="text-sm text-red-500">{errors.quantity_liters.message}</p>
              )}
            </div>

            {/* سعر اللتر */}
            <div className="space-y-2">
              <Label>سعر اللتر (د.ك) *</Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                {...register('cost_per_liter', { 
                  required: 'سعر اللتر مطلوب',
                  min: { value: 0.001, message: 'السعر يجب أن يكون أكبر من صفر' }
                })}
                placeholder="مثال: 0.250"
              />
              {errors.cost_per_liter && (
                <p className="text-sm text-red-500">{errors.cost_per_liter.message}</p>
              )}
            </div>

            {/* قراءة العداد */}
            <div className="space-y-2">
              <Label>قراءة العداد (كم)</Label>
              <Input
                type="number"
                min="0"
                {...register('odometer_reading')}
                placeholder="مثال: 125000"
              />
            </div>

            {/* رقم الإيصال */}
            <div className="space-y-2">
              <Label>رقم الإيصال</Label>
              <Input
                {...register('receipt_number')}
                placeholder="رقم إيصال التعبئة"
              />
            </div>
          </div>

          {/* إجمالي التكلفة */}
          {totalCost > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-lg font-semibold">
                إجمالي التكلفة: {totalCost.toFixed(3)} د.ك
              </div>
            </div>
          )}

          {/* ملاحظات */}
          <div className="space-y-2">
            <Label>ملاحظات</Label>
            <Textarea
              {...register('notes')}
              placeholder="أي ملاحظات إضافية..."
              rows={3}
            />
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : (fuelRecord ? 'تحديث' : 'حفظ')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}