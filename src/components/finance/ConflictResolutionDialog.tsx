import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AccountConflictInfo } from '@/hooks/useAccountConflictCheck';
import { AlertTriangle, FileText, Building2 } from 'lucide-react';

export type ConflictResolutionStrategy = 'replace' | 'merge' | 'skip' | 'backup_first';

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflictInfo: AccountConflictInfo;
  onResolve: (strategy: ConflictResolutionStrategy) => Promise<void>;
  isResolving: boolean;
}

export const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  open,
  onOpenChange,
  conflictInfo,
  onResolve,
  isResolving
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<ConflictResolutionStrategy>('backup_first');

  const handleResolve = async () => {
    await onResolve(selectedStrategy);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            تضارب في البيانات المحاسبية
          </DialogTitle>
          <DialogDescription>
            تم العثور على حسابات أو بنوك موجودة بالفعل. يرجى اختيار كيفية التعامل مع هذا التضارب.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* عرض معلومات التضارب */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {conflictInfo.has_existing_accounts && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>الحسابات الموجودة:</span>
                    <Badge variant="secondary">{conflictInfo.accounts_count} حساب</Badge>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {conflictInfo.has_existing_banks && (
              <Alert>
                <Building2 className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>البنوك الموجودة:</span>
                    <Badge variant="secondary">{conflictInfo.banks_count} بنك</Badge>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* عرض أكواد الحسابات الموجودة */}
          {conflictInfo.existing_codes.length > 0 && (
            <div>
              <Label className="text-sm font-medium">أكواد الحسابات الموجودة:</Label>
              <ScrollArea className="h-20 w-full rounded-md border p-2 mt-2">
                <div className="flex flex-wrap gap-1">
                  {conflictInfo.existing_codes.map((code, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {code}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* عرض أرقام الحسابات البنكية الموجودة */}
          {conflictInfo.existing_bank_accounts.length > 0 && (
            <div>
              <Label className="text-sm font-medium">أرقام البنوك الموجودة:</Label>
              <ScrollArea className="h-20 w-full rounded-md border p-2 mt-2">
                <div className="flex flex-wrap gap-1">
                  {conflictInfo.existing_bank_accounts.map((account, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {account}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* خيارات حل التضارب */}
          <div>
            <Label className="text-sm font-medium mb-3 block">اختر استراتيجية حل التضارب:</Label>
            <RadioGroup value={selectedStrategy} onValueChange={(value) => setSelectedStrategy(value as ConflictResolutionStrategy)}>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="backup_first" id="backup_first" />
                  <Label htmlFor="backup_first" className="cursor-pointer">
                    <div>
                      <div className="font-medium">نسخ احتياطي ثم استبدال (موصى به)</div>
                      <div className="text-sm text-muted-foreground">
                        إنشاء نسخة احتياطية من البيانات الحالية ثم استبدالها بالبيانات الجديدة
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="merge" id="merge" />
                  <Label htmlFor="merge" className="cursor-pointer">
                    <div>
                      <div className="font-medium">دمج ذكي</div>
                      <div className="text-sm text-muted-foreground">
                        دمج البيانات الجديدة مع الموجودة وتحديث المكرر منها
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label htmlFor="skip" className="cursor-pointer">
                    <div>
                      <div className="font-medium">تخطي المكرر</div>
                      <div className="text-sm text-muted-foreground">
                        إضافة البيانات الجديدة فقط وتخطي المكرر منها
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="replace" id="replace" />
                  <Label htmlFor="replace" className="cursor-pointer">
                    <div>
                      <div className="font-medium text-destructive">استبدال كامل (خطير)</div>
                      <div className="text-sm text-muted-foreground">
                        حذف جميع البيانات الموجودة واستبدالها بالجديدة
                      </div>
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {selectedStrategy === 'replace' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                تحذير: هذا الخيار سيحذف جميع الحسابات والبنوك الموجودة بشكل نهائي. تأكد من وجود نسخة احتياطية.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isResolving}>
            إلغاء
          </Button>
          <Button onClick={handleResolve} disabled={isResolving}>
            {isResolving ? 'جاري التنفيذ...' : 'تنفيذ الحل'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};