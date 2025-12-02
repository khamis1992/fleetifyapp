import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { Plus, Calendar, AlertTriangle, Shield, FileText } from "lucide-react";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { format } from "date-fns";
import { useVehicleInsurance, useCreateVehicleInsurance } from "@/hooks/useVehicleInsurance";
import { useVehicleRegistration, useCreateVehicleRegistration } from "@/hooks/useVehicleDocuments";
import { Skeleton } from "@/components/ui/skeleton";

interface VehicleInsurancePanelProps {
  vehicleId: string;
}

interface InsuranceFormData {
  insurance_company: string;
  policy_number: string;
  coverage_type: string;
  start_date: string;
  end_date: string;
  premium_amount: number;
  coverage_amount?: number;
  deductible_amount?: number;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
}

interface RegistrationFormData {
  document_name: string;
  document_number: string;
  issue_date: string;
  expiry_date: string;
  issuing_authority: string;
  document_url?: string;
}

export function VehicleInsurancePanel({ vehicleId }: VehicleInsurancePanelProps) {
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  
  const { data: insurance, isLoading: insuranceLoading } = useVehicleInsurance(vehicleId);
  const { data: registration, isLoading: registrationLoading } = useVehicleRegistration(vehicleId);
  
  const createInsurance = useCreateVehicleInsurance();
  const createRegistration = useCreateVehicleRegistration();
  
  const { formatCurrency } = useCurrencyFormatter();

  const insuranceForm = useForm<InsuranceFormData>({
    defaultValues: {
      insurance_company: "",
      policy_number: "",
      coverage_type: "comprehensive",
      start_date: new Date().toISOString().split('T')[0],
      end_date: "",
      premium_amount: 0,
      coverage_amount: 0,
      deductible_amount: 0,
      contact_person: "",
      contact_phone: "",
      contact_email: "",
      notes: "",
    }
  });

  const registrationForm = useForm<RegistrationFormData>({
    defaultValues: {
      document_name: "استمارة المركبة",
      document_number: "",
      issue_date: new Date().toISOString().split('T')[0],
      expiry_date: "",
      issuing_authority: "إدارة المرور",
      document_url: "",
    }
  });

  const onInsuranceSubmit = async (data: InsuranceFormData) => {
    await createInsurance.mutateAsync({
      vehicle_id: vehicleId,
      is_active: true,
      ...data,
    });
    setShowInsuranceForm(false);
    insuranceForm.reset();
  };

  const onRegistrationSubmit = async (data: RegistrationFormData) => {
    await createRegistration.mutateAsync({
      vehicle_id: vehicleId,
      document_type: 'registration',
      is_active: true,
      ...data,
    });
    setShowRegistrationForm(false);
    registrationForm.reset();
  };

  const isLoading = insuranceLoading || registrationLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-3 bg-muted rounded-lg">
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-5 w-28" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeInsurance = insurance?.find(p => p.is_active);
  const activeRegistration = registration?.find(r => r.is_active);
  
  const isInsuranceExpiringSoon = activeInsurance && new Date(activeInsurance.end_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const isRegistrationExpiringSoon = activeRegistration && new Date(activeRegistration.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">التأمين والاستمارة</CardTitle>
            <CardDescription>إدارة بوالص التأمين واستمارة المركبة وتواريخ التجديد</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="insurance" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="insurance" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              التأمين
              {isInsuranceExpiringSoon && <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center">!</Badge>}
            </TabsTrigger>
            <TabsTrigger value="registration" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              الاستمارة
              {isRegistrationExpiringSoon && <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center">!</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Insurance Tab */}
          <TabsContent value="insurance" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showInsuranceForm} onOpenChange={setShowInsuranceForm}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-coral-500 hover:bg-coral-600">
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة تأمين
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl bg-[#f8f7f5] border-0 shadow-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader className="pb-3 border-b border-neutral-200 sticky top-0 bg-[#f8f7f5] z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-coral-500 to-orange-500 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <DialogTitle className="text-lg font-bold text-neutral-900">إضافة بوليصة تأمين</DialogTitle>
                        <DialogDescription className="text-neutral-500 text-xs">
                          تسجيل بيانات التأمين
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>
                  <form onSubmit={insuranceForm.handleSubmit(onInsuranceSubmit)} className="space-y-3 pt-3">
                    {/* Basic Info + Financial in one section */}
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-neutral-100">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="insurance_company" className="text-neutral-600 text-xs">شركة التأمين *</Label>
                          <Input
                            id="insurance_company"
                            placeholder="اسم الشركة"
                            className="h-9 text-sm bg-neutral-50 border-neutral-200 focus:border-coral-500"
                            {...insuranceForm.register("insurance_company", { required: true })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="policy_number" className="text-neutral-600 text-xs">رقم البوليصة *</Label>
                          <Input
                            id="policy_number"
                            placeholder="رقم البوليصة"
                            className="h-9 text-sm bg-neutral-50 border-neutral-200 focus:border-coral-500"
                            {...insuranceForm.register("policy_number", { required: true })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="coverage_type" className="text-neutral-600 text-xs">نوع التأمين</Label>
                          <select
                            id="coverage_type"
                            className="w-full h-9 px-2 text-sm rounded-md bg-neutral-50 border border-neutral-200 focus:border-coral-500 outline-none"
                            {...insuranceForm.register("coverage_type")}
                          >
                            <option value="comprehensive">شامل</option>
                            <option value="third_party">طرف ثالث</option>
                            <option value="collision">تصادم</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Financial + Dates combined */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-lg p-3 shadow-sm border border-neutral-100">
                        <h4 className="text-xs font-medium text-neutral-500 mb-2">المعلومات المالية</h4>
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-neutral-600 text-[10px]">القسط</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                className="h-8 text-sm bg-neutral-50 border-neutral-200"
                                {...insuranceForm.register("premium_amount", { valueAsNumber: true })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-neutral-600 text-[10px]">التغطية</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                className="h-8 text-sm bg-neutral-50 border-neutral-200"
                                {...insuranceForm.register("coverage_amount", { valueAsNumber: true })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-neutral-600 text-[10px]">التحمل</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                className="h-8 text-sm bg-neutral-50 border-neutral-200"
                                {...insuranceForm.register("deductible_amount", { valueAsNumber: true })}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-3 shadow-sm border border-neutral-100">
                        <h4 className="text-xs font-medium text-neutral-500 mb-2">فترة التأمين</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-neutral-600 text-[10px]">من</Label>
                            <Input
                              type="date"
                              className="h-8 text-sm bg-neutral-50 border-neutral-200"
                              {...insuranceForm.register("start_date")}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-neutral-600 text-[10px]">إلى</Label>
                            <Input
                              type="date"
                              className="h-8 text-sm bg-neutral-50 border-neutral-200"
                              {...insuranceForm.register("end_date")}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Info - Collapsible style */}
                    <details className="bg-white rounded-lg shadow-sm border border-neutral-100 group">
                      <summary className="p-3 cursor-pointer text-xs font-medium text-neutral-500 hover:text-neutral-700 list-none flex items-center justify-between">
                        <span>بيانات الاتصال (اختياري)</span>
                        <span className="text-[10px] text-neutral-400">انقر للتوسيع</span>
                      </summary>
                      <div className="px-3 pb-3 grid grid-cols-3 gap-2">
                        <Input
                          placeholder="شخص الاتصال"
                          className="h-8 text-sm bg-neutral-50 border-neutral-200"
                          {...insuranceForm.register("contact_person")}
                        />
                        <Input
                          placeholder="رقم الهاتف"
                          className="h-8 text-sm bg-neutral-50 border-neutral-200"
                          {...insuranceForm.register("contact_phone")}
                          dir="ltr"
                        />
                        <Input
                          type="email"
                          placeholder="البريد الإلكتروني"
                          className="h-8 text-sm bg-neutral-50 border-neutral-200"
                          {...insuranceForm.register("contact_email")}
                        />
                      </div>
                    </details>

                    {/* Notes - smaller */}
                    <textarea
                      className="w-full p-2 text-sm rounded-lg bg-white border border-neutral-200 focus:border-coral-500 outline-none resize-none"
                      rows={2}
                      placeholder="ملاحظات (اختياري)..."
                      {...insuranceForm.register("notes")}
                    />

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowInsuranceForm(false)}
                        className="px-4 border-neutral-300 text-neutral-600"
                      >
                        إلغاء
                      </Button>
                      <Button 
                        type="submit" 
                        size="sm"
                        disabled={createInsurance.isPending}
                        className="px-4 bg-gradient-to-r from-coral-500 to-orange-500 hover:from-coral-600 hover:to-orange-600 text-white"
                      >
                        {createInsurance.isPending ? "جاري الحفظ..." : "حفظ"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {activeInsurance ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    التأمين الحالي
                  </h4>
                  <div className="flex gap-2">
                    <Badge variant="default" className="bg-green-100 text-green-700">نشط</Badge>
                    {isInsuranceExpiringSoon && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 ml-1" />
                        ينتهي قريباً
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">شركة التأمين</p>
                    <p className="font-semibold">{activeInsurance.insurance_company}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">رقم البوليصة</p>
                    <p className="font-semibold">{activeInsurance.policy_number}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">نوع التأمين</p>
                    <p className="font-semibold">
                      {activeInsurance.coverage_type === 'comprehensive' ? 'شامل' : 
                       activeInsurance.coverage_type === 'third_party' ? 'طرف ثالث' : 'تصادم'}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">قسط التأمين</p>
                    <p className="font-semibold">{formatCurrency(activeInsurance.premium_amount)}</p>
                  </div>
                  {activeInsurance.coverage_amount && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">مبلغ التغطية</p>
                      <p className="font-semibold">{formatCurrency(activeInsurance.coverage_amount)}</p>
                    </div>
                  )}
                  {activeInsurance.deductible_amount && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">مبلغ التحمل</p>
                      <p className="font-semibold">{formatCurrency(activeInsurance.deductible_amount)}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 ml-2" />
                  ساري من {format(new Date(activeInsurance.start_date), 'dd/MM/yyyy')} 
                  إلى {format(new Date(activeInsurance.end_date), 'dd/MM/yyyy')}
                </div>

                {activeInsurance.contact_person && (
                  <div className="pt-4 border-t">
                    <h5 className="font-medium mb-2">بيانات الاتصال</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <p><span className="font-medium">الاسم:</span> {activeInsurance.contact_person}</p>
                      {activeInsurance.contact_phone && (
                        <p><span className="font-medium">الهاتف:</span> <span dir="ltr">{activeInsurance.contact_phone}</span></p>
                      )}
                      {activeInsurance.contact_email && (
                        <p><span className="font-medium">البريد:</span> {activeInsurance.contact_email}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 bg-muted/30 rounded-lg">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-3">لم يتم تسجيل تأمين لهذه المركبة</p>
                <Button
                  variant="outline"
                  onClick={() => setShowInsuranceForm(true)}
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة تأمين
                </Button>
              </div>
            )}

            {/* Insurance History */}
            {insurance && insurance.length > 1 && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-3">تاريخ التأمين</h4>
                <div className="space-y-2">
                  {insurance
                    .filter(p => !p.is_active)
                    .slice(0, 3)
                    .map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                        <span>
                          {p.insurance_company} - {p.policy_number}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(p.start_date), 'dd/MM/yyyy')} - {format(new Date(p.end_date), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Registration Tab */}
          <TabsContent value="registration" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={showRegistrationForm} onOpenChange={setShowRegistrationForm}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-coral-500 hover:bg-coral-600">
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة استمارة
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-[#f8f7f5] border-0 shadow-2xl">
                  <DialogHeader className="pb-3 border-b border-neutral-200">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <DialogTitle className="text-lg font-bold text-neutral-900">إضافة استمارة</DialogTitle>
                        <DialogDescription className="text-neutral-500 text-xs">
                          تسجيل بيانات استمارة المركبة
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>
                  <form onSubmit={registrationForm.handleSubmit(onRegistrationSubmit)} className="space-y-3 pt-3">
                    {/* Document Info */}
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-neutral-100">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-neutral-600 text-xs">اسم الوثيقة *</Label>
                          <Input
                            placeholder="استمارة المركبة"
                            className="h-9 text-sm bg-neutral-50 border-neutral-200 focus:border-blue-500"
                            {...registrationForm.register("document_name", { required: true })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-neutral-600 text-xs">رقم الاستمارة *</Label>
                          <Input
                            placeholder="رقم الاستمارة"
                            className="h-9 text-sm bg-neutral-50 border-neutral-200 focus:border-blue-500"
                            {...registrationForm.register("document_number", { required: true })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-neutral-600 text-xs">الجهة المصدرة</Label>
                          <Input
                            placeholder="إدارة المرور"
                            className="h-9 text-sm bg-neutral-50 border-neutral-200 focus:border-blue-500"
                            {...registrationForm.register("issuing_authority")}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="bg-white rounded-lg p-3 shadow-sm border border-neutral-100">
                      <h4 className="text-xs font-medium text-neutral-500 mb-2">فترة الصلاحية</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-neutral-600 text-[10px]">تاريخ الإصدار</Label>
                          <Input
                            type="date"
                            className="h-8 text-sm bg-neutral-50 border-neutral-200"
                            {...registrationForm.register("issue_date", { required: true })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-neutral-600 text-[10px]">تاريخ الانتهاء</Label>
                          <Input
                            type="date"
                            className="h-8 text-sm bg-neutral-50 border-neutral-200"
                            {...registrationForm.register("expiry_date", { required: true })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Document Link */}
                    <Input
                      type="url"
                      placeholder="رابط الوثيقة (اختياري)"
                      className="h-9 text-sm bg-white border-neutral-200 focus:border-blue-500"
                      {...registrationForm.register("document_url")}
                    />

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowRegistrationForm(false)}
                        className="px-4 border-neutral-300 text-neutral-600"
                      >
                        إلغاء
                      </Button>
                      <Button 
                        type="submit" 
                        size="sm"
                        disabled={createRegistration.isPending}
                        className="px-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                      >
                        {createRegistration.isPending ? "جاري الحفظ..." : "حفظ"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {activeRegistration ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    الاستمارة الحالية
                  </h4>
                  <div className="flex gap-2">
                    <Badge variant="default" className="bg-blue-100 text-blue-700">سارية</Badge>
                    {isRegistrationExpiringSoon && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 ml-1" />
                        تنتهي قريباً
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">اسم الوثيقة</p>
                    <p className="font-semibold">{activeRegistration.document_name}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">رقم الاستمارة</p>
                    <p className="font-semibold">{activeRegistration.document_number || '-'}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">الجهة المصدرة</p>
                    <p className="font-semibold">{activeRegistration.issuing_authority || '-'}</p>
                  </div>
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 ml-2" />
                  صادرة في {format(new Date(activeRegistration.issue_date), 'dd/MM/yyyy')} 
                  - تنتهي في {format(new Date(activeRegistration.expiry_date), 'dd/MM/yyyy')}
                </div>

                {activeRegistration.document_url && (
                  <div className="pt-4 border-t">
                    <a 
                      href={activeRegistration.document_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <FileText className="h-4 w-4" />
                      عرض الوثيقة
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 bg-muted/30 rounded-lg">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-3">لم يتم تسجيل استمارة لهذه المركبة</p>
                <Button
                  variant="outline"
                  onClick={() => setShowRegistrationForm(true)}
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة استمارة
                </Button>
              </div>
            )}

            {/* Registration History */}
            {registration && registration.length > 1 && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-3">تاريخ الاستمارات</h4>
                <div className="space-y-2">
                  {registration
                    .filter(r => !r.is_active)
                    .slice(0, 3)
                    .map((r) => (
                      <div key={r.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                        <span>
                          {r.document_name} - {r.document_number}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(r.issue_date), 'dd/MM/yyyy')} - {format(new Date(r.expiry_date), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
