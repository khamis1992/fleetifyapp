import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Users, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useBulkDeleteCustomers } from '@/hooks/useBulkDeleteCustomers';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BulkDeleteCustomersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetCompanyId?: string;
}

export const BulkDeleteCustomersDialog: React.FC<BulkDeleteCustomersDialogProps> = ({
  open,
  onOpenChange,
  targetCompanyId
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [step, setStep] = useState<'warning' | 'processing' | 'completed'>('warning');
  
  const { companyId, browsedCompany, isBrowsingMode } = useUnifiedCompanyAccess();
  const { bulkDeleteCustomers, progress, resetProgress } = useBulkDeleteCustomers();
  
  const actualCompanyId = targetCompanyId || companyId;
  const companyName = isBrowsingMode && browsedCompany ? browsedCompany.name : 'الشركة الحالية';

  // Get customers and related data count for the target company
  const { data: customersInfo, isLoading: isLoadingInfo } = useQuery({
    queryKey: ['customers-bulk-info', actualCompanyId],
    queryFn: async () => {
      if (!actualCompanyId) return null;
      
      // Get customers
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, customer_type, first_name, last_name, company_name')
        .eq('company_id', actualCompanyId);
      
      if (customersError) throw customersError;

      if (!customers || customers.length === 0) {
        return {
          total: 0,
          individualCustomers: 0,
          corporateCustomers: 0,
          totalContracts: 0,
          totalInvoices: 0
        };
      }

      const customerIds = customers.map(c => c.id);
      
      // Get contracts count
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('id')
        .in('customer_id', customerIds);
      
      if (contractsError) console.warn('Error fetching contracts:', contractsError);

      // Get invoices count
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id')
        .in('customer_id', customerIds);
      
      if (invoicesError) console.warn('Error fetching invoices:', invoicesError);
      
      const individualCustomers = customers.filter(c => c.customer_type === 'individual').length;
      const corporateCustomers = customers.filter(c => c.customer_type === 'corporate').length;
      
      return {
        total: customers.length,
        individualCustomers,
        corporateCustomers,
        totalContracts: contracts?.length || 0,
        totalInvoices: invoices?.length || 0,
        customers
      };
    },
    enabled: open && !!actualCompanyId
  });

  const requiredConfirmationText = 'حذف جميع العملاء';
  const isConfirmationValid = confirmationText.trim() === requiredConfirmationText;

  useEffect(() => {
    if (!open) {
      setStep('warning');
      setConfirmationText('');
      resetProgress();
    }
  }, [open]);

  const handleConfirmDelete = async () => {
    if (!isConfirmationValid) return;
    
    setStep('processing');
    try {
      await bulkDeleteCustomers.mutateAsync(actualCompanyId);
      setStep('completed');
    } catch (error) {
      setStep('warning');
      console.error('Bulk delete failed:', error);
    }
  };

  const handleClose = () => {
    if (step === 'processing') return; // Prevent closing during processing
    onOpenChange(false);
  };

  const progressPercentage = progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Users className="h-5 w-5" />
            حذف جميع العملاء
          </DialogTitle>
          <DialogDescription>
            {step === 'warning' && 'عملية خطيرة جداً! سيتم حذف جميع العملاء والبيانات المرتبطة بهم نهائياً'}
            {step === 'processing' && 'جاري حذف العملاء...'}
            {step === 'completed' && 'اكتملت عملية الحذف'}
          </DialogDescription>
        </DialogHeader>

        {step === 'warning' && (
          <div className="space-y-4">
            {/* Company Info */}
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">الشركة:</span>
                    <Badge variant="outline">{companyName}</Badge>
                  </div>
                  
                  {isLoadingInfo ? (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 animate-spin" />
                      <span className="text-sm">جاري تحميل معلومات العملاء...</span>
                    </div>
                  ) : customersInfo ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">إجمالي العملاء:</span>
                        <Badge variant="destructive">{customersInfo.total} عميل</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">العملاء الأفراد:</span>
                        <Badge variant="outline">{customersInfo.individualCustomers} فرد</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">العملاء الشركات:</span>
                        <Badge variant="outline">{customersInfo.corporateCustomers} شركة</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">العقود المرتبطة:</span>
                        <Badge variant="secondary">{customersInfo.totalContracts} عقد</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">الفواتير المرتبطة:</span>
                        <Badge variant="secondary">{customersInfo.totalInvoices} فاتورة</Badge>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      لا يوجد عملاء للحذف
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Warning Messages */}
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">تحذير شديد جداً!</p>
                  <div className="text-sm space-y-1">
                    <div>• سيتم حذف جميع العملاء نهائياً ولا يمكن التراجع</div>
                    <div>• سيتم حذف جميع العقود المرتبطة بالعملاء</div>
                    <div>• سيتم حذف جميع الفواتير وجداول الدفع</div>
                    <div>• سيتم حذف جميع المدفوعات والتقارير المرتبطة</div>
                    <div>• هذه العملية قد تستغرق عدة دقائق</div>
                    <div>• تأكد من وجود نسخة احتياطية من البيانات</div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Additional Warning for Active Contracts */}
            {customersInfo && customersInfo.totalContracts > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold">تحذير إضافي:</p>
                  <p className="text-sm">
                    يوجد {customersInfo.totalContracts} عقد مرتبط بالعملاء سيتم حذفه أيضاً مع جميع بياناته!
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Confirmation Input */}
            <div className="space-y-2">
              <Label htmlFor="confirmation">
                اكتب "{requiredConfirmationText}" للتأكيد:
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={requiredConfirmationText}
                className={isConfirmationValid ? 'border-destructive' : ''}
              />
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>تقدم العملية</span>
                <span>{progress.processed} / {progress.total}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="text-sm font-medium">{progress.currentStep}</div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">محذوف</span>
                      </div>
                      <div className="text-lg font-bold text-green-600">{progress.deleted}</div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">معالج</span>
                      </div>
                      <div className="text-lg font-bold text-blue-600">{progress.processed}</div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium">فاشل</span>
                      </div>
                      <div className="text-lg font-bold text-red-600">{progress.failed}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {progress.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">أخطاء العملية:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {progress.errors.slice(0, 5).map((error, index) => (
                        <div key={index} className="text-xs">
                          {error.error}
                        </div>
                      ))}
                      {progress.errors.length > 5 && (
                        <div className="text-xs text-muted-foreground">
                          و {progress.errors.length - 5} أخطاء أخرى...
                        </div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 'completed' && (
          <div className="space-y-4">
            <Alert variant={progress.failed === 0 ? 'default' : 'destructive'}>
              {progress.failed === 0 ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertDescription>
                {progress.failed === 0 ? (
                  <div>
                    <p className="font-semibold text-green-600">تم حذف جميع العملاء بنجاح!</p>
                    <p className="text-sm">تم حذف {progress.deleted} عميل مع جميع بياناتهم المرتبطة</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold">اكتملت العملية مع بعض الأخطاء</p>
                    <p className="text-sm">تم حذف {progress.deleted} عميل، فشل {progress.failed} عميل</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {progress.errors.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">تفاصيل الأخطاء:</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {progress.errors.map((error, index) => (
                        <div key={index} className="text-xs text-muted-foreground">
                          {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'warning' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={!isConfirmationValid || isLoadingInfo || !customersInfo?.total}
              >
                <Users className="h-4 w-4 mr-2" />
                حذف جميع العملاء
              </Button>
            </>
          )}
          
          {step === 'processing' && (
            <Button disabled>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              جاري الحذف...
            </Button>
          )}
          
          {step === 'completed' && (
            <Button onClick={handleClose}>
              إغلاق
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};