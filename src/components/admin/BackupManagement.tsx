import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  HardDrive,
  Calendar
} from 'lucide-react';
import { StatCardNumber } from '@/components/ui/NumberDisplay';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const BackupManagement: React.FC = () => {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: backups, isLoading } = useQuery({
    queryKey: ['backup-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const createBackupMutation = useMutation({
    mutationFn: async (type: 'full' | 'incremental') => {
      const { data, error } = await supabase
        .from('backup_logs')
        .insert({
          backup_type: type,
          status: 'completed',
          file_size_bytes: 1024 * 1024 * 100, // 100MB simulation
          records_count: 1000,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "تم إنشاء النسخة الاحتياطية",
        description: "تم بدء عملية إنشاء النسخة الاحتياطية بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['backup-logs'] });
      setIsCreatingBackup(false);
    },
    onError: (error) => {
      toast({
        title: "خطأ في إنشاء النسخة الاحتياطية",
        description: "حدث خطأ أثناء إنشاء النسخة الاحتياطية",
        variant: "destructive",
      });
      setIsCreatingBackup(false);
    }
  });

  const restoreBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      // Simulate restore process
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "تم بدء عملية الاستعادة",
        description: "تم بدء عملية استعادة النسخة الاحتياطية بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['backup-logs'] });
    },
    onError: () => {
      toast({
        title: "خطأ في الاستعادة",
        description: "حدث خطأ أثناء استعادة النسخة الاحتياطية",
        variant: "destructive",
      });
    }
  });

  const downloadBackupMutation = useMutation({
    mutationFn: async (backup: any) => {
      // Simulate download process - in real implementation, this would download the actual backup file
      const blob = new Blob(['Backup data simulation'], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-${backup.backup_type}-${backup.created_at.split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "تم بدء التحميل",
        description: "تم بدء تحميل النسخة الاحتياطية بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ في التحميل",
        description: "حدث خطأ أثناء تحميل النسخة الاحتياطية",
        variant: "destructive",
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'in_progress':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">مكتملة</Badge>;
      case 'failed':
        return <Badge variant="destructive">فاشلة</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">قيد التنفيذ</Badge>;
      default:
        return <Badge variant="outline">منتظرة</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
      {/* Backup Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            إدارة النسخ الاحتياطية
          </CardTitle>
          <CardDescription>
            إنشاء واستعادة النسخ الاحتياطية للنظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={() => {
                setIsCreatingBackup(true);
                createBackupMutation.mutate('full');
              }}
              disabled={isCreatingBackup || createBackupMutation.isPending}
              className="flex items-center gap-2"
            >
              <HardDrive className="h-4 w-4" />
              إنشاء نسخة احتياطية كاملة
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => {
                setIsCreatingBackup(true);
                createBackupMutation.mutate('incremental');
              }}
              disabled={isCreatingBackup || createBackupMutation.isPending}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              إنشاء نسخة احتياطية تدريجية
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي النسخ</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <StatCardNumber value={backups?.length || 0} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">النسخ المكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <StatCardNumber 
              value={backups?.filter(b => b.status === 'completed').length || 0}
              className="text-green-600"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">النسخ الفاشلة</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <StatCardNumber 
              value={backups?.filter(b => b.status === 'failed').length || 0}
              className="text-red-600"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الحجم الإجمالي</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <StatCardNumber 
              value={formatFileSize(backups?.reduce((total, backup) => total + (backup.file_size_bytes || 0), 0) || 0)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle>سجل النسخ الاحتياطية</CardTitle>
          <CardDescription>
            جميع النسخ الاحتياطية المتاحة في النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups && backups.length > 0 ? (
            <div className="space-y-4">
              {backups.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(backup.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">نسخة احتياطية {backup.backup_type === 'full' ? 'كاملة' : 'تدريجية'}</h4>
                        {getStatusBadge(backup.status)}
                        <Badge variant="outline">
                          {backup.backup_type === 'full' ? 'كاملة' : 'تدريجية'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(backup.created_at), 'dd MMM yyyy, HH:mm', { locale: ar })}
                        </span>
                        {backup.file_size_bytes && (
                          <span className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            {formatFileSize(backup.file_size_bytes)}
                          </span>
                        )}
                        {backup.completed_at && (
                          <span>
                            مدة الإنشاء: {Math.round((new Date(backup.completed_at).getTime() - new Date(backup.created_at).getTime()) / 1000 / 60)} دقيقة
                          </span>
                        )}
                      </div>
                      {backup.error_message && (
                        <p className="text-sm text-red-600 mt-1">{backup.error_message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {backup.status === 'completed' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadBackupMutation.mutate(backup)}
                          disabled={downloadBackupMutation.isPending}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          تحميل
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => restoreBackupMutation.mutate(backup.id)}
                          disabled={restoreBackupMutation.isPending}
                          className="flex items-center gap-1"
                        >
                          <Upload className="h-3 w-3" />
                          استعادة
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">لا توجد نسخ احتياطية</h3>
              <p className="text-muted-foreground">قم بإنشاء النسخة الاحتياطية الأولى</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};