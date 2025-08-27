import React, { useState } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Control, UseFormSetValue, UseFormGetValues } from 'react-hook-form';
import { Calculator, CreditCard, DollarSign, Percent, TrendingUp } from 'lucide-react';
import { CreditLimitCalculator } from '@/components/finance/CreditLimitCalculator';

interface AccountingSettingsProps {
  control: Control<any>;
  customerType?: 'individual' | 'company';
  setValue?: UseFormSetValue<any>;
  getValues?: UseFormGetValues<any>;
}

export const AccountingSettings: React.FC<AccountingSettingsProps> = ({ 
  control, 
  customerType = 'individual',
  setValue,
  getValues
}) => {
  const [showCreditCalculator, setShowCreditCalculator] = useState(false);
  
  return (
    <Card className="border-accent/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" />
          الإعدادات المحاسبية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Customer Classification */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="accounting_classification"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  التصنيف المحاسبي
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر التصنيف المحاسبي" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="regular">عميل عادي</SelectItem>
                    <SelectItem value="vip">عميل VIP</SelectItem>
                    <SelectItem value="credit">عميل ائتماني</SelectItem>
                    <SelectItem value="cash">عميل نقدي</SelectItem>
                    <SelectItem value="wholesale">عميل جملة</SelectItem>
                    <SelectItem value="retail">عميل تجزئة</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="initial_credit_limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center justify-between">
                  حد الائتمان المبدئي
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreditCalculator(!showCreditCalculator)}
                    className="h-7 px-2"
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    حاسبة ذكية
                  </Button>
                </FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    className="text-left"
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Credit Calculator */}
        {showCreditCalculator && (
          <div className="mt-6">
            <CreditLimitCalculator
              customerType={customerType}
              onCreditLimitCalculated={(amount) => {
                if (setValue) setValue('initial_credit_limit', amount);
                setShowCreditCalculator(false);
              }}
              initialAmount={getValues ? getValues('initial_credit_limit') || 0 : 0}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};