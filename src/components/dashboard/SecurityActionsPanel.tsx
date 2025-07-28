import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSecurityActions } from '@/hooks/useSecurityActions';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { 
  RefreshCw, 
  Shield, 
  Trash2, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Settings
} from 'lucide-react';

export const SecurityActionsPanel: React.FC = () => {
  const { hasGlobalAccess, hasCompanyAdminAccess } = useUnifiedCompanyAccess();
  const {
    refreshCache,
    runSecurityScan,
    cleanupData,
    optimizePerformance,
    isRefreshingCache,
    isRunningScan,
    isCleaningData,
    isOptimizing,
    isPerformingActions
  } = useSecurityActions();

  if (!hasCompanyAdminAccess) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-5 w-5" />
            <span>تحتاج صلاحيات إدارية للوصول لهذه الأدوات</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleDataCleanup = () => {
    cleanupData({
      archiveOldData: true,
      removeOrphaned: true
    });
  };

  const actionButtons = [
    {
      title: 'تحديث الذاكرة المؤقتة',
      description: 'تحديث البيانات المحفوظة مؤقتاً لتحسين الأداء',
      action: refreshCache,
      loading: isRefreshingCache,
      icon: RefreshCw,
      variant: 'outline' as const,
      available: hasCompanyAdminAccess
    },
    {
      title: 'فحص أمني شامل',
      description: 'البحث عن الأنشطة المشبوهة ومحاولات الاختراق',
      action: runSecurityScan,
      loading: isRunningScan,
      icon: Shield,
      variant: 'outline' as const,
      available: hasCompanyAdminAccess
    },
    {
      title: 'تحسين الأداء',
      description: 'تحسين سرعة النظام وإزالة البيانات المؤقتة القديمة',
      action: optimizePerformance,
      loading: isOptimizing,
      icon: Zap,
      variant: 'default' as const,
      available: hasGlobalAccess
    },
    {
      title: 'تنظيف البيانات',
      description: 'أرشفة البيانات القديمة وحذف السجلات المعزولة',
      action: handleDataCleanup,
      loading: isCleaningData,
      icon: Trash2,
      variant: 'destructive' as const,
      available: hasGlobalAccess
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          أدوات إدارة النظام
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actionButtons.map((button, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button.icon className="h-4 w-4" />
                  <span className="font-medium text-sm">{button.title}</span>
                </div>
                <Badge variant={button.available ? "outline" : "secondary"}>
                  {button.available ? "متاح" : "محدود"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {button.description}
              </p>
              <Button
                variant={button.variant}
                size="sm"
                onClick={() => button.action()}
                disabled={!button.available || isPerformingActions}
                className="w-full"
              >
                {button.loading ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                    جاري التنفيذ...
                  </>
                ) : (
                  <>
                    <button.icon className="h-3 w-3 mr-2" />
                    تشغيل
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Status Indicators */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">حالة النظام:</span>
            <div className="flex items-center gap-2">
              {isPerformingActions ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin text-yellow-500" />
                  <span className="text-yellow-600">جاري التنفيذ</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span className="text-green-600">جاهز</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Access Level Info */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>مستوى الوصول:</span>
              <Badge variant={hasGlobalAccess ? "default" : "secondary"}>
                {hasGlobalAccess ? "مدير عام" : "مدير شركة"}
              </Badge>
            </div>
            {!hasGlobalAccess && (
              <p className="mt-1 text-xs">
                بعض الأدوات محدودة للمديرين العامين فقط
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};