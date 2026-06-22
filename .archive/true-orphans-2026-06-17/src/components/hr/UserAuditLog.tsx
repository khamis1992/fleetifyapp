import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { History, Search, User, Shield, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function UserAuditLog() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['user-audit-log'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_account_audit')
        .select(`
          *,
          employees (
            first_name,
            last_name,
            employee_number
          )
        `)
        .order('performed_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'account_created':
        return <User className="w-4 h-4 text-info" />;
      case 'account_activated':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'account_deactivated':
        return <XCircle className="w-4 h-4 text-warning" />;
      case 'account_suspended':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'role_assigned':
      case 'role_removed':
        return <Shield className="w-4 h-4 text-primary" />;
      default:
        return <History className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      'account_created': 'إنشاء حساب',
      'account_activated': 'تفعيل حساب',
      'account_deactivated': 'إلغاء تفعيل حساب',
      'account_suspended': 'تعليق حساب',
      'role_assigned': 'تعيين دور',
      'role_removed': 'إزالة دور',
      'password_reset': 'إعادة تعيين كلمة المرور'
    };
    return labels[actionType] || actionType;
  };

  const getActionBadgeVariant = (actionType: string) => {
    switch (actionType) {
      case 'account_created':
        return 'default';
      case 'account_activated':
        return 'default';
      case 'account_deactivated':
        return 'secondary';
      case 'account_suspended':
        return 'destructive';
      case 'role_assigned':
      case 'role_removed':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const filteredLogs = auditLogs?.filter(log =>
    `${log.employees?.first_name} ${log.employees?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.employees?.employee_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getActionLabel(log.action_type).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <History className="w-5 h-5 mr-2" />
          سجل تدقيق حسابات المستخدمين
        </CardTitle>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="البحث في سجل التدقيق..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            dir="rtl"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        {!filteredLogs || filteredLogs.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {searchTerm ? 'لا توجد نتائج للبحث المحدد' : 'لا توجد أنشطة في سجل التدقيق'}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <Card key={log.id} className="border-l-4 border-l-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 space-x-reverse flex-1">
                      {getActionIcon(log.action_type)}
                      
                      <div className="space-y-2 flex-1">
                        {/* Main Action */}
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Badge variant={getActionBadgeVariant(log.action_type)}>
                            {getActionLabel(log.action_type)}
                          </Badge>
                          <span className="font-medium">
                            {log.employees?.first_name} {log.employees?.last_name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({log.employees?.employee_number})
                          </span>
                        </div>

                        {/* Performer and Time */}
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>
                            <span>تم بواسطة: </span>
                            <span className="font-medium">النظام</span>
                          </div>
                          <div>
                            {format(new Date(log.performed_at), 'PPP pp', { locale: ar })}
                          </div>
                        </div>

                        {/* Details */}
                        {log.details && (
                          <div className="text-sm">
                            <details className="cursor-pointer">
                              <summary className="text-muted-foreground hover:text-foreground">
                                عرض التفاصيل
                              </summary>
                              <div className="mt-2 p-3 bg-muted/30 rounded-md">
                                <pre className="text-xs whitespace-pre-wrap">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            </details>
                          </div>
                        )}

                        {/* Old/New Values */}
                        {(log.old_values || log.new_values) && (
                          <div className="text-sm space-y-2">
                            {log.old_values && (
                              <details className="cursor-pointer">
                                <summary className="text-muted-foreground hover:text-foreground">
                                  القيم السابقة
                                </summary>
                                <div className="mt-2 p-3 bg-destructive/10 rounded-md">
                                  <pre className="text-xs whitespace-pre-wrap">
                                    {JSON.stringify(log.old_values, null, 2)}
                                  </pre>
                                </div>
                              </details>
                            )}
                            {log.new_values && (
                              <details className="cursor-pointer">
                                <summary className="text-muted-foreground hover:text-foreground">
                                  القيم الجديدة
                                </summary>
                                <div className="mt-2 p-3 bg-success/10 rounded-md">
                                  <pre className="text-xs whitespace-pre-wrap">
                                    {JSON.stringify(log.new_values, null, 2)}
                                  </pre>
                                </div>
                              </details>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}