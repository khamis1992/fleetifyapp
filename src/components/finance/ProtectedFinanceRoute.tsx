import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useModuleAccess } from '@/modules/core/hooks/useModuleConfig';
import { FinanceErrorBoundary } from './FinanceErrorBoundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Building, Settings } from 'lucide-react';

interface ProtectedFinanceRouteProps {
  children: React.ReactNode;
  permission?: string;
  requireModule?: boolean;
  title?: string;
}

export const ProtectedFinanceRoute: React.FC<ProtectedFinanceRouteProps> = ({ 
  children, 
  permission = 'finance.view',
  requireModule = true,
  title = "الصفحة المحاسبية"
}) => {
  const { user } = useAuth();
  const { companyId, hasCompanyAdminAccess } = useUnifiedCompanyAccess();
  const { hasAccess: hasModuleAccess, isLoading: moduleLoading } = useModuleAccess('finance');
  const permissionCheck = usePermissionCheck(permission);
  
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // تشخيص مفصل للحالة
  const [diagnostics, setDiagnostics] = useState({
    userLoaded: false,
    companyLoaded: false,
    moduleChecked: false,
    permissionChecked: false
  });

  useEffect(() => {
    console.log('🛡️ [PROTECTED_FINANCE] Route protection check:', {
      user: !!user,
      userId: user?.id,
      companyId,
      hasCompanyAdminAccess,
      permission,
      requireModule,
      hasModuleAccess,
      moduleLoading,
      permissionCheck: {
        data: permissionCheck.data,
        isLoading: permissionCheck.isLoading,
        error: permissionCheck.error
      }
    });

    setDiagnostics({
      userLoaded: !!user,
      companyLoaded: !!companyId,
      moduleChecked: !moduleLoading,
      permissionChecked: !permissionCheck.isLoading
    });

    // تحديد الأخطاء
    if (!user) {
      setError(new Error('يجب تسجيل الدخول للوصول إلى النظام المحاسبي'));
      return;
    }

    if (!companyId) {
      setError(new Error('لا توجد بيانات شركة مرتبطة بحسابك. يرجى التواصل مع المدير.'));
      return;
    }

    if (requireModule && !moduleLoading && !hasModuleAccess) {
      setError(new Error('الوحدة المحاسبية غير مفعلة لشركتك. يرجى التواصل مع المدير لتفعيل الوحدة.'));
      return;
    }

    if (!permissionCheck.isLoading && permissionCheck.error) {
      setError(new Error(`خطأ في التحقق من الصلاحيات: ${permissionCheck.error.message}`));
      return;
    }

    if (!permissionCheck.isLoading && !permissionCheck.data?.hasPermission && !hasCompanyAdminAccess) {
      setError(new Error(`ليس لديك صلاحية "${permission}" للوصول إلى هذه الصفحة. يرجى التواصل مع المدير.`));
      return;
    }

    // إذا وصلنا هنا، فكل شيء طبيعي
    if (error && user && companyId && (hasModuleAccess || !requireModule) && 
        (permissionCheck.data?.hasPermission || hasCompanyAdminAccess)) {
      setError(null);
    }
  }, [
    user, 
    companyId, 
    hasModuleAccess, 
    moduleLoading, 
    permissionCheck.data, 
    permissionCheck.isLoading, 
    permissionCheck.error,
    hasCompanyAdminAccess,
    permission,
    requireModule,
    error
  ]);

  const handleRetry = () => {
    console.log('🔄 [PROTECTED_FINANCE] Retrying...', { retryCount });
    setError(null);
    setRetryCount(prev => prev + 1);
    
    // إعادة تحديث البيانات
    if (permissionCheck.refetch) {
      permissionCheck.refetch();
    }
  };

  // تحميل البيانات - تحسين الأداء: لا ننتظر كل التحميلات
  const hasBasicAuth = !!user && !!companyId;
  const hasAllPermissions = !moduleLoading && !permissionCheck.isLoading && (permissionCheck.data?.hasPermission || hasCompanyAdminAccess);
  const isLoading = !hasBasicAuth || moduleLoading || permissionCheck.isLoading;
 
  // عرض محتوى مؤقت أثناء التحقق من الصلاحيات للمستخدمين ذوي الخبرة
  if (isLoading && !hasBasicAuth) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <LoadingSpinner size="lg" />
            <div className="text-center space-y-2">
              <h3 className="font-medium">جاري التحقق من الصلاحيات...</h3>
              <div className="text-sm text-muted-foreground">
                يتم تحميل بياناتك. قد يستغرق هذا بضع ثوانٍ في المرة الأولى.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // إعادة توجيه للمصادقة إذا لم يكن المستخدم مسجل دخول
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <FinanceErrorBoundary
      error={error}
      isLoading={isLoading}
      onRetry={handleRetry}
      title={`خطأ في الوصول إلى ${title}`}
      context={`المسار: ${window.location.pathname} | الصلاحية: ${permission}`}
    >
      {children}
    </FinanceErrorBoundary>
  );
};