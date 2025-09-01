import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 [ERROR_BOUNDARY] Uncaught error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Log error for debugging
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isAuthError = this.state.error?.message?.includes('auth') || 
                         this.state.error?.message?.includes('session') ||
                         this.state.error?.message?.includes('unauthorized');

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>
                {isAuthError ? 'مشكلة في المصادقة' : 'حدث خطأ غير متوقع'}
              </CardTitle>
              <CardDescription>
                {isAuthError 
                  ? 'حدث خطأ في النظام المصادقة. يرجى تسجيل الدخول مرة أخرى.'
                  : 'حدث خطأ أثناء تحميل التطبيق. يرجى المحاولة مرة أخرى.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p className="font-medium text-destructive mb-2">تفاصيل الخطأ (وضع التطوير):</p>
                  <p className="font-mono text-xs break-all">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <Button onClick={this.handleRetry} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  إعادة المحاولة
                </Button>
                
                <Button variant="outline" onClick={this.handleGoHome} className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  العودة للصفحة الرئيسية
                </Button>
                
                <Button variant="ghost" onClick={this.handleReload} className="w-full">
                  إعادة تحميل الصفحة
                </Button>
              </div>

              {isAuthError && (
                <div className="bg-info/10 border border-info/20 rounded-lg p-3">
                  <p className="text-sm text-info-foreground">
                    💡 إذا استمرت المشكلة، قم بمسح بيانات المتصفح وتسجيل الدخول مرة أخرى.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC wrapper for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  return (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
};