/**
 * Case Details Page with Timeline
 * صفحة تفاصيل القضية مع الخط الزمني
 * 
 * Features:
 * - Timeline of events
 * - Tabs (Overview, Documents, Settlements, Warnings)
 * - Actions (Edit, Close, Delete)
 * - Status updates
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Calendar,
  User,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit,
  Trash2,
  XCircle,
  Download,
  Plus,
  Scale,
  Building,
  Phone,
  Mail,
} from 'lucide-react';
import { LegalCase } from './CasesCardList';

interface CaseEvent {
  id: string;
  type: 'created' | 'hearing' | 'settlement' | 'warning' | 'document' | 'status_change' | 'note';
  title: string;
  description?: string;
  date: string;
  user?: string;
  metadata?: any;
}

interface CaseDetailsPageProps {
  caseData: LegalCase;
  onBack: () => void;
  onEdit: (caseId: string) => void;
  onClose: (caseId: string) => void;
  onDelete: (caseId: string) => void;
}

const priorityColors = {
  low: 'bg-gray-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const priorityLabels = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'عالي',
  urgent: 'عاجل',
};

const statusColors = {
  active: 'bg-green-500',
  pending: 'bg-yellow-500',
  closed: 'bg-gray-500',
};

const statusLabels = {
  active: 'نشطة',
  pending: 'معلقة',
  closed: 'مغلقة',
};

const caseTypeLabels: Record<string, string> = {
  commercial: 'تجاري',
  civil: 'مدني',
  labor: 'عمالي',
  rental: 'إيجارات',
  payment_collection: 'تحصيل مدفوعات',
  contract_dispute: 'نزاع عقد',
  other: 'أخرى',
};

const CaseDetailsPage: React.FC<CaseDetailsPageProps> = ({
  caseData,
  onBack,
  onEdit,
  onClose,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Mock timeline events
  const timelineEvents: CaseEvent[] = [
    {
      id: '1',
      type: 'created',
      title: 'تم إنشاء القضية',
      description: 'تم إنشاء القضية بواسطة النظام',
      date: caseData.created_at,
      user: 'النظام',
    },
    {
      id: '2',
      type: 'document',
      title: 'تم إضافة مستند',
      description: 'عقد الإيجار الأصلي',
      date: '2025-01-12T10:00:00Z',
      user: 'أحمد محمد',
    },
    {
      id: '3',
      type: 'hearing',
      title: 'جلسة استماع',
      description: 'الجلسة الأولى - تم تأجيلها',
      date: '2025-01-15T14:00:00Z',
      user: 'المحكمة',
    },
    {
      id: '4',
      type: 'warning',
      title: 'إنذار رسمي',
      description: 'تم إرسال إنذار للطرف الآخر',
      date: '2025-01-18T09:00:00Z',
      user: 'المحامي',
    },
  ];

  const getEventIcon = (type: CaseEvent['type']) => {
    switch (type) {
      case 'created':
        return <Plus className="h-4 w-4" />;
      case 'hearing':
        return <Calendar className="h-4 w-4" />;
      case 'settlement':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'status_change':
        return <Clock className="h-4 w-4" />;
      case 'note':
        return <Edit className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: CaseEvent['type']) => {
    switch (type) {
      case 'created':
        return 'bg-blue-500';
      case 'hearing':
        return 'bg-purple-500';
      case 'settlement':
        return 'bg-green-500';
      case 'warning':
        return 'bg-orange-500';
      case 'document':
        return 'bg-cyan-500';
      case 'status_change':
        return 'bg-yellow-500';
      case 'note':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Scale className="h-8 w-8 text-primary" />
              {caseData.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              رقم القضية: {caseData.case_number}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onEdit(caseData.id)}>
            <Edit className="h-4 w-4 mr-2" />
            تعديل
          </Button>
          <Button variant="outline" onClick={() => onClose(caseData.id)}>
            <XCircle className="h-4 w-4 mr-2" />
            إغلاق القضية
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            حذف
          </Button>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex gap-2">
        <Badge className={`${priorityColors[caseData.priority]} text-white`}>
          {priorityLabels[caseData.priority]}
        </Badge>
        <Badge className={`${statusColors[caseData.status]} text-white`}>
          {statusLabels[caseData.status]}
        </Badge>
        <Badge variant="outline">
          {caseTypeLabels[caseData.case_type] || caseData.case_type}
        </Badge>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
              <TabsTrigger value="documents">المستندات</TabsTrigger>
              <TabsTrigger value="settlements">التسويات</TabsTrigger>
              <TabsTrigger value="warnings">الإنذارات</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>الوصف</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {caseData.description || 'لا يوجد وصف'}
                  </p>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    الخط الزمني
                  </CardTitle>
                  <CardDescription>
                    سجل الأحداث والتحديثات
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {timelineEvents.map((event, index) => (
                      <div key={event.id} className="flex gap-4">
                        {/* Timeline Line */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full ${getEventColor(
                              event.type
                            )} flex items-center justify-center text-white`}
                          >
                            {getEventIcon(event.type)}
                          </div>
                          {index < timelineEvents.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 my-1" />
                          )}
                        </div>

                        {/* Event Content */}
                        <div className="flex-1 pb-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold">{event.title}</h4>
                              {event.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {event.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(event.date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                {event.user && (
                                  <>
                                    <span>•</span>
                                    <User className="h-3 w-3" />
                                    {event.user}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button variant="outline" className="w-full mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    إضافة حدث جديد
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle>المستندات</CardTitle>
                  <CardDescription>
                    جميع المستندات المرفقة بالقضية
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد مستندات</p>
                    <Button variant="outline" className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      إضافة مستند
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settlements Tab */}
            <TabsContent value="settlements">
              <Card>
                <CardHeader>
                  <CardTitle>التسويات</CardTitle>
                  <CardDescription>
                    محاولات التسوية والاتفاقيات
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد تسويات</p>
                    <Button variant="outline" className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      إضافة تسوية
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Warnings Tab */}
            <TabsContent value="warnings">
              <Card>
                <CardHeader>
                  <CardTitle>الإنذارات</CardTitle>
                  <CardDescription>
                    الإنذارات الرسمية المرسلة
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد إنذارات</p>
                    <Button variant="outline" className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      إضافة إنذار
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Info Cards */}
        <div className="space-y-4">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                معلومات العميل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">الاسم</p>
                <p className="font-medium">{caseData.customer_name}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  الجوال
                </p>
                <p className="font-medium">0501234567</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  البريد الإلكتروني
                </p>
                <p className="font-medium text-sm">customer@example.com</p>
              </div>
            </CardContent>
          </Card>

          {/* Lawyer Info */}
          {caseData.lawyer_name && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  المحامي
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">الاسم</p>
                  <p className="font-medium">{caseData.lawyer_name}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    المكتب
                  </p>
                  <p className="font-medium">مكتب المحاماة الدولي</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Financial Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                المعلومات المالية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">التكلفة الإجمالية</p>
                <p className="text-2xl font-bold text-primary">
                  {caseData.total_cost.toLocaleString('en-US')} ر.س
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Next Hearing */}
          {caseData.next_hearing_date && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  الموعد القادم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">
                  {new Date(caseData.next_hearing_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(caseData.next_hearing_date) > new Date()
                    ? `بعد ${Math.ceil(
                        (new Date(caseData.next_hearing_date).getTime() -
                          new Date().getTime()) /
                          (1000 * 60 * 60 * 24)
                      )} يوم`
                    : 'انتهى الموعد'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">إجراءات سريعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                تحميل ملف القضية
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                طباعة التقرير
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                جدولة موعد
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف هذه القضية؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(caseData.id);
                setShowDeleteDialog(false);
              }}
            >
              حذف
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CaseDetailsPage;
