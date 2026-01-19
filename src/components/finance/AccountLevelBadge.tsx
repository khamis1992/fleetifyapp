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
  const isEntryAllowed = (accountLevel === 5 || accountLevel === 6) && !isHeader;
  const isAggregate = isHeader || accountLevel < 5;

  // Get level-specific information
  const getLevelInfo = () => {
    switch (accountLevel) {
      case 1:
        return { label: 'مستوى 1 - حساب رئيسي', variant: 'secondary' as const, icon: Shield };
      case 2:
        return { label: 'مستوى 2 - مجموعة رئيسية', variant: 'secondary' as const, icon: Shield };
      case 3:
        return { label: 'مستوى 3 - مجموعة فرعية', variant: 'secondary' as const, icon: Shield };
      case 4:
        return { label: 'مستوى 4 - تصنيف', variant: 'outline' as const, icon: AlertTriangle };
      case 5:
        return { label: 'مستوى 5 - حساب قيد', variant: 'default' as const, icon: CheckCircle };
      case 6:
        return { label: 'مستوى 6 - حساب قيد تفصيلي', variant: 'default' as const, icon: CheckCircle };
      default:
        return { label: `مستوى ${accountLevel}`, variant: 'secondary' as const, icon: AlertTriangle };
    }
  };

  const levelInfo = getLevelInfo();
  const Icon = levelInfo.icon;

  if (isAggregate) {
    return (
      <Badge variant={levelInfo.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {levelInfo.label} (للتقارير فقط)
      </Badge>
    );
  }

  if (isEntryAllowed) {
    return (
      <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700 text-white">
        <CheckCircle className="h-3 w-3" />
        {levelInfo.label} - مسموح للقيود
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="gap-1">
      <AlertTriangle className="h-3 w-3" />
      {levelInfo.label} - غير مسموح للقيود
    </Badge>
  );
};