// مكون تهيئة React بسيط بدون استخدام hooks
import React from 'react';

interface SimpleAppWrapperProps {
  children: React.ReactNode;
}

// مكون بسيط بدون hooks لتهيئة React
export class SimpleAppWrapper extends React.Component<SimpleAppWrapperProps> {
  constructor(props: SimpleAppWrapperProps) {
    super(props);
    
    // التحقق الفوري من React
    if (!React || typeof React.useState !== 'function') {
      console.error('🚨 SimpleAppWrapper: React hooks not available');
      throw new Error('React hooks are not available');
    }
    
    console.log('✅ SimpleAppWrapper: React hooks are available');
  }

  render() {
    return this.props.children;
  }
}

// دالة مساعدة للتحقق من React
export const ensureReactAvailable = (): boolean => {
  console.log('🔧 Checking React availability...');
  console.log('🔧 React:', !!React);
  console.log('🔧 React.useState:', typeof React?.useState);
  console.log('🔧 React.useEffect:', typeof React?.useEffect);
  
  return !!(React && typeof React.useState === 'function');
};

export default SimpleAppWrapper;