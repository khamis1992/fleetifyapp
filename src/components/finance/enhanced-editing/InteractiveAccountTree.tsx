import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Target, Move, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChartOfAccount } from '@/hooks/useChartOfAccounts';
import { cn } from '@/lib/utils';

interface InteractiveAccountTreeProps {
  accounts: ChartOfAccount[];
  highlightedAccountId?: string;
  selectedParentId?: string;
  onParentSelect?: (parentId: string) => void;
  maxHeight?: string;
}

interface TreeNode {
  account: ChartOfAccount;
  children: TreeNode[];
  level: number;
}

export const InteractiveAccountTree: React.FC<InteractiveAccountTreeProps> = ({
  accounts,
  highlightedAccountId,
  selectedParentId,
  onParentSelect,
  maxHeight = "400px"
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const accountTree = useMemo(() => {
    const buildTree = (parentId: string | null = null, level: number = 0): TreeNode[] => {
      return accounts
        .filter(account => account.parent_account_id === parentId)
        .sort((a, b) => a.account_code.localeCompare(b.account_code))
        .map(account => ({
          account,
          level,
          children: buildTree(account.id, level + 1)
        }));
    };

    return buildTree();
  }, [accounts]);

  const toggleExpanded = (accountId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderTreeNode = (node: TreeNode): React.ReactNode => {
    const { account, children, level } = node;
    const hasChildren = children.length > 0;
    const isExpanded = expandedNodes.has(account.id);
    const isHighlighted = account.id === highlightedAccountId;
    const isSelectedParent = account.id === selectedParentId;
    const canBeParent = account.is_header && account.id !== highlightedAccountId;

    return (
      <div key={account.id} className="select-none">
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 hover:bg-accent/50 rounded-lg transition-colors",
            isHighlighted && "bg-primary/10 border border-primary/20",
            isSelectedParent && "bg-success/10 border border-success/20"
          )}
          style={{ marginRight: `${level * 20}px` }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => toggleExpanded(account.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="w-6" />
          )}

          {/* Account Info */}
          <div className="flex-1 flex items-center gap-3">
            <Badge variant="outline" className="font-mono text-xs">
              {account.account_code}
            </Badge>
            
            <span className={cn(
              "text-sm",
              isHighlighted && "font-bold text-primary",
              isSelectedParent && "font-semibold text-success"
            )}>
              {account.account_name_ar || account.account_name}
            </span>

            {isHighlighted && (
              <Target className="h-4 w-4 text-primary" />
            )}
            
            {isSelectedParent && (
              <CheckCircle2 className="h-4 w-4 text-success" />
            )}
          </div>

          {/* Level Badge */}
          <Badge 
            variant="secondary" 
            className="text-xs"
          >
            مستوى {account.account_level || 1}
          </Badge>

          {/* Select as Parent Button */}
          {canBeParent && onParentSelect && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onParentSelect(account.id)}
              disabled={isSelectedParent}
            >
              {isSelectedParent ? 'محدد' : 'اختيار'}
            </Button>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-1">
            {children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  const findAndExpandPath = (targetAccountId: string) => {
    const newExpanded = new Set<string>();
    
    const findPath = (nodes: TreeNode[], path: string[] = []): boolean => {
      for (const node of nodes) {
        const currentPath = [...path, node.account.id];
        
        if (node.account.id === targetAccountId) {
          // Found target, expand all parents
          path.forEach(id => newExpanded.add(id));
          return true;
        }
        
        if (findPath(node.children, currentPath)) {
          newExpanded.add(node.account.id);
          return true;
        }
      }
      return false;
    };
    
    findPath(accountTree);
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    
    const collectIds = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.children.length > 0) {
          allIds.add(node.account.id);
          collectIds(node.children);
        }
      });
    };
    
    collectIds(accountTree);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Tree Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            توسيع الكل
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            طي الكل
          </Button>
        </div>
        
        {highlightedAccountId && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => findAndExpandPath(highlightedAccountId)}
            className="flex items-center gap-2"
          >
            <Target className="h-4 w-4" />
            إظهار الحساب المحدد
          </Button>
        )}
      </div>

      {/* Tree View */}
      <ScrollArea className="border rounded-lg p-2" style={{ height: maxHeight }}>
        <div className="space-y-1" dir="rtl">
          {accountTree.length > 0 ? (
            accountTree.map(node => renderTreeNode(node))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد حسابات للعرض
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
        <div className="flex items-center gap-2">
          <Target className="h-3 w-3 text-primary" />
          <span>الحساب الحالي المحدد للتعديل</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3 w-3 text-success" />
          <span>الحساب الأب المختار</span>
        </div>
        <div className="flex items-center gap-2">
          <Move className="h-3 w-3" />
          <span>يمكن اختياره كحساب أب (الحسابات الرئيسية فقط)</span>
        </div>
      </div>
    </div>
  );
};