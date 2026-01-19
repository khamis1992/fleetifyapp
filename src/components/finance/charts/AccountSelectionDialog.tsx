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
import { AccountTemplate } from '@/hooks/useTemplateSystem';

interface AccountSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: AccountTemplate[];
  onApply: (selectedAccounts: AccountTemplate[]) => void;
  isApplying?: boolean;
}

export const AccountSelectionDialog: React.FC<AccountSelectionDialogProps> = ({
  open,
  onOpenChange,
  accounts,
  onApply,
  isApplying = false
}) => {
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('assets');

  // Use accounts directly since they're already an array
  const allAccounts = useMemo(() => accounts, [accounts]);

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
    
    return accounts.filter(acc =>
      acc.name_ar.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.code.includes(searchTerm)
    );
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
    const allIds = new Set(allAccounts.map(acc => acc.code));
    setSelectedAccountIds(allIds);
  };

  const selectEssential = () => {
    const essentialIds = new Set(
      allAccounts.filter(acc => acc.essential).map(acc => acc.code)
    );
    setSelectedAccountIds(essentialIds);
  };

  const selectRecommended = () => {
    const recommendedIds = new Set(
      allAccounts.filter(acc => acc.essential).map(acc => acc.code)
    );
    setSelectedAccountIds(recommendedIds);
  };

  const clearSelection = () => {
    setSelectedAccountIds(new Set());
  };

  const handleApply = () => {
    const selectedAccounts = allAccounts.filter(acc => selectedAccountIds.has(acc.code));
    onApply(selectedAccounts);
  };

  const renderAccountList = (accountList: AccountTemplate[], type: string) => (
    <div className="space-y-2 pb-16">
      {accountList.map((account) => (
        <div
          key={account.code}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
            selectedAccountIds.has(account.code) 
              ? 'bg-primary/10 border-primary/30' 
              : 'bg-card hover:bg-muted/50 border-border'
          }`}
          dir="rtl"
        >
          <Checkbox
            id={account.code}
            checked={selectedAccountIds.has(account.code)}
            onCheckedChange={() => toggleAccount(account.code)}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{account.name_ar}</span>
              {account.essential && (
                <Badge variant="destructive" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  أساسي
                </Badge>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <span>الكود: {account.code}</span>
                <span>•</span>
                <span>{account.name_en}</span>
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
    recommended: allAccounts.filter(acc => acc.essential).length
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] md:max-w-4xl h-[85vh] overflow-hidden" dir="rtl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-semibold text-right flex items-center gap-2">
            <Info className="h-4 w-4" />
            اختيار الحسابات من قالب تأجير السيارات
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full space-y-3">
          {/* Search and Statistics in one row */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في الحسابات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-right h-9"
                dir="rtl"
              />
            </div>
            <div className="flex gap-1 text-xs">
              <span className="px-2 py-1 bg-primary text-primary-foreground rounded">
                محدد: {statistics.selected}
              </span>
              <span className="px-2 py-1 bg-muted text-muted-foreground rounded">
                الكل: {statistics.total}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={selectAll} className="h-8 px-3">
              <Check className="h-3 w-3 ml-1" />
              تحديد الكل
            </Button>
            <Button size="sm" variant="outline" onClick={selectEssential} className="h-8 px-3">
              <Star className="h-3 w-3 ml-1" />
              الأساسية فقط
            </Button>
            <Button size="sm" variant="outline" onClick={selectRecommended} className="h-8 px-3">
              الموصى بها
            </Button>
            <Button size="sm" variant="outline" onClick={clearSelection} className="h-8 px-3">
              <X className="h-3 w-3 ml-1" />
              إلغاء التحديد
            </Button>
          </div>

          {/* Action Buttons - Always Visible */}
          <div className="flex gap-2 p-2 border rounded-lg bg-muted/30">
            <Button 
              onClick={handleApply}
              disabled={selectedAccountIds.size === 0 || isApplying}
              className="flex-1 h-10"
              size="sm"
            >
              {isApplying ? 'جاري التطبيق...' : `تطبيق (${selectedAccountIds.size})`}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="px-6 h-10"
              size="sm"
            >
              إلغاء
            </Button>
          </div>

          {/* Account Tabs - Take remaining space */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-5 h-9 bg-muted/50">
              <TabsTrigger value="assets" className="text-xs px-1 data-[state=active]:bg-background">
                <Building className="h-3 w-3 ml-1" />
                الأصول ({filteredAccounts.filter(acc => acc.account_type === 'assets').length})
              </TabsTrigger>
              <TabsTrigger value="liabilities" className="text-xs px-1 data-[state=active]:bg-background">
                <TrendingUp className="h-3 w-3 ml-1" />
                الخصوم ({filteredAccounts.filter(acc => acc.account_type === 'liabilities').length})
              </TabsTrigger>
              <TabsTrigger value="revenue" className="text-xs px-1 data-[state=active]:bg-background">
                <DollarSign className="h-3 w-3 ml-1" />
                الإيرادات ({filteredAccounts.filter(acc => acc.account_type === 'revenue').length})
              </TabsTrigger>
              <TabsTrigger value="expenses" className="text-xs px-1 data-[state=active]:bg-background">
                <Users className="h-3 w-3 ml-1" />
                المصروفات ({filteredAccounts.filter(acc => acc.account_type === 'expenses').length})
              </TabsTrigger>
              <TabsTrigger value="equity" className="text-xs px-1 data-[state=active]:bg-background">
                <Shield className="h-3 w-3 ml-1" />
                الملكية ({filteredAccounts.filter(acc => acc.account_type === 'equity').length})
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 mt-2 overflow-hidden">
              <ScrollArea className="h-full border rounded-md" dir="rtl">
                <div className="p-3 space-y-2">
                  <TabsContent value="assets" className="mt-0">
                    {renderAccountList(filteredAccounts.filter(acc => acc.account_type === 'assets'), 'assets')}
                  </TabsContent>
                  <TabsContent value="liabilities" className="mt-0">
                    {renderAccountList(filteredAccounts.filter(acc => acc.account_type === 'liabilities'), 'liabilities')}
                  </TabsContent>
                  <TabsContent value="revenue" className="mt-0">
                    {renderAccountList(filteredAccounts.filter(acc => acc.account_type === 'revenue'), 'revenue')}
                  </TabsContent>
                  <TabsContent value="expenses" className="mt-0">
                    {renderAccountList(filteredAccounts.filter(acc => acc.account_type === 'expenses'), 'expenses')}
                  </TabsContent>
                  <TabsContent value="equity" className="mt-0">
                    {renderAccountList(filteredAccounts.filter(acc => acc.account_type === 'equity'), 'equity')}
                  </TabsContent>
                </div>
              </ScrollArea>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};