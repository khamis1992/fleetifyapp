import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen, 
  FileText,
  Layers,
  Eye,
  Edit,
  Trash2,
  Plus,
  BarChart3,
  Search
} from 'lucide-react';

interface AccountNode {
  id: string;
  accountCode: string;
  accountName: string;
  accountNameAr?: string;
  level: number;
  parentId?: string;
  children: AccountNode[];
  accountType: string;
  balanceType: string;
  isHeader: boolean;
  isActive: boolean;
  isSystem: boolean;
}

interface AccountsTreeViewProps {
  accounts: any[];
  onViewAccount?: (account: any) => void;
  onEditAccount?: (account: any) => void;
  onDeleteAccount?: (account: any) => void;
  onAddChildAccount?: (parentAccount: any) => void;
  onViewStatement?: (account: any) => void;
}

export const AccountsTreeView: React.FC<AccountsTreeViewProps> = ({
  accounts,
  onViewAccount,
  onEditAccount,
  onDeleteAccount,
  onAddChildAccount,
  onViewStatement
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Filter accounts based on search term
  const filteredAccounts = useMemo(() => {
    if (!accounts || accounts.length === 0) return [];
    
    if (!searchTerm) return accounts;
    
    return accounts.filter(account => {
      const accountName = account.account_name || '';
      const accountNameAr = account.account_name_ar || '';
      const accountCode = account.account_code || '';
      
      return (
        accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        accountNameAr.includes(searchTerm) ||
        accountCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [accounts, searchTerm]);

  // Build tree structure from filtered accounts data
  const treeData = useMemo(() => {
    if (!filteredAccounts || filteredAccounts.length === 0) {
      return [];
    }
    


    // Create nodes from filtered accounts data
    const nodes: AccountNode[] = filteredAccounts.map(account => ({
      id: account.id,
      accountCode: account.account_code,
      accountName: account.account_name,
      accountNameAr: account.account_name_ar,
      level: account.account_level || 1,
      parentId: account.parent_account_id,
      children: [],
      accountType: account.account_type,
      balanceType: account.balance_type,
      isHeader: account.is_header || false,
      isActive: account.is_active !== false,
      isSystem: account.is_system || false
    }));

    // Sort nodes by account code to ensure proper hierarchy
    nodes.sort((a, b) => {
      const aNum = parseFloat(a.accountCode) || 0;
      const bNum = parseFloat(b.accountCode) || 0;
      return aNum - bNum;
    });

    // Build hierarchy using parent relationships
    const nodeMap = new Map<string, AccountNode>();
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });

    const rootNodes: AccountNode[] = [];

    nodes.forEach(node => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        const parent = nodeMap.get(node.parentId)!;
        parent.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    // Sort children recursively
    const sortChildren = (nodes: AccountNode[]) => {
      nodes.forEach(node => {
        node.children.sort((a, b) => {
          const aNum = parseFloat(a.accountCode) || 0;
          const bNum = parseFloat(b.accountCode) || 0;
          return aNum - bNum;
        });
        sortChildren(node.children);
      });
    };

    sortChildren(rootNodes);
    return rootNodes;
  }, [filteredAccounts]);

  const toggleExpanded = (accountId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (nodes: AccountNode[]) => {
      nodes.forEach(node => {
        if (node.children.length > 0) {
          allIds.add(node.id);
          collectIds(node.children);
        }
      });
    };
    collectIds(treeData);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const getAccountTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'assets': 'الأصول',
      'liabilities': 'الالتزامات',
      'equity': 'حقوق الملكية',
      'revenue': 'الإيرادات',
      'expenses': 'المصروفات'
    };
    return labels[type] || type;
  };

  const renderNode = (node: AccountNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const indentLevel = depth * 24;

    return (
      <div key={node.id} className="select-none">
        <div 
          className={`
            flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-slate-50 transition-colors
            ${!node.isActive ? 'opacity-60 bg-slate-100' : ''}
            ${node.isSystem ? 'bg-blue-50 border border-blue-200' : ''}
          `}
          style={{ paddingRight: `${indentLevel + 8}px` }}
          onClick={() => hasChildren && toggleExpanded(node.id)}
        >
          {/* Expand/Collapse Icon */}
          <div className="w-4 h-4 flex items-center justify-center">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-600" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
          </div>

          {/* Node Icon */}
          <div className="w-4 h-4 flex items-center justify-center">
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-blue-600" />
              ) : (
                <Folder className="h-4 w-4 text-blue-600" />
              )
            ) : (
              <FileText className="h-4 w-4 text-slate-600" />
            )}
          </div>

          {/* Account Code */}
          <Badge variant="outline" className="font-mono text-xs">
            {node.accountCode}
          </Badge>

          {/* Account Name */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">
                {node.accountNameAr || node.accountName}
              </span>
              {node.accountName && node.accountNameAr && (
                <span className="text-sm text-slate-500 truncate">
                  ({node.accountName})
                </span>
              )}
            </div>
          </div>

          {/* Account Type */}
          <Badge variant="outline" className="text-xs">
            {getAccountTypeLabel(node.accountType)}
          </Badge>

          {/* Level Badge */}
          <Badge variant="secondary" className="text-xs">
            مستوى {node.level}
          </Badge>

          {/* Balance Type */}
          <Badge variant={node.balanceType === 'debit' ? 'default' : 'secondary'} className="text-xs">
            {node.balanceType === 'debit' ? 'مدين' : 'دائن'}
          </Badge>

          {/* Status Badge */}
          <Badge variant={node.isActive ? 'default' : 'destructive'} className="text-xs">
            {node.isActive ? 'نشط' : 'غير نشط'}
          </Badge>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {onViewAccount && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewAccount(node);
                }}
                title="معاينة"
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
            
            {onViewStatement && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewStatement(node);
                }}
                title="كشف الحساب"
              >
                <BarChart3 className="h-3 w-3" />
              </Button>
            )}
            
            {onEditAccount && !node.isSystem && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  // Convert AccountNode to ChartOfAccount format
                  const convertedAccount = {
                    id: node.id,
                    account_code: node.accountCode,
                    account_name: node.accountName,
                    account_name_ar: node.accountNameAr,
                    account_type: node.accountType,
                    balance_type: node.balanceType,
                    account_level: node.level,
                    parent_account_id: node.parentId,
                    is_header: node.isHeader,
                    is_active: node.isActive,
                    is_system: node.isSystem
                  };
                  onEditAccount(convertedAccount);
                }}
                title="تعديل"
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
            
            {onDeleteAccount && !node.isSystem && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAccount(node);
                }}
                title="حذف"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            
            {onAddChildAccount && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChildAccount(node);
                }}
                title="إضافة حساب فرعي"
              >
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const totalNodes = accounts.length;
  const activeNodes = accounts.filter(acc => acc.is_active !== false).length;
  const inactiveNodes = totalNodes - activeNodes;
  const systemNodes = accounts.filter(acc => acc.is_system).length;

  if (totalNodes === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Layers className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-slate-600">لا توجد حسابات لعرضها</p>
          <p className="text-sm text-slate-500">قم بإضافة حسابات جديدة لعرض الشجرة</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          شجرة الحسابات
        </CardTitle>
        <CardDescription>
          عرض هرمي للحسابات مع إمكانية التعديل والإدارة
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              توسيع الكل
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              طي الكل
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <FileText className="h-3 w-3 text-green-600" />
              نشط: {activeNodes}
            </Badge>
            {inactiveNodes > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                غير نشط: {inactiveNodes}
              </Badge>
            )}
            {systemNodes > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <FileText className="h-3 w-3 text-blue-600" />
                نظام: {systemNodes}
              </Badge>
            )}
            <Badge variant="secondary">
              إجمالي: {totalNodes}
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="البحث في الحسابات (الاسم، الرمز، أو رقم الحساب)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-right"
            dir="rtl"
          />
        </div>

        {/* Tree */}
        <div className="border rounded-lg bg-white">
          <div className="max-h-96 overflow-auto p-2">
            {treeData.length > 0 ? (
              <div className="space-y-1">
                {treeData.map(node => renderNode(node))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                لا توجد حسابات صالحة لعرضها
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="text-sm text-slate-600 space-y-1">
          <p className="font-medium">دليل الرموز:</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1">
              <Folder className="h-4 w-4 text-blue-600" />
              <span>حساب رئيسي</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4 text-slate-600" />
              <span>حساب فرعي</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">نشط</Badge>
              <span>حساب نشط</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="destructive" className="text-xs">غير نشط</Badge>
              <span>حساب غير نشط</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs bg-blue-50">نظام</Badge>
              <span>حساب نظام</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
