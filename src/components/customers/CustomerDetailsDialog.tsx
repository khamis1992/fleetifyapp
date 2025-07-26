import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, Building, Phone, Mail, MapPin, FileText, CreditCard, 
  TrendingUp, Clock, Plus, AlertTriangle, DollarSign, Calendar,
  User, Shield, MessageSquare
} from "lucide-react";
import { useCustomer, useCustomerNotes, useCreateCustomerNote, useCustomerFinancialSummary } from "@/hooks/useCustomers";
import { CustomerInvoicesTab } from "./CustomerInvoicesTab";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface CustomerDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  onEdit: () => void;
  onCreateContract: () => void;
  onCreateInvoice?: () => void;
}

interface NoteFormData {
  note_type: string;
  title: string;
  content: string;
  is_important: boolean;
}

export function CustomerDetailsDialog({ 
  open, 
  onOpenChange, 
  customerId, 
  onEdit,
  onCreateContract,
  onCreateInvoice 
}: CustomerDetailsDialogProps) {
  const [showNoteForm, setShowNoteForm] = useState(false);
  const { data: customer, isLoading } = useCustomer(customerId);
  const { data: notes } = useCustomerNotes(customerId);
  const { data: financialSummary } = useCustomerFinancialSummary(customerId);
  const createNoteMutation = useCreateCustomerNote();

  const { register, handleSubmit, reset, setValue, watch } = useForm<NoteFormData>({
    defaultValues: {
      note_type: 'general',
      title: '',
      content: '',
      is_important: false
    }
  });

  const onSubmitNote = (data: NoteFormData) => {
    createNoteMutation.mutate({
      customerId,
      noteData: data
    }, {
      onSuccess: () => {
        setShowNoteForm(false);
        reset();
      }
    });
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="lg" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!customer) return null;

  const customerName = customer.customer_type === 'corporate' 
    ? customer.company_name 
    : `${customer.first_name} ${customer.last_name}`;

  const customerNameAr = customer.customer_type === 'corporate' 
    ? customer.company_name_ar 
    : `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {customer.customer_type === 'corporate' ? (
                <Building className="h-6 w-6 text-purple-600" />
              ) : (
                <Users className="h-6 w-6 text-green-600" />
              )}
              <div>
                <DialogTitle className="text-xl">{customerName}</DialogTitle>
                {customerNameAr && (
                  <p className="text-sm text-muted-foreground">{customerNameAr}</p>
                )}
              </div>
              {customer.is_blacklisted && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  محظور
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onEdit}>
                تعديل
              </Button>
              <Button onClick={onCreateContract}>
                <Plus className="h-4 w-4 mr-2" />
                عقد جديد
              </Button>
              {onCreateInvoice && (
                <Button onClick={onCreateInvoice} variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  فاتورة جديدة
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="financial">المالية</TabsTrigger>
            <TabsTrigger value="contracts">العقود</TabsTrigger>
            <TabsTrigger value="invoices">الفواتير</TabsTrigger>
            <TabsTrigger value="notes">الملاحظات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    المعلومات الأساسية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                  {customer.alternative_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.alternative_phone} (بديل)</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {customer.national_id && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>هوية: {customer.national_id}</span>
                    </div>
                  )}
                  {customer.passport_number && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>جواز: {customer.passport_number}</span>
                    </div>
                  )}
                  {customer.license_number && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>رخصة: {customer.license_number}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    معلومات العنوان
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {customer.address && (
                    <div>
                      <p className="text-sm text-muted-foreground">العنوان</p>
                      <p>{customer.address}</p>
                    </div>
                  )}
                  {customer.address_ar && (
                    <div>
                      <p className="text-sm text-muted-foreground">العنوان (عربي)</p>
                      <p>{customer.address_ar}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.city}, {customer.country}</span>
                  </div>
                  {customer.date_of_birth && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>تاريخ الميلاد: {new Date(customer.date_of_birth).toLocaleDateString('ar-SA')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              {(customer.emergency_contact_name || customer.emergency_contact_phone) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      جهة اتصال الطوارئ
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {customer.emergency_contact_name && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.emergency_contact_name}</span>
                      </div>
                    )}
                    {customer.emergency_contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.emergency_contact_phone}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Customer Notes */}
              {customer.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      ملاحظات العميل
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{customer.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            {financialSummary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">الرصيد الحالي</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {financialSummary.currentBalance.toFixed(3)} د.ك
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي العقود</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {financialSummary.totalContracts.toFixed(3)} د.ك
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي المدفوعات</CardTitle>
                    <CreditCard className="h-4 w-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {financialSummary.totalPayments.toFixed(3)} د.ك
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">الرصيد المستحق</CardTitle>
                    <Clock className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {financialSummary.outstandingBalance.toFixed(3)} د.ك
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي الفواتير</CardTitle>
                    <FileText className="h-4 w-4 text-indigo-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-indigo-600">
                      {(financialSummary.totalInvoices || 0).toFixed(3)} د.ك
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {financialSummary.invoicesCount || 0} فاتورة
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">فواتير مستحقة</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {(financialSummary.totalInvoicesOutstanding || 0).toFixed(3)} د.ك
                    </div>
                    <p className="text-xs text-muted-foreground">
                      مبلغ غير مدفوع
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">تفاصيل الحساب</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {customer.credit_limit && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الحد الائتماني:</span>
                      <span className="font-medium">{customer.credit_limit.toFixed(3)} د.ك</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">العقود النشطة:</span>
                    <span className="font-medium">{financialSummary?.activeContracts || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">إجمالي العقود:</span>
                    <span className="font-medium">{financialSummary?.contractsCount || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">عدد الفواتير:</span>
                    <span className="font-medium">{financialSummary?.invoicesCount || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">النشاط المالي</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">مدفوعات الفواتير:</span>
                    <span className="font-medium">{(financialSummary?.totalInvoicesPaid || 0).toFixed(3)} د.ك</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">فواتير مستحقة:</span>
                    <span className="font-medium text-red-600">{(financialSummary?.totalInvoicesOutstanding || 0).toFixed(3)} د.ك</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">حالة الحساب:</span>
                    <Badge variant={customer.is_blacklisted ? "destructive" : "secondary"}>
                      {customer.is_blacklisted ? "قائمة سوداء" : "نشط"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>عقود العميل</CardTitle>
              </CardHeader>
              <CardContent>
                {customer.contracts && Array.isArray(customer.contracts) && customer.contracts.length > 0 ? (
                  <div className="space-y-2">
                    {(customer.contracts as any[]).map((contract: any) => (
                      <div key={contract.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-semibold">عقد #{contract.contract_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {contract.contract_amount.toFixed(3)} د.ك - {contract.status}
                          </div>
                        </div>
                        <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>
                          {contract.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد عقود لهذا العميل</p>
                    <Button className="mt-4" onClick={onCreateContract}>
                      <Plus className="h-4 w-4 mr-2" />
                      إنشاء عقد جديد
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <CustomerInvoicesTab 
              customerId={customerId} 
              onCreateInvoice={onCreateInvoice}
            />
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">ملاحظات العميل</h3>
              <Button onClick={() => setShowNoteForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                إضافة ملاحظة
              </Button>
            </div>

            {showNoteForm && (
              <Card>
                <CardHeader>
                  <CardTitle>إضافة ملاحظة جديدة</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmitNote)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>نوع الملاحظة</Label>
                        <Select onValueChange={(value) => setValue('note_type', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر نوع الملاحظة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">عامة</SelectItem>
                            <SelectItem value="contract">متعلقة بالعقد</SelectItem>
                            <SelectItem value="payment">متعلقة بالدفع</SelectItem>
                            <SelectItem value="complaint">شكوى</SelectItem>
                            <SelectItem value="follow_up">متابعة</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>العنوان</Label>
                        <Input {...register('title', { required: true })} placeholder="عنوان الملاحظة" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>المحتوى</Label>
                      <Textarea {...register('content', { required: true })} rows={3} placeholder="محتوى الملاحظة..." />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowNoteForm(false)}>
                        إلغاء
                      </Button>
                      <Button type="submit" disabled={createNoteMutation.isPending}>
                        {createNoteMutation.isPending ? 'جاري الحفظ...' : 'حفظ الملاحظة'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {notes && notes.length > 0 ? (
                notes.map((note) => (
                  <Card key={note.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{note.title}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{note.note_type}</Badge>
                          {note.is_important && (
                            <Badge variant="destructive">مهم</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-2">{note.content}</p>
                       <div className="text-xs text-muted-foreground">
                         بواسطة: {(note.profiles as any)?.first_name} {(note.profiles as any)?.last_name} - 
                         {new Date(note.created_at).toLocaleDateString('ar-SA')} {new Date(note.created_at).toLocaleTimeString('ar-SA')}
                       </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد ملاحظات لهذا العميل</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}