import React from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Control } from 'react-hook-form';
import { Calculator, CreditCard, DollarSign, Percent } from 'lucide-react';

interface AccountingSettingsProps {
  control: Control<any>;
}

export const AccountingSettings: React.FC<AccountingSettingsProps> = ({ control }) => {
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
            name="base_currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  العملة الأساسية
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العملة الأساسية" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="KWD">دينار كويتي (KWD)</SelectItem>
                    <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                    <SelectItem value="EUR">يورو (EUR)</SelectItem>
                    <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                    <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator className="bg-border/50" />

        {/* Credit Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="initial_credit_limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>حد الائتمان المبدئي</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    className="text-left"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="payment_terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>شروط الدفع الافتراضية</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر شروط الدفع" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cash">نقداً</SelectItem>
                    <SelectItem value="net_15">15 يوم</SelectItem>
                    <SelectItem value="net_30">30 يوم</SelectItem>
                    <SelectItem value="net_45">45 يوم</SelectItem>
                    <SelectItem value="net_60">60 يوم</SelectItem>
                    <SelectItem value="net_90">90 يوم</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator className="bg-border/50" />

        {/* Discount Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="discount_group"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  مجموعة الخصم
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر مجموعة الخصم" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">بدون خصم</SelectItem>
                    <SelectItem value="bronze">برونزي (5%)</SelectItem>
                    <SelectItem value="silver">فضي (10%)</SelectItem>
                    <SelectItem value="gold">ذهبي (15%)</SelectItem>
                    <SelectItem value="platinum">بلاتيني (20%)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="default_discount_percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>نسبة الخصم الافتراضية (%)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0.0"
                    className="text-left"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Additional Settings */}
        <Separator className="bg-border/50" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="tax_exempt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>إعفاء ضريبي</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="حالة الإعفاء الضريبي" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="no">غير معفى</SelectItem>
                    <SelectItem value="partial">إعفاء جزئي</SelectItem>
                    <SelectItem value="full">إعفاء كامل</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="risk_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>مستوى المخاطر</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="تقييم مستوى المخاطر" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">منخفض</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="high">عالي</SelectItem>
                    <SelectItem value="critical">حرج</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};