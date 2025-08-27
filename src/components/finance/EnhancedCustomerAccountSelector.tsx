import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Eye, Plus } from 'lucide-react';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { CustomerAccountSelector } from '@/components/finance/CustomerAccountSelector';

interface EnhancedCustomerAccountSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  accountType?: 'receivable' | 'revenue' | 'advance' | 'deposits' | 'discounts';
  placeholder?: string;
  disabled?: boolean;
  customerName?: string;
  customerType?: 'individual' | 'company';
  showPreview?: boolean;
}

export const EnhancedCustomerAccountSelector: React.FC<EnhancedCustomerAccountSelectorProps> = ({
  value,
  onValueChange,
  accountType = 'receivable',
  placeholder = "اختر الحساب المحاسبي",
  disabled = false,
  customerName = '',
  customerType = 'individual',
  showPreview = true
}) => {
  const [showAccountGenerator, setShowAccountGenerator] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [generatedName, setGeneratedName] = useState('');
  
  const { data: accounts = [] } = useChartOfAccounts();

  // Generate smart account code based on account type and customer
  const generateAccountCode = () => {
    const baseCode = getBaseCodeByType(accountType);
    const existingCount = accounts.filter(acc => 
      acc.account_code.startsWith(baseCode)
    ).length;
    
    const newCode = `${baseCode}${String(existingCount + 1).padStart(3, '0')}`;
    const newName = `${customerName} - ${getAccountTypeLabel(accountType)}`;
    
    setGeneratedCode(newCode);
    setGeneratedName(newName);
    setShowAccountGenerator(true);
  };

  const getBaseCodeByType = (type: string) => {
    switch (type) {
      case 'receivable': return '1211';
      case 'advance': return '1213';
      case 'deposits': return '2111';
      case 'discounts': return '5121';
      case 'revenue': return '4111';
      default: return '1211';
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'receivable': return 'ذمم مدينة';
      case 'advance': return 'سلف وعهد';
      case 'deposits': return 'أمانات';
      case 'discounts': return 'خصومات مسموحة';
      case 'revenue': return 'إيرادات';
      default: return 'ذمم مدينة';
    }
  };

  const getAccountTypeProperties = (type: string) => {
    switch (type) {
      case 'receivable':
        return { accountType: 'asset', balanceType: 'debit', level: 5 };
      case 'advance':
        return { accountType: 'asset', balanceType: 'debit', level: 5 };
      case 'deposits':
        return { accountType: 'liability', balanceType: 'credit', level: 5 };
      case 'discounts':
        return { accountType: 'expense', balanceType: 'debit', level: 5 };
      case 'revenue':
        return { accountType: 'revenue', balanceType: 'credit', level: 5 };
      default:
        return { accountType: 'asset', balanceType: 'debit', level: 5 };
    }
  };

  // Create new account function (would normally call API)
  const createNewAccount = async () => {
    if (!generatedCode || !generatedName) return;
    
    const accountProps = getAccountTypeProperties(accountType);
    
    // Here you would normally call your createAccount mutation
    console.log('Creating new account:', {
      account_code: generatedCode,
      account_name: generatedName,
      account_name_ar: generatedName,
      ...accountProps,
      is_header: false,
      is_active: true,
      can_link_customers: true
    });
    
    setShowAccountGenerator(false);
    // After successful creation, you would select this account
    // onValueChange(newAccountId);
  };

  return (
    <div className="space-y-4">
      {/* Main Account Selector */}
      <div className="flex gap-2">
        <div className="flex-1">
          <CustomerAccountSelector
            value={value}
            onValueChange={onValueChange}
            accountType={accountType as any}
            placeholder={placeholder}
            disabled={disabled}
          />
        </div>
        
        {/* Quick Actions */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={generateAccountCode}
          disabled={disabled || !customerName}
          title="إنشاء حساب جديد"
        >
          <Plus className="h-4 w-4" />
        </Button>
        
        {showPreview && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="معاينة الحساب"
            disabled={!value}
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Account Generator */}
      {showAccountGenerator && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              إنشاء حساب محاسبي جديد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">كود الحساب المقترح</label>
                <Input
                  value={generatedCode}
                  onChange={(e) => setGeneratedCode(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div>
                <label className="text-sm font-medium">اسم الحساب</label>
                <Input
                  value={generatedName}
                  onChange={(e) => setGeneratedName(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Badge variant="outline">
                  {getAccountTypeProperties(accountType).accountType}
                </Badge>
                <Badge variant="outline">
                  {getAccountTypeProperties(accountType).balanceType}
                </Badge>
                <Badge variant="outline">
                  المستوى {getAccountTypeProperties(accountType).level}
                </Badge>
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAccountGenerator(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={createNewAccount}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  إنشاء الحساب
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Preview */}
      {showPreview && value && (
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">الحساب المحدد:</span>
              <span className="font-medium">
                {accounts.find(acc => acc.id === value)?.account_name || 'غير محدد'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};