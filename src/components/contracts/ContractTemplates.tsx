// @ts-nocheck
/**
 * Contract Templates Component
 * Quick templates for common contract settings (fines, guarantees, etc.)
 * Note: Templates don't include fixed prices - prices are custom per customer
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Building2,
  FileText,
  Settings,
  ChevronLeft,
  Check,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

// Template types
export interface ContractTemplate {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  icon: React.ElementType;
  contractType: string;
  // Settings (not prices!)
  settings: {
    lateFeePerDay?: number;
    securityDeposit?: number;
    kmLimit?: number;
    extraKmFee?: number;
    gracePeriodHours?: number;
    insuranceIncluded?: boolean;
    fuelPolicy?: 'full_to_full' | 'same_to_same' | 'prepaid';
    cancellationPolicy?: 'flexible' | 'moderate' | 'strict';
  };
  // Recommended durations
  recommendedDurations?: {
    min: number;
    max: number;
    typical: number;
  };
  // Tags for filtering
  tags: string[];
}

// Predefined templates
const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'daily_standard',
    name: 'Daily Rental',
    nameAr: 'إيجار يومي قياسي',
    description: 'للإيجارات القصيرة من يوم إلى أسبوع',
    icon: Calendar,
    contractType: 'daily',
    settings: {
      lateFeePerDay: 100,
      securityDeposit: 500,
      kmLimit: 200,
      extraKmFee: 1,
      gracePeriodHours: 2,
      insuranceIncluded: true,
      fuelPolicy: 'full_to_full',
      cancellationPolicy: 'flexible',
    },
    recommendedDurations: { min: 1, max: 7, typical: 3 },
    tags: ['قصير', 'سياحة', 'أفراد'],
  },
  {
    id: 'weekly_standard',
    name: 'Weekly Rental',
    nameAr: 'إيجار أسبوعي',
    description: 'للإيجارات المتوسطة من أسبوع إلى شهر',
    icon: CalendarDays,
    contractType: 'weekly',
    settings: {
      lateFeePerDay: 75,
      securityDeposit: 750,
      kmLimit: 1500,
      extraKmFee: 0.75,
      gracePeriodHours: 4,
      insuranceIncluded: true,
      fuelPolicy: 'full_to_full',
      cancellationPolicy: 'moderate',
    },
    recommendedDurations: { min: 7, max: 30, typical: 14 },
    tags: ['متوسط', 'عمل', 'زيارة'],
  },
  {
    id: 'monthly_standard',
    name: 'Monthly Rental',
    nameAr: 'إيجار شهري',
    description: 'للإيجارات الطويلة شهر فأكثر',
    icon: CalendarRange,
    contractType: 'monthly',
    settings: {
      lateFeePerDay: 50,
      securityDeposit: 1000,
      kmLimit: 5000,
      extraKmFee: 0.5,
      gracePeriodHours: 24,
      insuranceIncluded: true,
      fuelPolicy: 'same_to_same',
      cancellationPolicy: 'moderate',
    },
    recommendedDurations: { min: 30, max: 180, typical: 30 },
    tags: ['طويل', 'إقامة', 'توفير'],
  },
  {
    id: 'corporate',
    name: 'Corporate Rental',
    nameAr: 'إيجار شركات',
    description: 'للشركات والمؤسسات - شروط خاصة',
    icon: Building2,
    contractType: 'monthly',
    settings: {
      lateFeePerDay: 0, // Usually waived for corporate
      securityDeposit: 0, // Credit-based
      kmLimit: 0, // Unlimited
      extraKmFee: 0,
      gracePeriodHours: 48,
      insuranceIncluded: true,
      fuelPolicy: 'same_to_same',
      cancellationPolicy: 'flexible',
    },
    recommendedDurations: { min: 30, max: 365, typical: 90 },
    tags: ['شركات', 'B2B', 'VIP'],
  },
  {
    id: 'custom',
    name: 'Custom',
    nameAr: 'مخصص',
    description: 'إعدادات مخصصة حسب الاتفاق',
    icon: Settings,
    contractType: 'daily',
    settings: {},
    tags: ['مخصص'],
  },
];

// Template Card Component
const TemplateCard: React.FC<{
  template: ContractTemplate;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ template, isSelected, onSelect }) => {
  const Icon = template.icon;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full p-4 rounded-xl border-2 text-right transition-all',
        'hover:border-coral-300 hover:bg-rose-50/50',
        isSelected
          ? 'border-rose-500 bg-rose-50 shadow-sm'
          : 'border-neutral-200 bg-white'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-2 rounded-lg',
            isSelected ? 'bg-rose-500 text-white' : 'bg-neutral-100 text-neutral-600'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-neutral-900">{template.nameAr}</h4>
            {isSelected && <Check className="h-5 w-5 text-rose-500" />}
          </div>
          <p className="text-sm text-neutral-500 mt-1">{template.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {template.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
};

// Template Settings Preview
const TemplateSettingsPreview: React.FC<{
  template: ContractTemplate;
}> = ({ template }) => {
  const { formatCurrency } = useCurrencyFormatter();
  const { settings } = template;

  if (template.id === 'custom') {
    return (
      <div className="text-sm text-neutral-500 text-center py-4">
        <Settings className="h-8 w-8 mx-auto mb-2 text-neutral-400" />
        <p>قم بتعيين الإعدادات يدوياً</p>
      </div>
    );
  }

  const items = [
    { label: 'غرامة التأخير/يوم', value: settings.lateFeePerDay ? formatCurrency(settings.lateFeePerDay) : 'لا يوجد' },
    { label: 'مبلغ الضمان', value: settings.securityDeposit ? formatCurrency(settings.securityDeposit) : 'بدون ضمان' },
    { label: 'حد الكيلومترات', value: settings.kmLimit ? `${settings.kmLimit} كم` : 'غير محدود' },
    { label: 'رسوم الكم الإضافي', value: settings.extraKmFee ? formatCurrency(settings.extraKmFee) : 'مجاني' },
    { label: 'فترة السماح', value: settings.gracePeriodHours ? `${settings.gracePeriodHours} ساعة` : 'لا يوجد' },
    { label: 'التأمين', value: settings.insuranceIncluded ? 'مشمول' : 'غير مشمول' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <div key={item.label} className="flex justify-between text-sm p-2 bg-neutral-50 rounded">
          <span className="text-neutral-500">{item.label}</span>
          <span className="font-medium">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

// Main Component Props
interface ContractTemplatesProps {
  /** Currently selected template ID */
  selectedTemplateId?: string;
  /** Callback when template is selected */
  onSelectTemplate: (template: ContractTemplate) => void;
  /** Show as inline selector or dialog */
  variant?: 'inline' | 'dialog';
  /** Trigger button for dialog variant */
  triggerButton?: React.ReactNode;
}

// Main Component
export const ContractTemplates: React.FC<ContractTemplatesProps> = ({
  selectedTemplateId,
  onSelectTemplate,
  variant = 'inline',
  triggerButton,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<ContractTemplate | null>(null);

  const selectedTemplate = CONTRACT_TEMPLATES.find((t) => t.id === selectedTemplateId);

  const handleSelect = (template: ContractTemplate) => {
    onSelectTemplate(template);
    if (variant === 'dialog') {
      setIsOpen(false);
    }
  };

  const content = (
    <div className="space-y-4">
      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CONTRACT_TEMPLATES.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplateId === template.id}
            onSelect={() => {
              setPreviewTemplate(template);
              handleSelect(template);
            }}
          />
        ))}
      </div>

      {/* Settings Preview */}
      {previewTemplate && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              إعدادات القالب: {previewTemplate.nameAr}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TemplateSettingsPreview template={previewTemplate} />
          </CardContent>
        </Card>
      )}

      {/* Important Note */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm">
        <Info className="h-4 w-4 text-blue-600 mt-0.5" />
        <div className="text-blue-800">
          <strong>ملاحظة:</strong> القوالب تحدد الإعدادات فقط (الغرامات، الضمان، الحدود). 
          السعر يُدخل يدوياً ويُخصص لكل عميل.
        </div>
      </div>
    </div>
  );

  if (variant === 'dialog') {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {triggerButton || (
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              {selectedTemplate ? selectedTemplate.nameAr : 'اختر قالب'}
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>اختر قالب العقد</DialogTitle>
            <DialogDescription>
              القوالب تحدد الإعدادات الافتراضية للعقد. يمكنك تعديلها لاحقاً.
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          قوالب العقود
        </CardTitle>
        <CardDescription>
          اختر قالباً لتطبيق الإعدادات الافتراضية
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
};

// Export templates for external use
export { CONTRACT_TEMPLATES };
export type { ContractTemplate };
export default ContractTemplates;

