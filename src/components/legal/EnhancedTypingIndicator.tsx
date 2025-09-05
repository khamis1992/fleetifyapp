import React, { useState, useEffect } from 'react';
import { Brain, Zap, Search, FileText } from 'lucide-react';

interface EnhancedTypingIndicatorProps {
  isTyping: boolean;
  currentOperation?: 'thinking' | 'analyzing' | 'searching' | 'generating';
  operationText?: string;
}

const operations = {
  thinking: {
    icon: Brain,
    text: 'المساعد يفكر...',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  analyzing: {
    icon: FileText,
    text: 'تحليل المحتوى...',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  searching: {
    icon: Search,
    text: 'البحث في قاعدة البيانات...',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  generating: {
    icon: Zap,
    text: 'إنشاء الإجابة...',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  }
};

export const EnhancedTypingIndicator: React.FC<EnhancedTypingIndicatorProps> = ({ 
  isTyping, 
  currentOperation = 'thinking',
  operationText 
}) => {
  const [dots, setDots] = useState('');
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    if (!isTyping) {
      setDots('');
      setAnimationPhase(0);
      return;
    }

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
      
      setAnimationPhase(prev => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(interval);
  }, [isTyping]);

  if (!isTyping) return null;

  const operation = operations[currentOperation];
  const IconComponent = operation.icon;

  return (
    <div className="flex justify-start mb-4">
      <div className={`${operation.bgColor} p-4 rounded-lg max-w-xs border border-border/20 shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <IconComponent 
              className={`h-5 w-5 ${operation.color} transition-transform duration-300`}
              style={{
                transform: `scale(${1 + Math.sin(animationPhase * Math.PI / 2) * 0.1})`
              }}
            />
            <div className="absolute -top-1 -right-1">
              <div className={`w-2 h-2 ${operation.color.replace('text-', 'bg-')} rounded-full animate-pulse`} />
            </div>
          </div>
          
          <div className="flex-1">
            <div className={`text-sm font-medium ${operation.color}`}>
              {operationText || operation.text}
              <span className="inline-block w-6 text-left">{dots}</span>
            </div>
            
            {/* Enhanced animation dots */}
            <div className="flex gap-1 mt-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${operation.color.replace('text-', 'bg-')} transition-opacity duration-300`}
                  style={{
                    opacity: (animationPhase + i) % 3 === 0 ? 1 : 0.3,
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Progress bar animation */}
        <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${operation.color.replace('text-', 'bg-')} rounded-full transition-transform duration-1000 ease-in-out`}
            style={{
              transform: `translateX(${(animationPhase * 25) - 100}%)`,
              width: '50%'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default EnhancedTypingIndicator;