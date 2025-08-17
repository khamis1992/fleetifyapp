import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Network, 
  TreePine, 
  Search, 
  Maximize2, 
  Minimize2,
  ChevronRight,
  ChevronDown,
  Layers,
  FileText,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { ChartOfAccount } from '@/hooks/useChartOfAccounts';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface EnhancedAccountsVisualizationProps {
  onSelectAccount?: (account: ChartOfAccount) => void;
  selectedAccountId?: string;
}

interface TreeNode extends ChartOfAccount {
  children: TreeNode[];
  level: number;
}

export const EnhancedAccountsVisualization: React.FC<EnhancedAccountsVisualizationProps> = ({
  onSelectAccount,
  selectedAccountId,
}) => {
  const { data: accounts, isLoading } = useChartOfAccounts();
  const { formatCurrency } = useCurrencyFormatter();
  
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(false);

  // Build hierarchical tree
  const accountTree = useMemo(() => {
    if (!accounts) return [];
    
    const filteredAccounts = accounts.filter(account => {
      const matchesSearch = !searchTerm || 
        account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (account.account_name_ar && account.account_name_ar.includes(searchTerm));
      
      const matchesType = filterType === 'all' || account.account_type === filterType;
      const matchesActive = showInactiveAccounts || account.is_active;
      
      return matchesSearch && matchesType && matchesActive;
    });

    const buildTree = (parentId: string | null = null, level: number = 0): TreeNode[] => {
      return filteredAccounts
        .filter(account => account.parent_account_id === parentId)
        .map(account => ({
          ...account,
          level,
          children: buildTree(account.id, level + 1),
        }))
        .sort((a, b) => a.account_code.localeCompare(b.account_code));
    };

    return buildTree();
  }, [accounts, searchTerm, filterType, showInactiveAccounts]);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    if (!accounts) return;
    const allIds = new Set(accounts.map(account => account.id));
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const getAccountTypeColor = (type: string) => {
    const colors = {
      assets: 'text-blue-600 bg-blue-50 border-blue-200',
      liabilities: 'text-red-600 bg-red-50 border-red-200',
      equity: 'text-purple-600 bg-purple-50 border-purple-200',
      revenue: 'text-green-600 bg-green-50 border-green-200',
      expenses: 'text-orange-600 bg-orange-50 border-orange-200',
    };
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getAccountTypeLabel = (type: string) => {
    const labels = {
      assets: 'أصول',
      liabilities: 'خصوم',
      equity: 'حقوق ملكية',
      revenue: 'إيرادات',
      expenses: 'مصروفات',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const renderTreeNode = (node: TreeNode): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedAccountId === node.id;
    const paddingLeft = node.level * 20;

    return (
      <div key={node.id} className="select-none">
        <div 
          className={`
            flex items-center p-2 rounded-lg cursor-pointer transition-colors
            hover:bg-muted/50 group
            ${isSelected ? 'bg-primary/10 border border-primary/20' : ''}
          `}
          style={{ paddingLeft: `${paddingLeft + 12}px` }}
          onClick={() => onSelectAccount?.(node)}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 mr-2"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-8 mr-2" />
          )}

          {/* Account Icon */}
          <div className="mr-2">
            {node.is_header ? (
              <FileText className="h-4 w-4 text-muted-foreground" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-primary/20" />
            )}
          </div>

          {/* Account Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium">
                {node.account_code}
              </span>
              <span className="font-medium truncate">
                {node.account_name_ar || node.account_name}
              </span>
              {!node.is_active && (
                <Badge variant="secondary" className="text-xs">
                  غير نشط
                </Badge>
              )}
            </div>
            
            {node.account_name_ar && (
              <div className="text-xs text-muted-foreground truncate">
                {node.account_name}
              </div>
            )}
          </div>

          {/* Account Metadata */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Badge variant="outline" className={`text-xs ${getAccountTypeColor(node.account_type)}`}>
              {getAccountTypeLabel(node.account_type)}
            </Badge>
            
            <Badge variant="secondary" className="text-xs">
              <Layers className="h-3 w-3 mr-1" />
              {node.account_level}
            </Badge>

            {!node.is_header && node.current_balance !== 0 && (
              <div className="text-xs font-mono">
                {node.current_balance > 0 ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };


  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          عرض تفاعلي لدليل الحسابات
        </CardTitle>
        <CardDescription>
          استكشف دليل الحسابات بطرق مختلفة مع إمكانيات البحث والتصفية المتقدمة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في الحسابات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              <SelectItem value="assets">الأصول</SelectItem>
              <SelectItem value="liabilities">الخصوم</SelectItem>
              <SelectItem value="equity">حقوق الملكية</SelectItem>
              <SelectItem value="revenue">الإيرادات</SelectItem>
              <SelectItem value="expenses">المصروفات</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInactiveAccounts(!showInactiveAccounts)}
            className="flex items-center gap-2"
          >
            {showInactiveAccounts ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {showInactiveAccounts ? 'إخفاء' : 'إظهار'} غير النشط
          </Button>
        </div>

        {/* Tree View Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TreePine className="h-4 w-4" />
            <span className="font-medium">العرض الشجري</span>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              <Maximize2 className="h-4 w-4 mr-1" />
              توسيع الكل
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              <Minimize2 className="h-4 w-4 mr-1" />
              طي الكل
            </Button>
          </div>
        </div>

        {/* Tree View */}
        <ScrollArea className="h-[600px] w-full border rounded-lg p-2">
          <div className="space-y-1">
            {accountTree.map(node => renderTreeNode(node))}
          </div>
        </ScrollArea>

        {/* Selected Account Info */}
        {selectedAccountId && accounts && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              {(() => {
                const account = accounts.find(a => a.id === selectedAccountId);
                if (!account) return null;
                
                return (
                  <div className="space-y-2">
                    <div className="font-medium">الحساب المحدد:</div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-mono">{account.account_code}</span>
                      <span>{account.account_name_ar || account.account_name}</span>
                      <Badge variant="outline" className={getAccountTypeColor(account.account_type)}>
                        {getAccountTypeLabel(account.account_type)}
                      </Badge>
                      <Badge variant="secondary">مستوى {account.account_level}</Badge>
                    </div>
                    {!account.is_header && account.current_balance !== 0 && (
                      <div className="text-sm">
                        الرصيد الحالي: {formatCurrency(account.current_balance)}
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};