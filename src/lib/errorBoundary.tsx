import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from './logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  private compatibilityLogger = {
    logReactVersionIssue: (error: Error) => {
      logger.error('React compatibility issue:', error);
      logger.warn('React compatibility issue:', error);
    },
    logLibraryConflict: (lib: string, error: Error) => {
      logger.error(`${lib} conflict:`, error);
      logger.warn(`${lib} conflict:`, error);
    }
  };

  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log compatibility issues
    if (error.message.includes('forwardRef')) {
      this.compatibilityLogger.logLibraryConflict('Radix UI forwardRef', error);
    }
    
    if (error.message.includes('useForm') || error.message.includes('react-hook-form')) {
      this.compatibilityLogger.logLibraryConflict('React Hook Form', error);
    }
    
    if (error.message.includes('framer-motion') || error.message.includes('motion')) {
      this.compatibilityLogger.logLibraryConflict('Framer Motion', error);
    }
    
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md mx-auto p-6 bg-card rounded-lg shadow-card">
            <h2 className="text-xl font-semibold text-destructive mb-4">
              حدث خطأ غير متوقع
            </h2>
            <p className="text-muted-foreground mb-4">
              نعتذر، حدث خطأ في التطبيق. يرجى تحديث الصفحة والمحاولة مرة أخرى.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  تفاصيل الخطأ (للمطورين)
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-primary-foreground py-2 px-4 rounded hover:bg-primary/90 transition-colors"
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;