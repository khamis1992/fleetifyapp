import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Settings, 
  RefreshCw,
  User,
  Building,
  Shield,
  Database
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useModuleAccess } from '@/modules/core/hooks/useModuleConfig';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';
import { supabase } from '@/integrations/supabase/client';

interface DiagnosticItem {
  label: string;
  status: 'success' | 'error' | 'warning' | 'loading';
  message: string;
  action?: () => void;
  actionLabel?: string;
}

export const FinanceSystemDiagnostics: React.FC = () => {
  const { user } = useAuth();
  const { companyId, hasCompanyAdminAccess } = useUnifiedCompanyAccess();
  const { hasAccess: hasModuleAccess, isLoading: moduleLoading } = useModuleAccess('finance');
  const permissionCheck = usePermissionCheck('finance.view');
  
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticItem[] = [];

    // فحص تسجيل الدخول
    results.push({
      label: 'تسجيل الدخول',
      status: user ? 'success' : 'error',
      message: user ? `مسجل دخول: ${user.email}` : 'غير مسجل دخول',
      action: !user ? () => window.location.href = '/auth' : undefined,
      actionLabel: 'تسجيل الدخول'
    });

    // فحص بيانات الشركة
    results.push({
      label: 'بيانات الشركة',
      status: companyId ? 'success' : 'error',
      message: companyId ? `معرف الشركة: ${companyId}` : 'لا توجد بيانات شركة مرتبطة',
      action: !companyId ? () => window.location.href = '/dashboard' : undefined,
      actionLabel: 'العودة للوحة الرئيسية'
    });

    // فحص الوحدة المحاسبية
    if (companyId) {
      try {
        const { data: company } = await supabase
          .from('companies')
          .select('business_type, active_modules')
          .eq('id', companyId)
          .single();

        results.push({
          label: 'الوحدة المحاسبية',
          status: hasModuleAccess ? 'success' : 'error',
          message: hasModuleAccess 
            ? 'الوحدة مفعلة ومتاحة' 
            : `الوحدة غير مفعلة (نوع النشاط: ${company?.business_type || 'غير محدد'})`,
        });
      } catch (error) {
        results.push({
          label: 'الوحدة المحاسبية',
          status: 'error',
          message: 'خطأ في التحقق من الوحدة'
        });
      }
    }

    // فحص الصلاحيات
    if (user) {
      results.push({
        label: 'صلاحيات المحاسبة',
        status: permissionCheck.data?.hasPermission || hasCompanyAdminAccess ? 'success' : 'error',
        message: permissionCheck.data?.hasPermission || hasCompanyAdminAccess
          ? 'لديك صلاحية الوصول'
          : `لا توجد صلاحية: ${permissionCheck.data?.reason || 'غير محدد'}`
      });

      // فحص عدد الصلاحيات
      try {
        const { data: userPermissions } = await supabase
          .from('user_permissions')
          .select('permission_id')
          .eq('user_id', user.id);

        results.push({
          label: 'عدد الصلاحيات',
          status: userPermissions && userPermissions.length > 0 ? 'success' : 'warning',
          message: `${userPermissions?.length || 0} صلاحية مخصصة`
        });
      } catch (error) {
        results.push({
          label: 'عدد الصلاحيات',
          status: 'error',
          message: 'خطأ في تحميل الصلاحيات'
        });
      }
    }

    // فحص الاتصال بقاعدة البيانات
    try {
      const { data } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('company_id', companyId)
        .limit(1);

      results.push({
        label: 'قاعدة البيانات',
        status: 'success',
        message: 'الاتصال متاح'
      });
    } catch (error) {
      results.push({
        label: 'قاعدة البيانات',
        status: 'error',
        message: 'خطأ في الاتصال'
      });
    }

    setDiagnostics(results);
    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, [user, companyId, hasModuleAccess, permissionCheck.data]);

  const getStatusIcon = (status: DiagnosticItem['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'loading': return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusColor = (status: DiagnosticItem['status']) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'loading': return 'bg-blue-50 border-blue-200';
    }
  };

  const successCount = diagnostics.filter(d => d.status === 'success').length;
  const errorCount = diagnostics.filter(d => d.status === 'error').length;
  const warningCount = diagnostics.filter(d => d.status === 'warning').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            تشخيص النظام المحاسبي
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={runDiagnostics}
            disabled={isRunning}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            إعادة الفحص
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ملخص النتائج */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{successCount}</div>
            <div className="text-sm text-muted-foreground">سليم</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
            <div className="text-sm text-muted-foreground">تحذير</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
            <div className="text-sm text-muted-foreground">خطأ</div>
          </div>
        </div>

        {/* التفاصيل */}
        <div className="space-y-3">
          {diagnostics.map((item, index) => (
            <div 
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(item.status)}`}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(item.status)}
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-sm text-muted-foreground">{item.message}</div>
                </div>
              </div>
              
              {item.action && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={item.action}
                >
                  {item.actionLabel}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* تقييم عام */}
        {errorCount > 0 && (
          <Alert className="border-destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              يوجد {errorCount} مشكلة تحتاج إلى حل قبل أن تتمكن من استخدام النظام المحاسبي بشكل طبيعي.
            </AlertDescription>
          </Alert>
        )}

        {errorCount === 0 && warningCount > 0 && (
          <Alert className="border-yellow-500">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              النظام يعمل بشكل أساسي، لكن يوجد {warningCount} تحذير قد يؤثر على الأداء.
            </AlertDescription>
          </Alert>
        )}

        {errorCount === 0 && warningCount === 0 && diagnostics.length > 0 && (
          <Alert className="border-green-500">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              ممتاز! جميع الفحوصات تمت بنجاح. النظام المحاسبي جاهز للاستخدام.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};