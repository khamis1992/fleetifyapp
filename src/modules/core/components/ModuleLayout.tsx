import { ReactNode, useEffect, useState } from 'react';
import { useModuleAccess } from '../hooks/useModuleConfig';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { ModuleName } from '@/types/modules';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Settings, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModuleLayoutProps {
  moduleName: ModuleName;
  children: ReactNode;
  fallback?: ReactNode;
  showDiagnostics?: boolean;
}

export function ModuleLayout({ moduleName, children, fallback, showDiagnostics = false }: ModuleLayoutProps) {
  const { hasAccess, isLoading } = useModuleAccess(moduleName);
  const { companyId, user } = useUnifiedCompanyAccess();
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (showDiagnostics) {
      console.log('🏗️ [MODULE_LAYOUT] Module access check:', {
        moduleName,
        hasAccess,
        isLoading,
        companyId,
        userId: user?.id,
        retryCount
      });
      
      setDiagnosticsData({
        moduleName,
        hasAccess,
        isLoading,
        companyId,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
    }
  }, [moduleName, hasAccess, isLoading, companyId, user?.id, retryCount, showDiagnostics]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <div className="text-center space-y-2">
              <h3 className="font-medium">جاري التحقق من الوحدة...</h3>
              <p className="text-sm text-muted-foreground">
                تحقق من وحدة: <Badge variant="outline">{moduleName}</Badge>
              </p>
            </div>
            
            {showDiagnostics && diagnosticsData && (
              <details className="w-full max-w-md border rounded p-3 text-xs">
                <summary className="cursor-pointer font-medium">معلومات تشخيصية</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {JSON.stringify(diagnosticsData, null, 2)}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAccess) {
    return fallback || (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Lock className="h-5 w-5" />
              وحدة غير متاحة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>عذراً، وحدة <Badge variant="outline">{moduleName}</Badge> غير مفعلة لشركتك.</p>
                  <p className="text-sm text-muted-foreground">
                    يرجى التواصل مع المدير لتفعيل الوحدة المطلوبة أو التحقق من خطة الاشتراك.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={handleRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/dashboard'}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                العودة للرئيسية
              </Button>
            </div>

            {showDiagnostics && (
              <details className="border rounded p-3 text-xs text-muted-foreground">
                <summary className="cursor-pointer font-medium">معلومات تشخيصية</summary>
                <div className="mt-2 space-y-1">
                  <p><strong>الوحدة:</strong> {moduleName}</p>
                  <p><strong>معرف الشركة:</strong> {companyId || 'غير محدد'}</p>
                  <p><strong>معرف المستخدم:</strong> {user?.id || 'غير محدد'}</p>
                  <p><strong>حالة التحميل:</strong> {isLoading ? 'جاري التحميل' : 'مكتمل'}</p>
                  <p><strong>الوصول:</strong> {hasAccess ? 'متاح' : 'غير متاح'}</p>
                  <p><strong>التوقيت:</strong> {new Date().toLocaleString('ar-SA')}</p>
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}