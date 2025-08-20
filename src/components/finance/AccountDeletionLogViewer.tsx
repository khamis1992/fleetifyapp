import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  History,
  Shield,
  ArrowRight,
  Trash2,
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle
} from 'lucide-react';
import { useAccountDeletionLog } from '@/hooks/useEnhancedAccountDeletion';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface AccountDeletionLogViewerProps {
  trigger?: React.ReactNode;
}

export const AccountDeletionLogViewer: React.FC<AccountDeletionLogViewerProps> = ({
  trigger
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  
  const logQuery = useAccountDeletionLog();

  const handleOpen = () => {
    setIsOpen(true);
    logQuery.mutate(100); // جلب آخر 100 عملية
  };

  const getDeletionTypeIcon = (type: string) => {
    switch (type) {
      case 'soft': return <Shield className="h-4 w-4 text-blue-500" />;
      case 'transfer': return <ArrowRight className="h-4 w-4 text-yellow-500" />;
      case 'force': return <Trash2 className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getDeletionTypeLabel = (type: string) => {
    switch (type) {
      case 'soft': return 'إلغاء تفعيل';
      case 'transfer': return 'نقل وحذف';
      case 'force': return 'حذف قسري';
      default: return type;
    }
  };

  const getDeletionTypeBadge = (type: string) => {
    switch (type) {
      case 'soft': return 'default';
      case 'transfer': return 'secondary';
      case 'force': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy - HH:mm', { locale: ar });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" onClick={handleOpen}>
            <History className="h-4 w-4 mr-2" />
            سجل حذف الحسابات
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            سجل حذف الحسابات
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
          {/* قائمة السجلات */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">عمليات الحذف الأخيرة</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[50vh]">
                  {logQuery.isPending ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center gap-2">
                        <History className="h-5 w-5 animate-pulse" />
                        <span>جاري تحميل السجل...</span>
                      </div>
                    </div>
                  ) : logQuery.error ? (
                    <div className="flex items-center justify-center py-8 text-red-500">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-5 w-5" />
                        <span>خطأ في تحميل السجل</span>
                      </div>
                    </div>
                  ) : logQuery.data && logQuery.data.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>الحساب المحذوف</TableHead>
                          <TableHead>نوع العملية</TableHead>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logQuery.data.map((log: any) => (
                          <TableRow 
                            key={log.id}
                            className={`cursor-pointer hover:bg-muted/50 ${
                              selectedLog?.id === log.id ? 'bg-muted' : ''
                            }`}
                            onClick={() => setSelectedLog(log)}
                          >
                            <TableCell>
                              <div>
                                <div className="font-medium">{log.deleted_account_code}</div>
                                <div className="text-sm text-muted-foreground">
                                  {log.deleted_account_name}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getDeletionTypeIcon(log.deletion_type)}
                                <Badge variant={getDeletionTypeBadge(log.deletion_type) as any}>
                                  {getDeletionTypeLabel(log.deletion_type)}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {formatDate(log.created_at)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {log.completed_at ? (
                                log.error_message ? (
                                  <Badge variant="destructive">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    فشل
                                  </Badge>
                                ) : (
                                  <Badge variant="default">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    مكتمل
                                  </Badge>
                                )
                              ) : (
                                <Badge variant="secondary">
                                  جاري التنفيذ...
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <div className="text-center">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <div>لا توجد عمليات حذف مسجلة</div>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* تفاصيل العملية المختارة */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">تفاصيل العملية</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedLog ? (
                  <ScrollArea className="h-[50vh]">
                    <div className="space-y-4">
                      {/* معلومات أساسية */}
                      <div>
                        <h4 className="font-semibold mb-2">معلومات الحساب</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">الرمز:</span>
                            <span className="ml-2 font-medium">{selectedLog.deleted_account_code}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">الاسم:</span>
                            <span className="ml-2 font-medium">{selectedLog.deleted_account_name}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">نوع العملية:</span>
                            <div className="flex items-center gap-2 mt-1">
                              {getDeletionTypeIcon(selectedLog.deletion_type)}
                              <Badge variant={getDeletionTypeBadge(selectedLog.deletion_type) as any}>
                                {getDeletionTypeLabel(selectedLog.deletion_type)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* تفاصيل العملية */}
                      <div>
                        <h4 className="font-semibold mb-2">تفاصيل العملية</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">السبب:</span>
                            <span className="ml-2">{selectedLog.deletion_reason}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">التاريخ:</span>
                            <span className="ml-2">{formatDate(selectedLog.created_at)}</span>
                          </div>
                          {selectedLog.completed_at && (
                            <div>
                              <span className="text-muted-foreground">اكتمل في:</span>
                              <span className="ml-2">{formatDate(selectedLog.completed_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* البيانات المتأثرة */}
                      {selectedLog.affected_records && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="font-semibold mb-2">البيانات المتأثرة</h4>
                            <div className="space-y-2">
                              {Object.entries(selectedLog.affected_records).map(([table, count]) => (
                                <div key={table} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">{table}:</span>
                                  <Badge variant="outline">{count as number} سجل</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* رسالة الخطأ */}
                      {selectedLog.error_message && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="font-semibold mb-2 text-red-600">رسالة الخطأ</h4>
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                              {selectedLog.error_message}
                            </div>
                          </div>
                        </>
                      )}

                      {/* بيانات التحليل */}
                      {selectedLog.analysis_data && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="font-semibold mb-2">بيانات التحليل</h4>
                            <div className="p-3 bg-gray-50 border rounded-lg">
                              <pre className="text-xs overflow-x-auto">
                                {JSON.stringify(selectedLog.analysis_data, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
                    <div className="text-center">
                      <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <div>اختر عملية من القائمة لعرض التفاصيل</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountDeletionLogViewer;
