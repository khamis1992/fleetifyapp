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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PropertyOwner } from '../types';
import { Loader2 } from 'lucide-react';

const ownerSchema = z.object({
  full_name: z.string().min(1, 'الاسم الكامل مطلوب'),
  full_name_ar: z.string().min(1, 'الاسم باللغة العربية مطلوب'),
  owner_code: z.string().min(1, 'رقم المالك مطلوب'),
  national_id: z.string().min(1, 'رقم الهوية مطلوب'),
  phone_number: z.string().min(1, 'رقم الهاتف مطلوب'),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  iban_number: z.string().optional(),
  notes: z.string().optional(),
});

type OwnerFormData = z.infer<typeof ownerSchema>;

interface PropertyOwnerFormProps {
  owner?: PropertyOwner;
  onSubmit: (data: OwnerFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const PropertyOwnerForm: React.FC<PropertyOwnerFormProps> = ({
  owner,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const form = useForm<OwnerFormData>({
    resolver: zodResolver(ownerSchema),
    defaultValues: {
      full_name: owner?.full_name || '',
      full_name_ar: owner?.full_name_ar || '',
      owner_code: owner?.owner_code || '',
      national_id: owner?.civil_id || '',
      phone_number: owner?.phone || '',
      email: owner?.email || '',
      address: owner?.address || '',
      city: '',
      emergency_contact: '',
      emergency_phone: '',
      bank_name: '',
      bank_account: '',
      iban_number: '',
      notes: '',
    },
  });

  const handleSubmit = (data: OwnerFormData) => {
    onSubmit(data);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* معلومات شخصية */}
          <Card>
            <CardHeader>
              <CardTitle>المعلومات الشخصية</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم الكامل (بالإنجليزية)</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل الاسم الكامل" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="full_name_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم الكامل (بالعربية)</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل الاسم الكامل باللغة العربية" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="owner_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم المالك</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل رقم المالك" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="national_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهوية</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل رقم الهوية" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل رقم الهاتف" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل البريد الإلكتروني" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المدينة</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل المدينة" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* العنوان */}
          <Card>
            <CardHeader>
              <CardTitle>العنوان</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العنوان الكامل</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="أدخل العنوان الكامل..."
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

          {/* جهة الاتصال في حالات الطوارئ */}
          <Card>
            <CardHeader>
              <CardTitle>جهة الاتصال في حالات الطوارئ</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="emergency_contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم جهة الاتصال</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل اسم جهة الاتصال" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="emergency_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم هاتف الطوارئ</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل رقم هاتف الطوارئ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* المعلومات المصرفية */}
          <Card>
            <CardHeader>
              <CardTitle>المعلومات المصرفية</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="bank_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم البنك</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل اسم البنك" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bank_account"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الحساب</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل رقم الحساب" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="iban_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الآيبان</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل رقم الآيبان" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ملاحظات */}
          <Card>
            <CardHeader>
              <CardTitle>ملاحظات</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات إضافية</FormLabel>
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

          {/* أزرار الإجراءات */}
          <div className="flex justify-end space-x-2 space-x-reverse">
            <Button type="button" variant="outline" onClick={onCancel}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {owner ? 'تحديث المالك' : 'إضافة المالك'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};