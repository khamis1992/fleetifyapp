import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, CheckCircle, XCircle, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface AccountRequestsListProps {
  requests?: any[];
}

export default function AccountRequestsList({ requests }: AccountRequestsListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const processRequestMutation = useMutation({
    mutationFn: async ({ requestId, action, reason }: { requestId: string, action: 'approved' | 'rejected', reason?: string }) => {
      const { error } = await supabase
        .from('account_creation_requests')
        .update({
          status: action,
          processed_by: user?.id,
          processed_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: (_, { action }) => {
      toast({
        title: `تم ${action === 'approved' ? 'الموافقة على' : 'رفض'} الطلب`,
        description: `تم ${action === 'approved' ? 'الموافقة على' : 'رفض'} طلب إنشاء الحساب بنجاح`
      });
      queryClient.invalidateQueries({ queryKey: ['account-requests'] });
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        title: "خطأ في معالجة الطلب",
        description: error.message
      });
    }
  });

  const handleApprove = (requestId: string) => {
    processRequestMutation.mutate({ requestId, action: 'approved' });
  };

  const handleReject = (requestId: string) => {
    const reason = prompt('يرجى إدخال سبب الرفض:');
    if (reason) {
      processRequestMutation.mutate({ requestId, action: 'rejected', reason });
    }
  };

  if (!requests || requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            طلبات إنشاء الحسابات المعلقة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              لا توجد طلبات معلقة لإنشاء حسابات حاليًا
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          طلبات إنشاء الحسابات المعلقة ({requests.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="border-l-4 border-l-warning">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    {/* Employee Info */}
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <h4 className="font-semibold">
                        {request.employees?.first_name} {request.employees?.last_name}
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span>رقم الموظف: </span>
                        <span className="font-medium">{request.employees?.employee_number}</span>
                      </div>
                      <div>
                        <span>المنصب: </span>
                        <span className="font-medium">{request.employees?.position || 'غير محدد'}</span>
                      </div>
                    </div>

                    {/* Request Info */}
                    <div className="space-y-1">
                      <div className="text-sm">
                        <span className="text-muted-foreground">طُلب بواسطة: </span>
                        <span className="font-medium">
                          {request.profiles?.requester_first_name} {request.profiles?.requester_last_name}
                        </span>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        تاريخ الطلب: {format(new Date(request.request_date), 'PPP', { locale: ar })}
                      </div>
                    </div>

                    {/* Requested Roles */}
                    {request.requested_roles && request.requested_roles.length > 0 && (
                      <div>
                        <span className="text-sm text-muted-foreground">الأدوار المطلوبة: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {request.requested_roles.map((role: string) => (
                            <Badge key={role} variant="outline" className="text-xs">
                              {role === 'company_admin' ? 'مدير الشركة' :
                               role === 'manager' ? 'مدير' :
                               role === 'sales_agent' ? 'مندوب مبيعات' :
                               role === 'employee' ? 'موظف' : role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {request.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">ملاحظات: </span>
                        <span>{request.notes}</span>
                      </div>
                    )}

                    {/* Status */}
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Badge variant="secondary" className="bg-warning/10 text-warning">
                        <Clock className="w-3 h-3 mr-1" />
                        معلق
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(request.id)}
                      disabled={processRequestMutation.isPending}
                      className="bg-success hover:bg-success/90 text-success-foreground"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      موافقة
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(request.id)}
                      disabled={processRequestMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      رفض
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}