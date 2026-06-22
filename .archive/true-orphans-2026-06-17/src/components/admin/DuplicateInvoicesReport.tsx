/**
 * تقرير الفواتير المكررة
 * ========================
 * يعرض الفواتير المكررة (أكثر من فاتورة لنفس العقد في نفس الشهر)
 * ويتيح دمجها أو حذفها
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle, FileText, Trash2, Merge } from 'lucide-react';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { UnifiedInvoiceService } from '@/services/UnifiedInvoiceService';
import { toast } from 'sonner';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

export const DuplicateInvoicesReport: React.FC = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrencyFormatter();
  const [processingId, setProcessingId] = useState<string | null>(null);

  // جلب تقرير الفواتير المكررة
  const { data: report, isLoading, error, refetch } = useQuery({
    queryKey: ['duplicate-invoices-report', companyId],
    queryFn: async () => {
      if (!companyId) return { duplicates: [], totalDuplicates: 0 };
      return await UnifiedInvoiceService.getDuplicateInvoicesReport(companyId);
    },
    enabled: !!companyId,
    refetchInterval: 60000 // تحديث كل دقيقة
  });

  // دمج الفواتير المكررة
  const mergeMutation = useMutation({
    mutationFn: async ({ keepId, duplicateId }: { keepId: string; duplicateId: string }) => {
      return await UnifiedInvoiceService.mergeDuplicateInvoices(keepId, duplicateId);
    },
    onSuccess: () => {
      toast.success('تم دمج الفواتير بنجاح');
      queryClient.invalidateQueries({ queryKey: ['duplicate-invoices-report'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل في دمج الفواتير');
    }
  });

  const handleMerge = async (keepId: string, duplicateId: string) => {
    setProcessingId(duplicateId);
    await mergeMutation.mutateAsync({ keepId, duplicateId });
    setProcessingId(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>حدث خطأ في تحميل التقرير: {(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  const { duplicates = [], totalDuplicates = 0 } = report || {};

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              تقرير الفواتير المكررة
            </CardTitle>
            <CardDescription>
              الفواتير التي تم إنشاؤها أكثر من مرة لنفس العقد في نفس الشهر
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            تحديث
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {totalDuplicates === 0 ? (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              لا توجد فواتير مكررة - النظام نظيف! ✨
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                تم العثور على <strong>{totalDuplicates}</strong> فاتورة مكررة في{' '}
                <strong>{duplicates.length}</strong> مجموعة
              </AlertDescription>
            </Alert>

            {duplicates.map((group, index) => (
              <Card key={`${group.contract_id}-${group.invoice_month}`} className="border-orange-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">
                        العقد: {group.contract_number}
                      </CardTitle>
                      <CardDescription>
                        الشهر: {group.invoice_month} • {group.invoices.length} فواتير
                      </CardDescription>
                    </div>
                    <Badge variant="destructive">{group.invoices.length} مكررة</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {group.invoices.map((invoice, invIndex) => (
                      <div
                        key={invoice.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          invIndex === 0
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{invoice.invoice_number}</span>
                              {invIndex === 0 && (
                                <Badge variant="outline" className="bg-green-100 text-green-700">
                                  الأصلية
                                </Badge>
                              )}
                              {invIndex > 0 && (
                                <Badge variant="outline" className="bg-red-100 text-red-700">
                                  مكررة
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(invoice.invoice_date).toLocaleDateString('ar-SA')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold">
                              {formatCurrency(invoice.total_amount)}
                            </div>
                            <Badge
                              variant={
                                invoice.payment_status === 'paid'
                                  ? 'default'
                                  : invoice.payment_status === 'partial'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {invoice.payment_status === 'paid'
                                ? 'مدفوعة'
                                : invoice.payment_status === 'partial'
                                ? 'جزئية'
                                : 'غير مدفوعة'}
                            </Badge>
                          </div>
                          {invIndex > 0 && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleMerge(group.invoices[0].id, invoice.id)}
                              disabled={processingId === invoice.id}
                            >
                              {processingId === invoice.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Merge className="h-4 w-4 mr-1" />
                                  دمج
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    💡 الدمج: نقل الدفعات إلى الفاتورة الأصلية وإلغاء المكررة
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DuplicateInvoicesReport;
