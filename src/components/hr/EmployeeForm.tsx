import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, User, UserPlus, Shield, Lock, Send, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useHRSettings } from '@/hooks/useHRSettings';
import { cn, formatCurrency } from '@/lib/utils';

const employeeSchema = z.object({
  employee_number: z.string().min(1, 'رقم الموظف مطلوب'),
  first_name: z.string().min(1, 'الاسم الأول مطلوب'),
  last_name: z.string().min(1, 'اسم العائلة مطلوب'),
  first_name_ar: z.string().optional(),
  last_name_ar: z.string().optional(),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
  phone: z.string().optional(),
  position: z.string().optional(),
  position_ar: z.string().optional(),
  department: z.string().optional(),
  department_ar: z.string().optional(),
  hire_date: z.date({
    required_error: 'تاريخ التوظيف مطلوب',
  }),
  basic_salary: z.number().min(0, 'الراتب الأساسي يجب أن يكون أكبر من أو يساوي 0'),
  allowances: z.number().min(0, 'البدلات يجب أن تكون أكبر من أو تساوي 0').optional(),
  national_id: z.string().optional(),
  address: z.string().optional(),
  address_ar: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  bank_account: z.string().optional(),
  iban: z.string().optional(),
  notes: z.string().optional(),
  // Account creation fields
  createAccount: z.boolean().optional(),
  accountEmail: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
  accountRoles: z.array(z.string()).optional(),
  creationMethod: z.enum(['direct', 'email']).optional(),
  accountNotes: z.string().optional(),
  accountSetPassword: z.boolean().optional(),
  accountPassword: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل').optional(),
  accountPasswordConfirm: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.createAccount && data.creationMethod === 'direct' && data.accountSetPassword) {
    if (!data.accountPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['accountPassword'], message: 'يرجى إدخال كلمة المرور' });
    } else if (data.accountPassword.length < 8) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['accountPassword'], message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    }
    if (data.accountPassword !== data.accountPasswordConfirm) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['accountPasswordConfirm'], message: 'تأكيد كلمة المرور غير مطابق' });
    }
  }
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  onSubmit: (data: EmployeeFormData) => void;
  isLoading?: boolean;
  initialData?: Partial<EmployeeFormData>;
}

const availableRoles = [
  { value: 'company_admin', label: 'مدير الشركة', description: 'صلاحيات كاملة لإدارة الشركة' },
  { value: 'manager', label: 'مدير', description: 'صلاحيات إدارية محدودة' },
  { value: 'sales_agent', label: 'مندوب مبيعات', description: 'إدارة العملاء والمبيعات' },
  { value: 'employee', label: 'موظف', description: 'صلاحيات محدودة للاستعلام' },
];

export default function EmployeeForm({ onSubmit, isLoading, initialData }: EmployeeFormProps) {
  const { settings: hrSettings } = useHRSettings();
  
  // Calculate suggested salary based on HR settings
  const getDefaultSalary = () => {
    if (hrSettings && hrSettings.daily_working_hours && hrSettings.working_days_per_week) {
      // Example: minimum wage calculation based on working hours
      const monthlyHours = hrSettings.daily_working_hours * hrSettings.working_days_per_week * 4.33;
      return Math.round(monthlyHours * 3); // 3 KWD per hour as example minimum
    }
    return 300; // Default minimum salary
  };

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      basic_salary: initialData?.basic_salary || getDefaultSalary(),
      allowances: 0,
      hire_date: new Date(),
      createAccount: false,
      accountRoles: ['employee'],
      creationMethod: 'direct',
      accountSetPassword: false,
      ...initialData,
    },
  });

  // Reset form when initialData changes
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        basic_salary: 0,
        allowances: 0,
        hire_date: new Date(),
        createAccount: false,
        accountRoles: ['employee'],
        creationMethod: 'direct',
        ...initialData,
      });
    }
  }, [initialData, form]);

  const createAccount = form.watch('createAccount');
  const creationMethod = form.watch('creationMethod');
  const accountRoles = form.watch('accountRoles') || [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="employee_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>رقم الموظف *</FormLabel>
                <FormControl>
                  <Input placeholder="أدخل رقم الموظف" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الاسم الأول *</FormLabel>
                <FormControl>
                  <Input placeholder="أدخل الاسم الأول" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>اسم العائلة *</FormLabel>
                <FormControl>
                  <Input placeholder="أدخل اسم العائلة" {...field} />
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
                  <Input type="email" placeholder="أدخل البريد الإلكتروني" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
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
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>المنصب</FormLabel>
                <FormControl>
                  <Input placeholder="أدخل المنصب" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>القسم</FormLabel>
                <FormControl>
                  <Input placeholder="أدخل القسم" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hire_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>تاريخ التوظيف *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-right font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>اختر التاريخ</span>
                        )}
                        <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="basic_salary"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  الراتب الأساسي *
                  {hrSettings && (
                    <span className="text-xs text-muted-foreground">
                      (مقترح: {formatCurrency(getDefaultSalary())})
                    </span>
                  )}
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.001"
                    placeholder={`أدخل الراتب الأساسي (مقترح: ${getDefaultSalary()})`}
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
                {hrSettings && (
                  <p className="text-xs text-muted-foreground">
                    بناءً على {hrSettings.daily_working_hours} ساعات يومياً × {hrSettings.working_days_per_week} أيام أسبوعياً
                  </p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="allowances"
            render={({ field }) => (
              <FormItem>
                <FormLabel>البدلات</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.001"
                    placeholder="أدخل البدلات" 
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
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
                <FormLabel>الرقم المدني</FormLabel>
                <FormControl>
                  <Input placeholder="أدخل الرقم المدني" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="emergency_contact_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>اسم جهة الاتصال الطارئة</FormLabel>
                <FormControl>
                  <Input placeholder="أدخل اسم جهة الاتصال الطارئة" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="emergency_contact_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>هاتف جهة الاتصال الطارئة</FormLabel>
                <FormControl>
                  <Input placeholder="أدخل هاتف جهة الاتصال الطارئة" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>العنوان</FormLabel>
                <FormControl>
                  <Textarea placeholder="أدخل العنوان" {...field} />
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
                  <Textarea placeholder="أدخل أي ملاحظات إضافية" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator className="my-6" />

        {/* Account Creation Section */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              إنشاء حساب في النظام
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <FormField
                control={form.control}
                name="createAccount"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-x-reverse">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-medium">
                      إنشاء حساب مستخدم للموظف
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {createAccount && (
              <div className="space-y-4 bg-background/50 p-4 rounded-lg border">
                {/* Account Email */}
                <FormField
                  control={form.control}
                  name="accountEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني للحساب *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="user@company.com" 
                          {...field}
                          dir="ltr"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Creation Method */}
                <FormField
                  control={form.control}
                  name="creationMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>طريقة إنشاء الحساب</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="space-y-3"
                        >
                          <div className="flex items-start space-x-3 space-x-reverse">
                            <RadioGroupItem value="direct" id="direct" className="mt-1" />
                            <div className="grid gap-1.5 leading-none">
                              <label htmlFor="direct" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                                <UserPlus className="w-4 h-4" />
                                إنشاء حساب مباشر (موصى به)
                              </label>
                              <p className="text-xs text-muted-foreground">
                                إنشاء الحساب فوراً مع كلمة مرور مؤقتة
                              </p>
                            </div>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {creationMethod === 'direct' && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id="accountSetPassword"
                        checked={!!form.watch('accountSetPassword')}
                        onCheckedChange={(checked) => form.setValue('accountSetPassword', !!checked)}
                      />
                      <FormLabel htmlFor="accountSetPassword">تعيين كلمة المرور يدوياً</FormLabel>
                    </div>

                    {form.watch('accountSetPassword') ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="accountPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>كلمة المرور</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" dir="ltr" {...field} />
                              </FormControl>
                              <p className="text-xs text-muted-foreground mt-1">الحد الأدنى 8 أحرف</p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="accountPasswordConfirm"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>تأكيد كلمة المرور</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" dir="ltr" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ) : (
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                        <p className="text-sm text-blue-700">
                          <Lock className="w-4 h-4 inline mr-1" />
                          سيتم إنشاء كلمة مرور مؤقتة وعرضها لك بعد إضافة الموظف
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Roles */}
                <div className="space-y-3">
                  <FormLabel className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    الأدوار والصلاحيات
                  </FormLabel>
                  <FormField
                    control={form.control}
                    name="accountRoles"
                    render={() => (
                      <div className="grid gap-3">
                        {availableRoles.map((role) => (
                          <FormField
                            key={role.value}
                            control={form.control}
                            name="accountRoles"
                            render={({ field }) => (
                              <FormItem
                                key={role.value}
                                className="flex flex-row items-start space-x-3 space-x-reverse space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(role.value)}
                                    onCheckedChange={(checked) => {
                                      const currentRoles = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentRoles, role.value]);
                                      } else {
                                        field.onChange(currentRoles.filter((r) => r !== role.value));
                                      }
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm font-medium">
                                    {role.label}
                                  </FormLabel>
                                  <p className="text-xs text-muted-foreground">
                                    {role.description}
                                  </p>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    )}
                  />
                </div>

                {/* Account Notes */}
                <FormField
                  control={form.control}
                  name="accountNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ملاحظات الحساب (اختياري)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="أي ملاحظات إضافية حول إنشاء الحساب..." 
                          {...field}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pt-6">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'جاري الحفظ...' : createAccount ? 'حفظ الموظف وإنشاء الحساب' : 'حفظ الموظف'}
          </Button>
        </div>
      </form>
    </Form>
  );
}