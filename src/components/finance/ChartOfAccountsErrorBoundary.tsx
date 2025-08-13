import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, LogIn } from "lucide-react";
import { useNavigate } from 'react-router-dom';

interface ChartOfAccountsErrorBoundaryProps {
  error: Error | null;
  isLoading: boolean;
  onRetry: () => void;
  children: React.ReactNode;
}

export const ChartOfAccountsErrorBoundary: React.FC<ChartOfAccountsErrorBoundaryProps> = ({
  error,
  isLoading,
  onRetry,
  children
}) => {
  const navigate = useNavigate();

  if (error) {
    const isAuthError = error.message?.includes('تسجيل الدخول') || 
                       error.message?.includes('انتهت جلسة العمل') ||
                       error.message?.includes('يجب تسجيل الدخول');

    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            خطأ في تحميل دليل الحسابات
          </CardTitle>
          <CardDescription>
            {isAuthError ? 'مشكلة في المصادقة' : 'خطأ في قاعدة البيانات'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error.message}
            </AlertDescription>
          </Alert>
          
          <div className="flex gap-3">
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
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
};