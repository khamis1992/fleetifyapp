import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { 
  Search, 
  Filter, 
  Eye, 
  User, 
  Calendar, 
  Activity,
  Shield,
  Database,
  Settings,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

export const AuditLogViewer: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: auditLogs, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', user?.profile?.company_id, searchTerm, levelFilter, categoryFilter, dateRange],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];

      let query = supabase
        .from('system_logs')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (searchTerm) {
        query = query.or(`message.ilike.%${searchTerm}%,action.ilike.%${searchTerm}%`);
      }

      if (levelFilter !== 'all') {
        query = query.eq('level', levelFilter);
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }

      if (dateRange?.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.profile?.company_id
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info':
        return <Eye className="h-4 w-4 text-blue-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return <Badge variant="destructive">خطأ</Badge>;
      case 'warning':
        return <Badge variant="secondary">تحذير</Badge>;
      case 'info':
        return <Badge variant="default">معلومة</Badge>;
      default:
        return <Badge variant="outline">عام</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auth':
        return <Shield className="h-4 w-4" />;
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      case 'user_action':
        return <User className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'auth':
        return 'المصادقة';
      case 'database':
        return 'قاعدة البيانات';
      case 'system':
        return 'النظام';
      case 'user_action':
        return 'إجراءات المستخدم';
      default:
        return category;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            سجل العمليات
          </CardTitle>
          <CardDescription>
            مراجعة جميع العمليات والأنشطة في النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">البحث</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في الرسائل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">المستوى</label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المستوى" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المستويات</SelectItem>
                  <SelectItem value="error">خطأ</SelectItem>
                  <SelectItem value="warning">تحذير</SelectItem>
                  <SelectItem value="info">معلومة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">الفئة</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  <SelectItem value="auth">المصادقة</SelectItem>
                  <SelectItem value="database">قاعدة البيانات</SelectItem>
                  <SelectItem value="system">النظام</SelectItem>
                  <SelectItem value="user_action">إجراءات المستخدم</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">التاريخ</label>
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              عدد السجلات: {auditLogs?.length || 0}
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <Activity className="h-4 w-4 mr-2" />
              تحديث
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {auditLogs && auditLogs.length > 0 ? (
            <div className="space-y-0">
              {auditLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      {getLevelIcon(log.level)}
                      {getCategoryIcon(log.category)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{log.action}</span>
                        {getLevelBadge(log.level)}
                        <Badge variant="outline">{getCategoryLabel(log.category)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{log.message}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          مستخدم النظام
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm', { locale: ar })}
                        </span>
                        {log.resource_type && (
                          <span>النوع: {log.resource_type}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">لا توجد سجلات</h3>
              <p className="text-muted-foreground">لم يتم العثور على سجلات تطابق المعايير المحددة</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      {selectedLog && (
        <Card className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>تفاصيل السجل</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">المستوى</label>
                  <div className="mt-1">{getLevelBadge(selectedLog.level)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">الفئة</label>
                  <div className="mt-1">
                    <Badge variant="outline">{getCategoryLabel(selectedLog.category)}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">الإجراء</label>
                  <p className="mt-1">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">التاريخ</label>
                  <p className="mt-1">{format(new Date(selectedLog.created_at), 'dd MMMM yyyy, HH:mm:ss', { locale: ar })}</p>
                </div>
                {selectedLog.resource_type && (
                  <div>
                    <label className="text-sm font-medium">نوع المورد</label>
                    <p className="mt-1">{selectedLog.resource_type}</p>
                  </div>
                )}
                {selectedLog.resource_id && (
                  <div>
                    <label className="text-sm font-medium">معرف المورد</label>
                    <p className="mt-1 font-mono text-sm">{selectedLog.resource_id}</p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium">الرسالة</label>
                <p className="mt-1 p-3 bg-muted rounded-lg">{selectedLog.message}</p>
              </div>

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <label className="text-sm font-medium">بيانات إضافية</label>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      )}
    </div>
  );
};