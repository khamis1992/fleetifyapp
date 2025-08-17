import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    id: 'automotive',
    name: 'Automotive',
    nameAr: 'السيارات والنقل',
    description: 'لشركات بيع وصيانة السيارات والنقل',
    icon: <Car className="h-5 w-5" />,
    accountsCount: 110,
    category: 'industry',
    preview: ['مبيعات السيارات', 'قطع الغيار', 'مصاريف الصيانة', 'إيرادات الخدمات', 'تكلفة قطع الغيار']
  }
];

export const AccountTemplateManager: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<AccountTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const copyDefaultAccounts = useCopyDefaultAccounts();

  const handleApplyTemplate = (templateId: string) => {
    if (templateId === 'general_business') {
      copyDefaultAccounts.mutate();
    } else {
      // For now, we'll use the default accounts for all templates
      // In a real implementation, you'd have different RPC functions for different templates
      copyDefaultAccounts.mutate();
    }
  };

  const renderTemplateCard = (template: AccountTemplate) => (
    <Card key={template.id} className="group hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          {template.icon}
          <div>
            <div className="text-base">{template.nameAr}</div>
            <div className="text-sm text-muted-foreground font-normal">
              {template.name}
            </div>
          </div>
        </CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {template.accountsCount} حساب
            </Badge>
            <Badge variant={template.category === 'business' ? 'default' : 'secondary'}>
              {template.category === 'business' ? 'عام' : 'متخصص'}
            </Badge>
          </div>

          <div className="text-sm text-muted-foreground">
            <div className="font-medium mb-1">أمثلة من الحسابات:</div>
            <div className="text-xs space-y-1">
              {template.preview.slice(0, 3).map((account, index) => (
                <div key={index}>• {account}</div>
              ))}
              {template.preview.length > 3 && (
                <div className="text-muted-foreground">
                  + {template.preview.length - 3} حساب آخر...
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                setSelectedTemplate(template);
                setShowPreview(true);
              }}
              className="flex-1"
            >
              معاينة
            </Button>
            <Button 
              size="sm"
              onClick={() => handleApplyTemplate(template.id)}
              disabled={copyDefaultAccounts.isPending}
              className="flex-1"
            >
              {copyDefaultAccounts.isPending ? (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  تطبيق...
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  تطبيق
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCode className="h-5 w-5" />
          قوالب دليل الحسابات
        </CardTitle>
          <CardDescription>
            اختر قالب جاهز يناسب نوع نشاطك التجاري لتوفير الوقت والجهد
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              تطبيق قالب سيضيف الحسابات الجديدة إلى دليلك الحالي دون حذف الحسابات الموجودة
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs defaultValue="industry" className="space-y-4">
        <TabsList>
          <TabsTrigger value="industry">قوالب متخصصة</TabsTrigger>
        </TabsList>

        <TabsContent value="industry" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PREDEFINED_TEMPLATES
              .filter(t => t.category === 'industry')
              .map(renderTemplateCard)}
          </div>
        </TabsContent>
      </Tabs>

      {/* Template Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate?.icon}
              معاينة قالب: {selectedTemplate?.nameAr}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">نظرة عامة</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>عدد الحسابات: {selectedTemplate.accountsCount}</div>
                  <div>النوع: {selectedTemplate.category === 'business' ? 'عام' : 'متخصص'}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">أمثلة من الحسابات المتضمنة:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {selectedTemplate.preview.map((account, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      {account}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setShowPreview(false)}
                  className="flex-1"
                >
                  إغلاق
                </Button>
                <Button 
                  onClick={() => {
                    handleApplyTemplate(selectedTemplate.id);
                    setShowPreview(false);
                  }}
                  disabled={copyDefaultAccounts.isPending}
                  className="flex-1"
                >
                  تطبيق القالب
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};