import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useBulkInvoiceGeneration } from '@/hooks/useBulkInvoiceGeneration';
import { Receipt, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';

interface BulkInvoiceGenerationDialogProps {
  children: React.ReactNode;
}

export const BulkInvoiceGenerationDialog: React.FC<BulkInvoiceGenerationDialogProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { stats, isLoadingStats, isProcessing, generateBulkInvoices, isGenerating, refetchStats } = useBulkInvoiceGeneration();

  const handleGenerate = () => {
    generateBulkInvoices();
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      refetchStats();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            إنشاء فواتير شاملة للمدفوعات المفقودة
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                إحصائيات المدفوعات بدون فواتير
              </CardTitle>
              <CardDescription>
                ملخص المدفوعات المربوطة بعقود والتي تحتاج إلى فواتير
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">جاري تحميل الإحصائيات...</p>
                </div>
              ) : stats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {stats.total_payments_without_invoices}
                      </div>
                      <div className="text-sm text-orange-700">مدفوعة بدون فاتورة</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {stats.total_amount.toLocaleString()} د.ك
                      </div>
                      <div className="text-sm text-blue-700">إجمالي المبلغ</div>
                    </div>
                  </div>

                  {stats.total_payments_without_invoices > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-3">العقود المتأثرة:</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {stats.by_contract?.map((contract, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div>
                                <span className="font-medium">{contract.contract_number}</span>
                                <p className="text-sm text-muted-foreground">{contract.customer_name}</p>
                              </div>
                              <div className="text-right">
                                <Badge variant="secondary">{contract.payments_count} مدفوعة</Badge>
                                <p className="text-sm text-muted-foreground">
                                  {contract.total_amount.toLocaleString()} د.ك
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">لا توجد بيانات متاحة</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Processing Status */}
          {(isProcessing || isGenerating) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  جاري إنشاء الفواتير...
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Progress value={undefined} className="w-full" />
                  <p className="text-center text-muted-foreground">
                    يتم معالجة المدفوعات وإنشاء الفواتير، يرجى الانتظار...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {stats?.total_payments_without_invoices === 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">جميع المدفوعات لديها فواتير</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isProcessing || isGenerating}
              >
                إغلاق
              </Button>
              <Button 
                onClick={handleGenerate}
                disabled={
                  isLoadingStats || 
                  isProcessing || 
                  isGenerating || 
                  !stats || 
                  stats.total_payments_without_invoices === 0
                }
                className="min-w-[120px]"
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    معالجة...
                  </div>
                ) : (
                  <>إنشاء جميع الفواتير</>
                )}
              </Button>
            </div>
          </div>

          {/* Warning */}
          {stats && stats.total_payments_without_invoices > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-orange-800">
                      تحذير مهم
                    </p>
                    <p className="text-sm text-orange-700">
                      ستقوم هذه العملية بإنشاء {stats.total_payments_without_invoices} فاتورة جديدة. 
                      هذا الإجراء لا يمكن التراجع عنه. تأكد من صحة البيانات قبل المتابعة.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};