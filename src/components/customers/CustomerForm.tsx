import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerFormData, useCreateCustomer, useUpdateCustomer } from "@/hooks/useCustomers";

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: any;
  mode: 'create' | 'edit';
}

export function CustomerForm({ open, onOpenChange, customer, mode }: CustomerFormProps) {
  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<CustomerFormData>({
    defaultValues: {
      customer_type: customer?.customer_type || 'individual',
      first_name: customer?.first_name || '',
      last_name: customer?.last_name || '',
      first_name_ar: customer?.first_name_ar || '',
      last_name_ar: customer?.last_name_ar || '',
      company_name: customer?.company_name || '',
      company_name_ar: customer?.company_name_ar || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      alternative_phone: customer?.alternative_phone || '',
      national_id: customer?.national_id || '',
      passport_number: customer?.passport_number || '',
      license_number: customer?.license_number || '',
      address: customer?.address || '',
      address_ar: customer?.address_ar || '',
      city: customer?.city || 'Kuwait City',
      country: customer?.country || 'Kuwait',
      date_of_birth: customer?.date_of_birth || '',
      credit_limit: customer?.credit_limit || 0,
      emergency_contact_name: customer?.emergency_contact_name || '',
      emergency_contact_phone: customer?.emergency_contact_phone || '',
      notes: customer?.notes || ''
    }
  });

  const customerType = watch('customer_type');
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();

  const onSubmit = (data: CustomerFormData) => {
    if (mode === 'create') {
      createCustomerMutation.mutate(data, {
        onSuccess: () => {
          onOpenChange(false);
          reset();
        }
      });
    } else {
      updateCustomerMutation.mutate({
        customerId: customer.id,
        data
      }, {
        onSuccess: () => {
          onOpenChange(false);
        }
      });
    }
  };

  const isLoading = createCustomerMutation.isPending || updateCustomerMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'إضافة عميل جديد' : 'تعديل بيانات العميل'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">البيانات الأساسية</TabsTrigger>
              <TabsTrigger value="additional">بيانات إضافية</TabsTrigger>
              <TabsTrigger value="contact">معلومات الاتصال</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>نوع العميل</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>نوع العميل</Label>
                    <Select 
                      value={customerType} 
                      onValueChange={(value) => setValue('customer_type', value as 'individual' | 'corporate')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">فرد</SelectItem>
                        <SelectItem value="corporate">شركة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {customerType === 'individual' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>الاسم الأول *</Label>
                          <Input 
                            {...register('first_name', { required: 'الاسم الأول مطلوب' })} 
                            placeholder="الاسم الأول"
                          />
                          {errors.first_name && (
                            <p className="text-sm text-red-600">{errors.first_name.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>الاسم الأخير *</Label>
                          <Input 
                            {...register('last_name', { required: 'الاسم الأخير مطلوب' })} 
                            placeholder="الاسم الأخير"
                          />
                          {errors.last_name && (
                            <p className="text-sm text-red-600">{errors.last_name.message}</p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>الاسم الأول (عربي)</Label>
                          <Input {...register('first_name_ar')} placeholder="الاسم الأول بالعربي" />
                        </div>
                        <div className="space-y-2">
                          <Label>الاسم الأخير (عربي)</Label>
                          <Input {...register('last_name_ar')} placeholder="الاسم الأخير بالعربي" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>اسم الشركة *</Label>
                        <Input 
                          {...register('company_name', { 
                            required: customerType === 'corporate' ? 'اسم الشركة مطلوب' : false 
                          })} 
                          placeholder="اسم الشركة"
                        />
                        {errors.company_name && (
                          <p className="text-sm text-red-600">{errors.company_name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>اسم الشركة (عربي)</Label>
                        <Input {...register('company_name_ar')} placeholder="اسم الشركة بالعربي" />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>معلومات الاتصال الأساسية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>رقم الهاتف *</Label>
                      <Input 
                        {...register('phone', { required: 'رقم الهاتف مطلوب' })} 
                        placeholder="+965 XXXXXXXX"
                      />
                      {errors.phone && (
                        <p className="text-sm text-red-600">{errors.phone.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>رقم هاتف بديل</Label>
                      <Input {...register('alternative_phone')} placeholder="+965 XXXXXXXX" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني</Label>
                    <Input 
                      type="email" 
                      {...register('email')} 
                      placeholder="example@email.com"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="additional" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>الهوية والوثائق</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>رقم الهوية المدنية</Label>
                      <Input {...register('national_id')} placeholder="123456789012" />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم جواز السفر</Label>
                      <Input {...register('passport_number')} placeholder="A12345678" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>رقم رخصة القيادة</Label>
                      <Input {...register('license_number')} placeholder="DL123456" />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ الميلاد</Label>
                      <Input 
                        type="date" 
                        {...register('date_of_birth')} 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>معلومات مالية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>الحد الائتماني (د.ك)</Label>
                    <Input 
                      type="number" 
                      step="0.001"
                      {...register('credit_limit', { valueAsNumber: true })} 
                      placeholder="0.000"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>العنوان</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>العنوان (إنجليزي)</Label>
                    <Textarea {...register('address')} placeholder="Address in English" rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>العنوان (عربي)</Label>
                    <Textarea {...register('address_ar')} placeholder="العنوان بالعربي" rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>المدينة</Label>
                      <Input {...register('city')} placeholder="Kuwait City" />
                    </div>
                    <div className="space-y-2">
                      <Label>الدولة</Label>
                      <Input {...register('country')} placeholder="Kuwait" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>جهة اتصال طوارئ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم جهة الاتصال</Label>
                      <Input {...register('emergency_contact_name')} placeholder="اسم الشخص" />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم هاتف الطوارئ</Label>
                      <Input {...register('emergency_contact_phone')} placeholder="+965 XXXXXXXX" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ملاحظات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>ملاحظات إضافية</Label>
                    <Textarea 
                      {...register('notes')} 
                      placeholder="أي ملاحظات إضافية حول العميل..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'جاري الحفظ...' : (mode === 'create' ? 'إضافة العميل' : 'حفظ التغييرات')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}