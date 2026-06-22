/**
 * Contract Mode Selector
 * 
 * Helps users choose between Express Mode and Standard Mode
 * Shows comparison and guides decision
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  FileText, 
  Check, 
  Clock,
  Sparkles,
  Settings
} from 'lucide-react';

interface ContractModeSelectorProps {
  onSelectExpress: () => void;
  onSelectStandard: () => void;
}

export const ContractModeSelector: React.FC<ContractModeSelectorProps> = ({
  onSelectExpress,
  onSelectStandard,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto p-6">
      {/* Express Mode */}
      <Card className="border-green-200 hover:border-green-400 transition-all hover:shadow-lg cursor-pointer group">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                الوضع السريع
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <Sparkles className="h-3 w-3 mr-1" />
                  موصى به
                </Badge>
              </CardTitle>
              <CardDescription>
                إنشاء سريع للعقود القياسية
              </CardDescription>
            </div>
            <Badge className="bg-green-500">
              <Clock className="h-3 w-3 mr-1" />
              30 ثانية
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-green-800">المميزات:</p>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>صفحة واحدة فقط</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>حسابات تلقائية</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>قوالب سريعة</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span>أسرع 70%</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">الأفضل لـ:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• العقود القياسية</li>
              <li>• العملاء المعتادين</li>
              <li>• الفترات الشائعة</li>
            </ul>
          </div>

          <Button 
            onClick={onSelectExpress}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Zap className="h-4 w-4 mr-2" />
            ابدأ السريع
          </Button>
        </CardContent>
      </Card>

      {/* Standard Mode */}
      <Card className="border-blue-200 hover:border-blue-400 transition-all hover:shadow-lg cursor-pointer group">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-500" />
                الوضع المتقدم
              </CardTitle>
              <CardDescription>
                تحكم كامل بجميع التفاصيل
              </CardDescription>
            </div>
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              2 دقيقة
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-blue-800">المميزات:</p>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-600" />
                <span>جميع الحقول متاحة</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-600" />
                <span>تعديل المبالغ يدوياً</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-600" />
                <span>شروط مخصصة</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-600" />
                <span>موافقات متعددة</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">الأفضل لـ:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• العقود المعقدة</li>
              <li>• أسعار خاصة</li>
              <li>• شروط مخصصة</li>
            </ul>
          </div>

          <Button 
            onClick={onSelectStandard}
            className="w-full"
            variant="outline"
          >
            <FileText className="h-4 w-4 mr-2" />
            الوضع المتقدم
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
