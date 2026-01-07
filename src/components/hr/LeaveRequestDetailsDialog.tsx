import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, User, FileText, Phone, UserCheck, MessageSquare } from "lucide-react";

interface LeaveRequestDetailsDialogProps {
  request: any;
  children: React.ReactNode;
}

export const LeaveRequestDetailsDialog = ({ 
  request, 
  children 
}: LeaveRequestDetailsDialogProps) => {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "قيد الانتظار", variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800" },
      approved: { label: "موافق عليه", variant: "default" as const, color: "bg-green-100 text-green-800" },
      rejected: { label: "مرفوض", variant: "destructive" as const, color: "bg-red-100 text-red-800" },
      cancelled: { label: "ملغي", variant: "outline" as const, color: "bg-slate-100 text-slate-800" },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge variant={config?.variant || "secondary"}>
        {config?.label || status}
      </Badge>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">تفاصيل طلب الإجازة</DialogTitle>
              <DialogDescription>
                عرض جميع تفاصيل الطلب والحالة الحالية
              </DialogDescription>
            </div>
            {getStatusBadge(request.status)}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                معلومات الموظف
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">اسم الموظف</p>
                <p className="font-medium">
                  {request.employees?.first_name_ar || request.employees?.first_name} {" "}
                  {request.employees?.last_name_ar || request.employees?.last_name}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">رقم الموظف</p>
                <p className="font-medium">{request.employees?.employee_number}</p>
              </div>
              
              {request.employees?.department && (
                <div>
                  <p className="text-sm text-muted-foreground">القسم</p>
                  <p className="font-medium">{request.employees.department}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leave Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                تفاصيل الإجازة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">نوع الإجازة</p>
                  <p className="font-medium">
                    {request.leave_types?.type_name_ar || request.leave_types?.type_name}
                  </p>
                  {request.leave_types?.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {request.leave_types.description}
                    </p>
                  )}
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ البداية</p>
                  <p className="font-medium">
                    {format(new Date(request.start_date), "EEEE, dd MMMM yyyy", { locale: ar })}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ النهاية</p>
                  <p className="font-medium">
                    {format(new Date(request.end_date), "EEEE, dd MMMM yyyy", { locale: ar })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي عدد الأيام</p>
                  <p className="text-2xl font-bold text-primary">{request.total_days} يوم</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">نوع الإجازة</p>
                  <Badge variant={request.leave_types?.is_paid ? "default" : "secondary"}>
                    {request.leave_types?.is_paid ? "مدفوعة الأجر" : "غير مدفوعة الأجر"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                تفاصيل الطلب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">سبب الإجازة</p>
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm">{request.reason || "لم يتم تحديد سبب"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ التقديم</p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">
                      {format(new Date(request.applied_date), "dd/MM/yyyy HH:mm", { locale: ar })}
                    </p>
                  </div>
                </div>

                {request.emergency_contact && (
                  <div>
                    <p className="text-sm text-muted-foreground">رقم الطوارئ</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{request.emergency_contact}</p>
                    </div>
                  </div>
                )}
              </div>

              {request.covering_employee && (
                <div>
                  <p className="text-sm text-muted-foreground">الموظف البديل</p>
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">
                      {request.covering_employee.first_name_ar || request.covering_employee.first_name} {" "}
                      {request.covering_employee.last_name_ar || request.covering_employee.last_name}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review Information */}
          {(request.reviewed_at || request.review_notes || request.status !== "pending") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  معلومات المراجعة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {request.reviewed_at && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">تاريخ المراجعة</p>
                      <p className="font-medium">
                        {format(new Date(request.reviewed_at), "dd/MM/yyyy HH:mm", { locale: ar })}
                      </p>
                    </div>
                    
                    {request.reviewer && (
                      <div>
                        <p className="text-sm text-muted-foreground">تمت المراجعة بواسطة</p>
                        <p className="font-medium">
                          {request.reviewer.first_name} {request.reviewer.last_name}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {request.review_notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">ملاحظات المراجع</p>
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-sm">{request.review_notes}</p>
                    </div>
                  </div>
                )}

                {!request.reviewed_at && request.status === "pending" && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                    <p className="text-sm text-yellow-800">
                      الطلب قيد الانتظار ولم تتم مراجعته بعد
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};