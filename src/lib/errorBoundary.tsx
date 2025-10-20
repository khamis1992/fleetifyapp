import { Component, ErrorInfo, ReactNode } from 'react';
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
      console.warn('React compatibility issue:', error);
    },
    logLibraryConflict: (lib: string, error: Error) => {
      logger.error(`${lib} conflict:`, error);
      console.warn(`${lib} conflict:`, error);
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
    
    // Enhanced error logging with full details
    console.group('🔴 ERROR BOUNDARY CAUGHT ERROR');
    console.error('Error:', error);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();
    
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
    
    // Check for query/hook related errors
    if (error.message.includes('property_contracts') || error.message.includes('useProperty')) {
      console.error('🚨 Property-related hook error detected - likely table not found for car rental business');
    }
    
    if (error.message.includes('PGRST') || error.message.includes('does not exist')) {
      console.error('🚨 Database table error - table may not exist for this business type');
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
                <div className="mt-2 space-y-2">
                  <div>
                    <div className="text-xs font-semibold text-destructive mb-1">Error Message:</div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                      {this.state.error.toString()}
                    </pre>
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <div className="text-xs font-semibold text-destructive mb-1">Stack Trace:</div>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <div className="text-xs font-semibold text-destructive mb-1">Component Stack:</div>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
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