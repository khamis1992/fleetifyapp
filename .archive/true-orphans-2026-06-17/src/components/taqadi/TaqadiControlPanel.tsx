/**
 * Taqadi Automation Control Panel
 * Main UI component for controlling the automation process
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles,
  ExternalLink,
  Copy,
  Download,
  Info,
  AlertCircle,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTaqadiAutomation } from '@/hooks/useTaqadiAutomation';
import { TaqadiAutomationProgress } from './TaqadiAutomationProgress';
import { generateBookmarkletHtml, copyBookmarkletToClipboard } from '@/utils/taqadiBookmarklet';

interface TaqadiControlPanelProps {
  contractId: string;
  companyId: string;
  className?: string;
}

export function TaqadiControlPanel({
  contractId,
  companyId,
  className = '',
}: TaqadiControlPanelProps) {
  const [showBookmarklet, setShowBookmarklet] = useState(false);

  const {
    state,
    isIdle,
    isPreparing,
    isReady,
    isRunning,
    isCompleted,
    isFailed,
    isCancelled,
    canCancel,
    canRetry,
    startAutomation,
    cancelAutomation,
    retryAutomation,
    downloadDataFile,
    getValidationSummary,
  } = useTaqadiAutomation({
    contractId,
    companyId,
    onError: (error) => {
      console.error('Automation error:', error);
    },
  });

  // Handle bookmarklet copy
  const handleCopyBookmarklet = async () => {
    const success = await copyBookmarkletToClipboard();
    if (success) {
      toast.success('تم نسخ Bookmarklet!', {
        description: 'الصقه في شريط العناوين وأضفه للمفضلة',
      });
    } else {
      toast.error('فشل نسخ Bookmarklet');
    }
  };

  // Open Taqadi manually
  const handleOpenTaqadi = () => {
    window.open('https://taqadi.sjc.gov.qa/itc/login', '_blank');
  };

  const validationSummary = getValidationSummary();

  return (
    <div className={className}>
      {/* Main Control Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">أتمتة تقاضي</CardTitle>
                <CardDescription>
                  ملء نموذج الدعوى في نظام تقاضي تلقائياً
                </CardDescription>
              </div>
            </div>

            {/* Validation Badge */}
            {validationSummary && (
              <Badge
                variant="outline"
                className={`border-${validationSummary.color}-200 bg-${validationSummary.color}-50`}
              >
                {validationSummary.icon} {validationSummary.title}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Validation Summary */}
          {validationSummary && (
            <Alert className={`bg-${validationSummary.color}-50 border-${validationSummary.color}-200`}>
              {validationSummary.icon === '✓✓' || validationSummary.icon === '✓' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
              <AlertDescription className={`text-${validationSummary.color}-800`}>
                {validationSummary.description}
              </AlertDescription>
            </Alert>
          )}

          {/* Main Action Button */}
          {isIdle && (
            <Button
              size="lg"
              onClick={startAutomation}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-6 text-lg shadow-lg"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              بدء الأتمتة التلقائية
            </Button>
          )}

          {/* Progress Display */}
          <TaqadiAutomationProgress
            state={state}
            onCancel={canCancel ? cancelAutomation : undefined}
            onRetry={canRetry ? retryAutomation : undefined}
            onDownload={downloadDataFile}
          />

          {/* Manual Options (when idle) */}
          {isIdle && (
            <div className="space-y-3">
              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">أو</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Manual Actions */}
              <div className="grid gap-2 md:grid-cols-3">
                <Button
                  variant="outline"
                  onClick={handleOpenTaqadi}
                  className="border-blue-200 hover:bg-blue-50"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  فتح تقاضي
                </Button>

                <Button
                  variant="outline"
                  onClick={downloadDataFile}
                  className="border-green-200 hover:bg-green-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  تحميل البيانات
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowBookmarklet(!showBookmarklet)}
                  className="border-purple-200 hover:bg-purple-50"
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  Bookmarklet
                </Button>
              </div>
            </div>
          )}

          {/* Info Box */}
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              <strong>كيف يعمل؟</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>نضغط على "بدء الأتمتة" لاستخراج وتجهيز البيانات</li>
                <li>يُفتح نظام تقاضي في نافذة جديدة</li>
                <li>بعد تسجيل الدخول، اضغط على Bookmarklet لملء النموذج</li>
                <li>راجع البيانات وأرسل الدعوى</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Bookmarklet Installation Card */}
      {showBookmarklet && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <Card className="border-dashed border-2 border-purple-300 bg-purple-50/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bookmark className="h-5 w-5" />
                تثبيت Bookmarklet (أداة الملء السريع)
              </CardTitle>
              <CardDescription>
                أضف هذه الأداة لمتصفحك لملء نموذج تقاضي بضغطة واحدة
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Installation Steps */}
              <div className="bg-white rounded-lg p-4 border">
                <p className="font-medium mb-3">طريقة التثبيت:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground" dir="rtl">
                  <li>اسحب الزر الأزرق أدناه إلى شريط المفضلة (Bookmarks Bar)</li>
                  <li>أو انقر بالزر الأيمن واختر "إضافة إلى المفضلة"</li>
                  <li>عندما تكون في صفحة تقاضي، اضغط على الأداة من المفضلة</li>
                </ol>
              </div>

              {/* Bookmarklet Button */}
              <div
                dangerouslySetInnerHTML={{ __html: generateBookmarkletHtml() }}
                className="flex justify-center"
              />

              {/* Alternative: Copy */}
              <div className="text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyBookmarklet}
                  className="border-purple-200 hover:bg-purple-50"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  نسخ Bookmarklet
                </Button>
              </div>

              {/* Demo Image Placeholder */}
              <Alert className="bg-amber-50 border-amber-200">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  💡 <strong>نصيحة:</strong> أضف Bookmarklet لشريط المفضلة لتسهيل الوصول إليه عند الحاجة
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

export default TaqadiControlPanel;
