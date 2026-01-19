import { useState, useMemo, useCallback, useEffect, useTransition, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ArrowLeft, Save, Loader2, Car, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useCreateVehicleInstallment } from "@/hooks/useVehicleInstallments";
import { useVehicles } from "@/hooks/useVehicles";
import { useCurrentCompanyId } from "@/hooks/useUnifiedCompanyAccess";
import type { VehicleInstallmentCreateData } from "@/types/vehicle-installments";
import { toast } from "sonner";

import { StepIndicator } from "./StepIndicator";
import { FinancialSummary } from "./FinancialSummary";
import { VendorAutoSuggest } from "./VendorAutoSuggest";
import { InstallmentCalendar } from "./InstallmentCalendar";
import { AgreementPreview } from "./AgreementPreview";
import { VehicleBulkSelector } from "./VehicleBulkSelector";

const STEPS = [
  { id: 1, title: "الوكيل", description: "معلومات المورد" },
  { id: 2, title: "المركبات", description: "اختيار وتوزيع" },
  { id: 3, title: "المالية", description: "التفاصيل المالية" },
  { id: 4, title: "المراجعة", description: "تأكيد وحفظ" },
];

const wizardSchema = z.object({
  vendor_company_name: z.string().min(1, "يجب إدخال اسم الوكيل"),
  vendor_phone: z.string().optional(),
  agreement_number: z.string().optional(), // Made optional - will auto-generate if empty
  total_amount: z.number().min(1, "يجب إدخال المبلغ الإجمالي"),
  down_payment: z.number().min(0, "الدفعة المقدمة لا يمكن أن تكون سالبة"),
  number_of_installments: z.number().min(1, "يجب إدخال عدد الأقساط"),
  interest_rate: z.number().min(0).max(100),
  start_date: z.string().min(1, "يجب اختيار تاريخ البداية"),
  agreement_date: z.string().min(1, "يجب اختيار تاريخ الاتفاقية"),
  notes: z.string().optional(),
});

interface VehicleAllocation {
  id: string; // Required for VehicleBulkSelector compatibility
  vehicle_id: string;
  allocated_amount: number;
  plate_number?: string;
  make?: string;
  model?: string;
  year?: number;
}

interface MultiVehicleWizardProps {
  trigger?: React.ReactNode;
}

const DRAFT_KEY = 'vehicle_installment_draft';

export default function MultiVehicleWizard({ trigger }: MultiVehicleWizardProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [vehicleAllocations, setVehicleAllocations] = useState<VehicleAllocation[]>([]);
  const [isPending, startTransition] = useTransition();
  const lastSelectionRef = useRef<Set<string>>(new Set());
  const { formatCurrency } = useCurrencyFormatter();
  
  const companyId = useCurrentCompanyId();
  const createInstallment = useCreateVehicleInstallment();

  const form = useForm<z.infer<typeof wizardSchema>>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      vendor_company_name: "",
      vendor_phone: "",
      agreement_number: "",
      total_amount: 0,
      down_payment: 0,
      number_of_installments: 12,
      interest_rate: 0,
      start_date: new Date().toISOString().split('T')[0],
      agreement_date: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });

  const { data: vehicles, isLoading: vehiclesLoading, error: vehiclesError } = useVehicles();

  const watchedValues = form.watch();

  // حساب مبلغ القسط
  const installmentAmount = useMemo(() => {
    const { total_amount, down_payment, number_of_installments, interest_rate } = watchedValues;
    const principal = total_amount - down_payment;
    const monthlyRate = interest_rate / 12 / 100;

    if (monthlyRate > 0 && number_of_installments > 0) {
      const denom = Math.pow(1 + monthlyRate, number_of_installments) - 1;
      return Math.round(
        (principal * monthlyRate * Math.pow(1 + monthlyRate, number_of_installments)) / denom * 100
      ) / 100;
    }
    return number_of_installments > 0 ? Math.round(principal / number_of_installments * 100) / 100 : 0;
  }, [watchedValues]);

  // توزيع المبلغ تلقائياً عند تغيير إجمالي العقد أو الدفعة المقدمة
  // ملاحظة: تم إزالة التحديث التلقائي لتجنب الحلقة اللانهائية
  // التوزيع يتم عند الانتقال من الخطوة 2 إلى 3 فقط

  // حفظ المسودة تلقائياً
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      if (open && (watchedValues.vendor_company_name || vehicleAllocations.length > 0)) {
        const draft = {
          formData: watchedValues,
          vehicleAllocations,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }
    }, 1000);

    return () => clearTimeout(saveTimeout);
  }, [watchedValues, vehicleAllocations, open]);

  // استرجاع المسودة - يتم مرة واحدة فقط عند فتح النافذة
  const [draftRestored, setDraftRestored] = useState(false);
  
  useEffect(() => {
    if (open && !draftRestored) {
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          const savedTime = new Date(draft.savedAt);
          const now = new Date();
          const hoursDiff = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);
          
          // استرجاع المسودة إذا كانت محفوظة خلال 24 ساعة
          if (hoursDiff < 24) {
            toast.info("تم استرجاع المسودة المحفوظة", {
              action: {
                label: "مسح",
                onClick: () => {
                  localStorage.removeItem(DRAFT_KEY);
                  form.reset();
                  setVehicleAllocations([]);
                },
              },
            });
            Object.entries(draft.formData).forEach(([key, value]) => {
              form.setValue(key as any, value as any);
            });
            setVehicleAllocations(draft.vehicleAllocations || []);
          }
        } catch {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
      setDraftRestored(true);
    }
    
    // إعادة تعيين العلم عند إغلاق النافذة
    if (!open) {
      setDraftRestored(false);
    }
  }, [open, draftRestored]);


  // توزيع المبلغ تلقائياً على المركبات
  const autoDistributeAmount = useCallback(() => {
    const { total_amount, down_payment } = watchedValues;
    const count = vehicleAllocations.length;
    if (count === 0 || total_amount <= 0) return;

    const amountToDistribute = total_amount - down_payment;
    const perVehicle = Math.round(amountToDistribute / count * 100) / 100;
    
    setVehicleAllocations(prev => prev.map(v => ({ ...v, allocated_amount: perVehicle })));
  }, [watchedValues, vehicleAllocations.length]);

  // التحقق من صحة الخطوة الحالية - تم تبسيطها v2
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return !!watchedValues.vendor_company_name?.trim();
      case 2:
        // فقط التحقق من اختيار مركبات
        return vehicleAllocations.length > 0 && 
               vehicleAllocations.every(v => v.vehicle_id);
      case 3:
      case 4:
        // الخطوات 3 و 4 دائماً متاحة - التحقق النهائي يتم عند الحفظ
        return true;
      default:
        return true;
    }
  }, [currentStep, watchedValues, vehicleAllocations]);

  const nextStep = () => {
    if (canProceed() && currentStep < 4) {
      // عند الانتقال من اختيار المركبات إلى التفاصيل المالية
      if (currentStep === 2) {
        // توزيع المبلغ تلقائياً إذا كان هناك مبلغ محدد
        autoDistributeAmount();
      }
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    toast.info("جاري تحضير ملف PDF...");
    // يمكن إضافة مكتبة مثل jspdf أو html2pdf لاحقاً
    window.print();
  };

  const onSubmit = async () => {
    if (!companyId || !user) {
      toast.error("تعذر تحديد الشركة");
      return;
    }

    const data = form.getValues();

    // التحقق من البيانات الأساسية
    if (!data.vendor_company_name?.trim()) {
      toast.error("يجب إدخال اسم الوكيل");
      return;
    }
    if (vehicleAllocations.length === 0) {
      toast.error("يجب اختيار مركبة واحدة على الأقل");
      return;
    }
    if (data.total_amount <= 0) {
      toast.error("يجب إدخال المبلغ الإجمالي");
      return;
    }
    if (data.number_of_installments <= 0) {
      toast.error("يجب إدخال عدد الأقساط");
      return;
    }

    // إنشاء رقم اتفاقية تلقائي إذا كان فارغاً
    const agreementNumber = data.agreement_number?.trim() || 
      `INST-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // إنشاء/البحث عن الوكيل
    let vendorId: string | null = null;
    try {
      const companyName = data.vendor_company_name.trim();

      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', companyId)
        .ilike('company_name', companyName)
        .maybeSingle();

      if (existing?.id) {
        vendorId = existing.id;
      } else {
        const { data: created, error } = await supabase
          .from('customers')
          .insert({
            company_id: companyId,
            customer_type: 'corporate',
            company_name: companyName,
            phone: data.vendor_phone?.trim() || '',
            created_by: user.id,
          } as any)
          .select('id')
          .single();

        if (error) throw error;
        vendorId = created.id;
        toast.success(`تم إنشاء وكيل جديد: ${companyName}`);
      }
    } catch (e: any) {
      toast.error(e.message || "خطأ في تحديد الوكيل");
      return;
    }

    const formData: VehicleInstallmentCreateData = {
      vendor_id: vendorId!,
      vehicle_ids: vehicleAllocations.map(v => v.vehicle_id),
      vehicle_amounts: vehicleAllocations.reduce((acc, v) => {
        acc[v.vehicle_id] = v.allocated_amount;
        return acc;
      }, {} as { [key: string]: number }),
      agreement_number: agreementNumber,
      total_amount: data.total_amount,
      down_payment: data.down_payment,
      installment_amount: installmentAmount,
      number_of_installments: data.number_of_installments,
      interest_rate: data.interest_rate,
      start_date: data.start_date,
      end_date: new Date(new Date(data.start_date).setMonth(
        new Date(data.start_date).getMonth() + data.number_of_installments
      )).toISOString().split('T')[0],
      agreement_date: data.agreement_date,
      notes: data.notes,
      contract_type: 'multi_vehicle',
    };

    try {
      await createInstallment.mutateAsync(formData);
      localStorage.removeItem(DRAFT_KEY);
      setOpen(false);
      form.reset();
      setVehicleAllocations([]);
      setCurrentStep(1);
    } catch (e: any) {
      toast.error(e.message || "خطأ في حفظ الاتفاقية");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-rose-500 hover:bg-coral-600">
            <Plus className="w-4 h-4 ml-2" />
            إنشاء عقد أقساط متعدد المركبات
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl h-[85vh] overflow-hidden flex flex-col p-0">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-xl">
              إنشاء عقد أقساط متعدد المركبات
            </DialogTitle>
          </DialogHeader>

          {/* مؤشر التقدم */}
          <StepIndicator steps={STEPS} currentStep={currentStep} />
        </div>

        <ScrollArea className="flex-1 px-6 overflow-y-auto">
          <Form {...form}>
            <form className="space-y-6 py-4">
              
              {/* الخطوة 1: معلومات الوكيل */}
              {currentStep === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>معلومات الوكيل / المورد</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <VendorAutoSuggest
                      companyId={companyId || ""}
                      value={watchedValues.vendor_company_name}
                      phone={watchedValues.vendor_phone || ""}
                      onChange={(name, phone) => {
                        form.setValue('vendor_company_name', name);
                        form.setValue('vendor_phone', phone);
                      }}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="agreement_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>رقم الاتفاقية</FormLabel>
                            <FormControl>
                              <Input placeholder="INST-2024-001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="agreement_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>تاريخ الاتفاقية</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* الخطوة 2: اختيار المركبات */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  {/* عنوان الخطوة */}
                  <div className="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-100">
                    <div className="flex items-center gap-2">
                      <Car className="w-5 h-5 text-rose-500" />
                      <span className="font-medium text-coral-700">اختيار المركبات للعقد</span>
                    </div>
                    <span className="text-sm text-coral-600">
                      سيتم توزيع المبلغ تلقائياً في الخطوة التالية
                    </span>
                  </div>

                  {/* مكون اختيار المركبات الجماعي */}
                  <VehicleBulkSelector
                    vehicles={vehicles || []}
                    selectedVehicles={vehicleAllocations}
                    onSelectionChange={(selected) => {
                      // منع التحديث إذا كانت البيانات متطابقة
                      const newIds = new Set(selected.map(v => v.id));
                      
                      // تحقق من التطابق مع آخر تحديد
                      if (newIds.size === lastSelectionRef.current.size && 
                          [...newIds].every(id => lastSelectionRef.current.has(id))) {
                        return; // لا تحديث مطلوب
                      }
                      
                      // تحديث المرجع
                      lastSelectionRef.current = newIds;
                      
                      // استخدام startTransition لتأجيل التحديث الكبير
                      startTransition(() => {
                        setVehicleAllocations(selected.map(v => ({
                          id: v.id,
                          vehicle_id: v.id,
                          allocated_amount: 0,
                          plate_number: v.plate_number,
                          make: v.make,
                          model: v.model,
                          year: v.year,
                        })));
                      });
                    }}
                    isLoading={vehiclesLoading || isPending}
                    hideAmountInput={true}
                  />
                </div>
              )}

              {/* الخطوة 3: التفاصيل المالية */}
              {currentStep === 3 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>التفاصيل المالية</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="total_amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>المبلغ الإجمالي (ريال قطري)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
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
                          name="down_payment"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>الدفعة المقدمة (ريال قطري)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
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
                          name="number_of_installments"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>عدد الأقساط</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="interest_rate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>معدل الفائدة السنوي (%)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
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
                          name="start_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>تاريخ بداية الأقساط</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ملاحظات</FormLabel>
                            <FormControl>
                              <Textarea placeholder="ملاحظات إضافية..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <FinancialSummary
                      totalAmount={watchedValues.total_amount}
                      downPayment={watchedValues.down_payment}
                      numberOfInstallments={watchedValues.number_of_installments}
                      interestRate={watchedValues.interest_rate}
                      startDate={watchedValues.start_date}
                      vehicleCount={vehicleAllocations.length}
                    />

                    {/* ملخص توزيع المركبات */}
                    {vehicleAllocations.length > 0 && watchedValues.total_amount > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Car className="w-4 h-4 text-rose-500" />
                            توزيع المبلغ على المركبات ({vehicleAllocations.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {vehicleAllocations.slice(0, 5).map((v, idx) => (
                              <div key={v.vehicle_id || idx} className="flex justify-between text-sm">
                                <span className="text-neutral-600 truncate max-w-[60%]">
                                  {v.plate_number || `مركبة ${idx + 1}`}
                                </span>
                                <span className="font-medium text-coral-600">
                                  {formatCurrency(v.allocated_amount)}
                                </span>
                              </div>
                            ))}
                            {vehicleAllocations.length > 5 && (
                              <div className="text-xs text-neutral-400 text-center pt-1 border-t">
                                + {vehicleAllocations.length - 5} مركبات أخرى
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between font-semibold text-sm mt-3 pt-2 border-t">
                            <span>إجمالي الموزع:</span>
                            <span className="text-emerald-600">
                              {formatCurrency(vehicleAllocations.reduce((sum, v) => sum + (v.allocated_amount || 0), 0))}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <InstallmentCalendar
                      startDate={watchedValues.start_date}
                      numberOfInstallments={watchedValues.number_of_installments}
                      installmentAmount={installmentAmount}
                    />
                  </div>
                </div>
              )}

              {/* الخطوة 4: المراجعة والحفظ */}
              {currentStep === 4 && (
                <AgreementPreview
                  vendorName={watchedValues.vendor_company_name}
                  vendorPhone={watchedValues.vendor_phone || ""}
                  agreementNumber={watchedValues.agreement_number}
                  agreementDate={watchedValues.agreement_date}
                  totalAmount={watchedValues.total_amount}
                  downPayment={watchedValues.down_payment}
                  numberOfInstallments={watchedValues.number_of_installments}
                  interestRate={watchedValues.interest_rate}
                  startDate={watchedValues.start_date}
                  installmentAmount={installmentAmount}
                  vehicles={vehicleAllocations.map(v => ({
                    id: v.vehicle_id,
                    plate_number: v.plate_number || "",
                    make: v.make,
                    model: v.model,
                    year: v.year,
                    allocated_amount: v.allocated_amount,
                  }))}
                  notes={watchedValues.notes}
                  onPrint={handlePrint}
                  onExportPDF={handleExportPDF}
                />
              )}

            </form>
          </Form>
        </ScrollArea>

        {/* أزرار التنقل */}
        <div className="flex justify-between p-6 pt-4 border-t bg-white">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowRight className="w-4 h-4 ml-2" />
            السابق
          </Button>

          {currentStep < 4 ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={currentStep !== 3 && !canProceed()}
              className="bg-rose-500 hover:bg-coral-600"
            >
              التالي
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={createInstallment.isPending}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {createInstallment.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  حفظ الاتفاقية
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

