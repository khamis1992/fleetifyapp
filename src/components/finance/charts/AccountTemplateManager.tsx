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

const PREDEFINED_TEMPLATES: AccountTemplate[] = [
  {
    id: 'car_rental',
    name: 'Car Rental & Transportation',
    nameAr: 'السيارات والنقل',
    description: 'لشركات تأجير السيارات وخدمات النقل والمواصلات',
    icon: <Car className="h-5 w-5" />,
    accountsCount: 139,
    category: 'industry',
    preview: ['أسطول المركبات', 'إيرادات التأجير', 'صيانة المركبات', 'تأمين المركبات', 'رسوم التأخير', 'رواتب السائقين', 'مصاريف الوقود', 'رسوم الترخيص']
  }
];

export const AccountTemplateManager: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<AccountTemplate | null>(null);
  const [showAccountSelection, setShowAccountSelection] = useState(false);
  
  const copyDefaultAccounts = useCopyDefaultAccounts();
  const copySelectedAccounts = useCopySelectedAccounts();
  const { getAccountsByBusinessType } = useBusinessTypeAccounts();

  const handleApplyTemplate = (templateId: string) => {
    if (templateId === 'general_business') {
      copyDefaultAccounts.mutate();
    } else if (templateId === 'car_rental') {
      // Apply car rental specific accounts
      const carRentalAccounts = getAccountsByBusinessType('car_rental');
      const allCarRentalAccounts = [
        ...carRentalAccounts.assets,
        ...carRentalAccounts.liabilities,
        ...carRentalAccounts.revenue,
        ...carRentalAccounts.expenses,
        ...carRentalAccounts.equity
      ];
      copySelectedAccounts.mutate(allCarRentalAccounts);
    } else {
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
              onClick={() => handleApplyTemplate(template.id)}
              disabled={copyDefaultAccounts.isPending || copySelectedAccounts.isPending}
              className="flex-1 flex items-center gap-2"
            >
              {(copyDefaultAccounts.isPending || copySelectedAccounts.isPending) ? (
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
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleSelectAccounts(template)}
              className="flex-1"
            >
              اختيار الحسابات
            </Button>
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
              تطبيق قالب سيضيف الحسابات الجديدة إلى دليلك الحالي دون حذف الحسابات الموجودة
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