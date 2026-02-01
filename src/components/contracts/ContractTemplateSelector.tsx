// @ts-nocheck
/**
 * Contract Template Selector Component
 * 
 * Allows users to:
 * - Browse preset and custom templates
 * - Apply templates with one click
 * - Create new custom templates
 * - Manage existing templates
 */

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Plus, 
  Star, 
  Calendar, 
  Check,
  Save,
  X,
  Trash
} from 'lucide-react';
import { 
  useContractTemplates, 
  useCreateContractTemplate,
  useDeleteContractTemplate,
  applyTemplateToContract,
  calculateTemplateDiscount,
  ContractTemplate,
  ContractTemplateData
} from '@/hooks/useContractTemplates';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface ContractTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyTemplate: (contractData: any) => void;
  currentContractData?: any;
  selectedVehicle?: any;
}

export const ContractTemplateSelector: React.FC<ContractTemplateSelectorProps> = ({
  open,
  onOpenChange,
  onApplyTemplate,
  currentContractData,
  selectedVehicle
}) => {
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  
  const { data: templates, isLoading } = useContractTemplates();
  const createTemplate = useCreateContractTemplate();
  const deleteTemplate = useDeleteContractTemplate();
  const { formatCurrency } = useCurrencyFormatter();

  const [newTemplate, setNewTemplate] = useState<ContractTemplateData>({
    template_name: '',
    contract_type: 'monthly_rental',
    rental_days: 30,
    description: '',
    terms: '',
  });

  const handleApplyTemplate = (template: ContractTemplate) => {
    const appliedData = applyTemplateToContract(template, currentContractData);
    
    // Calculate discount if applicable
    if (selectedVehicle && template.preset_config?.discountPercentage) {
      const baseAmount = calculateContractAmount(template, selectedVehicle);
      const discountedAmount = calculateTemplateDiscount(baseAmount, template);
      (appliedData as any).contract_amount = discountedAmount;
    }
    
    onApplyTemplate(appliedData);
    toast.success(`تم تطبيق قالب "${template.template_name}" بنجاح`, {
      description: template.preset_config?.discountPercentage 
        ? `خصم ${template.preset_config.discountPercentage}% مطبق`
        : undefined
    });
    onOpenChange(false);
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.template_name.trim()) {
      toast.error('يرجى إدخال اسم القالب');
      return;
    }

    try {
      await createTemplate.mutateAsync(newTemplate);
      setShowCreateTemplate(false);
      setNewTemplate({
        template_name: '',
        contract_type: 'monthly_rental',
        rental_days: 30,
        description: '',
        terms: '',
      });
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا القالب?')) {
      try {
        await deleteTemplate.mutateAsync(templateId);
      } catch (error) {
        console.error('Error deleting template:', error);
      }
    }
  };

  const calculateContractAmount = (template: ContractTemplate, vehicle: any): number => {
    if (!vehicle) return 0;
    
    const days = template.rental_days;
    const dailyRate = vehicle.daily_rate || 0;
    const weeklyRate = vehicle.weekly_rate || 0;
    const monthlyRate = vehicle.monthly_rate || 0;
    
    switch (template.contract_type) {
      case 'daily_rental':
        return dailyRate * days;
      case 'weekly_rental':
        return weeklyRate * Math.ceil(days / 7);
      case 'monthly_rental':
        return monthlyRate * Math.ceil(days / 30);
      default:
        return dailyRate * days;
    }
  };

  const presetTemplates = ((templates || []) as ContractTemplate[]).filter(t => t.template_type === 'preset');
  const customTemplates = ((templates || []) as ContractTemplate[]).filter(t => t.template_type === 'custom');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            قوالب العقود
          </DialogTitle>
          <DialogDescription>
            اختر قالباً جاهزاً أو قم بإنشاء قالب مخصص لتوفير الوقت
          </DialogDescription>
        </DialogHeader>

        {/* Create Template Form */}
        {showCreateTemplate ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>إنشاء قالب جديد</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowCreateTemplate(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>اسم القالب *</Label>
                <Input
                  value={newTemplate.template_name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, template_name: e.target.value })}
                  placeholder="مثال: عقد شهري VIP"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نوع العقد</Label>
                  <Select
                    value={newTemplate.contract_type}
                    onValueChange={(value: any) => setNewTemplate({ ...newTemplate, contract_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily_rental">إيجار يومي</SelectItem>
                      <SelectItem value="weekly_rental">إيجار أسبوعي</SelectItem>
                      <SelectItem value="monthly_rental">إيجار شهري</SelectItem>
                      <SelectItem value="yearly_rental">إيجار سنوي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>عدد الأيام</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newTemplate.rental_days}
                    onChange={(e) => setNewTemplate({ ...newTemplate, rental_days: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="وصف مختصر للقالب..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>الشروط</Label>
                <Textarea
                  value={newTemplate.terms}
                  onChange={(e) => setNewTemplate({ ...newTemplate, terms: e.target.value })}
                  placeholder="شروط وأحكام العقد..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateTemplate(false)}
                >
                  إلغاء
                </Button>
                <Button 
                  onClick={handleCreateTemplate}
                  disabled={createTemplate.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  حفظ القالب
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Action Button */}
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateTemplate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                إنشاء قالب مخصص
              </Button>
            </div>

            {/* Preset Templates */}
            {presetTemplates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  قوالب جاهزة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {presetTemplates.map((template: ContractTemplate) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onApply={handleApplyTemplate}
                      onDelete={handleDeleteTemplate}
                      isPreset
                      selectedVehicle={selectedVehicle}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Custom Templates */}
            {customTemplates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  قوالبي المخصصة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customTemplates.map((template: ContractTemplate) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onApply={handleApplyTemplate}
                      onDelete={handleDeleteTemplate}
                      selectedVehicle={selectedVehicle}
                      formatCurrency={formatCurrency}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {customTemplates.length === 0 && !isLoading && (
              <Alert>
                <AlertDescription>
                  لا توجد قوالب مخصصة. قم بإنشاء قالب جديد لتوفير الوقت في المرات القادمة
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

interface TemplateCardProps {
  template: ContractTemplate;
  onApply: (template: ContractTemplate) => void;
  onDelete: (id: string) => void;
  isPreset?: boolean;
  selectedVehicle?: any;
  formatCurrency: (amount: number, options?: any) => string;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onApply,
  onDelete,
  isPreset,
  selectedVehicle,
  formatCurrency
}) => {
  const discountBadge = template.preset_config?.discountPercentage && (
    <Badge variant="secondary" className="bg-green-100 text-green-800">
      خصم {template.preset_config.discountPercentage}%
    </Badge>
  );

  return (
    <Card className="hover:border-primary transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              {template.template_name}
              {isPreset && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {template.rental_days} يوم
              {discountBadge}
            </div>
          </div>
          {!isPreset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(template.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {template.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {template.description}
          </p>
        )}

        {template.preset_config?.features && template.preset_config.features.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.preset_config.features.slice(0, 3).map((feature, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {feature}
              </Badge>
            ))}
            {template.preset_config.features.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{template.preset_config.features.length - 3}
              </Badge>
            )}
          </div>
        )}

        <Button 
          onClick={() => onApply(template)} 
          className="w-full"
          size="sm"
        >
          <Check className="h-4 w-4 mr-2" />
          تطبيق القالب
        </Button>
      </CardContent>
    </Card>
  );
};
