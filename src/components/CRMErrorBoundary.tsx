/**
 * Error Boundary for CRM Page
 * يحمي صفحة CRM من الأعطال غير المتوقعة
 */

import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';


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
          <button 
            onClick={() => window.location.reload()} 
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap bg-[rgba(0,168,150,1)] text-white shadow-md hover:opacity-90"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            إعادة التحميل
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

