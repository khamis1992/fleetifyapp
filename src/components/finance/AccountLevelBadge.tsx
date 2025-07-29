import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

  const getTooltipContent = () => {
    if (isAggregate) {
      return (
        <div className="text-center">
          <p className="font-medium">Aggregate Account</p>
          <p className="text-xs">Used for reporting and organization only.</p>
          <p className="text-xs">Cannot be used in journal entries.</p>
        </div>
      );
    }
    if (isEntryAllowed) {
      return (
        <div className="text-center">
          <p className="font-medium">Entry Allowed</p>
          <p className="text-xs">Can be used in journal entries and transactions.</p>
          <p className="text-xs">Level {accountLevel} - Detail account</p>
        </div>
      );
    }
    return (
      <div className="text-center">
        <p className="font-medium">Entry Not Allowed</p>
        <p className="text-xs">Level {accountLevel} is too high for entries.</p>
        <p className="text-xs">Only levels 5+ can have journal entries.</p>
      </div>
    );
  };

  const badge = (() => {
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
  })();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};