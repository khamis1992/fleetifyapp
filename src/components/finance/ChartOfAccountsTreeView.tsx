import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, BarChart3, TrendingUp, Building, DollarSign, PieChart, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AccountLevelBadge } from './AccountLevelBadge';
import { formatCurrency } from '@/lib/utils';
import type { ChartOfAccount } from '@/hooks/useChartOfAccounts';

interface TreeNode extends ChartOfAccount {
  children: TreeNode[];
}

interface ChartOfAccountsTreeViewProps {
  accounts: ChartOfAccount[];
  onAccountSelect?: (account: ChartOfAccount) => void;
  onAccountEdit?: (account: ChartOfAccount) => void;
  onAccountDelete?: (account: ChartOfAccount) => void;
  selectedAccountId?: string;
}

const getAccountTypeIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'assets':
    case 'الأصول':
      return Building;
    case 'liabilities':
    case 'الخصوم':
      return TrendingUp;
    case 'equity':
    case 'حقوق الملكية':
      return PieChart;
    case 'revenue':
    case 'الإيرادات':
      return DollarSign;
    case 'expenses':
    case 'المصروفات':
      return Calculator;
    default:
      return BarChart3;
  }
};

const getLevelColor = (level: number) => {
  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--accent))',
    'hsl(var(--muted-foreground))',
    'hsl(var(--success))',
  ];
  return colors[Math.min(level - 1, colors.length - 1)] || colors[colors.length - 1];
};

export const ChartOfAccountsTreeView: React.FC<ChartOfAccountsTreeViewProps> = ({
  accounts,
  onAccountSelect,
  onAccountEdit,
  onAccountDelete,
  selectedAccountId,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const treeData = useMemo(() => {
    const buildTree = (parentId: string | null = null): TreeNode[] => {
      return accounts
        .filter(account => account.parent_account_id === parentId)
        .map(account => ({
          ...account,
          children: buildTree(account.id),
        }))
        .sort((a, b) => a.account_code.localeCompare(b.account_code));
    };
    return buildTree();
  }, [accounts]);

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = accounts.map(account => account.id);
    setExpandedNodes(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isSelected = selectedAccountId === node.id;
    const Icon = getAccountTypeIcon(node.account_type);
    const levelColor = getLevelColor(node.account_level || 1);

    return (
      <div key={node.id} className="relative">
        {/* Level indicator line */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 rounded-full opacity-60"
          style={{ backgroundColor: levelColor, marginLeft: `${depth * 20}px` }}
        />
        
        <div
          className={`
            flex items-center gap-2 p-3 rounded-lg transition-all duration-200 ml-1
            ${isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'}
            ${depth > 0 ? 'ml-4' : ''}
          `}
          style={{ marginLeft: `${depth * 20 + 8}px` }}
        >
          {/* Expansion toggle */}
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpanded(node.id)}
              className="h-6 w-6 p-0 hover:bg-primary/10"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          
          {!hasChildren && <div className="w-6" />}
          
          {/* Account icon */}
          <div 
            className="p-1.5 rounded-md"
            style={{ backgroundColor: `${levelColor}20` }}
          >
            <Icon className="h-4 w-4" style={{ color: levelColor }} />
          </div>
          
          {/* Account info */}
          <div 
            className="flex-1 cursor-pointer"
            onClick={() => onAccountSelect?.(node)}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">
                {node.account_code}
              </span>
              <span className="font-medium">
                {node.account_name}
              </span>
              {node.account_name_ar && (
                <span className="text-sm text-muted-foreground">
                  ({node.account_name_ar})
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <AccountLevelBadge 
                accountLevel={node.account_level || 1} 
                isHeader={node.is_header || false} 
              />
              
              {node.current_balance !== 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="outline" className="text-xs">
                        {formatCurrency(node.current_balance || 0)}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Current Balance</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {!node.is_active && (
                <Badge variant="destructive" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          {(onAccountEdit || onAccountDelete) && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onAccountEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAccountEdit(node)}
                  className="h-7 w-7 p-0"
                >
                  ✏️
                </Button>
              )}
              {onAccountDelete && !node.is_system && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAccountDelete(node)}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                >
                  🗑️
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Chart of Accounts Tree View</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {treeData.map(node => renderTreeNode(node))}
        </div>
      </CardContent>
    </Card>
  );
};