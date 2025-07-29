import { useState } from "react";
import { 
  FileText, 
  Car, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Signature,
  MessageSquare,
  Edit,
  CheckCheck,
  X,
  ClipboardCheck
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDispatchPermits, useUpdatePermitStatus } from "@/hooks/useDispatchPermits";
import { useToast } from "@/hooks/use-toast";
import { VehicleConditionReportDialog } from "./VehicleConditionReportDialog";
import { VehicleReturnForm } from "./VehicleReturnForm";

interface DispatchPermitDetailsDialogProps {
  permitId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig = {
  pending: {
    label: "قيد الانتظار",
    color: "bg-yellow-500",
    icon: AlertCircle,
    variant: "secondary" as const
  },
  approved: {
    label: "موافق عليه",
    color: "bg-green-500",
    icon: CheckCircle,
    variant: "default" as const
  },
  rejected: {
    label: "مرفوض",
    color: "bg-red-500",
    icon: XCircle,
    variant: "destructive" as const
  },
  in_progress: {
    label: "قيد التنفيذ",
    color: "bg-blue-500",
    icon: Clock,
    variant: "default" as const
  },
  completed: {
    label: "مكتمل",
    color: "bg-green-600",
    icon: CheckCircle,
    variant: "default" as const
  },
  cancelled: {
    label: "ملغى",
    color: "bg-gray-500",
    icon: XCircle,
    variant: "secondary" as const
  }
};

const requestTypeConfig = {
  maintenance: "صيانة",
  employee_use: "استخدام موظف",
  delivery: "توصيل",
  inspection: "فحص",
  other: "أخرى"
};

export function DispatchPermitDetailsDialog({ 
  permitId, 
  open, 
  onOpenChange 
}: DispatchPermitDetailsDialogProps) {
  const [showApprovalActions, setShowApprovalActions] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showConditionReport, setShowConditionReport] = useState(false);
  const { toast } = useToast();

  const { data: permits } = useDispatchPermits();
  const updateStatus = useUpdatePermitStatus();

  const permit = permits?.find(p => p.id === permitId);

  if (!permit) {
    return null;
  }

  const statusInfo = statusConfig[permit.status as keyof typeof statusConfig];
  const StatusIcon = statusInfo?.icon || AlertCircle;

  const handleApprove = async () => {
    try {
      await updateStatus.mutateAsync({
        permitId: permit.id,
        status: 'approved',
        reason: 'تم الموافقة على التصريح'
      });
      
      toast({
        title: "تم الموافقة على التصريح",
        description: "تم الموافقة على تصريح الحركة بنجاح",
      });
      
      setShowApprovalActions(false);
    } catch (error) {
      toast({
        title: "خطأ في الموافقة",
        description: "حدث خطأ أثناء الموافقة على التصريح",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "سبب الرفض مطلوب",
        description: "يجب كتابة سبب رفض التصريح",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateStatus.mutateAsync({
        permitId: permit.id,
        status: 'rejected',
        reason: rejectionReason
      });
      
      toast({
        title: "تم رفض التصريح",
        description: "تم رفض تصريح الحركة",
      });
      
      setShowApprovalActions(false);
      setRejectionReason("");
    } catch (error) {
      toast({
        title: "خطأ في الرفض",
        description: "حدث خطأ أثناء رفض التصريح",
        variant: "destructive",
      });
    }
  };

  const handleStartProgress = async () => {
    try {
      await updateStatus.mutateAsync({
        permitId: permit.id,
        status: 'in_progress',
        reason: 'بدء تنفيذ التصريح'
      });
      
      toast({
        title: "تم بدء تنفيذ التصريح",
        description: "تم تغيير حالة التصريح إلى قيد التنفيذ",
      });
    } catch (error) {
      toast({
        title: "خطأ في تحديث الحالة",
        description: "حدث خطأ أثناء تحديث حالة التصريح",
        variant: "destructive",
      });
    }
  };

  const handleComplete = async () => {
    try {
      await updateStatus.mutateAsync({
        permitId: permit.id,
        status: 'completed',
        reason: 'تم اكتمال تنفيذ التصريح'
      });
      
      toast({
        title: "تم اكتمال التصريح",
        description: "تم إنهاء تصريح الحركة بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ في إنهاء التصريح",
        description: "حدث خطأ أثناء إنهاء التصريح",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            تفاصيل تصريح الحركة - {permit.permit_number}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">تفاصيل التصريح</TabsTrigger>
            <TabsTrigger value="return" disabled={permit.status !== 'completed' && permit.status !== 'in_progress'}>
              استمارة الإرجاع
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-6">
            {/* Status and Priority */}
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={statusInfo?.variant || "secondary"} className="px-3 py-1">
                <StatusIcon className="h-4 w-4 mr-1" />
                {statusInfo?.label || permit.status}
              </Badge>
              
              <Badge variant="outline" className="px-3 py-1">
                {permit.priority === 'low' && 'منخفضة'}
                {permit.priority === 'normal' && 'عادية'}
                {permit.priority === 'high' && 'عالية'}
                {permit.priority === 'urgent' && 'عاجل'}
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground">
              تم الإنشاء: {format(new Date(permit.created_at), 'dd MMM yyyy HH:mm', { locale: ar })}
            </div>
          </div>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">المعلومات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Car className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">المركبة</p>
                    <p className="text-sm text-muted-foreground">
                      {permit.vehicle?.plate_number} - {permit.vehicle?.make} {permit.vehicle?.model}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">الوجهة</p>
                    <p className="text-sm text-muted-foreground">{permit.destination}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">نوع الطلب</p>
                    <p className="text-sm text-muted-foreground">
                      {requestTypeConfig[permit.request_type as keyof typeof requestTypeConfig] || permit.request_type}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">مقدم الطلب</p>
                    <p className="text-sm text-muted-foreground">
                      {permit.requester?.first_name} {permit.requester?.last_name}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                الجدول الزمني
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium mb-1">تاريخ البداية</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(permit.start_date), 'dd MMM yyyy', { locale: ar })}
                    {permit.start_time && ` - ${permit.start_time}`}
                  </p>
                </div>
                
                <div>
                  <p className="font-medium mb-1">تاريخ النهاية</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(permit.end_date), 'dd MMM yyyy', { locale: ar })}
                    {permit.end_time && ` - ${permit.end_time}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purpose */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">الغرض من الاستخدام</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{permit.purpose}</p>
              {permit.purpose_ar && (
                <p className="text-sm text-muted-foreground mt-2">{permit.purpose_ar}</p>
              )}
            </CardContent>
          </Card>

          {/* Driver Information */}
          {(permit.driver_name || permit.driver_phone || permit.driver_license) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  بيانات السائق
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {permit.driver_name && (
                    <div>
                      <p className="font-medium mb-1">الاسم</p>
                      <p className="text-sm text-muted-foreground">{permit.driver_name}</p>
                    </div>
                  )}
                  
                  {permit.driver_phone && (
                    <div>
                      <p className="font-medium mb-1">رقم الهاتف</p>
                      <p className="text-sm text-muted-foreground" dir="ltr">{permit.driver_phone}</p>
                    </div>
                  )}
                  
                  {permit.driver_license && (
                    <div>
                      <p className="font-medium mb-1">رقم الرخصة</p>
                      <p className="text-sm text-muted-foreground">{permit.driver_license}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Information */}
          {(permit.estimated_km || permit.fuel_allowance || permit.notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">معلومات إضافية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {permit.estimated_km && (
                    <div>
                      <p className="font-medium mb-1">المسافة المتوقعة</p>
                      <p className="text-sm text-muted-foreground">{permit.estimated_km} كم</p>
                    </div>
                  )}
                  
                  {permit.fuel_allowance && (
                    <div>
                      <p className="font-medium mb-1">بدل الوقود</p>
                      <p className="text-sm text-muted-foreground">{permit.fuel_allowance} د.ك</p>
                    </div>
                  )}
                </div>
                
                {permit.notes && (
                  <div>
                    <p className="font-medium mb-1">ملاحظات</p>
                    <p className="text-sm text-muted-foreground">{permit.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Approval Information */}
          {(permit.approved_by || permit.approved_at || permit.rejection_reason) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Signature className="h-5 w-5" />
                  معلومات الموافقة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {permit.approved_by && permit.approver && (
                  <div>
                    <p className="font-medium mb-1">الموافق</p>
                    <p className="text-sm text-muted-foreground">
                      {permit.approver.first_name} {permit.approver.last_name}
                    </p>
                  </div>
                )}
                
                {permit.approved_at && (
                  <div>
                    <p className="font-medium mb-1">تاريخ الموافقة</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(permit.approved_at), 'dd MMM yyyy HH:mm', { locale: ar })}
                    </p>
                  </div>
                )}
                
                {permit.rejection_reason && (
                  <div>
                    <p className="font-medium mb-1 text-red-600">سبب الرفض</p>
                    <p className="text-sm text-red-600">{permit.rejection_reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Vehicle Condition Report - Prominent Section */}
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <ClipboardCheck className="h-5 w-5" />
                تقرير حالة المركبة
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                يمكنك عرض وإدارة تقارير حالة المركبة قبل وبعد التنفيذ من خلال النقر على الزر أدناه
              </p>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setShowConditionReport(true)}
                size="lg"
                className="w-full"
              >
                <ClipboardCheck className="h-5 w-5 mr-2" />
                عرض تقرير حالة المركبة
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                يتضمن فحص ما قبل التنفيذ وما بعد التنفيذ
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-4">
            {permit.status === 'pending' && (
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowApprovalActions(!showApprovalActions)}
                  variant="outline"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  إجراءات الموافقة
                </Button>
              </div>
            )}

            {permit.status === 'approved' && (
              <Button onClick={handleStartProgress} disabled={updateStatus.isPending}>
                <CheckCheck className="h-4 w-4 mr-1" />
                بدء التنفيذ
              </Button>
            )}

            {permit.status === 'in_progress' && (
              <Button onClick={handleComplete} disabled={updateStatus.isPending}>
                <CheckCircle className="h-4 w-4 mr-1" />
                إنهاء التصريح
              </Button>
            )}

            {/* Approval Actions */}
            {showApprovalActions && permit.status === 'pending' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">إجراءات الموافقة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleApprove} 
                      disabled={updateStatus.isPending}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      موافقة
                    </Button>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <Label htmlFor="rejection-reason">سبب الرفض</Label>
                    <Textarea
                      id="rejection-reason"
                      placeholder="اكتب سبب رفض التصريح..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                    <Button 
                      onClick={handleReject}
                      disabled={updateStatus.isPending || !rejectionReason.trim()}
                      variant="destructive"
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-1" />
                      رفض التصريح
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          </TabsContent>
          
          <TabsContent value="return" className="space-y-6">
            <VehicleReturnForm
              permitId={permit.id}
              vehicleId={permit.vehicle_id}
              vehicleName={`${permit.vehicle?.plate_number} - ${permit.vehicle?.make} ${permit.vehicle?.model}`}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Vehicle Condition Report Dialog */}
      <VehicleConditionReportDialog
        open={showConditionReport}
        onOpenChange={setShowConditionReport}
        permitId={permit.id}
        vehicleId={permit.vehicle_id}
        vehicleName={`${permit.vehicle?.plate_number} - ${permit.vehicle?.make} ${permit.vehicle?.model}`}
      />
    </Dialog>
  );
}