/**
 * Route Error Boundary Component
 * 
 * Provides granular error handling for each route
 * Prevents errors in one route from crashing the entire app
 * 
 * Features:
 * - Isolated error recovery
 * - Route-specific error messages
 * - Navigation fallback options
 * - Error logging for debugging
 * - Retry functionality
 */

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Home, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { captureException, addBreadcrumb } from '@/lib/sentry';

interface RouteErrorBoundaryProps {
  children: ReactNode;
  routeName?: string;
  fallbackPath?: string;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
}

class RouteErrorBoundaryClass extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<RouteErrorBoundaryState> {
    console.error('🔴 [RouteErrorBoundary] Error caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { routeName } = this.props;
    
    console.error(`🔴 [RouteErrorBoundary] Error in route: ${routeName || 'Unknown'}`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Log to external service (if configured)
    this.logErrorToService(error, errorInfo);

    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));
  }

  logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log error to Sentry with context
    const errorContext = {
      route: this.props.routeName,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      errorCount: this.state.errorCount + 1,
    };
    
    // Add breadcrumb for debugging
    addBreadcrumb({
      message: `Error in route: ${this.props.routeName || 'Unknown'}`,
      category: 'error',
      level: 'error',
      data: {
        errorMessage: error.message,
        route: this.props.routeName,
      },
    });
    
    // Capture exception in Sentry
    captureException(error, errorContext);

    // For now, log to console in dev
    if (import.meta.env.DEV) {
      console.table(errorLog);
    }

    // Store in localStorage for debugging
    try {
      const existingErrors = JSON.parse(localStorage.getItem('route_errors') || '[]');
      existingErrors.push(errorLog);
      // Keep only last 10 errors
      const recentErrors = existingErrors.slice(-10);
      localStorage.setItem('route_errors', JSON.stringify(recentErrors));
    } catch (e) {
      console.warn('Failed to store error log:', e);
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      const { routeName, fallbackPath = '/dashboard' } = this.props;
      const { error, errorInfo, errorCount } = this.state;

      return <RouteErrorFallback
        error={error}
        errorInfo={errorInfo}
        errorCount={errorCount}
        routeName={routeName}
        fallbackPath={fallbackPath}
        onReset={this.handleReset}
      />;
    }

    return this.props.children;
  }
}

// Functional wrapper to use hooks
export const RouteErrorBoundary: React.FC<RouteErrorBoundaryProps> = (props) => {
  return <RouteErrorBoundaryClass {...props} />;
};

// Error Fallback UI Component
interface RouteErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
  routeName?: string;
  fallbackPath: string;
  onReset: () => void;
}

const RouteErrorFallback: React.FC<RouteErrorFallbackProps> = ({
  error,
  errorInfo,
  errorCount,
  routeName,
  fallbackPath,
  onReset
}) => {
  const navigate = useNavigate();

  const errorType = useMemo(() => {
    if (!error) return 'unknown';
    
    const message = error.message.toLowerCase();
    
    if (message.includes('chunk') || message.includes('dynamically imported')) {
      return 'chunk_load';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'permission';
    }
    if (message.includes('not found') || message.includes('404')) {
      return 'not_found';
    }
    
    return 'generic';
  }, [error]);

  const getErrorMessage = () => {
    switch (errorType) {
      case 'chunk_load':
        return {
          title: 'تحديث التطبيق',
          description: 'تم نشر نسخة جديدة من التطبيق. يرجى إعادة تحميل الصفحة.',
          action: 'reload'
        };
      case 'network':
        return {
          title: 'خطأ في الاتصال',
          description: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.',
          action: 'retry'
        };
      case 'permission':
        return {
          title: 'خطأ في الصلاحيات',
          description: 'ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة.',
          action: 'navigate'
        };
      case 'not_found':
        return {
          title: 'الصفحة غير موجودة',
          description: 'لم يتم العثور على المحتوى المطلوب.',
          action: 'navigate'
        };
      default:
        return {
          title: 'حدث خطأ',
          description: `حدث خطأ غير متوقع في ${routeName || 'الصفحة'}.`,
          action: 'retry'
        };
    }
  };

  const errorMessage = getErrorMessage();

  const handleReload = () => {
    window.location.reload();
  };

  const handleNavigateHome = () => {
    navigate(fallbackPath);
    onReset();
  };

  const handleRetry = () => {
    onReset();
  };

  const handleGoBack = () => {
    navigate(-1);
    onReset();
  };

  // Auto-reload for chunk errors (only once)
  useEffect(() => {
    if (errorType === 'chunk_load' && errorCount === 1) {
      const timer = setTimeout(() => {
        console.log('🔄 Auto-reloading due to chunk error...');
        handleReload();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [errorType, errorCount]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30" dir="rtl">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <CardTitle>{errorMessage.title}</CardTitle>
              <CardDescription>{errorMessage.description}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error count warning */}
          {errorCount > 1 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                هذا الخطأ حدث {errorCount} مرات. قد تحتاج إلى مسح البيانات المخزنة.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {errorMessage.action === 'reload' && (
              <Button onClick={handleReload} size="lg">
                <RefreshCw className="h-4 w-4 ml-2" />
                إعادة تحميل الصفحة
              </Button>
            )}

            {errorMessage.action === 'retry' && (
              <Button onClick={handleRetry} size="lg">
                <RefreshCw className="h-4 w-4 ml-2" />
                إعادة المحاولة
              </Button>
            )}

            <Button onClick={handleGoBack} variant="outline" size="lg">
              <ArrowLeft className="h-4 w-4 ml-2" />
              رجوع
            </Button>

            <Button onClick={handleNavigateHome} variant="outline" size="lg">
              <Home className="h-4 w-4 ml-2" />
              الصفحة الرئيسية
            </Button>
          </div>

          {/* Technical Details (Collapsible) */}
          {import.meta.env.DEV && error && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                التفاصيل التقنية (للمطورين)
              </summary>
              <div className="mt-3 space-y-2">
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-xs font-mono text-destructive break-all">
                    {error.message}
                  </p>
                </div>
                
                {error.stack && (
                  <div className="p-3 bg-muted rounded-md max-h-48 overflow-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </div>
                )}

                {errorInfo?.componentStack && (
                  <div className="p-3 bg-muted rounded-md max-h-48 overflow-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

RouteErrorBoundary.displayName = 'RouteErrorBoundary';
