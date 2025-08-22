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

import { useCompleteCarRentalTemplate } from '@/hooks/useCompleteCarRentalTemplate';
import { TemplatePreviewDialog } from './TemplatePreviewDialog';
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
  const { totalAccounts: completeTemplateCount, isReady: completeTemplateReady } = useCompleteCarRentalTemplate();
  const { toast } = useToast();
  
  const PREDEFINED_TEMPLATES: AccountTemplate[] = [
    {
      id: 'car_rental',
      name: 'Car Rental & Transportation - Complete Template',
      nameAr: 'قالب تأجير السيارات الشامل - 6 مستويات',
      description: 'القالب الكامل لشركات تأجير السيارات يحتوي على 403 حساب محاسبي منظم في 6 مستويات هرمية احترافية',
      icon: <Car className="h-5 w-5" />,
      accountsCount: 403, // Always show 403 as the template is complete
      category: 'industry',
      preview: [
        '403 حساب محاسبي شامل',
        '6 مستويات هرمية منظمة',
        'أصول المركبات مع الإهلاك',
        'إيرادات التأجير المتخصصة',
        'مصروفات الصيانة المفصلة',
        'حسابات العملاء والموردين',
        'إدارة الوقود والتأمين',
        'هيكل محاسبي مطابق للمعايير'
      ]
    }
  ];

  // تشخيص القوالب
  console.log('📋 [TEMPLATES] القوالب المعرفة:', PREDEFINED_TEMPLATES.map(t => ({ 
    id: t.id, 
    name: t.nameAr, 
    count: t.accountsCount,
    isComplete: t.id === 'car_rental' && completeTemplateReady
  })));

  const [selectedTemplate, setSelectedTemplate] = useState<AccountTemplate | null>(null);
  const [showAccountSelection, setShowAccountSelection] = useState(false);
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  
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
      
      // سيتم استخدام النظام المحسن JSON مباشرة
      console.log('🚗 [TEMPLATE] سيتم تحميل القالب الكامل (403 حساب) من JSON');
      
      console.log('🎯 [TEMPLATE] استدعاء directTemplateCopy...');
      
      // التحقق من وجود الـ hook
      if (!directTemplateCopy || !directTemplateCopy.mutate) {
        console.error('❌ [TEMPLATE] directTemplateCopy غير معرف أو معطل!');
        
        toast({
          variant: "destructive",
          title: "خطأ في النظام",
          description: "hook النسخ المباشر غير متوفر. يرجى إعادة تحميل الصفحة."
        });
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
    // استخدام النظام العام للاختيار (ليس التأجير المحدد)
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

  // دالة اختبار JSON Template مباشرة
  const handleDirectTest = async () => {
    if (!companyId) {
      toast({
        variant: "destructive",
        title: "معرف الشركة غير متوفر"
      });
      return;
    }

    console.log('🧪 [JSON_TEST] بدء اختبار القالب JSON');
    
    try {
      // تحميل القالب JSON مباشرة
      const response = await fetch('/car_rental_complete_template.json');
      if (!response.ok) {
        throw new Error(`فشل تحميل JSON: ${response.status}`);
      }
      
      const templateData = await response.json();
      const allAccounts = templateData.chart_of_accounts || [];

      console.log('📊 [JSON_TEST] بيانات القالب JSON:', {
        total: allAccounts.length,
        hasMetadata: !!templateData.template_metadata,
        sampleAccounts: allAccounts.slice(0, 3).map(acc => ({ 
          code: acc.code, 
          name: acc.name_ar,
          type: acc.account_type
        }))
      });

      // جلب الحسابات الموجودة
      const { data: existingAccounts, error } = await supabase
        .from('chart_of_accounts')
        .select('account_code, account_name')
        .eq('company_id', companyId);

      if (error) {
        console.error('❌ [JSON_TEST] خطأ في جلب الحسابات:', error);
        toast({
          variant: "destructive",
          title: "خطأ في جلب الحسابات",
          description: error.message
        });
        return;
      }

      const existingCodes = new Set(existingAccounts?.map(acc => acc.account_code) || []);
      const newAccounts = allAccounts.filter(acc => !existingCodes.has(acc.code));

      console.log('🆕 [JSON_TEST] النتائج:', {
        jsonAccountsCount: allAccounts.length,
        existingAccountsCount: existingCodes.size,
        newAccountsCount: newAccounts.length,
        sampleNewAccounts: newAccounts.slice(0, 5).map(acc => acc.code + ' - ' + acc.name_ar)
      });

      toast({
        title: "✅ اختبار JSON مكتمل",
        description: `القالب JSON يحتوي على ${allAccounts.length} حساب - ${newAccounts.length} جديد`
      });

    } catch (error: any) {
      console.error('❌ [JSON_TEST] خطأ في اختبار JSON:', error);
      toast({
        variant: "destructive",
        title: "❌ فشل اختبار JSON",
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
                  <span>تطبيق مباشر</span>
                  <CheckCircle className="h-3 w-3" />
                </>
              )}
            </Button>
            
            {/* زر المعاينة المحسن */}
            {template.id === 'car_rental' && completeTemplateReady && (
              <Button 
                size="sm"
                variant="outline"
                onClick={() => setShowTemplatePreview(true)}
                className="flex items-center gap-1"
                title="معاينة القالب الكامل"
              >
                <span className="text-xs">معاينة</span>
                <Info className="h-3 w-3" />
              </Button>
            )}
            
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
                  onClick={async () => {
                    console.log('🎯 [QUICK_JSON] اختبار سريع للقالب JSON');
                    try {
                      const response = await fetch('/car_rental_complete_template.json');
                      const templateData = await response.json();
                      const accountsCount = templateData.chart_of_accounts?.length || 0;
                      console.log('📊 عدد حسابات JSON:', accountsCount);
                      toast({
                        title: "✅ اختبار سريع JSON",
                        description: `القالب JSON يحتوي على ${accountsCount} حساب`
                      });
                    } catch (error) {
                      console.error('❌ فشل اختبار JSON:', error);
                      toast({
                        variant: "destructive",
                        title: "❌ فشل اختبار JSON",
                        description: "لم يتم تحميل ملف JSON"
                      });
                    }
                  }}
                  className="px-2"
                  title="اختبار سريع JSON"
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
                  ✨ النظام المحسن: الآن يتم نسخ جميع الحسابات مباشرة من القالب الكامل (403 حساب احترافي) 
                  - هيكل محاسبي صحيح من المستوى 1-6 مطابق للمعايير المحاسبية
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

      {/* Template Preview Dialog */}
      <TemplatePreviewDialog
        open={showTemplatePreview}
        onOpenChange={setShowTemplatePreview}
        onApply={() => {
          setShowTemplatePreview(false);
          handleApplyTemplate('car_rental');
        }}
        isApplying={directTemplateCopy.isPending}
      />

      {/* Account Selection Dialog */}
      {selectedTemplate && (
        <AccountSelectionDialog
          open={showAccountSelection}
          onOpenChange={setShowAccountSelection}
          accounts={getAccountsByBusinessType('general_business')} // استخدام النظام العام للاختيار
          templateName={selectedTemplate.nameAr}
          onApply={handleApplySelectedAccounts}
          isApplying={copySelectedAccounts.isPending}
        />
      )}
    </div>
  );
};