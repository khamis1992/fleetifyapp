import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PropertyMaintenance, PropertyMaintenanceType, PropertyMaintenancePriority } from '../types';
import { useCreatePropertyMaintenance, useUpdatePropertyMaintenance } from '../hooks/usePropertyMaintenance';
import { useProperties } from '../hooks/useProperties';

const maintenanceSchema = z.object({
  property_id: z.string().min(1, 'يجب اختيار العقار'),
  maintenance_type: z.string().min(1, 'يجب اختيار نوع الصيانة'),
  priority: z.string().min(1, 'يجب تحديد الأولوية'),
  title: z.string().min(1, 'يجب إدخال عنوان للصيانة'),
  title_ar: z.string().optional(),
  description: z.string().optional(),
  description_ar: z.string().optional(),
  scheduled_date: z.string().optional(),
  estimated_cost: z.string().optional(),
  contractor_name: z.string().optional(),
  contractor_phone: z.string().optional(),
  location_details: z.string().optional(),
  notes: z.string().optional(),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

interface PropertyMaintenanceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maintenance?: PropertyMaintenance;
  propertyId?: string; // يمكن تمرير معرف العقار مسبقاً
  onSuccess?: () => void;
}

const maintenanceTypes: { value: PropertyMaintenanceType; label: string }[] = [
  { value: 'routine', label: 'صيانة دورية' },
  { value: 'emergency', label: 'صيانة طارئة' },
  { value: 'repair', label: 'إصلاح' },
  { value: 'improvement', label: 'تحسينات' },
  { value: 'renovation', label: 'تجديد' },
  { value: 'inspection', label: 'فحص' },
  { value: 'cleaning', label: 'تنظيف' },
  { value: 'electrical', label: 'كهرباء' },
  { value: 'plumbing', label: 'سباكة' },
  { value: 'hvac', label: 'تكييف' },
  { value: 'painting', label: 'دهان' },
  { value: 'flooring', label: 'أرضيات' },
];

const priorities: { value: PropertyMaintenancePriority; label: string }[] = [
  { value: 'low', label: 'منخفضة' },
  { value: 'medium', label: 'متوسطة' },
  { value: 'high', label: 'عالية' },
  { value: 'urgent', label: 'عاجلة' },
];

export const PropertyMaintenanceForm: React.FC<PropertyMaintenanceFormProps> = ({
  open,
  onOpenChange,
  maintenance,
  propertyId,
  onSuccess,
}) => {
  const { data: properties } = useProperties();
  const createMutation = useCreatePropertyMaintenance();
  const updateMutation = useUpdatePropertyMaintenance();

  const form = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      property_id: maintenance?.property_id || propertyId || '',
      maintenance_type: maintenance?.maintenance_type || '',
      priority: maintenance?.priority || '',
      title: maintenance?.title || '',
      title_ar: maintenance?.title_ar || '',
      description: maintenance?.description || '',
      description_ar: maintenance?.description_ar || '',
      scheduled_date: maintenance?.scheduled_date ? new Date(maintenance.scheduled_date).toISOString().split('T')[0] : '',
      estimated_cost: maintenance?.estimated_cost?.toString() || '',
      contractor_name: maintenance?.contractor_name || '',
      contractor_phone: maintenance?.contractor_phone || '',
      location_details: maintenance?.location_details || '',
      notes: maintenance?.notes || '',
    },
  });

  const onSubmit = async (data: MaintenanceFormData) => {
    try {
      const submitData = {
        property_id: data.property_id,
        maintenance_type: data.maintenance_type as PropertyMaintenanceType,
        priority: data.priority as PropertyMaintenancePriority,
        title: data.title,
        title_ar: data.title_ar,
        description: data.description,
        description_ar: data.description_ar,
        estimated_cost: data.estimated_cost ? parseFloat(data.estimated_cost) : undefined,
        scheduled_date: data.scheduled_date || undefined,
        contractor_name: data.contractor_name,
        contractor_phone: data.contractor_phone,
        location_details: data.location_details,
        notes: data.notes,
        status: 'pending' as const,
        requested_date: new Date().toISOString(),
      };

      if (maintenance) {
        await updateMutation.mutateAsync({ id: maintenance.id, ...submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }

      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error submitting maintenance form:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {maintenance ? 'تعديل طلب الصيانة' : 'إضافة طلب صيانة جديد'}
          </DialogTitle>
          <DialogDescription>
            {maintenance ? 'تعديل بيانات طلب الصيانة' : 'إنشاء طلب صيانة جديد للعقار'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* إظهار حقل اختيار العقار فقط إذا لم يتم تحديده مسبقاً */}
              {!propertyId && !maintenance && (
                <FormField
                  control={form.control}
                  name="property_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>العقار *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر العقار" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties?.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.property_name || `عقار ${property.property_code}`}
                              {property.address && ` - ${property.address}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* إظهار معلومات العقار المحدد مسبقاً */}
              {(propertyId || maintenance) && (
                <div className="space-y-2">
                  <FormLabel>العقار المحدد</FormLabel>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium">
                      {properties?.find(p => p.id === (propertyId || maintenance?.property_id))?.property_name || 
                       `عقار ${properties?.find(p => p.id === (propertyId || maintenance?.property_id))?.property_code}`}
                    </p>
                    {properties?.find(p => p.id === (propertyId || maintenance?.property_id))?.address && (
                      <p className="text-sm text-muted-foreground">
                        {properties.find(p => p.id === (propertyId || maintenance?.property_id))?.address}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="maintenance_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الصيانة *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الصيانة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {maintenanceTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الأولوية *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="حدد الأولوية" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorities.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            {priority.label}
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
                name="scheduled_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التاريخ المجدول</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العنوان (إنجليزي) *</FormLabel>
                    <FormControl>
                      <Input placeholder="عنوان الصيانة" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العنوان (عربي)</FormLabel>
                    <FormControl>
                      <Input placeholder="عنوان الصيانة بالعربي" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimated_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التكلفة المتوقعة</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.000" step="0.001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location_details"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تفاصيل الموقع</FormLabel>
                    <FormControl>
                      <Input placeholder="مثل: الطابق الثاني، المطبخ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contractor_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المقاول</FormLabel>
                    <FormControl>
                      <Input placeholder="اسم المقاول أو الشركة" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractor_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>هاتف المقاول</FormLabel>
                    <FormControl>
                      <Input placeholder="رقم الهاتف" {...field} />
                    </FormControl>
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
                  <FormLabel>الوصف</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="وصف تفصيلي لأعمال الصيانة المطلوبة"
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="ملاحظات إضافية"
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? 'جاري الحفظ...' : (maintenance ? 'تحديث' : 'إضافة')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};