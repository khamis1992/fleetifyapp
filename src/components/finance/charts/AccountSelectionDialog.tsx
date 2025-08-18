import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Check, 
  X, 
  Info, 
  Star, 
  Shield,
  TrendingUp,
  DollarSign,
  Building,
  Users
} from 'lucide-react';
import { AccountTemplate, BusinessTypeAccounts } from '@/hooks/useBusinessTypeAccounts';

interface AccountSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: BusinessTypeAccounts;
  templateName: string;
  onApply: (selectedAccounts: AccountTemplate[]) => void;
  isApplying?: boolean;
}

export const AccountSelectionDialog: React.FC<AccountSelectionDialogProps> = ({
  open,
  onOpenChange,
  accounts,
  templateName,
  onApply,
  isApplying = false
}) => {
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('assets');

  // Flatten all accounts for easy access
  const allAccounts = useMemo(() => {
    return [
      ...accounts.assets,
      ...accounts.liabilities,
      ...accounts.revenue,
      ...accounts.expenses,
      ...accounts.equity
    ];
  }, [accounts]);

  // Reset selection when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSelectedAccountIds(new Set());
      setSearchTerm('');
      setActiveTab('assets');
    }
  }, [open]);

  const filteredAccounts = useMemo(() => {
    if (!searchTerm) return accounts;
    
    const filterAccountList = (accountList: AccountTemplate[]) =>
      accountList.filter(acc =>
        acc.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.code.includes(searchTerm)
      );

    return {
      assets: filterAccountList(accounts.assets),
      liabilities: filterAccountList(accounts.liabilities),
      revenue: filterAccountList(accounts.revenue),
      expenses: filterAccountList(accounts.expenses),
      equity: filterAccountList(accounts.equity)
    };
  }, [accounts, searchTerm]);

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'assets': return <Building className="h-4 w-4" />;
      case 'liabilities': return <TrendingUp className="h-4 w-4" />;
      case 'revenue': return <DollarSign className="h-4 w-4" />;
      case 'expenses': return <Users className="h-4 w-4" />;
      case 'equity': return <Shield className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'assets': return 'الأصول';
      case 'liabilities': return 'الخصوم';
      case 'revenue': return 'الإيرادات';
      case 'expenses': return 'المصروفات';
      case 'equity': return 'حقوق الملكية';
      default: return type;
    }
  };

  const toggleAccount = (accountId: string) => {
    const newSelection = new Set(selectedAccountIds);
    if (newSelection.has(accountId)) {
      newSelection.delete(accountId);
    } else {
      newSelection.add(accountId);
    }
    setSelectedAccountIds(newSelection);
  };

  const selectAll = () => {
    const allIds = new Set(allAccounts.map(acc => acc.id));
    setSelectedAccountIds(allIds);
  };

  const selectEssential = () => {
    const essentialIds = new Set(
      allAccounts.filter(acc => acc.essential).map(acc => acc.id)
    );
    setSelectedAccountIds(essentialIds);
  };

  const selectRecommended = () => {
    const recommendedIds = new Set(
      allAccounts.filter(acc => acc.essential || acc.recommended).map(acc => acc.id)
    );
    setSelectedAccountIds(recommendedIds);
  };

  const clearSelection = () => {
    setSelectedAccountIds(new Set());
  };

  const handleApply = () => {
    const selectedAccounts = allAccounts.filter(acc => selectedAccountIds.has(acc.id));
    onApply(selectedAccounts);
  };

  const renderAccountList = (accountList: AccountTemplate[], type: string) => (
    <div className="space-y-2">
      {accountList.map((account) => (
        <div
          key={account.id}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        selectedAccountIds.has(account.id) 
          ? 'bg-primary/10 border-primary/30' 
          : 'bg-card hover:bg-muted/50 border-border'
      }`}
          dir="rtl"
        >
          <Checkbox
            id={account.id}
            checked={selectedAccountIds.has(account.id)}
            onCheckedChange={() => toggleAccount(account.id)}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{account.nameAr}</span>
              {account.essential && (
                <Badge variant="destructive" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  أساسي
                </Badge>
              )}
              {account.recommended && !account.essential && (
                <Badge variant="secondary" className="text-xs">
                  موصى به
                </Badge>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <span>الكود: {account.code}</span>
                <span>•</span>
                <span>{account.nameEn}</span>
              </div>
              <div>{account.description}</div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {getAccountTypeIcon(type)}
          </div>
        </div>
      ))}
    </div>
  );

  const statistics = {
    total: allAccounts.length,
    selected: selectedAccountIds.size,
    essential: allAccounts.filter(acc => acc.essential).length,
    recommended: allAccounts.filter(acc => acc.recommended).length
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[70vh] bg-background border shadow-lg z-50" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Info className="h-5 w-5" />
            اختيار الحسابات من قالب: {templateName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full space-y-4">
          {/* Search and Quick Actions */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في الحسابات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-right bg-background"
                dir="rtl"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={selectAll}>
                <Check className="h-3 w-3 ml-1" />
                تحديد الكل
              </Button>
              <Button size="sm" variant="outline" onClick={selectEssential}>
                <Star className="h-3 w-3 ml-1" />
                الأساسية فقط
              </Button>
              <Button size="sm" variant="outline" onClick={selectRecommended}>
                الموصى بها
              </Button>
              <Button size="sm" variant="outline" onClick={clearSelection}>
                <X className="h-3 w-3 ml-1" />
                إلغاء التحديد
              </Button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-4 gap-4 p-3 bg-muted/30 border rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold text-primary">{statistics.selected}</div>
                <div className="text-xs text-muted-foreground">محدد</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{statistics.total}</div>
                <div className="text-xs text-muted-foreground">الإجمالي</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-destructive">{statistics.essential}</div>
                <div className="text-xs text-muted-foreground">أساسي</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">{statistics.recommended}</div>
                <div className="text-xs text-muted-foreground">موصى به</div>
              </div>
            </div>
          </div>

          <Alert className="bg-muted/20 border">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-right">
              الحسابات الأساسية مطلوبة لضمان عمل النظام بشكل صحيح. يمكنك إلغاء تحديد الحسابات غير المرغوب فيها.
            </AlertDescription>
          </Alert>

          {/* Account Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-5 bg-muted/50 shrink-0">
              <TabsTrigger value="assets" className="flex items-center gap-1 data-[state=active]:bg-background">
                <Building className="h-3 w-3" />
                الأصول ({filteredAccounts.assets.length})
              </TabsTrigger>
              <TabsTrigger value="liabilities" className="flex items-center gap-1 data-[state=active]:bg-background">
                <TrendingUp className="h-3 w-3" />
                الخصوم ({filteredAccounts.liabilities.length})
              </TabsTrigger>
              <TabsTrigger value="revenue" className="flex items-center gap-1 data-[state=active]:bg-background">
                <DollarSign className="h-3 w-3" />
                الإيرادات ({filteredAccounts.revenue.length})
              </TabsTrigger>
              <TabsTrigger value="expenses" className="flex items-center gap-1 data-[state=active]:bg-background">
                <Users className="h-3 w-3" />
                المصروفات ({filteredAccounts.expenses.length})
              </TabsTrigger>
              <TabsTrigger value="equity" className="flex items-center gap-1 data-[state=active]:bg-background">
                <Shield className="h-3 w-3" />
                الملكية ({filteredAccounts.equity.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-4 min-h-0">
              <ScrollArea className="h-full bg-background border rounded-md">
                <div className="p-4">
                  <TabsContent value="assets" className="mt-0">
                    {renderAccountList(filteredAccounts.assets, 'assets')}
                  </TabsContent>
                  <TabsContent value="liabilities" className="mt-0">
                    {renderAccountList(filteredAccounts.liabilities, 'liabilities')}
                  </TabsContent>
                  <TabsContent value="revenue" className="mt-0">
                    {renderAccountList(filteredAccounts.revenue, 'revenue')}
                  </TabsContent>
                  <TabsContent value="expenses" className="mt-0">
                    {renderAccountList(filteredAccounts.expenses, 'expenses')}
                  </TabsContent>
                  <TabsContent value="equity" className="mt-0">
                    {renderAccountList(filteredAccounts.equity, 'equity')}
                  </TabsContent>
                </div>
              </ScrollArea>
            </div>
          </Tabs>

          <Separator />

          {/* Actions */}
          <div className="flex gap-3 pt-2 bg-background">
            <Button 
              onClick={handleApply}
              disabled={selectedAccountIds.size === 0 || isApplying}
              className="flex-1"
            >
              {isApplying ? 'جاري التطبيق...' : `تطبيق الحسابات المحددة (${selectedAccountIds.size})`}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};