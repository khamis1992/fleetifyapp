import React, { Component, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImprovedErrorDisplay } from '@/components/error/ImprovedErrorDisplay';
import { ErrorHandler, getErrorMessage } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';

interface ImprovedRouteErrorBoundaryProps {
  children: ReactNode;
  routeName?: string;
  fallbackPath?: string;
}

interface ImprovedRouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
}

class ImprovedRouteErrorBoundaryClass extends Component<
  ImprovedRouteErrorBoundaryProps,
  ImprovedRouteErrorBoundaryState
> {
  constructor(props: ImprovedRouteErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ImprovedRouteErrorBoundaryState> {
    logger.error('🔴 [ImprovedRouteErrorBoundary] Error caught:', error.message);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { routeName } = this.props;

    logger.error(`🔴 [ImprovedRouteErrorBoundary] Error in route: ${routeName || 'Unknown'}`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Log with full context
    ErrorHandler.log(error, {
      component: routeName,
      action: 'route_rendering',
      metadata: { componentStack: errorInfo.componentStack }
    });

    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleRetry = () => {
    this.handleReset();
    // Force re-render
    this.forceUpdate();
  };

  render() {
    if (this.state.hasError) {
      const { fallbackPath = '/dashboard' } = this.props;
      const { error, errorCount } = this.state;

      return (
        <ImprovedRouteErrorFallback
          error={error}
          errorCount={errorCount}
          fallbackPath={fallbackPath}
          onReset={this.handleReset}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

// Functional wrapper to use hooks
export const ImprovedRouteErrorBoundary: React.FC<ImprovedRouteErrorBoundaryProps> = (props) => {
  return <ImprovedRouteErrorBoundaryClass {...props} />;
};

// Error Fallback UI Component
interface ImprovedRouteErrorFallbackProps {
  error: Error | null;
  errorCount: number;
  fallbackPath: string;
  onReset: () => void;
  onRetry: () => void;
}

const ImprovedRouteErrorFallback: React.FC<ImprovedRouteErrorFallbackProps> = ({
  error,
  errorCount,
  fallbackPath,
  onReset,
  onRetry
}) => {
  const navigate = useNavigate();

  const errorMsg = error ? getErrorMessage(error) : null;

  if (!errorMsg || !error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">حدث خطأ غير متوقع</h2>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            إعادة تحميل
          </button>
        </div>
      </div>
    );
  }

  const handleNavigate = (path: string) => {
    onReset();
    navigate(path);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30" dir="rtl">
      <div className="w-full max-w-2xl">
        {/* Error count warning */}
        {errorCount > 2 && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            ⚠️ حدثت أخطاء متعددة. قد تحتاج إلى إعادة تحميل الصفحة أو مسح الذاكرة المؤقتة.
          </div>
        )}

        <ImprovedErrorDisplay
          error={error}
          errorMessage={errorMsg}
          onRetry={onRetry}
          onNavigate={handleNavigate}
          onDismiss={onReset}
          retryCount={0}
        />
      </div>
    </div>
  );
};

export default ImprovedRouteErrorBoundary;
