// مكون تهيئة React بسيط بدون استخدام hooks
import * as React from 'react';

interface SimpleAppWrapperProps {
  children: React.ReactNode;
}

// مكون بسيط بدون hooks لتهيئة React
export class SimpleAppWrapper extends React.Component<SimpleAppWrapperProps> {
  private reactValidationPassed = false;

  constructor(props: SimpleAppWrapperProps) {
    super(props);
    
    console.log('🔧 SimpleAppWrapper: Starting React validation...');
    
    // التحقق الشامل من React
    this.validateReact();
    
    if (!this.reactValidationPassed) {
      throw new Error('React validation failed in SimpleAppWrapper');
    }
    
    console.log('✅ SimpleAppWrapper: React validation passed');
  }

  private validateReact(): void {
    const validations = [
      { name: 'React exists', check: () => !!React },
      { name: 'React is object', check: () => typeof React === 'object' },
      { name: 'useState exists', check: () => typeof React.useState === 'function' },
      { name: 'useEffect exists', check: () => typeof React.useEffect === 'function' },
      { name: 'useContext exists', check: () => typeof React.useContext === 'function' },
      { name: 'createContext exists', check: () => typeof React.createContext === 'function' },
      { name: 'Component exists', check: () => typeof React.Component === 'function' }
    ];

    const failures: string[] = [];

    for (const validation of validations) {
      try {
        if (!validation.check()) {
          failures.push(validation.name);
        }
      } catch (error) {
        failures.push(`${validation.name} (error: ${error})`);
      }
    }

    if (failures.length > 0) {
      console.error('🚨 React validation failures:', failures);
      console.error('🚨 React object keys:', Object.keys(React || {}));
      console.error('🚨 React object type:', typeof React);
      this.reactValidationPassed = false;
      return;
    }

    console.log('✅ All React validations passed');
    this.reactValidationPassed = true;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('🚨 SimpleAppWrapper caught error:', error);
    console.error('🚨 Error info:', errorInfo);
    
    // إعادة التحقق من React في حالة الخطأ
    this.validateReact();
  }

  render() {
    if (!this.reactValidationPassed) {
      return React.createElement('div', {
        style: {
          padding: '20px',
          backgroundColor: '#fee',
          border: '2px solid #f00',
          borderRadius: '8px',
          margin: '20px',
          fontFamily: 'monospace'
        }
      }, 'React initialization failed. Please refresh the page.');
    }

    return this.props.children;
  }
}

// دالة مساعدة للتحقق من React
export const ensureReactAvailable = (): boolean => {
  console.log('🔧 Checking React availability...');
  console.log('🔧 React:', !!React);
  console.log('🔧 React.useState:', typeof React?.useState);
  console.log('🔧 React.useEffect:', typeof React?.useEffect);
  console.log('🔧 React.useContext:', typeof React?.useContext);
  
  return !!(React && 
           typeof React.useState === 'function' && 
           typeof React.useEffect === 'function' && 
           typeof React.useContext === 'function');
};

export default SimpleAppWrapper;