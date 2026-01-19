import * as React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    console.error('🔧 ErrorBoundary: Caught error:', error);
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔧 ErrorBoundary: Component did catch:', error, errorInfo);
    
    // Check if this is a chunk loading error
    const isChunkLoadError = 
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.message?.includes('error loading dynamically imported module') ||
      error?.message?.includes('ChunkLoadError');
    
    if (isChunkLoadError) {
      console.warn('🔄 [ErrorBoundary] Detected chunk load error, attempting reload...');
      const hasReloaded = sessionStorage.getItem('chunk_reload_attempted');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload_attempted', 'true');
        window.location.reload();
        return;
      }
    }
    
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      const isChunkLoadError = 
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message?.includes('Importing a module script failed') ||
        this.state.error?.message?.includes('error loading dynamically imported module') ||
        this.state.error?.message?.includes('ChunkLoadError');
      
      const isReactHookError = this.state.error?.message?.includes('useState') || 
                              this.state.error?.message?.includes('React hooks');
      
      return (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '5px',
          margin: '20px',
          direction: 'rtl'
        }}>
          <h2>خطأ في التطبيق</h2>
          <p>
            {isChunkLoadError
              ? 'تم نشر نسخة جديدة من التطبيق. يتم إعادة التحميل تلقائياً...'
              : isReactHookError 
              ? 'حدث خطأ في تحميل React. هذا قد يكون بسبب مشكلة في البيئة.'
              : 'حدث خطأ غير متوقع في التطبيق.'
            }
          </p>
          
          <details style={{ marginTop: '20px', textAlign: 'right' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
              عرض تفاصيل الخطأ (للمطورين)
            </summary>
            <div style={{ 
              backgroundColor: '#f8f8f8', 
              padding: '10px', 
              borderRadius: '3px',
              fontSize: '12px',
              fontFamily: 'monospace',
              textAlign: 'left',
              direction: 'ltr'
            }}>
              <strong>Error:</strong> {this.state.error?.message}
              <br/><br/>
              <strong>Stack:</strong>
              <pre>{this.state.error?.stack}</pre>
              {this.state.errorInfo && (
                <>
                  <br/>
                  <strong>Component Stack:</strong>
                  <pre>{this.state.errorInfo.componentStack}</pre>
                </>
              )}
            </div>
          </details>
          
          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                margin: '5px'
              }}
            >
              إعادة تحميل الصفحة
            </button>
            
            <button 
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }} 
              style={{
                padding: '10px 20px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                margin: '5px'
              }}
            >
              مسح البيانات وإعادة التحميل
            </button>
            
            <button 
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })} 
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                margin: '5px'
              }}
            >
              محاولة المتابعة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
