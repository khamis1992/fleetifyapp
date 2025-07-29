import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface AccountLevelBadgeProps {
  accountLevel: number;
  isHeader: boolean;
}

export const AccountLevelBadge: React.FC<AccountLevelBadgeProps> = ({ 
  accountLevel, 
  isHeader 
}) => {
  const isEntryAllowed = accountLevel >= 5 && !isHeader;
  const isAggregate = isHeader || accountLevel < 5;

  if (isAggregate) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Shield className="h-3 w-3" />
        حساب إجمالي (للتقارير فقط)
      </Badge>
    );
  }

  if (isEntryAllowed) {
    return (
      <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
        <CheckCircle className="h-3 w-3" />
        مسموح للقيود
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="gap-1">
      <AlertTriangle className="h-3 w-3" />
      غير مسموح للقيود
    </Badge>
  );
};