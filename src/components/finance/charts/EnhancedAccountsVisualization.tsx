import React, { useState, useMemo, useCallback } from 'react';
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
  EyeOff,
  Move,
  AlertCircle
} from 'lucide-react';
import { useChartOfAccounts, useUpdateAccount } from '@/hooks/useChartOfAccounts';
import { ChartOfAccount } from '@/hooks/useChartOfAccounts';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useToast } from '@/hooks/use-toast';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';

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
  const updateAccount = useUpdateAccount();
  const { toast } = useToast();
  
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(false);
  
  // Drag and Drop states
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragMode, setIsDragMode] = useState(false);
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Drag and Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsDragMode(true);
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setIsDragMode(false);
    
    if (!over || !accounts) return;
    
    const draggedAccountId = active.id as string;
    const targetParentId = over.id as string;
    const draggedAccount = accounts.find(acc => acc.id === draggedAccountId);
    const targetParent = accounts.find(acc => acc.id === targetParentId);
    
    if (!draggedAccount || !targetParent) return;
    
    // Validation checks
    if (draggedAccountId === targetParentId) {
      toast({
        title: "خطأ في العملية",
        description: "لا يمكن نقل الحساب إلى نفسه",
        variant: "destructive",
      });
      return;
    }
    
    // Check if target is a child of dragged account (prevent circular reference)
    const isCircularReference = (checkId: string, parentId: string): boolean => {
      const account = accounts.find(acc => acc.id === checkId);
      if (!account || !account.parent_account_id) return false;
      if (account.parent_account_id === parentId) return true;
      return isCircularReference(account.parent_account_id, parentId);
    };
    
    if (isCircularReference(targetParentId, draggedAccountId)) {
      toast({
        title: "خطأ في العملية",
        description: "لا يمكن نقل الحساب إلى حساب فرعي منه",
        variant: "destructive",
      });
      return;
    }
    
    // Check if account is system account
    if (draggedAccount.is_system) {
      toast({
        title: "عملية غير مسموحة",
        description: "لا يمكن تعديل الحسابات النظامية",
        variant: "destructive",
      });
      return;
    }
    
    // Calculate new level
    const newLevel = targetParent.account_level + 1;
    
    try {
      await updateAccount.mutateAsync({
        id: draggedAccountId,
        updates: {
          parent_account_id: targetParentId,
          account_level: newLevel,
        }
      });
      
      toast({
        title: "تم التحديث بنجاح",
        description: `تم نقل الحساب "${draggedAccount.account_name_ar || draggedAccount.account_name}" إلى "${targetParent.account_name_ar || targetParent.account_name}"`,
      });
      
      // Expand target parent to show the moved account
      setExpandedNodes(prev => new Set([...prev, targetParentId]));
    } catch (error) {
      toast({
        title: "خطأ في التحديث",
        description: "حدث خطأ أثناء نقل الحساب",
        variant: "destructive",
      });
    }
  }, [accounts, updateAccount, toast]);

  // Draggable Account Node Component
  const DraggableAccountNode: React.FC<{ account: TreeNode; children: React.ReactNode }> = ({ 
    account, 
    children 
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      isDragging,
    } = useDraggable({
      id: account.id,
      disabled: false, // Allow dragging for all accounts
    });

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`${isDragging ? 'opacity-50 z-50' : ''} transition-opacity`}
        {...attributes}
      >
        <div className="flex items-center">
          <div
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted/50 rounded transition-colors ml-2"
            title="اسحب لنقل الحساب"
          >
            <Move className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    );
  };

  // Droppable Account Node Component
  const DroppableAccountNode: React.FC<{ account: TreeNode; children: React.ReactNode }> = ({ 
    account, 
    children 
  }) => {
    const {
      isOver,
      setNodeRef,
    } = useDroppable({
      id: account.id,
      disabled: false, // Allow dropping on all accounts
    });

    return (
      <div
        ref={setNodeRef}
        className={`${
          isOver ? 'bg-primary/10 border-2 border-primary/30 border-dashed rounded-lg' : ''
        } transition-all duration-200`}
      >
        {children}
      </div>
    );
  };

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
    const paddingRight = node.level * 20;

    const nodeContent = (
      <div 
        className={`
          flex items-center p-2 rounded-lg cursor-pointer transition-colors
          hover:bg-muted/50 group
          ${isSelected ? "bg-primary/10 border border-primary/20" : ""}
        `}
        style={{ paddingRight: `${paddingRight + 12}px` }}
        onClick={() => onSelectAccount?.(node)}
        dir="rtl"
      >
        {/* Account Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 justify-start">
            <span className="font-medium truncate">
              {node.account_name_ar || node.account_name}
            </span>
            <span className="font-mono text-sm font-medium">
              {node.account_code}
            </span>
            {!node.is_active && (
              <Badge variant="secondary" className="text-xs">
                غير نشط
              </Badge>
            )}
            {node.is_system && (
              <Badge variant="outline" className="text-xs">
                نظامي
              </Badge>
            )}
          </div>
          
          {node.account_name_ar && (
            <div className="text-xs text-muted-foreground truncate text-right">
              {node.account_name}
            </div>
          )}
        </div>

        {/* Account Metadata */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          <Badge variant="outline" className={`text-xs ${getAccountTypeColor(node.account_type)}`}>
            {getAccountTypeLabel(node.account_type)}
          </Badge>
          
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <span>{node.account_level}</span>
            <Layers className="h-3 w-3" />
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

        {/* Account Icon */}
        <div className="ml-2">
          {node.is_header ? (
            <FileText className="h-4 w-4 text-muted-foreground" />
          ) : (
            <div className="w-4 h-4 rounded-full bg-primary/20" />
          )}
        </div>

        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 ml-2"
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
          <div className="w-8 ml-2" />
        )}
      </div>
    );

    return (
      <div key={node.id} className="select-none">
        <DroppableAccountNode account={node}>
          <DraggableAccountNode account={node}>
            {nodeContent}
          </DraggableAccountNode>
        </DroppableAccountNode>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  // Get dragged account for overlay
  const activeAccount = useMemo(() => {
    if (!activeId || !accounts) return null;
    return accounts.find(account => account.id === activeId);
  }, [activeId, accounts]);


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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-right">
            <Network className="h-5 w-5" />
            عرض تفاعلي لدليل الحسابات
          </CardTitle>
          <CardDescription className="text-right">
            استكشف دليل الحسابات بطرق مختلفة مع إمكانيات البحث والتصفية المتقدمة - اسحب الحسابات لتغيير مستواها
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4" dir="rtl">
          {/* Drag Mode Indicator */}
          {isDragMode && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Move className="h-4 w-4" />
                <span className="font-medium">اسحب الحساب إلى الحساب الرئيسي المطلوب</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap gap-2" dir="rtl">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في الحسابات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 text-right"
                  dir="rtl"
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
              dir="rtl"
            >
              {showInactiveAccounts ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span>{showInactiveAccounts ? "إخفاء" : "إظهار"} غير النشط</span>
            </Button>
          </div>

          {/* Tree View Controls */}
          <div className="flex items-center justify-between" dir="rtl">
            <div className="flex items-center gap-2">
              <TreePine className="h-4 w-4" />
              <span className="font-medium">العرض الشجري</span>
              <Badge variant="outline" className="text-xs">
                سحب وإفلات
              </Badge>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll} className="flex items-center gap-2">
                <Maximize2 className="h-4 w-4" />
                <span>توسيع الكل</span>
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll} className="flex items-center gap-2">
                <Minimize2 className="h-4 w-4" />
                <span>طي الكل</span>
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <div className="font-medium">تعليمات السحب والإفلات:</div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>اضغط على أيقونة السحب {<Move className="inline h-3 w-3" />} بجانب اسم الحساب</li>
                  <li>اسحب الحساب إلى أي حساب آخر لجعله حساباً فرعياً منه</li>
                  <li>يمكن السحب والإفلات على جميع المستويات والحسابات</li>
                  <li>يمكن سحب جميع الحسابات بما في ذلك النظامية وغير النشطة</li>
                  <li>لا يمكن نقل الحساب إلى حساب فرعي منه لتجنب التداخل الدائري</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Tree View */}
          <ScrollArea className="h-[600px] w-full border rounded-lg p-2" dir="rtl">
            <div className="space-y-1">
              {accountTree.map(node => renderTreeNode(node))}
            </div>
          </ScrollArea>

          {/* Selected Account Info */}
          {selectedAccountId && accounts && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4" dir="rtl">
                {(() => {
                  const account = accounts.find(a => a.id === selectedAccountId);
                  if (!account) return null;
                  
                  return (
                    <div className="space-y-2">
                      <div className="font-medium text-right">الحساب المحدد:</div>
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <span className="font-mono">{account.account_code}</span>
                        <span className="font-medium">{account.account_name_ar || account.account_name}</span>
                        <Badge variant="outline" className={getAccountTypeColor(account.account_type)}>
                          {getAccountTypeLabel(account.account_type)}
                        </Badge>
                        <Badge variant="secondary">مستوى {account.account_level}</Badge>
                      </div>
                      {!account.is_header && account.current_balance !== 0 && (
                        <div className="text-sm text-right">
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

      {/* Drag Overlay */}
      <DragOverlay>
        {activeAccount && (
          <div className="bg-background border border-primary/50 rounded-lg p-2 shadow-lg opacity-90">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {activeAccount.account_name_ar || activeAccount.account_name}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {activeAccount.account_code}
              </span>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};