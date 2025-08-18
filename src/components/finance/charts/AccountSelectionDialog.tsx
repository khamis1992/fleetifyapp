import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
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

  // Auto-select essential accounts when dialog opens
  React.useEffect(() => {
    if (open && allAccounts.length > 0 && selectedAccountIds.size === 0) {
      const essentialIds = new Set(
        allAccounts.filter(acc => acc.essential).map(acc => acc.id)
      );
      if (essentialIds.size > 0) {
        setSelectedAccountIds(essentialIds);
      }
    }
  }, [open, allAccounts, selectedAccountIds.size]);

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
      <DialogContent className="max-w-5xl h-[85vh] bg-background border shadow-lg z-50" dir="rtl">
        <DialogHeader className="border-b pb-4 mb-4">
          <DialogTitle className="flex items-center gap-3 text-right text-xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-lg font-bold">اختيار الحسابات من قالب</div>
              <div className="text-sm text-muted-foreground font-normal">{templateName}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full space-y-6">
          {/* Search and Quick Actions */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في الحسابات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-right bg-background"
                  dir="rtl"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={selectAll} className="flex items-center gap-2">
                  <Check className="h-3 w-3" />
                  تحديد الكل
                </Button>
                <Button size="sm" variant="outline" onClick={selectEssential} className="flex items-center gap-2">
                  <Star className="h-3 w-3" />
                  الأساسية فقط
                </Button>
                <Button size="sm" variant="outline" onClick={selectRecommended}>
                  الموصى بها
                </Button>
                <Button size="sm" variant="outline" onClick={clearSelection} className="flex items-center gap-2">
                  <X className="h-3 w-3" />
                  إلغاء التحديد
                </Button>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{statistics.selected}</div>
                  <div className="text-sm text-muted-foreground">محدد</div>
                </div>
                <div className="text-center p-3 bg-muted/30 border rounded-lg">
                  <div className="text-2xl font-bold">{statistics.total}</div>
                  <div className="text-sm text-muted-foreground">الإجمالي</div>
                </div>
                <div className="text-center p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <div className="text-2xl font-bold text-destructive">{statistics.essential}</div>
                  <div className="text-sm text-muted-foreground">أساسي</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{statistics.recommended}</div>
                  <div className="text-sm text-muted-foreground">موصى به</div>
                </div>
              </div>
            </div>
          </Card>

          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-right text-blue-800">
              الحسابات الأساسية مطلوبة لضمان عمل النظام بشكل صحيح. يمكنك إلغاء تحديد الحسابات غير المرغوب فيها.
            </AlertDescription>
          </Alert>

          {/* Account Tabs */}
          <Card className="flex-1 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-5 bg-muted/50 h-12">
                <TabsTrigger value="assets" className="flex items-center gap-2 data-[state=active]:bg-background">
                  <Building className="h-4 w-4" />
                  <span>الأصول</span>
                  <Badge variant="secondary" className="text-xs">{filteredAccounts.assets.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="liabilities" className="flex items-center gap-2 data-[state=active]:bg-background">
                  <TrendingUp className="h-4 w-4" />
                  <span>الخصوم</span>
                  <Badge variant="secondary" className="text-xs">{filteredAccounts.liabilities.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="revenue" className="flex items-center gap-2 data-[state=active]:bg-background">
                  <DollarSign className="h-4 w-4" />
                  <span>الإيرادات</span>
                  <Badge variant="secondary" className="text-xs">{filteredAccounts.revenue.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="expenses" className="flex items-center gap-2 data-[state=active]:bg-background">
                  <Users className="h-4 w-4" />
                  <span>المصروفات</span>
                  <Badge variant="secondary" className="text-xs">{filteredAccounts.expenses.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="equity" className="flex items-center gap-2 data-[state=active]:bg-background">
                  <Shield className="h-4 w-4" />
                  <span>الملكية</span>
                  <Badge variant="secondary" className="text-xs">{filteredAccounts.equity.length}</Badge>
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 p-4">
                <ScrollArea className="h-[350px]">
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
                </ScrollArea>
              </div>
            </Tabs>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t bg-background">
            <Button 
              onClick={handleApply}
              disabled={selectedAccountIds.size === 0 || isApplying}
              className="flex-1 h-12 text-base font-medium"
              size="lg"
            >
              {isApplying ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  جاري التطبيق...
                </div>
              ) : (
                `تطبيق الحسابات المحددة (${selectedAccountIds.size})`
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 text-base"
              size="lg"
            >
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};