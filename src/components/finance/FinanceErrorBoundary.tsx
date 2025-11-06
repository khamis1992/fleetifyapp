import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  error?: Error | null;
  isLoading?: boolean;
  onRetry?: () => void;
  title?: string;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class FinanceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Finance component error:', { error, errorInfo });
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    // عرض حالة التحميل
    if (this.props.isLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">جاري التحميل...</p>
          </div>
        </div>
      );
    }

    // عرض الخطأ من الـ props
    if (this.props.error && !this.state.hasError) {
      return (
        <Card className="max-w-2xl mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {this.props.title || 'حدث خطأ في النظام المالي'}
            </CardTitle>
            <CardDescription>
              {this.props.fallbackMessage || 'عذراً، حدث خطأ غير متوقع في تحميل البيانات المالية.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                <p className="text-sm font-mono text-destructive">
                  {this.props.error.message}
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">الحلول المقترحة:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>تحقق من اتصالك بالإنترنت</li>
                  <li>تأكد من تسجيل الدخول بحساب له صلاحيات مناسبة</li>
                  <li>حاول تحديث الصفحة</li>
                  <li>إذا استمرت المشكلة، اتصل بالدعم الفني</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={this.props.onRetry || this.handleReset} 
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  إعادة المحاولة
                </Button>
                <Button variant="outline" onClick={() => window.history.back()}>
                  العودة
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // عرض الخطأ من الـ state (Error Boundary)
    if (this.state.hasError) {
      return (
        <Card className="max-w-2xl mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              حدث خطأ في النظام المالي
            </CardTitle>
            <CardDescription>
              {this.props.fallbackMessage || 'عذراً، حدث خطأ غير متوقع في تحميل البيانات المالية.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {this.state.error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                  <p className="text-sm font-mono text-destructive">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">الحلول المقترحة:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>تحقق من اتصالك بالإنترنت</li>
                  <li>تأكد من تسجيل الدخول بحساب له صلاحيات مناسبة</li>
                  <li>حاول تحديث الصفحة</li>
                  <li>إذا استمرت المشكلة، اتصل بالدعم الفني</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button onClick={this.handleReset} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  إعادة المحاولة
                </Button>
                <Button variant="outline" onClick={() => window.history.back()}>
                  العودة
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}