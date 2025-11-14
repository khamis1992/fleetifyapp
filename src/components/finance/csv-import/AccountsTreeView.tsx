import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen, 
  FileText,
  AlertTriangle,
  CheckCircle,
  Layers
} from 'lucide-react';

interface AccountNode {
  accountCode: string;
  accountName: string;
  accountNameAr?: string;
  level: number;
  parentCode?: string;
  children: AccountNode[];
  hasError?: boolean;
  errorMessage?: string;
  rowNumber?: number;
}

interface AccountsTreeViewProps {
  data: unknown[]; // البيانات المعالجة من الـ Hook
  hierarchyErrors?: Array<{ accountCode: string; message: string; rowNumber: number }>;
}

export const AccountsTreeView: React.FC<AccountsTreeViewProps> = ({
  data,
  hierarchyErrors = []
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Create error map for quick lookup
  const errorMap = useMemo(() => {
    const map = new Map<string, { message: string; rowNumber: number }>();
    hierarchyErrors.forEach(error => {
      map.set(error.accountCode, { message: error.message, rowNumber: error.rowNumber });
    });
    return map;
  }, [hierarchyErrors]);

  // Build tree structure from processed data
  const treeData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Create nodes from processed data
    const nodes: AccountNode[] = data.map(account => {
      const error = errorMap.get(account.account_code);

      return {
        accountCode: account.account_code,
        accountName: account.account_name,
        accountNameAr: account.account_name_ar,
        level: account.account_level || 1,
        parentCode: account.parent_account_code,
        children: [],
        hasError: !!error,
        errorMessage: error?.message,
        rowNumber: error?.rowNumber || account._rowNumber
      };
    });

    // Sort nodes by account code to ensure proper hierarchy
    nodes.sort((a, b) => {
      const aNum = parseFloat(a.accountCode) || 0;
      const bNum = parseFloat(b.accountCode) || 0;
      return aNum - bNum;
    });

    // Build hierarchy using the processed parent relationships
    const nodeMap = new Map<string, AccountNode>();
    nodes.forEach(node => {
      nodeMap.set(node.accountCode, node);
    });

    const rootNodes: AccountNode[] = [];

    nodes.forEach(node => {
      if (node.parentCode && nodeMap.has(node.parentCode)) {
        const parent = nodeMap.get(node.parentCode)!;
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
  }, [data, errorMap]);

  const toggleExpanded = (accountCode: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountCode)) {
        newSet.delete(accountCode);
      } else {
        newSet.add(accountCode);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allCodes = new Set<string>();
    const collectCodes = (nodes: AccountNode[]) => {
      nodes.forEach(node => {
        if (node.children.length > 0) {
          allCodes.add(node.accountCode);
          collectCodes(node.children);
        }
      });
    };
    collectCodes(treeData);
    setExpandedNodes(allCodes);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const renderNode = (node: AccountNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.accountCode);
    const hasChildren = node.children.length > 0;
    const indentLevel = depth * 24;

    return (
      <div key={node.accountCode} className="select-none">
        <div 
          className={`
            flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 transition-colors
            ${node.hasError ? 'bg-red-50 border border-red-200' : ''}
          `}
          style={{ paddingRight: `${indentLevel + 8}px` }}
          onClick={() => hasChildren && toggleExpanded(node.accountCode)}
        >
          {/* Expand/Collapse Icon */}
          <div className="w-4 h-4 flex items-center justify-center">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
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
              <FileText className="h-4 w-4 text-gray-600" />
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
                <span className="text-sm text-gray-500 truncate">
                  ({node.accountName})
                </span>
              )}
            </div>
          </div>

          {/* Status Icon */}
          <div className="flex items-center gap-1">
            {node.hasError ? (
              <div className="flex items-center gap-1" title={node.errorMessage}>
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-xs text-red-600">خطأ</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-xs text-green-600">صحيح</span>
              </div>
            )}
          </div>

          {/* Level Badge */}
          <Badge variant="secondary" className="text-xs">
            مستوى {node.level}
          </Badge>

          {/* Parent Code (for debugging) */}
          {node.parentCode && (
            <Badge variant="outline" className="text-xs">
              أب: {node.parentCode}
            </Badge>
          )}
        </div>

        {/* Error Message */}
        {node.hasError && node.errorMessage && (
          <div 
            className="text-xs text-red-600 bg-red-50 p-2 mx-2 mb-1 rounded border border-red-200"
            style={{ marginRight: `${indentLevel + 32}px` }}
          >
            <strong>صف {node.rowNumber}:</strong> {node.errorMessage}
          </div>
        )}

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const totalNodes = data.length;
  const errorNodes = hierarchyErrors.length;
  const validNodes = totalNodes - errorNodes;

  if (totalNodes === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-600">لا توجد بيانات لعرض الشجرة</p>
          <p className="text-sm text-gray-500">قم برفع ملف CSV لعرض شجرة الحسابات</p>
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
          عرض هرمي للحسابات مع التحقق من صحة العلاقات
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
              <CheckCircle className="h-3 w-3 text-green-600" />
              صحيح: {validNodes}
            </Badge>
            {errorNodes > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                أخطاء: {errorNodes}
              </Badge>
            )}
            <Badge variant="secondary">
              إجمالي: {totalNodes}
            </Badge>
          </div>
        </div>

        {/* Tree */}
        <div className="border rounded-lg bg-white">
          <div className="max-h-96 overflow-auto p-2">
            {treeData.length > 0 ? (
              <div className="space-y-1">
                {treeData.map(node => renderNode(node))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                لا توجد حسابات صالحة لعرضها
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="text-sm text-gray-600 space-y-1">
          <p className="font-medium">دليل الرموز:</p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1">
              <Folder className="h-4 w-4 text-blue-600" />
              <span>حساب رئيسي</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4 text-gray-600" />
              <span>حساب فرعي</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>صحيح</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span>خطأ في التسلسل</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
