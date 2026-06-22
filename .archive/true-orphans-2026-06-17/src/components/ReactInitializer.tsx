import * as React from 'react';
import { Component, ReactNode } from 'react';

// مكون تهيئة React للتأكد من أن React متاح بشكل صحيح
interface ReactInitializerProps {
  children: ReactNode;
}

interface ReactInitializerState {
  reactReady: boolean;
  error: string | null;
}

export class ReactInitializer extends Component<ReactInitializerProps, ReactInitializerState> {
  constructor(props: ReactInitializerProps) {
    super(props);
    
    this.state = {
      reactReady: false,
      error: null
    };
  }

  componentDidMount() {
    this.initializeReact();
  }

  initializeReact = async () => {
    try {
      console.log('🔧 ReactInitializer: Starting React initialization...');
      
      // التحقق من توفر React
      if (typeof React === 'undefined' || React === null) {
        throw new Error('React is not available');
      }

      // التحقق من توفر hooks
      if (typeof React.useState !== 'function') {
        throw new Error('React hooks are not available');
      }

      // التحقق من توفر React DOM
      if (typeof window !== 'undefined') {
        // تأكد من أن React متاح عالمياً
        (window as any).React = React;
      }

      console.log('🔧 ReactInitializer: React is ready', {
        version: React.version,
        hooks: {
          useState: typeof React.useState,
          useEffect: typeof React.useEffect,
          useContext: typeof React.useContext
        }
      });

      // انتظار قصير للتأكد من استقرار البيئة
      await new Promise(resolve => setTimeout(resolve, 100));

      this.setState({ reactReady: true, error: null });
    } catch (error) {
      console.error('🚨 ReactInitializer: Failed to initialize React:', error);
      this.setState({ 
        reactReady: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  render() {
    const { reactReady, error } = this.state;
    const { children } = this.props;

    if (error) {
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
          <h1 style={{ color: '#d63031', marginBottom: '20px' }}>
            خطأ في تهيئة النظام
          </h1>
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>
            فشل في تحميل مكتبة React. تفاصيل الخطأ:
          </p>
          <pre style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#d63031',
            direction: 'ltr',
            textAlign: 'left'
          }}>
            {error}
          </pre>
          <div style={{ marginTop: '30px' }}>
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
                fontSize: '16px',
                margin: '5px'
              }}
            >
              إعادة تحميل الصفحة
            </button>
            <button
              onClick={() => {
                // مسح الكاش وإعادة التحميل
                if (typeof window !== 'undefined') {
                  if ('caches' in window) {
                    (window as any).caches.keys().then((names: string[]) => {
                      names.forEach(name => (window as any).caches.delete(name));
                    }).finally(() => (window as any).location.reload());
                  } else {
                    (window as any).location.reload();
                  }
                }
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: '#fd79a8',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                margin: '5px'
              }}
            >
              مسح الكاش وإعادة التحميل
            </button>
          </div>
        </div>
      );
    }

    if (!reactReady) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#f8f9fa',
          fontFamily: 'Arial, sans-serif',
          direction: 'rtl'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '3px solid #e9ecef',
              borderTop: '3px solid #0984e3',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }} />
            <p style={{ fontSize: '18px', color: '#6c757d' }}>
              جاري تحميل النظام...
            </p>
            <style>
              {`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}
            </style>
          </div>
        </div>
      );
    }

    return <>{children}</>;
  }
}