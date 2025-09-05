import React from 'react';
import { normalizeArabicDigits } from '@/utils/numberFormatter';
import { cn } from '@/lib/utils';

interface NumberDisplayProps {
  value: number | string;
  className?: string;
  forceEnglishDigits?: boolean;
  children?: React.ReactNode;
}

/**
 * مكون لعرض الأرقام مع إجبار استخدام الأرقام الإنجليزية في البطاقات
 */
export const NumberDisplay: React.FC<NumberDisplayProps> = ({ 
  value, 
  className,
  forceEnglishDigits = true,
  children 
}) => {
  const displayValue = React.useMemo(() => {
    if (typeof value === 'number') {
      return value.toString();
    }
    
    if (typeof value === 'string') {
      return forceEnglishDigits ? normalizeArabicDigits(value) : value;
    }
    
    return '';
  }, [value, forceEnglishDigits]);

  return (
    <div className={cn(className)}>
      {displayValue}
      {children}
    </div>
  );
};

/**
 * مكون خاص بعرض الأرقام في البطاقات الإحصائية
 */
export const StatCardNumber: React.FC<{ 
  value: number | string; 
  className?: string;
}> = ({ value, className }) => {
  return (
    <NumberDisplay 
      value={value}
      className={cn("text-2xl font-bold", className)}
      forceEnglishDigits={true}
    />
  );
};

/**
 * مكون خاص بعرض النسب المئوية في البطاقات
 */
export const StatCardPercentage: React.FC<{ 
  value: number; 
  className?: string;
}> = ({ value, className }) => {
  return (
    <NumberDisplay 
      value={`${value}%`}
      className={cn("text-2xl font-bold", className)}
      forceEnglishDigits={true}
    />
  );
};