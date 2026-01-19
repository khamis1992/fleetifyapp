/**
 * Customer Creation Options Dialog
 * 
 * Provides two options when creating a new customer:
 * 1. Full Customer Details - Complete form with all fields
 * 2. Quick Add - Minimal form for temporary customers
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Zap, AlertCircle, Info, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerCreationOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFullForm: () => void;
  onSelectQuickAdd: () => void;
}

export const CustomerCreationOptionsDialog: React.FC<CustomerCreationOptionsDialogProps> = ({
  open,
  onOpenChange,
  onSelectFullForm,
  onSelectQuickAdd,
}) => {
  const handleSelectFullForm = () => {
    onOpenChange(false);
    onSelectFullForm();
  };

  const handleSelectQuickAdd = () => {
    onOpenChange(false);
    onSelectQuickAdd();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">إضافة عميل جديد</DialogTitle>
          <DialogDescription>
            اختر طريقة إضافة العميل المناسبة لك
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Full Form Option */}
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md hover:border-primary",
              "border-2"
            )}
            onClick={handleSelectFullForm}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">إضافة تفاصيل العميل</CardTitle>
                    <CardDescription className="mt-1">
                      نموذج كامل مع جميع التفاصيل المطلوبة
                    </CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  اختيار
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>جميع الحقول متاحة</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>جاهز لإنشاء عقد مباشرة</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>معلومات كاملة للعميل</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Add Option */}
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md hover:border-green-500",
              "border-2 border-green-200 bg-green-50/50"
            )}
            onClick={handleSelectQuickAdd}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Zap className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      إضافة سريعة
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        ⚡ 15 ثانية
                      </span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      للعملاء المؤقتين أو غير الجاهزين للعقود
                    </CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-green-500 text-green-700 hover:bg-green-50">
                  اختيار
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-sm text-yellow-800">
                  <strong>ملاحظة مهمة:</strong> الإضافة السريعة للعملاء المؤقتين الذين ليسوا جاهزين لإنشاء عقد بعد. 
                  عند إنشاء عقد جديد، يجب أن تكون تفاصيل العميل كاملة.
                </AlertDescription>
              </Alert>
              <div className="space-y-2 text-sm text-muted-foreground mt-3">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>الاسم ورقم الهاتف فقط</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>إنشاء سريع في 15 ثانية</span>
                </div>
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span>يمكن إكمال التفاصيل لاحقاً</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Box */}
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              <strong>نصيحة:</strong> استخدم الإضافة السريعة للمشاهدين المؤقتين أو العملاء غير الجاهزين للعقود. 
              استخدم إضافة التفاصيل الكاملة للعملاء الجاهزين لإنشاء عقد فوراً.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
};

