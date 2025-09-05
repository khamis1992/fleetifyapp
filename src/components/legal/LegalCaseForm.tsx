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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateLegalCase, type LegalCaseFormData } from '@/hooks/useLegalCases';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  case_title: z.string().min(1, 'عنوان القضية مطلوب'),
  case_title_ar: z.string().optional(),
  case_type: z.string().min(1, 'نوع القضية مطلوب'),
  case_status: z.string().min(1, 'حالة القضية مطلوبة'),
  priority: z.string().min(1, 'الأولوية مطلوبة'),
  client_name: z.string().optional(),
  client_phone: z.string().optional(),
  client_email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
  description: z.string().optional(),
  case_value: z.number().min(0, 'قيمة القضية يجب أن تكون أكبر من أو تساوي صفر'),
  court_name: z.string().optional(),
  court_name_ar: z.string().optional(),
  case_reference: z.string().optional(),
  filing_date: z.string().optional(),
  hearing_date: z.string().optional(),
  statute_limitations: z.string().optional(),
  legal_fees: z.number().min(0, 'الأتعاب القانونية يجب أن تكون أكبر من أو تساوي صفر'),
  court_fees: z.number().min(0, 'رسوم المحكمة يجب أن تكون أكبر من أو تساوي صفر'),
  other_expenses: z.number().min(0, 'المصروفات الأخرى يجب أن تكون أكبر من أو تساوي صفر'),
  billing_status: z.string().min(1, 'حالة الفوترة مطلوبة'),
  notes: z.string().optional(),
  is_confidential: z.boolean(),
  police_station: z.string().optional(),
  police_report_number: z.string().optional(),
});

interface LegalCaseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LegalCaseForm: React.FC<LegalCaseFormProps> = ({
  open,
  onOpenChange,
}) => {
  const createMutation = useCreateLegalCase();

  const form = useForm<LegalCaseFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      case_title: '',
      case_title_ar: '',
      case_type: 'civil',
      case_status: 'active',
      priority: 'medium',
      client_name: '',
      client_phone: '',
      client_email: '',
      description: '',
      case_value: 0,
      court_name: '',
      court_name_ar: '',
      case_reference: '',
      filing_date: '',
      hearing_date: '',
      statute_limitations: '',
      legal_fees: 0,
      court_fees: 0,
      other_expenses: 0,
      billing_status: 'pending',
      notes: '',
      is_confidential: false,
      police_station: '',
      police_report_number: '',
      legal_team: [],
      tags: [],
    },
  });

  const onSubmit = (data: LegalCaseFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>قضية قانونية جديدة</DialogTitle>
          <DialogDescription>
            أدخل بيانات القضية القانونية الجديدة
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Information */}
              <div className="col-span-full">
                <h3 className="text-lg font-semibold mb-4">معلومات أساسية</h3>
              </div>

              <FormField
                control={form.control}
                name="case_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان القضية *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="أدخل عنوان القضية" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="case_title_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان القضية (عربي)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="أدخل عنوان القضية باللغة العربية" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="case_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع القضية *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع القضية" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="civil">مدنية</SelectItem>
                        <SelectItem value="criminal">جنائية</SelectItem>
                        <SelectItem value="commercial">تجارية</SelectItem>
                        <SelectItem value="labor">عمالية</SelectItem>
                        <SelectItem value="administrative">إدارية</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="case_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حالة القضية *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حالة القضية" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">نشطة</SelectItem>
                        <SelectItem value="closed">مغلقة</SelectItem>
                        <SelectItem value="suspended">معلقة</SelectItem>
                        <SelectItem value="on_hold">في الانتظار</SelectItem>
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
                    <FormLabel>الأولوية *</FormLabel>
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
                        <SelectItem value="urgent">عاجل</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="case_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>قيمة القضية (د.ك)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.001"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        placeholder="0.000"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Client Information */}
              <div className="col-span-full mt-6">
                <h3 className="text-lg font-semibold mb-4">معلومات العميل</h3>
              </div>

              <FormField
                control={form.control}
                name="client_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم العميل</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="أدخل اسم العميل" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="client_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>هاتف العميل</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="أدخل رقم هاتف العميل" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="client_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>بريد العميل الإلكتروني</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="أدخل البريد الإلكتروني للعميل" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Court Information */}
              <div className="col-span-full mt-6">
                <h3 className="text-lg font-semibold mb-4">معلومات المحكمة</h3>
              </div>

              <FormField
                control={form.control}
                name="court_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المحكمة</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="أدخل اسم المحكمة" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="case_reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم القضية في المحكمة</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="أدخل رقم القضية في المحكمة" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="filing_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ رفع القضية</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hearing_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ الجلسة القادمة</FormLabel>
                    <FormControl>
                      <Input {...field} type="datetime-local" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Financial Information */}
              <div className="col-span-full mt-6">
                <h3 className="text-lg font-semibold mb-4">المعلومات المالية</h3>
              </div>

              <FormField
                control={form.control}
                name="legal_fees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الأتعاب القانونية (د.ك)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.001"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        placeholder="0.000"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="court_fees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رسوم المحكمة (د.ك)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.001"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        placeholder="0.000"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="other_expenses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>مصروفات أخرى (د.ك)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.001"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        placeholder="0.000"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="billing_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حالة الفوترة *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حالة الفوترة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">في الانتظار</SelectItem>
                        <SelectItem value="billed">تم إرسال الفاتورة</SelectItem>
                        <SelectItem value="paid">مدفوعة</SelectItem>
                        <SelectItem value="overdue">متأخرة</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Police Information */}
              <div className="col-span-full mt-6">
                <h3 className="text-lg font-semibold mb-4">معلومات الشرطة</h3>
              </div>

              <FormField
                control={form.control}
                name="police_station"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم مركز الشرطة</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="أدخل اسم مركز الشرطة" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="police_report_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم البلاغ</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="أدخل رقم البلاغ" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Additional Information */}
              <div className="col-span-full mt-6">
                <h3 className="text-lg font-semibold mb-4">معلومات إضافية</h3>
              </div>

              <div className="col-span-full">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>وصف القضية</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="أدخل وصف مفصل للقضية" rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-full">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ملاحظات</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="أدخل أي ملاحظات إضافية" rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="is_confidential"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">قضية سرية</FormLabel>
                      <FormMessage />
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                إنشاء القضية
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};