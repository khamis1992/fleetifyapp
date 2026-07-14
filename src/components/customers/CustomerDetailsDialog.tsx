import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
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
  User, Shield, MessageSquare, Edit, Save, X
} from "lucide-react";
import { useCustomerById as useCustomer, useCustomerNotes, useCreateCustomerNote, useCustomerFinancialSummary } from "@/hooks/useEnhancedCustomers";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { formatDateInGregorian } from "@/utils/dateFormatter";
import { DriverLicenseManager } from "./DriverLicenseManager";

// Lazy load heavy components that aren't immediately visible
const CustomerInvoicesTab = lazy(() => import("./CustomerInvoicesTab").then(m => ({ default: m.CustomerInvoicesTab })));
const CustomerAccountSelector = lazy(() => import("./CustomerAccountSelector").then(m => ({ default: m.CustomerAccountSelector })));
const CustomerAccountStatement = lazy(() => import("./CustomerAccountStatement").then(m => ({ default: m.CustomerAccountStatement })));

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

interface CustomerContractSummary {
  id: string;
  contract_number: string;
  contract_amount?: number | null;
  status?: string | null;
}

export function CustomerDetailsDialog({ 
  open, 
  onOpenChange, 
  customerId, 
  onEdit,
  onCreateContract,
  onCreateInvoice 
}: CustomerDetailsDialogProps) {
  const navigate = useNavigate();
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [isEditingAccounts, setIsEditingAccounts] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // OPTIMIZATION: Only fetch data when dialog is open
  const { data: customer, isLoading, error, isError } = useCustomer(customerId, { enabled: open });
  
  // OPTIMIZATION: Only fetch notes when notes tab is active
  const { data: notes } = useCustomerNotes(customerId, { enabled: open && activeTab === "notes" });
  
  // OPTIMIZATION: Only fetch financial summary when financial tab is active
  const { data: financialSummary } = useCustomerFinancialSummary(customerId, { enabled: open && activeTab === "financial" });
  
  const { formatCurrency } = useCurrencyFormatter();
  const createNoteMutation = useCreateCustomerNote();

  const { register, handleSubmit, reset, setValue } = useForm<NoteFormData>({
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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 bg-muted rounded animate-pulse" />
              <div>
                <div className="h-6 w-48 bg-muted rounded animate-pulse" />
                <div className="h-4 w-32 bg-muted rounded animate-pulse mt-1" />
              </div>
            </div>
          </DialogHeader>
          
          {/* Skeleton for tabs */}
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-6 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
            
            {/* Skeleton for content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="border rounded-lg p-6">
                  <div className="h-5 w-32 bg-muted rounded animate-pulse mb-4" />
                  <div className="space-y-3">
                    <div className="h-4 w-full bg-muted rounded animate-pulse" />
                    <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-5/6 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isError || !customer) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="text-red-500 text-lg mb-4">⚠️ خطأ في تحميل البيانات</div>
            <p className="text-slate-600 mb-4">
              {error?.message || 'لا يمكن العثور على بيانات العميل'}
            </p>
            <Button 
              onClick={() => onOpenChange(false)}
              variant="outline"
            >
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
              <Button onClick={onEdit}>
                تعديل
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="financial">المالية</TabsTrigger>
            <TabsTrigger value="contracts">العقود</TabsTrigger>
            <TabsTrigger value="invoices">الفواتير</TabsTrigger>
            <TabsTrigger value="licenses">رخص القيادة</TabsTrigger>
            <TabsTrigger value="notes">الملاحظات</TabsTrigger>
            <TabsTrigger value="accounting">الحسابات</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Address Information - First */}
              <Card dir="rtl">
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
                       <span>تاريخ الميلاد: {formatDateInGregorian(customer.date_of_birth)}</span>
                     </div>
                   )}
                </CardContent>
              </Card>

              {/* Basic Information - Second */}
              <Card dir="rtl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    المعلومات الأساسية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span dir="ltr">{customer.phone}</span>
                  </div>
                  {customer.alternative_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span dir="ltr">{customer.alternative_phone} (بديل)</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  
                  {/* الرقم الوطني - يظهر دائماً */}
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <span className="text-sm text-muted-foreground">الرقم الوطني: </span>
                      <span className={customer.national_id ? "font-medium" : "text-muted-foreground italic"}>
                        {customer.national_id || 'غير محدد'}
                      </span>
                    </div>
                  </div>
                  
                  {/* رقم رخصة القيادة - يظهر دائماً */}
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <span className="text-sm text-muted-foreground">رقم الرخصة: </span>
                      <span className={customer.license_number ? "font-medium" : "text-muted-foreground italic"}>
                        {customer.license_number || 'غير محدد'}
                      </span>
                    </div>
                  </div>
                  
                  {customer.passport_number && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>جواز: {customer.passport_number}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Customer Notes - Third */}
              {customer.notes && (
                <Card dir="rtl">
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

              {/* Emergency Contact - Fourth */}
              {(customer.emergency_contact_name || customer.emergency_contact_phone) && (
                <Card dir="rtl">
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
                        <span dir="ltr">{customer.emergency_contact_phone}</span>
                      </div>
                    )}
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
                      {formatCurrency(financialSummary.currentBalance ?? 0, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
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
                      {financialSummary.totalContracts.toLocaleString('ar-QA')}
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
                      {formatCurrency(financialSummary.totalPayments)}
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
                      {formatCurrency(financialSummary.outstandingBalance)}
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
                      {formatCurrency(financialSummary.totalInvoices || 0)}
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
                      {formatCurrency(financialSummary.totalInvoicesOutstanding || 0)}
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
                      <span className="font-medium">{formatCurrency(customer.credit_limit)}</span>
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
                    <span className="font-medium">{formatCurrency(financialSummary?.totalInvoicesPaid || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">فواتير مستحقة:</span>
                    <span className="font-medium text-red-600">{formatCurrency(financialSummary?.totalInvoicesOutstanding || 0)}</span>
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

            {/* Professional Customer Account Statement - Lazy Loaded */}
            <div className="mt-6">
              <Suspense fallback={
                <Card>
                  <CardContent className="py-8">
                    <div className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span className="text-sm text-muted-foreground">جاري تحميل كشف الحساب...</span>
                    </div>
                  </CardContent>
                </Card>
              }>
                <CustomerAccountStatement customer={customer} />
              </Suspense>
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
                    {(customer.contracts as unknown as CustomerContractSummary[]).map((contract) => (
                      <div 
                        key={contract.id} 
                        onClick={() => {
                          onOpenChange(false);
                          navigate(`/contracts/${contract.contract_number}`);
                        }}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:shadow-md hover:border-coral-400 transition-all"
                      >
                        <div>
                          <div className="font-semibold">عقد #{contract.contract_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(contract.contract_amount ?? 0)} - {contract.status}
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
            <Suspense fallback={
              <Card>
                <CardContent className="py-8">
                  <div className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-muted-foreground">جاري تحميل الفواتير...</span>
                  </div>
                </CardContent>
              </Card>
            }>
              <CustomerInvoicesTab 
                customerId={customerId} 
                onCreateInvoice={onCreateInvoice}
              />
            </Suspense>
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
                         بواسطة: مستخدم النظام - 
                         {new Date(note.created_at).toLocaleDateString('en-US')} {new Date(note.created_at).toLocaleTimeString('en-US')}
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

          <TabsContent value="licenses" className="space-y-4">
            <DriverLicenseManager customerId={customerId} />
          </TabsContent>

          <TabsContent value="accounting" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>الحسابات المحاسبية</CardTitle>
                  {!isEditingAccounts ? (
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingAccounts(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      إدارة الحسابات
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingAccounts(false);
                          toast.success("تم حفظ التغييرات");
                        }}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        حفظ
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditingAccounts(false)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        إلغاء
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Suspense fallback={
                  <div className="flex items-center justify-center py-4">
                    <LoadingSpinner size="sm" />
                    <span className="mr-2 text-sm text-muted-foreground">جاري تحميل الحسابات...</span>
                  </div>
                }>
                  <CustomerAccountSelector
                    customerId={customerId}
                    customerName={customerName || ''}
                    mode={isEditingAccounts ? "edit" : "view"}
                    companyId={customer.company_id}
                  />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
