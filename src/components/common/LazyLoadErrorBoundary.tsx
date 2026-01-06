import React, { Component, ReactNode, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  isChunkError?: boolean;
  isUndefinedError?: boolean;
}

/**
 * Error Boundary specifically for lazy-loaded components
 * Provides better UX for code-splitting failures
 */
export class LazyLoadErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check for different error types
    const isChunkError = error?.message?.includes('Failed to fetch dynamically imported module') ||
                        error?.message?.includes('error loading dynamically imported module') ||
                        error?.message?.includes('ChunkLoadError');
    const isUndefinedError = error?.message?.includes('undefined') ||
                             error?.message?.includes('Cannot read prop');

    return {
      hasError: true,
      error,
      errorInfo: null,
      ...(isChunkError && { isChunkError }),
      ...(isUndefinedError && { isUndefinedError })
    } as State;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('LazyLoadErrorBoundary caught an error:', error, errorInfo);
    }

    // You can also log to an error reporting service here
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, isChunkError, isUndefinedError } = this.state;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="max-w-2xl w-full border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-6 w-6" />
                {isChunkError ? 'فشل في تحميل المكون' :
                 isUndefinedError ? 'خطأ في البيانات' :
                 'حدث خطأ غير متوقع'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isChunkError ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    فشل تحميل هذا المكون. قد يكون ذلك بسبب:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mr-4">
                    <li>انقطاع الاتصال بالإنترنت</li>
                    <li>تحديث النظام (تم تحديث الملفات)</li>
                    <li>مشكلة مؤقتة في التحميل</li>
                  </ul>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={this.handleReload} className="flex-1">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      إعادة تحميل الصفحة
                    </Button>
                    <Button onClick={this.handleReset} variant="outline" className="flex-1">
                      المحاولة مرة أخرى
                    </Button>
                  </div>
                </div>
              ) : isUndefinedError ? (
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    هناك مشكلة في تحميل البيانات المطلوبة. يرجى المحاولة مرة أخرى.
                  </p>
                  {import.meta.env.DEV && error && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                        تفاصيل الخطأ (Development Mode)
                      </summary>
                      <div className="mt-2 p-3 bg-muted rounded-lg text-xs">
                        <pre className="whitespace-pre-wrap">{error.toString()}</pre>
                      </div>
                    </details>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button onClick={this.handleReset} className="flex-1">
                      المحاولة مرة أخرى
                    </Button>
                    <Button onClick={this.handleReload} variant="outline" className="flex-1">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      إعادة تحميل الصفحة
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    حدث خطأ أثناء عرض هذا المكون.
                  </p>
                  {import.meta.env.DEV && error && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                        تفاصيل الخطأ (Development Mode)
                      </summary>
                      <div className="mt-2 p-3 bg-muted rounded-lg text-xs space-y-2">
                        <div>
                          <strong>Error:</strong>
                          <pre className="mt-1 whitespace-pre-wrap">{error.toString()}</pre>
                        </div>
                        {errorInfo && (
                          <div>
                            <strong>Component Stack:</strong>
                            <pre className="mt-1 whitespace-pre-wrap text-xs">{errorInfo.componentStack}</pre>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button onClick={this.handleReset} className="flex-1">
                      المحاولة مرة أخرى
                    </Button>
                    <Button onClick={this.handleReload} variant="outline" className="flex-1">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      إعادة تحميل الصفحة
                    </Button>
                  </div>
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

/**
 * HOC to wrap lazy-loaded components with error boundary
 */
export function withLazyLoadErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <LazyLoadErrorBoundary fallback={fallback}>
        <Suspense fallback={fallback || <div>Loading...</div>}>
          <Component {...props} />
        </Suspense>
      </LazyLoadErrorBoundary>
    );
  };
}

export default LazyLoadErrorBoundary;
