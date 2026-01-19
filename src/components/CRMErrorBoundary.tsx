/**
 * Error Boundary for CRM Page
 * يحمي صفحة CRM من الأعطال غير المتوقعة
 */

import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class CRMErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CRM Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-red-50 rounded-xl border border-red-200">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">حدث خطأ غير متوقع</h2>
          <p className="text-red-700 text-center mb-6 max-w-md">
            {this.state.error?.message || 'نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.'}
          </p>
          <Button onClick={() => window.location.reload()} variant="destructive">
            <RefreshCw className="w-4 h-4 mr-2" />
            إعادة التحميل
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

