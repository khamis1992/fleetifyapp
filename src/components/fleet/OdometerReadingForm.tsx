import { useState } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCreateOdometerReading, useUpdateOdometerReading } from "@/hooks/useOdometerReadings"
import { useVehicles } from "@/hooks/useVehicles"
import type { OdometerReading } from "@/hooks/useOdometerReadings"

interface OdometerReadingFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reading?: OdometerReading
  vehicleId?: string
}

interface FormData {
  vehicle_id: string
  reading_date: string
  odometer_reading: number
  reading_type: string
  notes: string
}

export function OdometerReadingForm({ open, onOpenChange, reading, vehicleId }: OdometerReadingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { data: vehicles } = useVehicles()
  const createReading = useCreateOdometerReading()
  const updateReading = useUpdateOdometerReading()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: reading ? {
      vehicle_id: reading.vehicle_id,
      reading_date: reading.reading_date,
      odometer_reading: reading.odometer_reading,
      reading_type: reading.reading_type,
      notes: reading.notes || ''
    } : {
      vehicle_id: vehicleId || '',
      reading_date: new Date().toISOString().split('T')[0],
      reading_type: 'manual',
      notes: ''
    }
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const readingData = {
        ...data,
        odometer_reading: Number(data.odometer_reading)
      }

      if (reading) {
        await updateReading.mutateAsync({ id: reading.id, ...readingData })
      } else {
        await createReading.mutateAsync(readingData)
      }

      reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving odometer reading:', error)
    }
    setIsSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {reading ? 'تعديل قراءة العداد' : 'إضافة قراءة عداد جديدة'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* اختيار المركبة */}
          <div className="space-y-2">
            <Label>المركبة *</Label>
            <Select
              value={watch('vehicle_id')}
              onValueChange={(value) => setValue('vehicle_id', value)}
              disabled={!!vehicleId}
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

          {/* تاريخ القراءة */}
          <div className="space-y-2">
            <Label>تاريخ القراءة *</Label>
            <Input
              type="date"
              {...register('reading_date', { required: 'تاريخ القراءة مطلوب' })}
            />
            {errors.reading_date && (
              <p className="text-sm text-red-500">{errors.reading_date.message}</p>
            )}
          </div>

          {/* قراءة العداد */}
          <div className="space-y-2">
            <Label>قراءة العداد (كم) *</Label>
            <Input
              type="number"
              min="0"
              {...register('odometer_reading', { 
                required: 'قراءة العداد مطلوبة',
                min: { value: 0, message: 'القراءة يجب أن تكون أكبر من أو تساوي صفر' }
              })}
              placeholder="مثال: 125000"
            />
            {errors.odometer_reading && (
              <p className="text-sm text-red-500">{errors.odometer_reading.message}</p>
            )}
          </div>

          {/* نوع القراءة */}
          <div className="space-y-2">
            <Label>نوع القراءة</Label>
            <Select
              value={watch('reading_type')}
              onValueChange={(value) => setValue('reading_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">يدوي</SelectItem>
                <SelectItem value="automatic">تلقائي</SelectItem>
                <SelectItem value="maintenance">عند الصيانة</SelectItem>
                <SelectItem value="fuel">عند التعبئة</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
              {isSubmitting ? 'جاري الحفظ...' : (reading ? 'تحديث' : 'حفظ')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}