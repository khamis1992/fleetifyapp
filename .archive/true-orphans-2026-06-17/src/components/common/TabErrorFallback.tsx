import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TabErrorFallbackProps {
  tabName: string;
  onRetry?: () => void;
}

const TabErrorFallback: React.FC<TabErrorFallbackProps> = ({ tabName, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-xl text-red-700 min-h-[200px]">
      <AlertTriangle className="w-8 h-8 mb-3" />
      <h2 className="text-lg font-semibold mb-2">حدث خطأ في تحميل تبويب {tabName}</h2>
      <p className="text-sm text-center mb-4">
        نعتذر عن هذا الإزعاج. يرجى المحاولة مرة أخرى.
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="destructive" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
};

export default TabErrorFallback;

