import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type LegalCase } from '@/hooks/useLegalCases';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Building, 
  Phone, 
  Mail, 
  FileText, 
  Scale,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface LegalCaseDetailsDialogProps {
  legalCase: LegalCase;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LegalCaseDetailsDialog: React.FC<LegalCaseDetailsDialogProps> = ({
  legalCase,
  open,
  onOpenChange,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      case 'suspended': return 'bg-yellow-500';
      case 'on_hold': return 'bg-orange-500';
      default: return 'bg-blue-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'نشطة';
      case 'closed': return 'مغلقة';
      case 'suspended': return 'معلقة';
      case 'on_hold': return 'في الانتظار';
      default: return status;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'عاجل';
      case 'high': return 'عالية';
      case 'medium': return 'متوسطة';
      case 'low': return 'منخفضة';
      default: return priority;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'civil': return 'مدنية';
      case 'criminal': return 'جنائية';
      case 'commercial': return 'تجارية';
      case 'labor': return 'عمالية';
      case 'administrative': return 'إدارية';
      default: return type;
    }
  };

  const getBillingStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'في الانتظار';
      case 'billed': return 'تم إرسال الفاتورة';
      case 'paid': return 'مدفوعة';
      case 'overdue': return 'متأخرة';
      default: return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{legalCase.case_title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-2">
                <span className="font-mono">{legalCase.case_number}</span>
                <Badge variant="outline" className={`${getStatusColor(legalCase.case_status)} text-white`}>
                  {getStatusText(legalCase.case_status)}
                </Badge>
                <Badge variant="outline" className={`${getPriorityColor(legalCase.priority)} text-white`}>
                  {getPriorityText(legalCase.priority)}
                </Badge>
                {legalCase.is_confidential && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    سري
                  </Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
            <TabsTrigger value="financial">مالية</TabsTrigger>
            <TabsTrigger value="documents">المستندات</TabsTrigger>
            <TabsTrigger value="timeline">التسلسل الزمني</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Case Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    معلومات القضية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">نوع القضية:</span>
                    <span>{getTypeText(legalCase.case_type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">قيمة القضية:</span>
                    <span>{legalCase.case_value.toLocaleString()} د.ك</span>
                  </div>
                  {legalCase.filing_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تاريخ رفع القضية:</span>
                      <span>{format(new Date(legalCase.filing_date), 'dd/MM/yyyy', { locale: ar })}</span>
                    </div>
                  )}
                  {legalCase.hearing_date && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الجلسة القادمة:</span>
                      <span>{format(new Date(legalCase.hearing_date), 'dd/MM/yyyy HH:mm', { locale: ar })}</span>
                    </div>
                  )}
                  {legalCase.statute_limitations && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">انتهاء التقادم:</span>
                      <span>{format(new Date(legalCase.statute_limitations), 'dd/MM/yyyy', { locale: ar })}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Client Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    معلومات العميل
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {legalCase.client_name ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الاسم:</span>
                        <span>{legalCase.client_name}</span>
                      </div>
                      {legalCase.client_phone && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">الهاتف:</span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {legalCase.client_phone}
                          </span>
                        </div>
                      )}
                      {legalCase.client_email && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">البريد الإلكتروني:</span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {legalCase.client_email}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">لا توجد معلومات عميل</p>
                  )}
                </CardContent>
              </Card>

              {/* Court Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    معلومات المحكمة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {legalCase.court_name ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">اسم المحكمة:</span>
                        <span>{legalCase.court_name}</span>
                      </div>
                      {legalCase.case_reference && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">رقم القضية:</span>
                          <span>{legalCase.case_reference}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">لا توجد معلومات محكمة</p>
                  )}
                </CardContent>
              </Card>

              {/* Additional Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    معلومات إضافية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">تاريخ الإنشاء:</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(legalCase.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">آخر تحديث:</span>
                    <span>{format(new Date(legalCase.updated_at), 'dd/MM/yyyy HH:mm', { locale: ar })}</span>
                  </div>
                  {legalCase.tags && legalCase.tags.length > 0 && (
                    <div>
                      <span className="text-muted-foreground block mb-2">العلامات:</span>
                      <div className="flex flex-wrap gap-1">
                        {legalCase.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Description and Notes */}
            {(legalCase.description || legalCase.notes) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {legalCase.description && (
                  <Card>
                    <CardHeader>
                      <CardTitle>وصف القضية</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed">{legalCase.description}</p>
                    </CardContent>
                  </Card>
                )}
                {legalCase.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>ملاحظات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed">{legalCase.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    الأتعاب القانونية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{legalCase.legal_fees.toLocaleString()} د.ك</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    رسوم المحكمة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{legalCase.court_fees.toLocaleString()} د.ك</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    مصروفات أخرى
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{legalCase.other_expenses.toLocaleString()} د.ك</p>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    إجمالي التكاليف
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-3xl font-bold">{legalCase.total_costs.toLocaleString()} د.ك</p>
                    <Badge variant="outline" className={
                      legalCase.billing_status === 'paid' ? 'bg-green-500 text-white' :
                      legalCase.billing_status === 'overdue' ? 'bg-red-500 text-white' :
                      legalCase.billing_status === 'billed' ? 'bg-blue-500 text-white' :
                      'bg-yellow-500 text-white'
                    }>
                      {getBillingStatusText(legalCase.billing_status)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>المستندات</CardTitle>
                <CardDescription>مستندات القضية والمراسلات</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">سيتم إضافة إدارة المستندات في التحديث القادم</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>التسلسل الزمني</CardTitle>
                <CardDescription>تاريخ الأنشطة والأحداث المتعلقة بالقضية</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">سيتم إضافة التسلسل الزمني في التحديث القادم</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};