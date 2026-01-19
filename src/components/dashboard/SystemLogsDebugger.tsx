/**
 * مكون مساعد لتشخيص وإصلاح مشكلة عدم ظهور النشاطات الأخيرة
 * يوفر أدوات للمطورين لملء البيانات التجريبية وفحص الجدول
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { populateSystemLogs, clearSystemLogs, checkSystemLogsCount } from '@/scripts/populateSystemLogs';
import { AlertCircle, RefreshCw, Trash2, Database, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SystemLogsDebugger() {
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [logsCount, setLogsCount] = useState<number | null>(null);
  const [showDebugger, setShowDebugger] = useState(false);

  // إظهار المكون فقط في بيئة التطوير
  if (import.meta.env.PROD && !showDebugger) {
    return (
      <div 
        onClick={() => setShowDebugger(true)}
        className="fixed bottom-4 left-4 w-3 h-3 bg-muted rounded-full cursor-pointer hover:bg-primary transition-colors"
        title="Click 3 times to show debugger"
      />
    );
  }

  const handleCheckCount = async () => {
    if (!companyId) {
      toast({
        title: '⚠️ تحذير',
        description: 'معرف الشركة غير متوفر',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const count = await checkSystemLogsCount(companyId);
      setLogsCount(count);
      
      toast({
        title: '📊 عدد النشاطات',
        description: `يوجد ${count} نشاط في قاعدة البيانات`,
      });
    } catch (error) {
      console.error('Error checking logs count:', error);
      toast({
        title: '❌ خطأ',
        description: 'فشل في التحقق من عدد النشاطات',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePopulate = async () => {
    if (!companyId) {
      toast({
        title: '⚠️ تحذير',
        description: 'معرف الشركة غير متوفر',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await populateSystemLogs(companyId);
      
      toast({
        title: '✅ نجح',
        description: 'تم ملء البيانات التجريبية بنجاح',
      });

      // إعادة فحص العدد
      setTimeout(handleCheckCount, 1000);
      
      // إعادة تحميل الصفحة لعرض البيانات الجديدة
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Error populating logs:', error);
      toast({
        title: '❌ خطأ',
        description: 'فشل في ملء البيانات التجريبية',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    if (!companyId) {
      toast({
        title: '⚠️ تحذير',
        description: 'معرف الشركة غير متوفر',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('هل أنت متأكد من حذف جميع النشاطات؟')) {
      return;
    }

    setIsLoading(true);
    try {
      await clearSystemLogs(companyId);
      
      toast({
        title: '✅ نجح',
        description: 'تم حذف جميع النشاطات بنجاح',
      });

      setLogsCount(0);
    } catch (error) {
      console.error('Error clearing logs:', error);
      toast({
        title: '❌ خطأ',
        description: 'فشل في حذف النشاطات',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="fixed bottom-4 left-4 w-96 shadow-2xl border-2 border-primary/20 z-50 bg-background/95 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">مصحح النشاطات</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDebugger(false)}
            className="h-6 w-6 p-0"
          >
            ✕
          </Button>
        </div>
        <CardDescription>أدوات لإصلاح مشكلة عدم ظهور النشاطات</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* معلومات الحالة */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {companyId ? (
              <div className="space-y-1">
                <div>معرف الشركة: <code className="text-xs bg-muted px-1 rounded">{companyId.substring(0, 8)}...</code></div>
                {logsCount !== null && (
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>عدد النشاطات: <Badge variant="secondary">{logsCount}</Badge></span>
                  </div>
                )}
              </div>
            ) : (
              'معرف الشركة غير متوفر'
            )}
          </AlertDescription>
        </Alert>

        {/* الأزرار */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleCheckCount}
            disabled={isLoading || !companyId}
            size="sm"
            variant="outline"
            className="w-full"
          >
            <Database className="h-4 w-4 mr-2" />
            فحص العدد
          </Button>

          <Button
            onClick={handlePopulate}
            disabled={isLoading || !companyId}
            size="sm"
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            ملء البيانات
          </Button>
        </div>

        <Button
          onClick={handleClear}
          disabled={isLoading || !companyId || logsCount === 0}
          size="sm"
          variant="destructive"
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          حذف جميع النشاطات
        </Button>

        {/* تعليمات */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p className="font-semibold mb-1">التعليمات:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>اضغط "فحص العدد" للتحقق من البيانات</li>
            <li>إذا كان العدد 0، اضغط "ملء البيانات"</li>
            <li>سيتم إعادة تحميل الصفحة تلقائياً</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}




