import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowRight, 
  ArrowLeft, 
  Link,
  CheckCircle,
  AlertTriangle,
  Target
} from 'lucide-react';
import { WizardData } from '../AccountingSystemWizard';
import { useTemplateSystem } from '@/hooks/useTemplateSystem';

interface Props {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface AccountMapping {
  key: string;
  nameAr: string;
  description: string;
  required: boolean;
  accountType: string;
}

const ACCOUNT_MAPPINGS: AccountMapping[] = [
  {
    key: 'default_receivables',
    nameAr: 'حساب العملاء المدينون الافتراضي',
    description: 'الحساب الذي سيتم ربط العملاء به تلقائياً',
    required: true,
    accountType: 'assets'
  },
  {
    key: 'default_payables',
    nameAr: 'حساب الموردون الدائنون الافتراضي',
    description: 'الحساب الذي سيتم ربط الموردين به تلقائياً',
    required: true,
    accountType: 'liabilities'
  },
  {
    key: 'default_cash',
    nameAr: 'حساب النقدية الافتراضي',
    description: 'الحساب المستخدم للمعاملات النقدية',
    required: true,
    accountType: 'assets'
  },
  {
    key: 'default_bank',
    nameAr: 'الحساب البنكي الافتراضي',
    description: 'الحساب المستخدم للمعاملات البنكية',
    required: true,
    accountType: 'assets'
  },
  {
    key: 'default_revenue',
    nameAr: 'حساب الإيرادات الافتراضي',
    description: 'الحساب المستخدم لتسجيل الإيرادات العامة',
    required: true,
    accountType: 'revenue'
  },
  {
    key: 'default_expenses',
    nameAr: 'حساب المصروفات الافتراضي',
    description: 'الحساب المستخدم لتسجيل المصروفات العامة',
    required: false,
    accountType: 'expenses'
  }
];

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
  const selectedAccountIds = data.selectedAccounts || [];
  
  // Get available accounts for each type
  const getAvailableAccounts = (accountType: string) => {
    const allAccounts = [
      ...accounts.assets,
      ...accounts.liabilities,
      ...accounts.revenue,
      ...accounts.expenses,
      ...accounts.equity
    ];
    
    return allAccounts.filter(acc => 
      acc.accountType === accountType && 
      selectedAccountIds.includes(acc.id)
    );
  };

  const handleMappingChange = (key: string, accountId: string) => {
    const newMappings = { ...mappings, [key]: accountId };
    setMappings(newMappings);
  };

  const handleNext = () => {
    onUpdate({ accountMappings: mappings });
    onNext();
  };

  // Auto-suggest mappings based on business type
  const getAutoSuggestion = (mappingKey: string, accountType: string) => {
    const availableAccounts = getAvailableAccounts(accountType);
    
    switch (mappingKey) {
      case 'default_receivables':
        return availableAccounts.find(acc => 
          acc.id === 'accounts_receivable' || 
          acc.nameAr.includes('مدين') || 
          acc.nameAr.includes('عملاء')
        );
      case 'default_payables':
        return availableAccounts.find(acc => 
          acc.id === 'accounts_payable' || 
          acc.nameAr.includes('دائن') || 
          acc.nameAr.includes('موردين')
        );
      case 'default_cash':
        return availableAccounts.find(acc => 
          acc.id === 'cash' || 
          acc.nameAr.includes('نقد') || 
          acc.nameAr.includes('صندوق')
        );
      case 'default_bank':
        return availableAccounts.find(acc => 
          acc.id === 'bank' || 
          acc.nameAr.includes('بنك')
        );
      case 'default_revenue':
        if (data.businessType === 'car_rental') {
          return availableAccounts.find(acc => acc.id === 'rental_revenue');
        }
        return availableAccounts.find(acc => 
          acc.id === 'sales_revenue' || 
          acc.nameAr.includes('إيرادات') || 
          acc.nameAr.includes('مبيعات')
        );
      default:
        return availableAccounts[0];
    }
  };

  // Apply auto suggestions
  const applyAutoSuggestions = () => {
    const autoMappings: Record<string, string> = {};
    
    ACCOUNT_MAPPINGS.forEach(mapping => {
      const suggestion = getAutoSuggestion(mapping.key, mapping.accountType);
      if (suggestion) {
        autoMappings[mapping.key] = suggestion.id;
      }
    });
    
    setMappings(autoMappings);
  };

  const requiredMappingsComplete = ACCOUNT_MAPPINGS
    .filter(m => m.required)
    .every(m => mappings[m.key]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-2">ربط الحسابات الأساسية</h3>
        <p className="text-muted-foreground">
          حدد الحسابات التي سيتم استخدامها افتراضياً في العمليات المختلفة
        </p>
      </div>

      <div className="flex justify-center mb-6">
        <Button 
          variant="outline" 
          onClick={applyAutoSuggestions}
          className="flex items-center gap-2"
        >
          <Target className="h-4 w-4" />
          اقتراحات تلقائية
        </Button>
      </div>

      <div className="grid gap-4">
        {ACCOUNT_MAPPINGS.map((mapping) => {
          const availableAccounts = getAvailableAccounts(mapping.accountType);
          const selectedAccount = availableAccounts.find(acc => acc.id === mappings[mapping.key]);
          const autoSuggestion = getAutoSuggestion(mapping.key, mapping.accountType);
          
          return (
            <Card key={mapping.key} className={`
              ${mapping.required && !mappings[mapping.key] ? 'border-red-200 bg-red-50/30' : ''}
              ${mappings[mapping.key] ? 'border-green-200 bg-green-50/30' : ''}
            `}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{mapping.nameAr}</CardTitle>
                    {mapping.required && (
                      <Badge variant="destructive" className="text-xs">مطلوب</Badge>
                    )}
                    {mappings[mapping.key] && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <Link className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {mapping.description}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Select 
                    value={mappings[mapping.key] || ""} 
                    onValueChange={(value) => handleMappingChange(mapping.key, value)}
                  >
                    <SelectTrigger className={`
                      ${mapping.required && !mappings[mapping.key] ? 'border-red-300' : ''}
                    `}>
                      <SelectValue placeholder="اختر الحساب..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <span>{account.code}</span>
                            <span>-</span>
                            <span>{account.nameAr}</span>
                            {account.id === autoSuggestion?.id && (
                              <Badge variant="secondary" className="text-xs ml-2">
                                مقترح
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedAccount && (
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      {selectedAccount.description}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!requiredMappingsComplete && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            يجب تحديد جميع الربطات المطلوبة (المحددة بـ "مطلوب") للمتابعة.
          </AlertDescription>
        </Alert>
      )}

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
          disabled={!requiredMappingsComplete}
          className="flex items-center gap-2"
        >
          التالي
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};