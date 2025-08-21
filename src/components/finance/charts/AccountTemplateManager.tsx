import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileCode, 
  Download, 
  Upload, 
  Car,
  Info,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useCopyDefaultAccounts } from '@/hooks/useChartOfAccounts';
import { AccountSelectionDialog } from './AccountSelectionDialog';
import { useBusinessTypeAccounts } from '@/hooks/useBusinessTypeAccounts';
import { useCopySelectedAccounts } from '@/hooks/useCopySelectedAccounts';
import { useDirectTemplateCopy } from '@/hooks/useDirectTemplateCopy';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { getCleanCarRentalAccountsCount } from '@/hooks/useBusinessTypeAccountsNew';
import { useToast } from '@/hooks/use-toast';

interface AccountTemplate {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  icon: React.ReactNode;
  accountsCount: number;
  category: 'business' | 'industry' | 'custom';
  preview: string[];
}

export const AccountTemplateManager: React.FC = () => {
  const { getTotalAccountsCount, getAccountsByBusinessType } = useBusinessTypeAccounts();
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();
  
  const PREDEFINED_TEMPLATES: AccountTemplate[] = [
    {
      id: 'car_rental',
      name: 'Car Rental & Transportation',
      nameAr: 'السيارات والنقل - منظم محاسبياً',
      description: 'قالب محاسبي محترف لشركات تأجير السيارات مع تسلسل هرمي صحيح وحسابات عملية بدون أسماء وهمية',
      icon: <Car className="h-5 w-5" />,
      accountsCount: getCleanCarRentalAccountsCount(),
      category: 'industry',
      preview: ['أصول المركبات', 'تمويل المركبات', 'إيرادات التأجير', 'مصروفات الصيانة', 'تسلسل هرمي محاسبي صحيح', 'بدون حسابات وهمية']
    }
  ];

  // تشخيص القوالب
  console.log('📋 [TEMPLATES] القوالب المعرفة:', PREDEFINED_TEMPLATES.map(t => ({ id: t.id, name: t.nameAr, count: t.accountsCount })));

  const [selectedTemplate, setSelectedTemplate] = useState<AccountTemplate | null>(null);
  const [showAccountSelection, setShowAccountSelection] = useState(false);
  
  const copyDefaultAccounts = useCopyDefaultAccounts();
  const copySelectedAccounts = useCopySelectedAccounts();
  const directTemplateCopy = useDirectTemplateCopy();

  const handleApplyTemplate = (templateId: string) => {
    console.log('🎯 [TEMPLATE] بدء تطبيق القالب:', templateId);
    
    if (templateId === 'general_business') {
      console.log('📋 [TEMPLATE] استخدام النسخ الافتراضي للأعمال العامة');
      copyDefaultAccounts.mutate();
    } else if (templateId === 'car_rental') {
      // استخدام النسخ المباشر للحصول على جميع الحسابات
      console.log('🚗 [TEMPLATE] تطبيق قالب التأجير باستخدام النسخ المباشر');
      console.log('🔍 [TEMPLATE] التحقق من الـ hooks المتاحة:', {
        hasDirectTemplateCopy: !!directTemplateCopy,
        hasCopySelectedAccounts: !!copySelectedAccounts,
        hasCopyDefaultAccounts: !!copyDefaultAccounts
      });
      
      // عرض إحصائيات القالب قبل النسخ
      const accounts = getAccountsByBusinessType('car_rental');
      console.log('📊 [TEMPLATE] إحصائيات القالب:', {
        assets: accounts.assets.length,
        liabilities: accounts.liabilities.length,
        revenue: accounts.revenue.length,
        expenses: accounts.expenses.length,
        equity: accounts.equity.length,
        total: accounts.assets.length + accounts.liabilities.length + accounts.revenue.length + accounts.expenses.length + accounts.equity.length
      });
      
      console.log('🎯 [TEMPLATE] استدعاء directTemplateCopy...');
      
      // التحقق من وجود الـ hook
      if (!directTemplateCopy || !directTemplateCopy.mutate) {
        console.error('❌ [TEMPLATE] directTemplateCopy غير معرف أو معطل!');
        
        // استخدام النظام القديم كـ fallback
        console.log('🔄 [TEMPLATE] استخدام النظام القديم كبديل');
        const carRentalAccounts = getAccountsByBusinessType('car_rental');
        const allCarRentalAccounts = [
          ...carRentalAccounts.assets,
          ...carRentalAccounts.liabilities,
          ...carRentalAccounts.revenue,
          ...carRentalAccounts.expenses,
          ...carRentalAccounts.equity
        ];
        copySelectedAccounts.mutate(allCarRentalAccounts);
        return;
      }
      
      console.log('🚀 [TEMPLATE] استدعاء النظام المحسن...');
      directTemplateCopy.mutate('car_rental');
    } else {
      console.log('📋 [TEMPLATE] استخدام النسخ الافتراضي للقالب:', templateId);
      copyDefaultAccounts.mutate();
    }
  };

  const handleSelectAccounts = (template: AccountTemplate) => {
    console.log('🎯 Selecting accounts for template:', template);
    const accounts = getAccountsByBusinessType('car_rental');
    console.log('📋 Retrieved accounts:', accounts);
    setSelectedTemplate(template);
    setShowAccountSelection(true);
  };

  const handleApplySelectedAccounts = (selectedAccounts: any[]) => {
    copySelectedAccounts.mutate(selectedAccounts, {
      onSuccess: () => {
        setShowAccountSelection(false);
        setSelectedTemplate(null);
      }
    });
  };

  // دالة اختبار مباشرة للتشخيص
  const handleDirectTest = async () => {
    if (!companyId) {
      toast({
        variant: "destructive",
        title: "معرف الشركة غير متوفر"
      });
      return;
    }

    console.log('🧪 [DIRECT_TEST] بدء الاختبار المباشر');
    
    try {
      // جلب حسابات القالب
      const templateAccounts = getAccountsByBusinessType('car_rental');
      const allAccounts = [
        ...templateAccounts.assets,
        ...templateAccounts.liabilities,
        ...templateAccounts.revenue,
        ...templateAccounts.expenses,
        ...templateAccounts.equity
      ];

      console.log('📊 [DIRECT_TEST] إحصائيات القالب:', {
        total: allAccounts.length,
        assets: templateAccounts.assets.length,
        liabilities: templateAccounts.liabilities.length,
        revenue: templateAccounts.revenue.length,
        expenses: templateAccounts.expenses.length,
        equity: templateAccounts.equity.length
      });

      // جلب الحسابات الموجودة
      const { data: existingAccounts, error } = await supabase
        .from('chart_of_accounts')
        .select('account_code, account_name')
        .eq('company_id', companyId);

      if (error) {
        console.error('❌ [DIRECT_TEST] خطأ في جلب الحسابات:', error);
        toast({
          variant: "destructive",
          title: "خطأ في جلب الحسابات",
          description: error.message
        });
        return;
      }

      console.log('📋 [DIRECT_TEST] الحسابات الموجودة:', existingAccounts?.length || 0);

      // حساب الحسابات التي ستتم إضافتها
      const existingCodes = new Set(existingAccounts?.map(acc => acc.account_code) || []);
      const newAccounts = allAccounts.filter(acc => !existingCodes.has(acc.code));

      console.log('🆕 [DIRECT_TEST] الحسابات الجديدة:', {
        newAccountsCount: newAccounts.length,
        existingAccountsCount: existingCodes.size,
        totalTemplateAccounts: allAccounts.length,
        sampleNewAccounts: newAccounts.slice(0, 5).map(acc => acc.code + ' - ' + acc.nameAr)
      });

      toast({
        title: "اختبار مكتمل",
        description: `${newAccounts.length} حساب جديد من أصل ${allAccounts.length} في القالب`
      });

    } catch (error: any) {
      console.error('❌ [DIRECT_TEST] خطأ في الاختبار:', error);
      toast({
        variant: "destructive",
        title: "خطأ في الاختبار",
        description: error.message
      });
    }
  };

  const renderTemplateCard = (template: AccountTemplate) => (
    <Card key={template.id} className="group hover:shadow-md transition-shadow" dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-right">
          {template.icon}
          <div className="text-right">
            <div className="text-base">{template.nameAr}</div>
            <div className="text-sm text-muted-foreground font-normal">
              {template.name}
            </div>
          </div>
        </CardTitle>
        <CardDescription className="text-right">{template.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant={template.category === 'business' ? 'default' : 'secondary'}>
              {template.category === 'business' ? 'عام' : 'متخصص'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {template.accountsCount} حساب
            </Badge>
          </div>

          <div className="text-sm text-muted-foreground text-right">
            <div className="font-medium mb-1">أمثلة من الحسابات:</div>
            <div className="text-xs space-y-1">
              {template.preview.slice(0, 3).map((account, index) => (
                <div key={index} className="text-right">• {account}</div>
              ))}
              {template.preview.length > 3 && (
                <div className="text-muted-foreground text-right">
                  + {template.preview.length - 3} حساب آخر...
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              size="sm"
              onClick={() => {
                console.log('🎯 [BUTTON_CLICK] تم الضغط على تطبيق الكل للقالب:', template.id);
                handleApplyTemplate(template.id);
              }}
              disabled={copyDefaultAccounts.isPending || copySelectedAccounts.isPending || directTemplateCopy.isPending}
              className="flex-1 flex items-center gap-2"
            >
              {(copyDefaultAccounts.isPending || copySelectedAccounts.isPending || directTemplateCopy.isPending) ? (
                <>
                  <span>جاري التطبيق...</span>
                  <Clock className="h-3 w-3" />
                </>
              ) : (
                <>
                  <span>تطبيق الكل</span>
                  <CheckCircle className="h-3 w-3" />
                </>
              )}
            </Button>
            
            {/* زر فرض النسخ المحسن للتأجير */}
            {template.id === 'car_rental' && (
              <Button 
                size="sm"
                variant="default"
                onClick={() => {
                  console.log('🚀 [FORCE_NEW] فرض استخدام النظام المحسن');
                  directTemplateCopy.mutate('car_rental');
                }}
                disabled={directTemplateCopy.isPending}
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                title="فرض النظام المحسن"
              >
                {directTemplateCopy.isPending ? (
                  <>
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">محسن...</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs">محسن</span>
                    <CheckCircle className="h-3 w-3" />
                  </>
                )}
              </Button>
            )}
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleSelectAccounts(template)}
              className="flex-1"
            >
              اختيار الحسابات
            </Button>
            
            {/* أزرار اختبار للتشخيص */}
            {template.id === 'car_rental' && (
              <div className="flex gap-1">
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={handleDirectTest}
                  className="px-2"
                  title="اختبار شامل"
                >
                  🧪
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => {
                    console.log('🎯 [QUICK_TEST] اختبار سريع للقالب');
                    const accounts = getAccountsByBusinessType('car_rental');
                    console.log('📊 أعداد الحسابات:', {
                      assets: accounts.assets.length,
                      liabilities: accounts.liabilities.length,
                      revenue: accounts.revenue.length,
                      expenses: accounts.expenses.length,
                      equity: accounts.equity.length,
                      total: accounts.assets.length + accounts.liabilities.length + accounts.revenue.length + accounts.expenses.length + accounts.equity.length
                    });
                    toast({
                      title: "اختبار سريع",
                      description: `القالب يحتوي على ${accounts.assets.length + accounts.liabilities.length + accounts.revenue.length + accounts.expenses.length + accounts.equity.length} حساب`
                    });
                  }}
                  className="px-2"
                  title="اختبار سريع"
                >
                  ⚡
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-right">
            <FileCode className="h-5 w-5" />
            قوالب دليل الحسابات
          </CardTitle>
          <CardDescription className="text-right">
            اختر قالب جاهز يناسب نوع نشاطك التجاري لتوفير الوقت والجهد
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-right">
              <div className="space-y-2">
                <p>تطبيق قالب سيضيف الحسابات الجديدة إلى دليلك الحالي دون حذف الحسابات الموجودة</p>
                <p className="text-sm text-blue-600 font-medium">
                  ✨ تم تحسين النظام: الآن يتم نسخ جميع الحسابات مباشرة من القالب المنظم ({getCleanCarRentalAccountsCount()} حساب محاسبي صحيح) 
                  بدلاً من الاقتصار على الحسابات الأساسية (232 حساب) - تم حذف الحسابات الوهمية
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PREDEFINED_TEMPLATES
          .filter(t => t.category === 'industry')
          .map(renderTemplateCard)}
      </div>

      {/* Account Selection Dialog */}
      {selectedTemplate && (
        <AccountSelectionDialog
          open={showAccountSelection}
          onOpenChange={setShowAccountSelection}
          accounts={getAccountsByBusinessType('car_rental')} // Use car_rental as example
          templateName={selectedTemplate.nameAr}
          onApply={handleApplySelectedAccounts}
          isApplying={copySelectedAccounts.isPending}
        />
      )}
    </div>
  );
};