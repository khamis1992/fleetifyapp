
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useCustomerDiagnostics } from '@/hooks/useCustomers';
import { 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  User, 
  Shield, 
  Database, 
  RefreshCw,
  Info
} from 'lucide-react';

interface CustomerDiagnosticsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CustomerDiagnostics: React.FC<CustomerDiagnosticsProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const { data: diagnostics, isLoading, refetch } = useCustomerDiagnostics();

  if (!open) return null;

  const getStatusIcon = (status: boolean | null, error?: string | null) => {
    if (error) return <XCircle className="h-4 w-4 text-red-600" />;
    if (status === true) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (status === false) return <XCircle className="h-4 w-4 text-red-600" />;
    return <AlertCircle className="h-4 w-4 text-yellow-600" />;
  };

  const getStatusText = (status: boolean | null, error?: string | null) => {
    if (error) return 'خطأ';
    if (status === true) return 'صحيح';
    if (status === false) return 'غير صحيح';
    return 'غير معروف';
  };

  const getStatusVariant = (status: boolean | null, error?: string | null) => {
    if (error) return 'destructive';
    if (status === true) return 'default';
    if (status === false) return 'destructive';
    return 'secondary';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl max-h-[90vh] overflow-y-auto p-6 m-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Info className="h-6 w-6" />
            تشخيص مشاكل إضافة العملاء
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إغلاق
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="mr-2">جاري التشخيص...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* معلومات المستخدم */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  معلومات المستخدم
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">معرف المستخدم:</p>
                    <p className="text-sm text-muted-foreground">
                      {diagnostics?.userInfo?.id || 'غير متاح'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">البريد الإلكتروني:</p>
                    <p className="text-sm text-muted-foreground">
                      {diagnostics?.userInfo?.email || 'غير متاح'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">الأدوار:</p>
                    <div className="flex gap-1 flex-wrap">
                      {diagnostics?.userInfo?.roles?.map((role) => (
                        <Badge key={role} variant="outline" className="text-xs">
                          {role}
                        </Badge>
                      )) || <span className="text-sm text-muted-foreground">لا توجد أدوار</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">لديه ملف شخصي:</p>
                    <Badge variant={diagnostics?.userInfo?.hasProfile ? "default" : "destructive"}>
                      {diagnostics?.userInfo?.hasProfile ? "نعم" : "لا"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">معرف الشركة (من الملف الشخصي):</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {diagnostics?.userInfo?.profileCompanyId || 'غير متاح'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">معرف الشركة (من المستخدم):</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {diagnostics?.userInfo?.userCompanyId || 'غير متاح'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* الصلاحيات */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  الصلاحيات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">مدير عام:</span>
                    <Badge variant={diagnostics?.permissions?.isSuperAdmin ? "default" : "secondary"}>
                      {diagnostics?.permissions?.isSuperAdmin ? "نعم" : "لا"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">مدير شركة:</span>
                    <Badge variant={diagnostics?.permissions?.isCompanyAdmin ? "default" : "secondary"}>
                      {diagnostics?.permissions?.isCompanyAdmin ? "نعم" : "لا"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">مدير:</span>
                    <Badge variant={diagnostics?.permissions?.isManager ? "default" : "secondary"}>
                      {diagnostics?.permissions?.isManager ? "نعم" : "لا"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">مندوب مبيعات:</span>
                    <Badge variant={diagnostics?.permissions?.isSalesAgent ? "default" : "secondary"}>
                      {diagnostics?.permissions?.isSalesAgent ? "نعم" : "لا"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">معرف الشركة المستخدم:</span>
                    <span className="text-sm font-mono text-muted-foreground">
                      {diagnostics?.permissions?.companyId || 'غير متاح'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">يمكن إضافة العملاء:</span>
                    <Badge variant={diagnostics?.permissions?.canCreateCustomers ? "default" : "destructive"}>
                      {diagnostics?.permissions?.canCreateCustomers ? "نعم" : "لا"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* قاعدة البيانات */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  قاعدة البيانات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">الشركة موجودة:</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(diagnostics?.database?.companyExists, diagnostics?.database?.error)}
                      <Badge variant={getStatusVariant(diagnostics?.database?.companyExists, diagnostics?.database?.error) as any}>
                        {getStatusText(diagnostics?.database?.companyExists, diagnostics?.database?.error)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">يمكن قراءة العملاء:</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(diagnostics?.database?.canAccessCustomers, diagnostics?.database?.error)}
                      <Badge variant={getStatusVariant(diagnostics?.database?.canAccessCustomers, diagnostics?.database?.error) as any}>
                        {getStatusText(diagnostics?.database?.canAccessCustomers, diagnostics?.database?.error)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">يمكن إضافة العملاء:</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(diagnostics?.database?.canInsertCustomers, diagnostics?.database?.error)}
                      <Badge variant={getStatusVariant(diagnostics?.database?.canInsertCustomers, diagnostics?.database?.error) as any}>
                        {getStatusText(diagnostics?.database?.canInsertCustomers, diagnostics?.database?.error)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {diagnostics?.database?.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {diagnostics.database.error}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* التوصيات */}
            <Card>
              <CardHeader>
                <CardTitle>التوصيات والحلول</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {!diagnostics?.permissions?.companyId && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>المشكلة:</strong> لا يوجد معرف شركة مرتبط بالمستخدم.
                        <br />
                        <strong>الحل:</strong> يرجى التواصل مع الإدارة لربط حسابك بشركة.
                      </AlertDescription>
                    </Alert>
                  )}

                  {!diagnostics?.permissions?.canCreateCustomers && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>المشكلة:</strong> ليس لديك الصلاحية المطلوبة لإضافة العملاء.
                        <br />
                        <strong>الحل:</strong> تحتاج إلى أحد الأدوار التالية: مدير شركة، مدير، أو مندوب مبيعات.
                      </AlertDescription>
                    </Alert>
                  )}

                  {!diagnostics?.database?.companyExists && diagnostics?.permissions?.companyId && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>المشكلة:</strong> الشركة المرتبطة بحسابك غير موجودة في قاعدة البيانات.
                        <br />
                        <strong>الحل:</strong> يرجى التواصل مع الإدارة فوراً لحل هذه المشكلة.
                      </AlertDescription>
                    </Alert>
                  )}

                  {!diagnostics?.database?.canAccessCustomers && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>المشكلة:</strong> لا يمكن الوصول إلى بيانات العملاء.
                        <br />
                        <strong>الحل:</strong> قد تكون هناك مشكلة في سياسات الأمان أو الاتصال بقاعدة البيانات.
                      </AlertDescription>
                    </Alert>
                  )}

                  {diagnostics?.permissions?.canCreateCustomers && diagnostics?.database?.canInsertCustomers && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        <strong>ممتاز!</strong> جميع الفحوصات اجتازت بنجاح. يمكنك الآن إضافة العملاء بدون مشاكل.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}; 
