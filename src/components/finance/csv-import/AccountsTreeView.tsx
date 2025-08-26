import React, { useState } from 'react';
import { Account } from '@/types';
import { cn } from '@/lib/utils';
import { 
  ChevronDown, 
  ChevronLeft,
  Building,
  CreditCard,
  TrendingUp
} from 'lucide-react';

interface AccountsTreeViewProps {
  data: Account[];
  onSelect: (account: Account | null) => void;
}

export const AccountsTreeView = ({ data, onSelect }: AccountsTreeViewProps) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set<string>());
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newExpandedNodes = new Set(prev);
      if (newExpandedNodes.has(nodeId)) {
        newExpandedNodes.delete(nodeId);
      } else {
        newExpandedNodes.add(nodeId);
      }
      return newExpandedNodes;
    });
  };

  const handleNodeClick = (account: Account) => {
    setSelectedAccount(account);
    onSelect(account);
  };

  const renderAccountNode = (account: Account, level: number = 0): JSX.Element => {
    const hasChildren = account.children && account.children.length > 0;
    const isExpanded = expandedNodes.has(account.id);
    const isSelected = selectedAccount?.id === account.id;

    return (
      <div key={account.id} className="w-full">
        <div
          className={cn(
            "flex items-center gap-2 p-2 hover:bg-accent/50 cursor-pointer rounded-sm transition-colors",
            isSelected && "bg-accent border-l-2 border-primary",
            "text-right"
          )}
          style={{ paddingRight: `${level * 20 + 8}px` }}
          onClick={() => handleNodeClick(account)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(account.id);
              }}
              className="p-1 hover:bg-accent rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-6" />}
          
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {account.account_type === 'Asset' && (
              <Building className="h-4 w-4 text-blue-600 flex-shrink-0" />
            )}
            {account.account_type === 'Liability' && (
              <CreditCard className="h-4 w-4 text-red-600 flex-shrink-0" />
            )}
            {account.account_type === 'Equity' && (
              <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground flex-shrink-0">
                  {account.account_code}
                </span>
                <span className="font-medium truncate">
                  {account.account_name}
                </span>
              </div>
              
              {account.current_balance !== undefined && (
                <div className="text-xs text-muted-foreground">
                  الرصيد: {account.current_balance.toFixed(3)} د.ك
                </div>
              )}
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-r border-border mr-3">
            {account.children!.map(child => renderAccountNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {data.map(account => renderAccountNode(account))}
    </div>
  );
};
