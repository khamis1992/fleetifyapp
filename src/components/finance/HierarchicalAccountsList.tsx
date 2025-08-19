import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, FileText, Edit2, Trash2, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChartOfAccount } from '@/hooks/useChartOfAccounts';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useAuth } from '@/contexts/AuthContext';
import { AccountDeleteConfirmDialog } from '@/components/finance/AccountDeleteConfirmDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HierarchicalAccountsListProps {
  accounts: ChartOfAccount[];
  onAddSubAccount?: (parentAccount: ChartOfAccount) => void;
  onEditAccount?: (account: ChartOfAccount) => void;
  onDeleteAccount?: (account: ChartOfAccount) => void;
  onViewAccount?: (account: ChartOfAccount) => void;
  expandedAccounts?: Set<string>;
  onToggleExpanded?: (accountId: string) => void;
}

export const HierarchicalAccountsList: React.FC<HierarchicalAccountsListProps> = ({
  accounts,
  onAddSubAccount,
  onEditAccount,
  onDeleteAccount,
  onViewAccount,
  expandedAccounts = new Set(),
  onToggleExpanded,
}) => {
  const { user } = useAuth();
  const [localExpanded, setLocalExpanded] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<ChartOfAccount | null>(null);
  const { formatCurrency } = useCurrencyFormatter();

  const handleDeleteClick = (account: ChartOfAccount) => {
    console.log('🔘 [DELETE_CLICK] Account selected for deletion:', {
      id: account.id,
      code: account.account_code,
      name: account.account_name,
      isSystem: account.is_system,
      isActive: account.is_active
    });
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    console.log('✅ [DELETE_SUCCESS] Account deletion completed successfully');
    setAccountToDelete(null);
    setDeleteDialogOpen(false);
  };
  
  // Check if user is super admin or company admin
  const isSuperAdmin = user?.roles?.includes('super_admin');
  const isCompanyAdmin = user?.roles?.includes('company_admin');
  
  const isExpanded = (accountId: string) => {
    return onToggleExpanded ? expandedAccounts.has(accountId) : localExpanded.has(accountId);
  };

  const toggleExpanded = (accountId: string) => {
    if (onToggleExpanded) {
      onToggleExpanded(accountId);
    } else {
      const newExpanded = new Set(localExpanded);
      if (newExpanded.has(accountId)) {
        newExpanded.delete(accountId);
      } else {
        newExpanded.add(accountId);
      }
      setLocalExpanded(newExpanded);
    }
  };

  // Build hierarchy
  const buildHierarchy = (accounts: ChartOfAccount[]) => {
    const accountMap = new Map<string, ChartOfAccount & { children: ChartOfAccount[] }>();
    const rootAccounts: (ChartOfAccount & { children: ChartOfAccount[] })[] = [];

    // First pass: create map with children arrays
    accounts.forEach(account => {
      accountMap.set(account.id, { ...account, children: [] });
    });

    // Second pass: build hierarchy
    accounts.forEach(account => {
      const accountWithChildren = accountMap.get(account.id)!;
      if (account.parent_account_id) {
        const parent = accountMap.get(account.parent_account_id);
        if (parent) {
          parent.children.push(accountWithChildren);
        } else {
          rootAccounts.push(accountWithChildren);
        }
      } else {
        rootAccounts.push(accountWithChildren);
      }
    });

    return rootAccounts;
  };

  const hierarchy = buildHierarchy(accounts);

  const getAccountTypeColor = (type: string): string => {
    switch (type) {
      case 'assets':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'liabilities':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'equity':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'revenue':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'expenses':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAccountTypeLabel = (type: string): string => {
    switch (type) {
      case 'assets':
        return 'أصول';
      case 'liabilities':
        return 'خصوم';
      case 'equity':
        return 'حقوق ملكية';
      case 'revenue':
        return 'إيرادات';
      case 'expenses':
        return 'مصروفات';
      default:
        return type;
    }
  };

  const formatBalance = (balance: number, balanceType: string) => {
    const formattedBalance = formatCurrency(Math.abs(balance), { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    
    const isNormalBalance = 
      (['assets', 'expenses'].includes(balanceType) && balance >= 0) ||
      (['liabilities', 'equity', 'revenue'].includes(balanceType) && balance < 0);
    
    const balanceIcon = balance > 0 ? TrendingUp : balance < 0 ? TrendingDown : null;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-left cursor-help">
              <div className="flex items-center gap-1">
                {balanceIcon && React.createElement(balanceIcon, { 
                  className: cn(
                    "h-3 w-3",
                    isNormalBalance ? "text-success" : "text-destructive"
                  )
                })}
                <span className={cn(
                  "font-mono text-sm font-medium",
                  isNormalBalance ? "text-success" : "text-destructive"
                )}>
                  {formattedBalance}
                </span>
              </div>
              {Math.abs(balance) > 0 && (
                <div className="text-xs text-muted-foreground">
                  {balance >= 0 ? 'مدين' : 'دائن'}
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">تفاصيل الرصيد</p>
              <div className="text-sm space-y-1">
                <p>المبلغ: {formattedBalance}</p>
                <p>طبيعة الرصيد: {balance >= 0 ? 'مدين' : 'دائن'}</p>
                <p>الحالة: {isNormalBalance ? 'رصيد طبيعي' : 'رصيد غير طبيعي'}</p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderAccount = (account: ChartOfAccount & { children: ChartOfAccount[] }, level: number = 0) => {
    const hasChildren = account.children.length > 0;
    const expanded = isExpanded(account.id);
    const paddingLeft = level * 24;

    return (
      <React.Fragment key={account.id}>
        <TableRow className={cn(
          "group hover:bg-muted/50",
          account.is_header && "bg-muted/30 font-medium",
          level > 0 && "border-l-2 border-muted"
        )}>
          <TableCell style={{ paddingLeft: `${16 + paddingLeft}px` }} className="font-medium">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => toggleExpanded(account.id)}
                >
                  {expanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              )}
              {!hasChildren && <div className="w-6" />}
              
              <div className="flex items-center gap-2">
                {account.is_header ? (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-primary/20" />
                )}
                
                <div>
                  <div className="font-medium">{account.account_code}</div>
                  {level > 0 && (
                    <div className="text-xs text-muted-foreground">
                      المستوى {account.account_level}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TableCell>
          
          <TableCell>
            <div>
              <div className="font-medium">{account.account_name}</div>
              {account.account_name_ar && (
                <div className="text-sm text-muted-foreground">
                  {account.account_name_ar}
                </div>
              )}
            </div>
          </TableCell>
          
          <TableCell>
            <Badge 
              variant="outline" 
              className={cn("text-xs", getAccountTypeColor(account.account_type))}
            >
              {getAccountTypeLabel(account.account_type)}
            </Badge>
          </TableCell>
          
          <TableCell>
            <Badge variant={account.balance_type === 'debit' ? 'secondary' : 'default'}>
              {account.balance_type === 'debit' ? 'مدين' : 'دائن'}
            </Badge>
          </TableCell>
          
          <TableCell className="text-left">
            {!account.is_header && formatBalance(account.current_balance || 0, account.account_type)}
          </TableCell>
          
          <TableCell>
            <Badge variant={account.is_active ? 'default' : 'secondary'}>
              {account.is_active ? 'نشط' : 'غير نشط'}
            </Badge>
          </TableCell>
          
          <TableCell>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onViewAccount && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewAccount(account)}
                  className="h-8 w-8 p-0"
                  title="عرض تفاصيل الحساب"
                >
                  <Eye className="h-3 w-3" />
                </Button>
              )}
              {onEditAccount && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditAccount(account)}
                  className="h-8 w-8 p-0"
                  title="تعديل الحساب"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}
              {(!account.is_system || isSuperAdmin || isCompanyAdmin) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteClick(account)}
                  className={cn(
                    "h-8 w-8 p-0 text-destructive hover:text-destructive",
                    account.is_system && (isSuperAdmin || isCompanyAdmin) && "ring-2 ring-destructive ring-opacity-50"
                  )}
                  title={account.is_system 
                    ? (isSuperAdmin ? "حذف حساب نظامي (مدير عام)" : "حذف حساب نظامي (مدير شركة) - تحذير: عملية خطيرة!")
                    : "حذف الحساب"
                  }
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
              {onAddSubAccount && !account.is_header && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddSubAccount(account)}
                  className="h-8 w-8 p-0"
                  title="إضافة حساب فرعي"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
        
        {hasChildren && expanded && account.children.map((child: ChartOfAccount & { children: ChartOfAccount[] }) => 
          renderAccount(child, level + 1)
        )}
      </React.Fragment>
    );
  };

  if (!accounts.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        لا توجد حسابات للعرض
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">كود الحساب</TableHead>
              <TableHead>اسم الحساب</TableHead>
              <TableHead className="w-32">نوع الحساب</TableHead>
              <TableHead className="w-24">طبيعة الرصيد</TableHead>
              <TableHead className="w-32 text-left">الرصيد الحالي</TableHead>
              <TableHead className="w-24">الحالة</TableHead>
              <TableHead className="w-16">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hierarchy.map(account => renderAccount(account, 0))}
          </TableBody>
        </Table>
      </div>
      
        <AccountDeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            console.log('🔄 [DELETE_DIALOG] Dialog state changed:', {
              open,
              hasAccount: !!accountToDelete,
              accountId: accountToDelete?.id
            });
            setDeleteDialogOpen(open);
          }}
          account={accountToDelete}
          onSuccess={handleDeleteSuccess}
        />
    </>
  );
};