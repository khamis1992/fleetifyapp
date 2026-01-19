import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target } from 'lucide-react';
import { WizardData } from '../AccountingSystemWizard';
import { useTemplateSystem } from '@/hooks/useTemplateSystem';

interface Props {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const ACCOUNT_TYPES = {
  sales: { 
    nameAr: 'الإيرادات من المبيعات', 
    nameEn: 'Sales Revenue',
    accounts: ['revenue']
  },
  accounts_receivable: { 
    nameAr: 'العملاء والمدينون', 
    nameEn: 'Accounts Receivable',
    accounts: ['assets']
  },
  accounts_payable: { 
    nameAr: 'الموردون والدائنون', 
    nameEn: 'Accounts Payable',
    accounts: ['liabilities']
  },
  cash: { 
    nameAr: 'النقدية والبنوك', 
    nameEn: 'Cash and Banks',
    accounts: ['assets']
  },
  cost_of_sales: { 
    nameAr: 'تكلفة المبيعات', 
    nameEn: 'Cost of Sales',
    accounts: ['expenses']
  },
  operating_expenses: { 
    nameAr: 'المصروفات التشغيلية', 
    nameEn: 'Operating Expenses',
    accounts: ['expenses']
  },
  inventory: { 
    nameAr: 'المخزون', 
    nameEn: 'Inventory',
    accounts: ['assets']
  },
  fixed_assets: { 
    nameAr: 'الأصول الثابتة', 
    nameEn: 'Fixed Assets',
    accounts: ['assets']
  }
};

export const AccountsMapping: React.FC<Props> = ({ 
  data, 
  onUpdate, 
  onNext, 
  onBack 
}) => {
  const { getAccountsByType } = useTemplateSystem();
  const [mappings, setMappings] = useState<Record<string, string>>(
    data.accountMappings || {}
  );

  const accounts = getAccountsByType();
  
  const allAccounts = [
    ...accounts.assets,
    ...accounts.liabilities,
    ...accounts.revenue,
    ...accounts.expenses,
    ...accounts.equity
  ];

  const getAccountsByTypeFilter = (accountTypes: string[]) => {
    return allAccounts.filter(acc => accountTypes.includes(acc.account_type));
  };

  const renderAccountTypeMapping = (typeKey: string) => {
    const typeInfo = ACCOUNT_TYPES[typeKey as keyof typeof ACCOUNT_TYPES];
    const availableAccounts = getAccountsByTypeFilter(typeInfo.accounts);
    
    return (
      <Card key={typeKey} className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h4 className="font-medium">{typeInfo.nameAr}</h4>
            <Badge variant="outline" className="text-xs">
              {typeInfo.nameEn}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">اختر الحساب المناسب:</label>
            <select
              className="w-full p-2 border border-input rounded-md bg-background"
              value={mappings[typeKey] || ''}
              onChange={(e) => {
                const newMappings = { ...mappings, [typeKey]: e.target.value };
                setMappings(newMappings);
                onUpdate({ accountMappings: newMappings });
              }}
            >
              <option value="">-- اختر حساب --</option>
              {availableAccounts.map((account) => (
                <option key={account.code} value={account.code}>
                  {account.code} - {account.name_ar}
                </option>
              ))}
            </select>
          </div>
          
          {mappings[typeKey] && (
            <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
              <div className="font-medium">الحساب المحدد:</div>
              <div>
                {(() => {
                  const selectedAccount = allAccounts.find(acc => acc.code === mappings[typeKey]);
                  return selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name_ar}` : 'غير محدد';
                })()}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const completedMappings = Object.keys(mappings).filter(key => mappings[key]).length;
  const totalMappings = Object.keys(ACCOUNT_TYPES).length;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-2">ربط أنواع الحسابات</h3>
        <p className="text-muted-foreground">
          اختر الحسابات المناسبة لكل نوع من أنواع العمليات المالية
        </p>
        
        <div className="mt-4">
          <Badge variant={completedMappings === totalMappings ? "default" : "secondary"}>
            {completedMappings} من {totalMappings} مكتمل
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.keys(ACCOUNT_TYPES).map(renderAccountTypeMapping)}
      </div>

      <div className="flex justify-between pt-6">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="flex items-center gap-2"
        >
          السابق
        </Button>
        
        <Button 
          onClick={onNext}
          className="flex items-center gap-2"
          disabled={completedMappings < totalMappings}
        >
          التالي ({completedMappings}/{totalMappings})
        </Button>
      </div>
    </div>
  );
};