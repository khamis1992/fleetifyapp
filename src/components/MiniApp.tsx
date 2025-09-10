// مكون تهيئة مصغر للتطبيق
import React from 'react';
import { SimpleAppWrapper, ensureReactAvailable } from '@/components/SimpleAppWrapper';
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface MiniAppProps {
  children: React.ReactNode;
}

export class MiniApp extends React.Component<MiniAppProps> {
  constructor(props: MiniAppProps) {
    super(props);
    
    console.log('🔧 MiniApp: Starting initialization...');
    
    // التحقق من React قبل المتابعة
    if (!ensureReactAvailable()) {
      throw new Error('React is not properly initialized');
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 MiniApp: Component error:', error, errorInfo);
  }

  render() {
    try {
      return (
        <SimpleAppWrapper>
          <ErrorBoundary>
            {this.props.children}
          </ErrorBoundary>
        </SimpleAppWrapper>
      );
    } catch (error) {
      console.error('🚨 MiniApp: Render error:', error);
      
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          margin: '20px',
          fontFamily: 'Arial, sans-serif',
          direction: 'rtl'
        }}>
          <h1 style={{ color: '#d63031' }}>خطأ في التطبيق</h1>
          <p>حدث خطأ أثناء تحميل التطبيق</p>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#0984e3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            إعادة تحميل
          </button>
        </div>
      );
    }
  }
}

export default MiniApp;