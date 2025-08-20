import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  Info,
  Trash2,
  ArrowRight,
  Shield,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import {
  useAnalyzeAccountDependencies,
  useComprehensiveAccountDeletion,
  formatDeletionConfirmation,
  determineDeletionStrategy,
  type AccountDeletionAnalysis,
  type DeletionMode
} from '@/hooks/useEnhancedAccountDeletion';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';

interface EnhancedAccountDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountName: string;
  accountCode: string;
}

export const EnhancedAccountDeleteDialog: React.FC<EnhancedAccountDeleteDialogProps> = ({
  isOpen,
  onClose,
  accountId,
  accountName,
  accountCode
}) => {
  const [step, setStep] = useState<'analysis' | 'confirmation' | 'execution'>('analysis');
  const [selectedMode, setSelectedMode] = useState<DeletionMode>('soft');
  const [transferAccountId, setTransferAccountId] = useState<string>('');
  const [analysis, setAnalysis] = useState<AccountDeletionAnalysis | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const analyzeQuery = useAnalyzeAccountDependencies();
  const deleteAccount = useComprehensiveAccountDeletion();
  const { data: accounts } = useChartOfAccounts();

  // تحليل التبعيات عند فتح الحوار
  useEffect(() => {
    if (isOpen && accountId) {
      setStep('analysis');
      setAnalysis(null);
      analyzeQuery.mutate(accountId);
    }
  }, [isOpen, accountId]);

  // تحديث النتائج عند اكتمال التحليل
  useEffect(() => {
    if (analyzeQuery.data) {
      setAnalysis(analyzeQuery.data);
      
      // تحديد الاستراتيجية الموصى بها فقط إذا كان التحليل ناجحاً
      if (analyzeQuery.data.success) {
        const strategy = determineDeletionStrategy(analyzeQuery.data);
        setSelectedMode(strategy.recommendedMode);
      } else {
        // في حالة فشل التحليل، استخدم الوضع الآمن
        setSelectedMode('soft');
      }
      
      setStep('confirmation');
    }
  }, [analyzeQuery.data]);

  const handleDelete = async () => {
    if (!analysis) return;
    
    setStep('execution');
    
    try {
      await deleteAccount.mutateAsync({
        accountId,
        deletionMode: selectedMode,
        transferToAccountId: selectedMode === 'transfer' ? transferAccountId : undefined
      });
      
      onClose();
    } catch (error) {
      setStep('confirmation');
    }
  };

  const handleClose = () => {
    setStep('analysis');
    setAnalysis(null);
    setSelectedMode('soft');
    setTransferAccountId('');
    setShowAdvanced(false);
    onClose();
  };

  const getDeletionModeIcon = (mode: DeletionMode) => {
    switch (mode) {
      case 'soft': return <Shield className="h-4 w-4" />;
      case 'transfer': return <ArrowRight className="h-4 w-4" />;
      case 'force': return <Trash2 className="h-4 w-4" />;
    }
  };

  const getDeletionModeColor = (mode: DeletionMode) => {
    switch (mode) {
      case 'soft': return 'bg-blue-100 text-blue-800';
      case 'transfer': return 'bg-yellow-100 text-yellow-800';
      case 'force': return 'bg-red-100 text-red-800';
    }
  };

  const getDeletionModeDescription = (mode: DeletionMode) => {
    switch (mode) {
      case 'soft': return 'إلغاء تفعيل الحساب (آمن)';
      case 'transfer': return 'نقل البيانات ثم حذف الحساب';
      case 'force': return 'حذف قسري مع جميع البيانات';
    }
  };

  // قائمة الحسابات المتاحة للنقل (استبعاد الحساب الحالي)
  const availableAccounts = accounts?.filter(acc => 
    acc.id !== accountId && 
    acc.is_active && 
    !acc.is_system
  ) || [];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            حذف الحساب: {accountCode} - {accountName}
          </DialogTitle>
        </DialogHeader>

        {/* مرحلة التحليل */}
        {step === 'analysis' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="text-lg">جاري تحليل البيانات المرتبطة...</span>
              </div>
            </div>
            
            {analyzeQuery.error && (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  خطأ في التحليل: {analyzeQuery.error.message}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* مرحلة التأكيد */}
        {step === 'confirmation' && analysis && (
          <div className="space-y-6">
            {/* في حالة فشل التحليل */}
            {!analysis.success && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>خطأ في التحليل:</strong> {analysis.error || 'لا يمكن تحليل البيانات المرتبطة بالحساب'}
                  <br />
                  <span className="text-sm">سيتم استخدام الوضع الآمن (إلغاء التفعيل) فقط.</span>
                </AlertDescription>
              </Alert>
            )}

            {/* معلومات الحساب */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">معلومات الحساب</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">رمز الحساب:</span>
                    <div className="font-medium">{analysis.account_info?.code || accountCode}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">اسم الحساب:</span>
                    <div className="font-medium">{analysis.account_info?.name || accountName}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">نوع الحساب:</span>
                    <div className="font-medium">{analysis.account_info?.type || 'غير محدد'}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">حساب نظامي:</span>
                    <Badge variant={analysis.account_info?.is_system ? 'destructive' : 'default'}>
                      {analysis.account_info?.is_system ? 'نعم' : 'لا'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* البيانات المرتبطة */}
            {analysis.success && analysis.total_dependencies > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-500" />
                    البيانات المرتبطة ({analysis.total_dependencies})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.dependencies?.map((dep, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium">{dep.description}</div>
                          <div className="text-sm text-muted-foreground">{dep.action}</div>
                        </div>
                        <Badge variant="outline">{dep.count} سجل</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* خيارات الحذف */}
            <Card>
              <CardHeader>
                <CardTitle>خيارات الحذف</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* الخيارات الأساسية */}
                <div className="grid grid-cols-1 gap-3">
                  <div 
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedMode === 'soft' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedMode('soft')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${getDeletionModeColor('soft')}`}>
                        {getDeletionModeIcon('soft')}
                      </div>
                      <div>
                        <div className="font-medium">إلغاء التفعيل (آمن)</div>
                        <div className="text-sm text-muted-foreground">
                          إخفاء الحساب دون حذف البيانات المرتبطة
                        </div>
                      </div>
                    </div>
                  </div>

                  {analysis.success && analysis.total_dependencies > 0 && (
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedMode === 'transfer' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200'
                      }`}
                      onClick={() => setSelectedMode('transfer')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${getDeletionModeColor('transfer')}`}>
                          {getDeletionModeIcon('transfer')}
                        </div>
                        <div>
                          <div className="font-medium">نقل البيانات ثم حذف</div>
                          <div className="text-sm text-muted-foreground">
                            نقل جميع البيانات إلى حساب آخر ثم حذف الحساب
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* إظهار خيار الحذف القسري فقط في حالة نجاح التحليل أو عدم وجود تبعيات */}
                  {(!analysis.success || analysis.total_dependencies === 0) && (
                    <div 
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedMode === 'force' ? 'border-red-500 bg-red-50' : 'border-gray-200'
                      }`}
                      onClick={() => setSelectedMode('force')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${getDeletionModeColor('force')}`}>
                          {getDeletionModeIcon('force')}
                        </div>
                        <div>
                          <div className="font-medium">حذف قسري (خطر)</div>
                          <div className="text-sm text-muted-foreground">
                            حذف الحساب وجميع البيانات المرتبطة نهائياً
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* اختيار الحساب البديل للنقل */}
                {selectedMode === 'transfer' && (
                  <div className="space-y-3">
                    <Separator />
                    <div>
                      <Label htmlFor="transfer-account">الحساب البديل</Label>
                      <Select value={transferAccountId} onValueChange={setTransferAccountId}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحساب البديل..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableAccounts.map(account => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.account_code} - {account.account_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* تحذيرات */}
                {selectedMode === 'force' && analysis.total_dependencies > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>تحذير:</strong> الحذف القسري سيؤدي إلى فقدان {analysis.total_dependencies} سجل مرتبط.
                      هذا الإجراء لا يمكن التراجع عنه!
                    </AlertDescription>
                  </Alert>
                )}

                {selectedMode === 'transfer' && !transferAccountId && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      يرجى اختيار الحساب البديل الذي ستنقل إليه البيانات.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* مرحلة التنفيذ */}
        {step === 'execution' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="text-lg">جاري تنفيذ عملية الحذف...</span>
              </div>
            </div>
            
            <div className="text-center text-muted-foreground">
              يرجى الانتظار حتى اكتمال العملية...
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'analysis' && (
            <Button variant="outline" onClick={handleClose}>
              إلغاء
            </Button>
          )}
          
          {step === 'confirmation' && (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                إلغاء
              </Button>
              
              <Button 
                onClick={handleDelete}
                disabled={selectedMode === 'transfer' && !transferAccountId}
                variant={selectedMode === 'force' ? 'destructive' : 'default'}
                className="flex-1"
              >
                {selectedMode === 'soft' && (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    إلغاء التفعيل
                  </>
                )}
                {selectedMode === 'transfer' && (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    نقل وحذف
                  </>
                )}
                {selectedMode === 'force' && (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    حذف قسري
                  </>
                )}
              </Button>
            </div>
          )}
          
          {step === 'execution' && (
            <Button variant="outline" disabled>
              جاري التنفيذ...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedAccountDeleteDialog;
