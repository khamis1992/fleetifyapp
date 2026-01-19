/**
 * Global Error Boundary Component
 * 
 * Catches errors at the app level and provides fallback UI
 * Integrates with Sentry for error tracking
 */

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { captureException, addBreadcrumb } from '@/lib/sentry';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Add breadcrumb for debugging
    addBreadcrumb({
      message: 'Global error caught',
      category: 'error',
      level: 'error',
      data: {
        errorMessage: error.message,
        errorStack: error.stack,
      },
    });

    // Capture exception in Sentry
    captureException(error, {
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
          <Card className="max-w-2xl w-full shadow-2xl">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <CardTitle className="text-3xl font-bold text-slate-900">
                عذراً، حدث خطأ غير متوقع
              </CardTitle>
              <CardDescription className="text-lg">
                نعتذر عن الإزعاج. تم تسجيل المشكلة وسنعمل على إصلاحها قريباً.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Error Details (only in development) */}
              {import.meta.env.DEV && this.state.error && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">تفاصيل الخطأ (وضع التطوير):</p>
                  <pre className="text-xs text-red-600 overflow-auto max-h-40 whitespace-pre-wrap">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="text-xs text-slate-600 overflow-auto max-h-40 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  size="lg"
                  className="gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  إعادة المحاولة
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                >
                  <Home className="w-5 h-5" />
                  العودة للرئيسية
                </Button>
              </div>

              {/* Help Text */}
              <p className="text-center text-sm text-slate-600">
                إذا استمرت المشكلة، يرجى التواصل مع الدعم الفني
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
