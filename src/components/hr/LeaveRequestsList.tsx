import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Eye, CheckCircle, XCircle, Clock, Calendar, User, FileText } from "lucide-react";
import { useLeaveRequests } from "@/hooks/useLeaveManagement";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { LeaveRequestReviewDialog } from "./LeaveRequestReviewDialog";
import { LeaveRequestDetailsDialog } from "./LeaveRequestDetailsDialog";

interface LeaveRequestsListProps {
  employeeId?: string;
  showActions?: boolean;
  canReview?: boolean;
}

export const LeaveRequestsList = ({ 
  employeeId, 
  showActions = true, 
  canReview = false 
}: LeaveRequestsListProps) => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: allRequests = [], isLoading } = useLeaveRequests(
    activeTab === "all" ? undefined : activeTab,
    employeeId
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "قيد الانتظار", variant: "secondary" as const, icon: Clock },
      approved: { label: "موافق عليه", variant: "default" as const, icon: CheckCircle },
      rejected: { label: "مرفوض", variant: "destructive" as const, icon: XCircle },
      cancelled: { label: "ملغي", variant: "outline" as const, icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || Clock;

    return (
      <Badge variant={config?.variant || "secondary"} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config?.label || status}
      </Badge>
    );
  };

  const filteredRequests = allRequests.filter((request: any) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const employeeName = `${request.employees?.first_name_ar || request.employees?.first_name} ${request.employees?.last_name_ar || request.employees?.last_name}`.toLowerCase();
    const leaveType = (request.leave_types?.type_name_ar || request.leave_types?.type_name || "").toLowerCase();
    const reason = (request.reason || "").toLowerCase();
    
    return employeeName.includes(searchLower) || 
           leaveType.includes(searchLower) || 
           reason.includes(searchLower);
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="البحث في الطلبات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="pending">قيد الانتظار</TabsTrigger>
          <TabsTrigger value="approved">موافق عليه</TabsTrigger>
          <TabsTrigger value="rejected">مرفوض</TabsTrigger>
          <TabsTrigger value="cancelled">ملغي</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">لا توجد طلبات</h3>
                <p className="text-muted-foreground text-center">
                  {searchTerm ? "لا توجد طلبات تطابق البحث" : "لا توجد طلبات إجازة"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredRequests.map((request: any) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {request.leave_types?.type_name_ar || request.leave_types?.type_name}
                          </CardTitle>
                          {getStatusBadge(request.status)}
                        </div>
                        {!employeeId && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>
                              {request.employees?.first_name_ar || request.employees?.first_name} {" "}
                              {request.employees?.last_name_ar || request.employees?.last_name}
                            </span>
                            <span className="text-xs">
                              ({request.employees?.employee_number})
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {showActions && (
                        <div className="flex items-center gap-2">
                          <LeaveRequestDetailsDialog request={request}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              عرض
                            </Button>
                          </LeaveRequestDetailsDialog>
                          
                          {canReview && request.status === "pending" && (
                            <LeaveRequestReviewDialog 
                              request={request}
                              onSuccess={() => window.location.reload()}
                            >
                              <Button size="sm">
                                مراجعة
                              </Button>
                            </LeaveRequestReviewDialog>
                          )}
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(request.start_date), "dd/MM/yyyy", { locale: ar })} - {" "}
                          {format(new Date(request.end_date), "dd/MM/yyyy", { locale: ar })}
                        </span>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">{request.total_days}</span> يوم
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        تاريخ التقديم: {format(new Date(request.applied_date), "dd/MM/yyyy", { locale: ar })}
                      </div>
                    </div>

                    {request.reason && (
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground mb-1">السبب:</p>
                        <p className="text-sm line-clamp-2">{request.reason}</p>
                      </div>
                    )}

                    {request.covering_employee && (
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground mb-1">الموظف البديل:</p>
                        <p className="text-sm">
                          {request.covering_employee.first_name_ar || request.covering_employee.first_name} {" "}
                          {request.covering_employee.last_name_ar || request.covering_employee.last_name}
                        </p>
                      </div>
                    )}

                    {(request.reviewed_at || request.review_notes) && (
                      <div className="border-t pt-4 mt-4">
                        {request.reviewed_at && (
                          <div className="text-sm text-muted-foreground mb-2">
                            تمت المراجعة في: {format(new Date(request.reviewed_at), "dd/MM/yyyy HH:mm", { locale: ar })}
                            {request.reviewer && (
                              <span className="ml-2">
                                بواسطة: {request.reviewer.first_name} {request.reviewer.last_name}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {request.review_notes && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">ملاحظات المراجع:</p>
                            <p className="text-sm">{request.review_notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};