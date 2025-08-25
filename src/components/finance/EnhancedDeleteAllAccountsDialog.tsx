import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Shield, 
  Skull, 
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { useEnhancedAccountDeletion, useAccountDeletionPreview, type EnhancedDeletionOptions, type EnhancedDeletionResult } from "@/hooks/useEnhancedAccountDeletion";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONFIRMATION_TEXT = "أؤكد حذف جميع الحسابات";

export const EnhancedDeleteAllAccountsDialog: React.FC<Props> = ({
  open,
  onOpenChange,
}) => {
  const [step, setStep] = useState<'preview' | 'options' | 'confirm' | 'results'>('preview');
  const [options, setOptions] = useState<EnhancedDeletionOptions>({
    includeSystemAccounts: false,
    includeInactiveAccounts: true,
    forceCompleteReset: false,
    deletionReason: 'حذف شامل لجميع الحسابات'
  });
  const [confirmationText, setConfirmationText] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [results, setResults] = useState<EnhancedDeletionResult | null>(null);

  const previewMutation = useAccountDeletionPreview();
  const deletionMutation = useEnhancedAccountDeletion();

  // Load preview when dialog opens
  useEffect(() => {
    if (open && step === 'preview') {
      previewMutation.mutate({});
    }
  }, [open, step]);

  // Update preview when options change
  useEffect(() => {
    if (step === 'options') {
      previewMutation.mutate(options);
    }
  }, [options.includeSystemAccounts]);

  useEffect(() => {
    if (previewMutation.data) {
      setPreviewData(previewMutation.data);
    }
  }, [previewMutation.data]);

  const handleNext = () => {
    if (step === 'preview') setStep('options');
    else if (step === 'options') setStep('confirm');
    else if (step === 'confirm') handleDelete();
  };

  const handleDelete = () => {
    deletionMutation.mutate(options, {
      onSuccess: (data) => {
        setResults(data);
        setStep('results');
      }
    });
  };

  const handleClose = () => {
    setStep('preview');
    setConfirmationText('');
    setPreviewData(null);
    setResults(null);
    setOptions({
      includeSystemAccounts: false,
      includeInactiveAccounts: true,
      forceCompleteReset: false,
      deletionReason: 'حذف شامل لجميع الحسابات'
    });
    onOpenChange(false);
  };

  const canProceed = () => {
    if (step === 'confirm') {
      return confirmationText === CONFIRMATION_TEXT;
    }
    return true;
  };

  const getDangerLevel = () => {
    if (options.forceCompleteReset) return 'extreme';
    if (options.includeSystemAccounts) return 'high';
    return 'medium';
  };

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <Eye className="mx-auto h-12 w-12 text-blue-500 mb-4" />
        <h3 className="text-lg font-semibold">معاينة الحسابات الموجودة</h3>
        <p className="text-muted-foreground">فحص الحسابات الحالية قبل الحذف</p>
      </div>

      {previewMutation.isPending && (
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          <span className="mr-2">جاري تحليل الحسابات...</span>
        </div>
      )}

      {previewData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{previewData.total_accounts}</div>
              <div className="text-sm text-blue-600">إجمالي الحسابات</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-700">{previewData.system_accounts}</div>
              <div className="text-sm text-orange-600">حسابات نظامية</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{previewData.regular_accounts}</div>
              <div className="text-sm text-green-600">حسابات عادية</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-700">{previewData.will_be_deactivated}</div>
              <div className="text-sm text-red-600">سيتم إلغاء تفعيلها</div>
            </div>
          </div>

          {previewData.warning_message && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{previewData.warning_message}</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );

  const renderOptionsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="mx-auto h-12 w-12 text-orange-500 mb-4" />
        <h3 className="text-lg font-semibold">خيارات الحذف المتقدمة</h3>
        <p className="text-muted-foreground">اختر الخيارات المناسبة لاحتياجاتك</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id="includeInactive"
              checked={options.includeInactiveAccounts}
              onCheckedChange={(checked) => 
                setOptions(prev => ({ ...prev, includeInactiveAccounts: checked as boolean }))
              }
            />
            <Label htmlFor="includeInactive" className="text-sm font-medium">
              حذف الحسابات غير النشطة
            </Label>
          </div>
          <p className="text-xs text-muted-foreground mt-1 mr-6">
            سيتم حذف الحسابات التي تم إلغاء تفعيلها مسبقاً
          </p>
        </div>

        <div className="p-4 border rounded-lg border-orange-200 bg-orange-50">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id="includeSystem"
              checked={options.includeSystemAccounts}
              onCheckedChange={(checked) => 
                setOptions(prev => ({ ...prev, includeSystemAccounts: checked as boolean }))
              }
            />
            <Label htmlFor="includeSystem" className="text-sm font-medium text-orange-800">
              حذف الحسابات النظامية
            </Label>
            <Badge variant="secondary" className="bg-orange-200 text-orange-800">
              خطر متوسط
            </Badge>
          </div>
          <p className="text-xs text-orange-700 mt-1 mr-6">
            الحسابات النظامية هي أساس النظام المحاسبي. احذفها فقط إذا كنت تريد البدء من الصفر
          </p>
        </div>

        <div className="p-4 border rounded-lg border-red-200 bg-red-50">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id="forceReset"
              checked={options.forceCompleteReset}
              onCheckedChange={(checked) => 
                setOptions(prev => ({ ...prev, forceCompleteReset: checked as boolean }))
              }
            />
            <Label htmlFor="forceReset" className="text-sm font-medium text-red-800">
              الحذف القسري للبيانات المرتبطة
            </Label>
            <Badge variant="destructive">
              خطر عالي
            </Badge>
          </div>
          <p className="text-xs text-red-700 mt-1 mr-6">
            سيتم حذف جميع القيود المحاسبية والبيانات المرتبطة. هذا الإجراء لا يمكن التراجع عنه!
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">سبب الحذف (اختياري)</Label>
        <Textarea
          id="reason"
          value={options.deletionReason}
          onChange={(e) => setOptions(prev => ({ ...prev, deletionReason: e.target.value }))}
          placeholder="اكتب سبب حذف الحسابات..."
          className="min-h-[80px]"
        />
      </div>

      {previewData && (
        <Alert className={`${getDangerLevel() === 'extreme' ? 'border-red-500 bg-red-50' : 
                         getDangerLevel() === 'high' ? 'border-orange-500 bg-orange-50' : 
                         'border-yellow-500 bg-yellow-50'}`}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            مع الخيارات الحالية، سيتم حذف <strong>{
              options.includeSystemAccounts ? previewData.total_accounts : previewData.regular_accounts
            }</strong> حساب
            {options.includeSystemAccounts && ` (بما في ذلك ${previewData.system_accounts} حساب نظامي)`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Skull className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-red-700">تأكيد الحذف النهائي</h3>
        <p className="text-muted-foreground">هذا الإجراء لا يمكن التراجع عنه</p>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          أنت على وشك حذف {options.includeSystemAccounts ? 'جميع' : 'معظم'} الحسابات في دليل الحسابات.
          {options.forceCompleteReset && ' سيتم أيضاً حذف جميع البيانات المرتبطة بما في ذلك القيود المحاسبية.'}
          هذا الإجراء لا يمكن التراجع عنه!
        </AlertDescription>
      </Alert>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">ملخص العملية:</h4>
        <ul className="text-sm space-y-1">
          <li>• سيتم حذف الحسابات العادية: ✓</li>
          <li>• سيتم حذف الحسابات غير النشطة: {options.includeInactiveAccounts ? '✓' : '✗'}</li>
          <li>• سيتم حذف الحسابات النظامية: {options.includeSystemAccounts ? '✓' : '✗'}</li>
          <li>• حذف قسري للبيانات المرتبطة: {options.forceCompleteReset ? '✓' : '✗'}</li>
        </ul>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm">
          للمتابعة، اكتب النص التالي بالضبط: <strong>{CONFIRMATION_TEXT}</strong>
        </Label>
        <Input
          id="confirm"
          value={confirmationText}
          onChange={(e) => setConfirmationText(e.target.value)}
          placeholder={CONFIRMATION_TEXT}
          className="text-center"
        />
      </div>
    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        {results?.success ? (
          <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
        ) : (
          <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        )}
        <h3 className="text-lg font-semibold">
          {results?.success ? 'تمت العملية بنجاح' : 'فشلت العملية'}
        </h3>
      </div>

      {results && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-green-50 p-3 rounded">
              <div className="font-semibold text-green-700">{results.deleted_count + results.system_deleted_count + results.inactive_deleted_count}</div>
              <div className="text-green-600">تم حذفها</div>
            </div>
            <div className="bg-orange-50 p-3 rounded">
              <div className="font-semibold text-orange-700">{results.deactivated_count}</div>
              <div className="text-orange-600">تم إلغاء تفعيلها</div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="font-semibold text-red-700">{results.failed_count}</div>
              <div className="text-red-600">فشل</div>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <div className="font-semibold text-blue-700">{results.total_processed}</div>
              <div className="text-blue-600">إجمالي المعالج</div>
            </div>
          </div>

          {results.success_details && results.success_details.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">تفاصيل النجاح:</h4>
              <ScrollArea className="h-32 border rounded p-2">
                {results.success_details.slice(0, 10).map((detail, index) => (
                  <div key={index} className="text-xs mb-1 flex items-center gap-2">
                    <Badge variant={detail.is_system ? "destructive" : "secondary"} className="text-xs">
                      {detail.account_code}
                    </Badge>
                    <span className="truncate">{detail.account_name}</span>
                    <span className="text-muted-foreground">- {detail.action}</span>
                  </div>
                ))}
                {results.success_details.length > 10 && (
                  <div className="text-xs text-muted-foreground">
                    ... و {results.success_details.length - 10} حساب آخر
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {results.error_details && results.error_details.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-red-700">الأخطاء:</h4>
              <ScrollArea className="h-32 border rounded p-2">
                {results.error_details.map((error, index) => (
                  <div key={index} className="text-xs mb-1 text-red-600">
                    <strong>{error.account_code}</strong>: {error.error}
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}

          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            مدة العملية: {results.operation_duration}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Skull className="h-5 w-5 text-red-500" />
            حذف جميع الحسابات - {
              step === 'preview' ? 'معاينة' :
              step === 'options' ? 'خيارات' :
              step === 'confirm' ? 'تأكيد' : 'نتائج'
            }
          </DialogTitle>
          <DialogDescription>
            {step === 'results' ? 
              'نتائج عملية حذف الحسابات' :
              'حذف شامل لدليل الحسابات مع خيارات متقدمة'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === 'preview' && renderPreviewStep()}
          {step === 'options' && renderOptionsStep()}
          {step === 'confirm' && renderConfirmStep()}
          {step === 'results' && renderResultsStep()}
        </div>

        <Separator />

        <div className="flex justify-between">
          {step !== 'results' && (
            <Button variant="outline" onClick={handleClose}>
              إلغاء
            </Button>
          )}
          
          {step === 'results' && (
            <Button onClick={handleClose} className="mr-auto">
              إغلاق
            </Button>
          )}

          {step !== 'results' && (
            <div className="flex gap-2">
              {step !== 'preview' && (
                <Button 
                  variant="outline" 
                  onClick={() => setStep(step === 'confirm' ? 'options' : 'preview')}
                >
                  السابق
                </Button>
              )}
              
              <Button
                onClick={handleNext}
                disabled={!canProceed() || deletionMutation.isPending}
                variant={step === 'confirm' ? 'destructive' : 'default'}
                className="flex items-center gap-2"
              >
                {deletionMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    جاري الحذف...
                  </>
                ) : (
                  step === 'confirm' ? 'حذف جميع الحسابات' : 'التالي'
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};