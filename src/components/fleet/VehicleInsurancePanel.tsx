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
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>إضافة بوليصة تأمين جديدة</DialogTitle>
                    <DialogDescription>
                      تسجيل بيانات التأمين وتفاصيل البوليصة
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={insuranceForm.handleSubmit(onInsuranceSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="insurance_company">شركة التأمين</Label>
                        <Input
                          id="insurance_company"
                          {...insuranceForm.register("insurance_company", { required: true })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="policy_number">رقم البوليصة</Label>
                        <Input
                          id="policy_number"
                          {...insuranceForm.register("policy_number", { required: true })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="coverage_type">نوع التأمين</Label>
                        <select
                          id="coverage_type"
                          className="w-full p-2 border rounded"
                          {...insuranceForm.register("coverage_type")}
                        >
                          <option value="comprehensive">شامل</option>
                          <option value="third_party">طرف ثالث</option>
                          <option value="collision">تصادم</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="premium_amount">قسط التأمين (ر.ق)</Label>
                        <Input
                          id="premium_amount"
                          type="number"
                          step="0.01"
                          {...insuranceForm.register("premium_amount", { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="coverage_amount">مبلغ التغطية (ر.ق)</Label>
                        <Input
                          id="coverage_amount"
                          type="number"
                          step="0.01"
                          {...insuranceForm.register("coverage_amount", { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="deductible_amount">مبلغ التحمل (ر.ق)</Label>
                        <Input
                          id="deductible_amount"
                          type="number"
                          step="0.01"
                          {...insuranceForm.register("deductible_amount", { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="start_date">تاريخ البداية</Label>
                        <Input
                          id="start_date"
                          type="date"
                          {...insuranceForm.register("start_date")}
                        />
                      </div>
                      <div>
                        <Label htmlFor="end_date">تاريخ الانتهاء</Label>
                        <Input
                          id="end_date"
                          type="date"
                          {...insuranceForm.register("end_date")}
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact_person">شخص الاتصال</Label>
                        <Input
                          id="contact_person"
                          {...insuranceForm.register("contact_person")}
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact_phone">رقم الهاتف</Label>
                        <Input
                          id="contact_phone"
                          {...insuranceForm.register("contact_phone")}
                          dir="ltr"
                          className="text-right"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="contact_email">البريد الإلكتروني</Label>
                      <Input
                        id="contact_email"
                        type="email"
                        {...insuranceForm.register("contact_email")}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">ملاحظات</Label>
                      <textarea
                        id="notes"
                        className="w-full p-2 border rounded"
                        rows={3}
                        {...insuranceForm.register("notes")}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowInsuranceForm(false)}>
                        إلغاء
                      </Button>
                      <Button type="submit" disabled={createInsurance.isPending}>
                        {createInsurance.isPending ? "جاري الحفظ..." : "حفظ التأمين"}
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
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>إضافة استمارة جديدة</DialogTitle>
                    <DialogDescription>
                      تسجيل بيانات استمارة المركبة
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={registrationForm.handleSubmit(onRegistrationSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="document_name">اسم الوثيقة</Label>
                        <Input
                          id="document_name"
                          {...registrationForm.register("document_name", { required: true })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="document_number">رقم الاستمارة</Label>
                        <Input
                          id="document_number"
                          {...registrationForm.register("document_number", { required: true })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="issuing_authority">الجهة المصدرة</Label>
                        <Input
                          id="issuing_authority"
                          {...registrationForm.register("issuing_authority")}
                        />
                      </div>
                      <div>
                        <Label htmlFor="issue_date">تاريخ الإصدار</Label>
                        <Input
                          id="issue_date"
                          type="date"
                          {...registrationForm.register("issue_date", { required: true })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="expiry_date">تاريخ الانتهاء</Label>
                        <Input
                          id="expiry_date"
                          type="date"
                          {...registrationForm.register("expiry_date", { required: true })}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="document_url">رابط الوثيقة (اختياري)</Label>
                        <Input
                          id="document_url"
                          type="url"
                          placeholder="https://..."
                          {...registrationForm.register("document_url")}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowRegistrationForm(false)}>
                        إلغاء
                      </Button>
                      <Button type="submit" disabled={createRegistration.isPending}>
                        {createRegistration.isPending ? "جاري الحفظ..." : "حفظ الاستمارة"}
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
