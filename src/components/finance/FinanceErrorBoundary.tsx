import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, LogIn, Home, MessageSquare } from "lucide-react";
import { useNavigate } from 'react-router-dom';

interface FinanceErrorBoundaryProps {
  error: Error | null;
  isLoading: boolean;
  onRetry: () => void;
  children: React.ReactNode;
  title?: string;
  context?: string;
}

export const FinanceErrorBoundary: React.FC<FinanceErrorBoundaryProps> = ({
  error,
  isLoading,
  onRetry,
  children,
  title = "خطأ في النظام المحاسبي",
  context = "النظام المحاسبي"
}) => {
  const navigate = useNavigate();

  if (error) {
    // تحديد نوع الخطأ
    const isAuthError = error.message?.includes('تسجيل الدخول') || 
                       error.message?.includes('انتهت جلسة العمل') ||
                       error.message?.includes('يجب تسجيل الدخول') ||
                       error.message?.includes('authentication') ||
                       error.message?.includes('unauthorized');

    const isPermissionError = error.message?.includes('صلاحية') ||
                             error.message?.includes('permission') ||
                             error.message?.includes('access denied') ||
                             error.message?.includes('ليس لديك صلاحية');

    const isModuleError = error.message?.includes('الوحدة') ||
                         error.message?.includes('module') ||
                         error.message?.includes('غير مفعلة') ||
                         error.message?.includes('not enabled');

    const isCompanyError = error.message?.includes('الشركة') ||
                          error.message?.includes('company') ||
                          error.message?.includes('Company ID');

    const isConnectionError = error.message?.includes('network') ||
                             error.message?.includes('connection') ||
                             error.message?.includes('timeout') ||
                             error.message?.includes('شبكة');

    const getErrorIcon = () => {
      if (isAuthError) return <LogIn className="h-5 w-5" />;
      return <AlertTriangle className="h-5 w-5" />;
    };

    const getErrorTitle = () => {
      if (isAuthError) return 'مشكلة في المصادقة';
      if (isPermissionError) return 'مشكلة في الصلاحيات';
      if (isModuleError) return 'مشكلة في الوحدة';
      if (isCompanyError) return 'مشكلة في بيانات الشركة';
      if (isConnectionError) return 'مشكلة في الاتصال';
      return 'خطأ في النظام';
    };

    const getErrorDescription = () => {
      if (isAuthError) return 'يبدو أن جلسة العمل انتهت أو تحتاج لتسجيل الدخول مرة أخرى';
      if (isPermissionError) return 'ليس لديك صلاحية للوصول إلى هذه الصفحة';
      if (isModuleError) return 'الوحدة المحاسبية غير مفعلة أو غير متاحة لشركتك';
      if (isCompanyError) return 'مشكلة في بيانات الشركة المرتبطة بحسابك';
      if (isConnectionError) return 'مشكلة في الاتصال بالخادم';
      return 'حدث خطأ غير متوقع في النظام';
    };

    const getSuggestions = () => {
      if (isAuthError) return ['تسجيل الدخول مرة أخرى', 'التحقق من صحة البيانات'];
      if (isPermissionError) return ['التواصل مع المدير لمنحك الصلاحيات المطلوبة', 'التحقق من نوع حسابك'];
      if (isModuleError) return ['التواصل مع المدير لتفعيل الوحدة المحاسبية', 'التحقق من خطة الاشتراك'];
      if (isCompanyError) return ['التواصل مع المدير للتحقق من بيانات الشركة', 'إعادة تسجيل الدخول'];
      if (isConnectionError) return ['التحقق من الاتصال بالإنترنت', 'إعادة المحاولة بعد قليل'];
      return ['إعادة المحاولة', 'التواصل مع الدعم الفني'];
    };

    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              {getErrorIcon()}
              {title}
            </CardTitle>
            <CardDescription>
              {getErrorDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">{getErrorTitle()}</p>
                  <p className="text-sm text-muted-foreground">{error.message}</p>
                </div>
              </AlertDescription>
            </Alert>

            {/* الاقتراحات */}
            <div className="space-y-3">
              <h4 className="font-medium">الحلول المقترحة:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {getSuggestions().map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
            
            {/* الإجراءات */}
            <div className="flex flex-wrap gap-3">
              {isAuthError ? (
                <Button 
                  onClick={() => navigate('/auth')}
                  className="flex items-center gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  تسجيل الدخول
                </Button>
              ) : (
                <Button 
                  onClick={onRetry}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  إعادة المحاولة
                </Button>
              )}
              
              <Button 
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                العودة للرئيسية
              </Button>

              <Button 
                variant="outline"
                onClick={() => navigate('/support')}
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                تواصل مع الدعم
              </Button>
            </div>

            {/* معلومات تشخيصية للمطورين */}
            <details className="border rounded p-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer font-medium">معلومات تشخيصية</summary>
              <div className="mt-2 space-y-1">
                <p><strong>السياق:</strong> {context}</p>
                <p><strong>الخطأ:</strong> {error.message}</p>
                <p><strong>التوقيت:</strong> {new Date().toLocaleString('ar-SA')}</p>
                <p><strong>المسار:</strong> {window.location.pathname}</p>
              </div>
            </details>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};