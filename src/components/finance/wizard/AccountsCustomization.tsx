import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Plus,
  Info,
  TrendingUp,
  TrendingDown,
  Building,
  CreditCard
} from 'lucide-react';
import { WizardData } from '../AccountingSystemWizard';
import { useTemplateSystem } from '@/hooks/useTemplateSystem';

interface Props {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const AccountsCustomization: React.FC<Props> = ({ 
  data, 
  onUpdate, 
  onNext, 
  onBack 
}) => {
  const { getAccountsByType } = useTemplateSystem(data.businessType);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(data.selectedAccounts || []);
  
  const businessAccounts = getAccountsByType();

  useEffect(() => {
    // Pre-select essential accounts
    const essentialAccounts = [
      ...businessAccounts.assets.filter(acc => acc.essential).map(acc => acc.code),
      ...businessAccounts.liabilities.filter(acc => acc.essential).map(acc => acc.code),
      ...businessAccounts.revenue.filter(acc => acc.essential).map(acc => acc.code),
      ...businessAccounts.expenses.filter(acc => acc.essential).map(acc => acc.code),
    ];
    
    if (selectedAccounts.length === 0) {
      setSelectedAccounts(essentialAccounts);
    }
  }, [businessAccounts]);

  const handleAccountToggle = (accountCode: string, isEssential: boolean) => {
    if (isEssential) return; // Can't unselect essential accounts
    
    setSelectedAccounts(prev => 
      prev.includes(accountCode) 
        ? prev.filter(code => code !== accountCode)
        : [...prev, accountCode]
    );
  };

  const handleNext = () => {
    onUpdate({ selectedAccounts });
    onNext();
  };

  const AccountSection: React.FC<{
    title: string;
    accounts: any[];
    icon: React.ComponentType<any>;
    color: string;
  }> = ({ title, accounts, icon: Icon, color }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`h-5 w-5 ${color}`} />
        <h4 className="font-semibold">{title}</h4>
        <Badge variant="outline" className="text-xs">
          {accounts.filter(acc => selectedAccounts.includes(acc.code)).length} من {accounts.length}
        </Badge>
      </div>
      
      <div className="space-y-2">
        {accounts.map((account) => (
          <div 
            key={account.code}
            className={`
              flex items-center space-x-3 p-3 rounded-lg border transition-colors
              ${selectedAccounts.includes(account.code) 
                ? 'bg-primary/5 border-primary/20' 
                : 'bg-background hover:bg-muted/50'
              }
              ${account.essential ? 'border-green-200 bg-green-50/50' : ''}
            `}
          >
            <Checkbox
              checked={selectedAccounts.includes(account.code)}
              onCheckedChange={() => handleAccountToggle(account.code, account.essential)}
              disabled={account.essential}
              className="data-[state=checked]:bg-primary"
            />
            
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{account.name_ar}</span>
                {account.essential && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                    أساسي
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">
                {account.description}
              </p>
              
              <div className="text-xs text-muted-foreground">
                رمز الحساب: {account.code}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const essentialCount = selectedAccounts.filter(code => {
    const allAccounts = [
      ...businessAccounts.assets,
      ...businessAccounts.liabilities,
      ...businessAccounts.revenue,
      ...businessAccounts.expenses
    ];
    const account = allAccounts.find(acc => acc.code === code);
    return account?.essential;
  }).length;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-2">تخصيص دليل الحسابات</h3>
        <p className="text-muted-foreground">
          اختر الحسابات التي تحتاجها شركتك (الحسابات الأساسية محددة مسبقاً)
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{selectedAccounts.length}</div>
              <div className="text-sm text-muted-foreground">إجمالي الحسابات</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{essentialCount}</div>
              <div className="text-sm text-muted-foreground">حسابات أساسية</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {businessAccounts.revenue.filter(acc => selectedAccounts.includes(acc.code)).length}
              </div>
              <div className="text-sm text-muted-foreground">حسابات إيرادات</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {businessAccounts.expenses.filter(acc => selectedAccounts.includes(acc.code)).length}
              </div>
              <div className="text-sm text-muted-foreground">حسابات مصروفات</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          الحسابات المحددة بـ "أساسي" مطلوبة لعمل النظام بشكل صحيح ولا يمكن إلغاء تحديدها.
          يمكنك إضافة المزيد من الحسابات لاحقاً من قسم المالية.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="assets" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="assets">الأصول</TabsTrigger>
          <TabsTrigger value="liabilities">الخصوم</TabsTrigger>
          <TabsTrigger value="revenue">الإيرادات</TabsTrigger>
          <TabsTrigger value="expenses">المصروفات</TabsTrigger>
        </TabsList>
        
        <TabsContent value="assets" className="mt-6">
          <AccountSection
            title="حسابات الأصول"
            accounts={businessAccounts.assets}
            icon={Building}
            color="text-blue-600"
          />
        </TabsContent>
        
        <TabsContent value="liabilities" className="mt-6">
          <AccountSection
            title="حسابات الخصوم"
            accounts={businessAccounts.liabilities}
            icon={CreditCard}
            color="text-orange-600"
          />
        </TabsContent>
        
        <TabsContent value="revenue" className="mt-6">
          <AccountSection
            title="حسابات الإيرادات"
            accounts={businessAccounts.revenue}
            icon={TrendingUp}
            color="text-green-600"
          />
        </TabsContent>
        
        <TabsContent value="expenses" className="mt-6">
          <AccountSection
            title="حسابات المصروفات"
            accounts={businessAccounts.expenses}
            icon={TrendingDown}
            color="text-red-600"
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-between pt-6">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          السابق
        </Button>
        
        <Button 
          onClick={handleNext}
          className="flex items-center gap-2"
          disabled={selectedAccounts.length === 0}
        >
          التالي ({selectedAccounts.length} حساب محدد)
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};