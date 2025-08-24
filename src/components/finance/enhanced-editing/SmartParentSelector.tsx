import React from 'react';
import { AISmartParentSelector } from './AISmartParentSelector';

interface SmartParentSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  currentAccountId?: string;
  accountName?: string;
  accountType?: string;
  placeholder?: string;
}

export const SmartParentSelector: React.FC<SmartParentSelectorProps> = ({
  value,
  onValueChange,
  currentAccountId,
  accountName = '',
  accountType,
  placeholder = "اختر الحساب الأب"
}) => {
  // Use the new AI-enhanced selector with full flexibility
  // Any account can now be a parent, with proper hierarchy validation
  return (
    <AISmartParentSelector
      value={value}
      onValueChange={onValueChange}
      currentAccountId={currentAccountId}
      accountName={accountName}
      accountType={accountType}
      placeholder={placeholder}
    />
  );
};