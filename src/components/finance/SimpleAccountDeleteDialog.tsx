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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  Trash2,
  ArrowRight,
  Shield,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useSimpleAccountAnalysis, useSimpleAccountDeletion } from '@/hooks/useSimpleAccountDeletion';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';

interface SimpleAccountDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountName: string;
  accountCode: string;
}

export const SimpleAccountDeleteDialog: React.FC<SimpleAccountDeleteDialogProps> = ({
  isOpen,
  onClose,
  accountId,
  accountName,
  accountCode
}) => {
  const [step, setStep] = useState<'analysis' | 'confirmation'>('analysis');
  const [selectedMode, setSelectedMode] = useState<'soft' | 'transfer' | 'force'>('soft');
  const [transferAccountId, setTransferAccountId] = useState<string>('');
  const [analysis, setAnalysis] = useState<any>(null);

  const analyzeQuery = useSimpleAccountAnalysis();
  const deleteAccount = useSimpleAccountDeletion();
  const { data: accounts } = useChartOfAccounts();

  // تحليل الحساب عند فتح الحوار
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
      
      // تحديد النمط الموصى به
      if (analyzeQuery.data.can_delete_safely) {
        setSelectedMode('force'); // حذف آمن
      } else if (analyzeQuery.data.has_journal_entries) {
        setSelectedMode('transfer'); // يحتاج نقل
      } else {
        setSelectedMode('soft'); // إلغاء تفعيل
      }
      
      setStep('confirmation');
    }
  }, [analyzeQuery.data]);

  const handleDelete = async () => {
    if (!analysis) return;
    
    try {
      await deleteAccount.mutateAsync({
        accountId,
        deletionMode: selectedMode,
        transferToAccountId: selectedMode === 'transfer' ? transferAccountId : undefined
      });
      
      onClose();
    } catch (error) {
      // الخطأ سيظهر في toast تلقائياً
    }
  };

  const handleClose = () => {
    setStep('analysis');
    setAnalysis(null);
    setSelectedMode('soft');
    setTransferAccountId('');
    onClose();
  };

  // قائمة الحسابات المتاحة للنقل
  const availableAccounts = accounts?.filter(acc => 
    acc.id !== accountId && 
    acc.is_active && 
    !acc.is_system &&
    acc.account_type === analysis?.account_info.type // نفس النوع
  ) || [];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            حذف الحساب: {accountCode}
          </DialogTitle>
        </DialogHeader>

        {/* مرحلة التحليل */}
        {step === 'analysis' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span>جاري فحص الحساب...</span>
              </div>
            </div>
            
            {analyzeQuery.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  خطأ في التحليل: {analyzeQuery.error.message}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* مرحلة التأكيد */}
        {step === 'confirmation' && analysis && (
          <div className="space-y-4">
            {/* معلومات الحساب */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">اسم الحساب:</span>
                  <span className="font-medium">{analysis.account_info.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">نوع الحساب:</span>
                  <Badge variant="outline">{analysis.account_info.type}</Badge>
                </div>
                {analysis.account_info.is_system && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">حساب نظامي:</span>
                    <Badge variant="destructive">نعم</Badge>
                  </div>
                )}
              </div>
            </div>

            {/* حالة التبعيات */}
            {analysis.has_journal_entries || analysis.has_child_accounts || analysis.has_fixed_assets ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">يحتوي الحساب على بيانات مرتبطة:</p>
                    {analysis.has_journal_entries && (
                      <div>• {analysis.journal_entries_count} قيد محاسبي</div>
                    )}
                    {analysis.has_child_accounts && (
                      <div>• {analysis.child_accounts_count} حساب فرعي</div>
                    )}
                    {analysis.has_fixed_assets && (
                      <div>• {analysis.fixed_assets_count} أصل ثابت</div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  الحساب آمن للحذف - لا توجد بيانات مرتبطة
                </AlertDescription>
              </Alert>
            )}

            {/* خيارات الحذف */}
            <div className="space-y-3">
              <Label className="text-base font-medium">اختر نوع الحذف:</Label>
              
              <div className="space-y-2">
                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedMode === 'soft' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                  }`}
                  onClick={() => setSelectedMode('soft')}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">إلغاء التفعيل (آمن)</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    إخفاء الحساب دون حذف البيانات
                  </p>
                </div>

                {(analysis.has_journal_entries || analysis.has_child_accounts || analysis.has_fixed_assets) && (
                  <div 
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedMode === 'transfer' ? 'border-yellow-500 bg-yellow-50' : 'border-slate-200'
                    }`}
                    onClick={() => setSelectedMode('transfer')}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">نقل البيانات ثم حذف</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      نقل البيانات لحساب آخر ثم حذف الحساب
                    </p>
                  </div>
                )}

                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedMode === 'force' ? 'border-red-500 bg-red-50' : 'border-slate-200'
                  }`}
                  onClick={() => setSelectedMode('force')}
                >
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span className="font-medium">حذف قسري</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    حذف الحساب وجميع البيانات المرتبطة
                  </p>
                </div>
              </div>
            </div>

            {/* اختيار الحساب البديل */}
            {selectedMode === 'transfer' && (
              <div className="space-y-2">
                <Label>الحساب البديل:</Label>
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
            )}

            {/* تحذيرات */}
            {selectedMode === 'force' && (analysis.has_journal_entries || analysis.has_child_accounts) && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  تحذير: سيتم حذف جميع البيانات المرتبطة نهائياً!
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              إلغاء
            </Button>
            
            {step === 'confirmation' && (
              <Button 
                onClick={handleDelete}
                disabled={
                  deleteAccount.isPending ||
                  (selectedMode === 'transfer' && !transferAccountId)
                }
                variant={selectedMode === 'force' ? 'destructive' : 'default'}
                className="flex-1"
              >
                {deleteAccount.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    جاري الحذف...
                  </>
                ) : (
                  <>
                    {selectedMode === 'soft' && <Shield className="h-4 w-4 mr-2" />}
                    {selectedMode === 'transfer' && <ArrowRight className="h-4 w-4 mr-2" />}
                    {selectedMode === 'force' && <Trash2 className="h-4 w-4 mr-2" />}
                    {selectedMode === 'soft' && 'إلغاء التفعيل'}
                    {selectedMode === 'transfer' && 'نقل وحذف'}
                    {selectedMode === 'force' && 'حذف قسري'}
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleAccountDeleteDialog;
