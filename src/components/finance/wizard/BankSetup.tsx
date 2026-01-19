import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowRight, 
  ArrowLeft, 
  Plus,
  Trash2,
  Building,
  CreditCard,
  Info
} from 'lucide-react';
import { WizardData } from '../AccountingSystemWizard';

interface Props {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface BankAccount {
  name: string;
  accountNumber: string;
  currency: string;
  openingBalance: number;
}

const CURRENCIES = [
  { code: 'KWD', name: 'دينار كويتي', symbol: 'د.ك' },
  { code: 'USD', name: 'دولار أمريكي', symbol: '$' },
  { code: 'EUR', name: 'يورو', symbol: '€' },
  { code: 'SAR', name: 'ريال سعودي', symbol: 'ر.س' },
  { code: 'AED', name: 'درهم إماراتي', symbol: 'د.إ' }
];

const COMMON_BANKS = [
  'البنك الأهلي الكويتي',
  'بنك الكويت الوطني',
  'بنك الخليج',
  'بنك بوبيان',
  'البنك التجاري الكويتي',
  'بنك وربة',
  'البنك الأهلي المتحد'
];

export const BankSetup: React.FC<Props> = ({ 
  data, 
  onUpdate, 
  onNext, 
  onBack 
}) => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(
    data.bankAccounts || [
      {
        name: '',
        accountNumber: '',
        currency: 'KWD',
        openingBalance: 0
      }
    ]
  );

  const handleBankAccountChange = (
    index: number, 
    field: keyof BankAccount, 
    value: string | number
  ) => {
    const updated = [...bankAccounts];
    updated[index] = { ...updated[index], [field]: value };
    setBankAccounts(updated);
  };

  const addBankAccount = () => {
    setBankAccounts([
      ...bankAccounts,
      {
        name: '',
        accountNumber: '',
        currency: 'KWD',
        openingBalance: 0
      }
    ]);
  };

  const removeBankAccount = (index: number) => {
    if (bankAccounts.length > 1) {
      setBankAccounts(bankAccounts.filter((_, i) => i !== index));
    }
  };

  const handleNext = () => {
    // Filter out empty bank accounts
    const validBankAccounts = bankAccounts.filter(
      bank => bank.name.trim() !== '' && bank.accountNumber.trim() !== ''
    );
    
    onUpdate({ bankAccounts: validBankAccounts });
    onNext();
  };

  const canProceed = bankAccounts.some(
    bank => bank.name.trim() !== '' && bank.accountNumber.trim() !== ''
  );

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-2">إعداد الحسابات المصرفية</h3>
        <p className="text-muted-foreground">
          أضف الحسابات المصرفية التي تستخدمها شركتك (يمكن تخطي هذه الخطوة وإضافتها لاحقاً)
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          ستتم مزامنة الحسابات المصرفية مع دليل الحسابات تلقائياً. 
          يمكنك إضافة المزيد من الحسابات لاحقاً من قسم المالية.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        {bankAccounts.map((bank, index) => (
          <Card key={index} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  حساب بنكي {index + 1}
                  {index === 0 && (
                    <Badge variant="secondary" className="text-xs">
                      أساسي
                    </Badge>
                  )}
                </CardTitle>
                {bankAccounts.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeBankAccount(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم البنك *</Label>
                  <Select
                    value={bank.name}
                    onValueChange={(value) => handleBankAccountChange(index, 'name', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر البنك..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_BANKS.map((bankName) => (
                        <SelectItem key={bankName} value={bankName}>
                          {bankName}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">أخرى...</SelectItem>
                    </SelectContent>
                  </Select>
                  {bank.name === 'other' && (
                    <Input
                      placeholder="اكتب اسم البنك..."
                      value={bank.name === 'other' ? '' : bank.name}
                      onChange={(e) => handleBankAccountChange(index, 'name', e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>رقم الحساب *</Label>
                  <Input
                    placeholder="1234567890"
                    value={bank.accountNumber}
                    onChange={(e) => handleBankAccountChange(index, 'accountNumber', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>العملة</Label>
                  <Select
                    value={bank.currency}
                    onValueChange={(value) => handleBankAccountChange(index, 'currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          <div className="flex items-center gap-2">
                            <span>{currency.symbol}</span>
                            <span>{currency.name}</span>
                            <span className="text-muted-foreground">({currency.code})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الرصيد الافتتاحي</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0.000"
                      value={bank.openingBalance}
                      onChange={(e) => 
                        handleBankAccountChange(index, 'openingBalance', parseFloat(e.target.value) || 0)
                      }
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                      {CURRENCIES.find(c => c.code === bank.currency)?.symbol}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={addBankAccount}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          إضافة حساب بنكي آخر
        </Button>
      </div>

      {/* Summary */}
      {bankAccounts.some(b => b.name && b.accountNumber) && (
        <Card className="bg-blue-50/50 border-blue-200">
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              ملخص الحسابات المصرفية:
            </h4>
            <div className="space-y-2">
              {bankAccounts
                .filter(b => b.name && b.accountNumber)
                .map((bank, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{bank.name}</span>
                      <span className="text-muted-foreground ml-2">({bank.accountNumber})</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">
                        {bank.openingBalance.toLocaleString('ar-KW', { 
                          minimumFractionDigits: 3, 
                          maximumFractionDigits: 3 
                        })}
                      </span>
                      <span className="text-muted-foreground ml-1">
                        {CURRENCIES.find(c => c.code === bank.currency)?.symbol}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
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
          className="flex items-center gap-2"
        >
          {canProceed ? 'التالي' : 'تخطي هذه الخطوة'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};