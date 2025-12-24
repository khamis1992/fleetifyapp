import { useState, useMemo, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, ArrowRight, ArrowLeft, Save, Loader2, Car } from "lucide-react";
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
import { VehicleSelector } from "../VehicleSelector";

const STEPS = [
  { id: 1, title: "الوكيل", description: "معلومات المورد" },
  { id: 2, title: "المركبات", description: "اختيار وتوزيع" },
  { id: 3, title: "المالية", description: "التفاصيل المالية" },
  { id: 4, title: "المراجعة", description: "تأكيد وحفظ" },
];

const wizardSchema = z.object({
  vendor_company_name: z.string().min(1, "يجب إدخال اسم الوكيل"),
  vendor_phone: z.string().optional(),
  agreement_number: z.string().min(1, "يجب إدخال رقم الاتفاقية"),
  total_amount: z.number().min(1, "يجب إدخال المبلغ الإجمالي"),
  down_payment: z.number().min(0, "الدفعة المقدمة لا يمكن أن تكون سالبة"),
  number_of_installments: z.number().min(1, "يجب إدخال عدد الأقساط"),
  interest_rate: z.number().min(0).max(100),
  start_date: z.string().min(1, "يجب اختيار تاريخ البداية"),
  agreement_date: z.string().min(1, "يجب اختيار تاريخ الاتفاقية"),
  notes: z.string().optional(),
});

interface VehicleAllocation {
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

  // استرجاع المسودة
  useEffect(() => {
    if (open) {
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
    }
  }, [open, form]);

  // المركبات المتاحة
  const availableVehicles = useMemo(() => {
    if (!vehicles) return [];
    const selectedIds = vehicleAllocations.map(v => v.vehicle_id);
    return vehicles.filter(v => v?.id && !selectedIds.includes(v.id));
  }, [vehicles, vehicleAllocations]);

  const addVehicle = () => {
    setVehicleAllocations(prev => [...prev, { vehicle_id: "", allocated_amount: 0 }]);
  };

  const removeVehicle = (index: number) => {
    setVehicleAllocations(prev => prev.filter((_, i) => i !== index));
  };

  const updateVehicle = (index: number, vehicleId: string) => {
    const vehicle = vehicles?.find(v => v.id === vehicleId);
    setVehicleAllocations(prev => prev.map((v, i) => 
      i === index ? {
        ...v,
        vehicle_id: vehicleId,
        plate_number: vehicle?.plate_number,
        make: vehicle?.make,
        model: vehicle?.model,
        year: vehicle?.year,
      } : v
    ));
  };

  const updateAmount = (index: number, amount: number) => {
    setVehicleAllocations(prev => prev.map((v, i) => 
      i === index ? { ...v, allocated_amount: amount } : v
    ));
  };

  const distributeEqually = () => {
    const { total_amount, down_payment } = watchedValues;
    const amountToDistribute = total_amount - down_payment;
    const count = vehicleAllocations.length;
    if (count === 0) return;

    const perVehicle = Math.round(amountToDistribute / count * 100) / 100;
    setVehicleAllocations(prev => prev.map(v => ({ ...v, allocated_amount: perVehicle })));
  };

  const getRemainingAmount = useCallback(() => {
    const { total_amount, down_payment } = watchedValues;
    const allocated = vehicleAllocations.reduce((sum, v) => sum + (v.allocated_amount || 0), 0);
    return total_amount - down_payment - allocated;
  }, [watchedValues, vehicleAllocations]);

  // التحقق من صحة الخطوة الحالية
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return !!watchedValues.vendor_company_name?.trim();
      case 2:
        return vehicleAllocations.length > 0 && 
               vehicleAllocations.every(v => v.vehicle_id) &&
               Math.abs(getRemainingAmount()) < 0.01;
      case 3:
        return watchedValues.total_amount > 0 && 
               watchedValues.number_of_installments > 0 &&
               !!watchedValues.start_date &&
               !!watchedValues.agreement_number;
      default:
        return true;
    }
  }, [currentStep, watchedValues, vehicleAllocations, getRemainingAmount]);

  const nextStep = () => {
    if (canProceed() && currentStep < 4) {
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
      agreement_number: data.agreement_number,
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
          <Button className="bg-coral-500 hover:bg-coral-600">
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
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Car className="w-5 h-5 text-coral-500" />
                      المركبات المختارة ({vehicleAllocations.length})
                    </h3>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={distributeEqually}>
                        توزيع متساوي
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={addVehicle}>
                        <Plus className="w-4 h-4 ml-1" />
                        إضافة مركبة
                      </Button>
                    </div>
                  </div>

                  {/* ملخص التوزيع */}
                  <div className="p-3 bg-neutral-50 rounded-lg flex justify-between items-center">
                    <span>المبلغ المتبقي للتوزيع:</span>
                    <span className={`font-bold ${Math.abs(getRemainingAmount()) < 0.01 ? 'text-emerald-600' : 'text-coral-600'}`}>
                      {formatCurrency(getRemainingAmount())}
                    </span>
                  </div>

                  {/* قائمة المركبات */}
                  <div className="space-y-3">
                    {vehicleAllocations.map((allocation, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex gap-4 items-start">
                          <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block">المركبة</label>
                            <VehicleSelector
                              vehicles={[
                                ...availableVehicles,
                                ...(allocation.vehicle_id ? 
                                  vehicles?.filter(v => v.id === allocation.vehicle_id) || [] 
                                  : [])
                              ]}
                              selectedVehicleId={allocation.vehicle_id}
                              onSelect={(id) => updateVehicle(index, id)}
                              placeholder="اختر المركبة..."
                              isLoading={vehiclesLoading}
                              error={vehiclesError?.message || null}
                            />
                          </div>
                          <div className="w-48">
                            <label className="text-sm font-medium mb-2 block">المبلغ (ريال قطري)</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={allocation.allocated_amount || ''}
                              onChange={(e) => updateAmount(index, parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="mt-6"
                            onClick={() => removeVehicle(index)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </Card>
                    ))}

                    {vehicleAllocations.length === 0 && (
                      <Card className="p-8 text-center border-dashed">
                        <Car className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
                        <p className="text-neutral-500">لم يتم اختيار أي مركبة بعد</p>
                        <Button type="button" variant="outline" className="mt-4" onClick={addVehicle}>
                          <Plus className="w-4 h-4 ml-2" />
                          إضافة مركبة
                        </Button>
                      </Card>
                    )}
                  </div>
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
              disabled={!canProceed()}
              className="bg-coral-500 hover:bg-coral-600"
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

