import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePropertyOwnersOptions } from '../hooks/usePropertyOwners';
import { Property, PropertyType, PropertyStatus, PropertyCondition } from '../types';
import { MapPicker } from './MapPicker';
import { Loader2 } from 'lucide-react';

const propertySchema = z.object({
  property_name: z.string().min(1, 'اسم العقار مطلوب'),
  property_code: z.string().min(1, 'رقم العقار مطلوب'),
  address: z.string().min(1, 'العنوان مطلوب'),
  area: z.string().min(1, 'المنطقة مطلوبة'),
  property_type: z.enum(['apartment', 'villa', 'office', 'shop', 'warehouse', 'land']),
  status: z.enum(['available', 'rented', 'sold', 'maintenance', 'reserved']),
  condition_status: z.enum(['excellent', 'very_good', 'good', 'fair', 'poor']),
  owner_id: z.string().min(1, 'اختيار المالك مطلوب'),
  area_size: z.number().min(1, 'المساحة مطلوبة'),
  bedrooms: z.number().min(0, 'عدد الغرف يجب أن يكون موجباً'),
  bathrooms: z.number().min(0, 'عدد الحمامات يجب أن يكون موجباً'),
  parking_spaces: z.number().min(0, 'عدد مواقف السيارات يجب أن يكون موجباً'),
  is_furnished: z.boolean(),
  has_elevator: z.boolean(),
  has_garden: z.boolean(),
  has_swimming_pool: z.boolean(),
  sale_price: z.number().min(0, 'سعر البيع يجب أن يكون موجباً').optional(),
  rental_price: z.number().min(0, 'سعر الإيجار يجب أن يكون موجباً').optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface PropertyFormProps {
  property?: Property;
  onSubmit: (data: PropertyFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<PropertyFormData>;
}

const propertyTypeOptions = [
  { value: 'apartment', label: 'شقة' },
  { value: 'villa', label: 'فيلا' },
  { value: 'office', label: 'مكتب' },
  { value: 'shop', label: 'محل تجاري' },
  { value: 'warehouse', label: 'مستودع' },
  { value: 'land', label: 'أرض' },
];

const statusOptions = [
  { value: 'available', label: 'متاح' },
  { value: 'rented', label: 'مؤجر' },
  { value: 'sold', label: 'مباع' },
  { value: 'maintenance', label: 'تحت الصيانة' },
  { value: 'reserved', label: 'محجوز' },
];

const conditionOptions = [
  { value: 'excellent', label: 'ممتاز' },
  { value: 'very_good', label: 'جيد جداً' },
  { value: 'good', label: 'جيد' },
  { value: 'fair', label: 'مقبول' },
  { value: 'poor', label: 'سيء' },
];

export const PropertyForm: React.FC<PropertyFormProps> = ({
  property,
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
}) => {
  const { data: ownerOptions, isLoading: ownersLoading } = usePropertyOwnersOptions();

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      property_name: initialData?.property_name || property?.property_name || '',
      property_code: initialData?.property_code || property?.property_code || '',
      address: initialData?.address || property?.address || '',
      area: initialData?.area || '',
      property_type: initialData?.property_type || (property?.property_type as any) || 'apartment',
      status: initialData?.status || (property?.property_status as any) || 'available',
      condition_status: initialData?.condition_status || 'good',
      owner_id: initialData?.owner_id || property?.owner_id || '',
      area_size: initialData?.area_size || property?.area_sqm || 0,
      bedrooms: initialData?.bedrooms || property?.bedrooms || 0,
      bathrooms: initialData?.bathrooms || property?.bathrooms || 0,
      parking_spaces: initialData?.parking_spaces || property?.parking_spaces || 0,
      is_furnished: initialData?.is_furnished ?? property?.furnished ?? false,
      has_elevator: initialData?.has_elevator ?? false,
      has_garden: initialData?.has_garden ?? false,
      has_swimming_pool: initialData?.has_swimming_pool ?? false,
      sale_price: initialData?.sale_price || property?.sale_price || undefined,
      rental_price: initialData?.rental_price || property?.rental_price || undefined,
      description: initialData?.description || property?.description || '',
      notes: '',
      latitude: initialData?.latitude || property?.location_coordinates?.latitude || undefined,
      longitude: initialData?.longitude || property?.location_coordinates?.longitude || undefined,
    },
  });

  // تحديث القيم عند تغيير البيانات الأولية
  useEffect(() => {
    if (initialData) {
      Object.keys(initialData).forEach((key) => {
        const value = initialData[key as keyof PropertyFormData];
        if (value !== undefined) {
          form.setValue(key as keyof PropertyFormData, value);
        }
      });
    }
  }, [initialData, form]);

  const handleSubmit = (data: PropertyFormData) => {
    onSubmit(data);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* معلومات أساسية */}
          <Card>
            <CardHeader>
              <CardTitle>المعلومات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="property_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم العقار</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل اسم العقار" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="property_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم العقار</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل رقم العقار" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العنوان</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل العنوان" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المنطقة</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل المنطقة" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="property_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع العقار</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع العقار" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {propertyTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="condition_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حالة العقار</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حالة العقار" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {conditionOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="owner_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المالك</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المالك" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ownersLoading ? (
                          <SelectItem value="" disabled>
                            جاري التحميل...
                          </SelectItem>
                        ) : (
                          ownerOptions?.map((owner) => (
                            <SelectItem key={owner.value} value={owner.value}>
                              {owner.label} ({owner.code})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* المواصفات */}
          <Card>
            <CardHeader>
              <CardTitle>المواصفات</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="area_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المساحة (م²)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bedrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عدد الغرف</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bathrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عدد الحمامات</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parking_spaces"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>مواقف السيارات</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* الميزات */}
          <Card>
            <CardHeader>
              <CardTitle>الميزات</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="is_furnished"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>مفروش</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="has_elevator"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>مصعد</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="has_garden"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>حديقة</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="has_swimming_pool"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>مسبح</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* الأسعار */}
          <Card>
            <CardHeader>
              <CardTitle>الأسعار</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sale_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>سعر البيع (ريال)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rental_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>سعر الإيجار شهرياً</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* الوصف والملاحظات */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات إضافية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوصف</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="أدخل وصف العقار..."
                        className="resize-none"
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
                        placeholder="أدخل أي ملاحظات إضافية..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* موقع العقار على الخريطة */}
          <MapPicker
            latitude={form.watch('latitude')}
            longitude={form.watch('longitude')}
            onLocationChange={(lat, lng) => {
              form.setValue('latitude', lat);
              form.setValue('longitude', lng);
            }}
          />

          {/* أزرار الإجراءات */}
          <div className="flex justify-end space-x-2 space-x-reverse">
            <Button type="button" variant="outline" onClick={onCancel}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {property ? 'تحديث العقار' : 'إضافة العقار'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};