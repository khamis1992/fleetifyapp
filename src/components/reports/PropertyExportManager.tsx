import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Image, 
  Mail, 
  Calendar,
  Settings,
  Palette,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'html' | 'json';
  includeCharts: boolean;
  includeLogo: boolean;
  customColors: boolean;
  colorScheme: 'blue' | 'green' | 'purple' | 'orange';
  sections: string[];
  dateRange: {
    from?: Date;
    to?: Date;
  };
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
}

interface PropertyExportManagerProps {
  reportData: any;
  reportType: string;
  onExport: (options: ExportOptions) => Promise<void>;
}

export const PropertyExportManager: React.FC<PropertyExportManagerProps> = ({
  reportData,
  reportType,
  onExport
}) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeCharts: true,
    includeLogo: true,
    customColors: false,
    colorScheme: 'blue',
    sections: ['overview', 'financial', 'performance'],
    dateRange: {},
    schedule: {
      enabled: false,
      frequency: 'monthly',
      recipients: []
    }
  });

  const formatIcons = {
    pdf: FileText,
    excel: FileSpreadsheet,
    csv: FileSpreadsheet,
    html: Image,
    json: FileText
  };

  const formatLabels = {
    pdf: 'PDF',
    excel: 'Excel',
    csv: 'CSV', 
    html: 'HTML',
    json: 'JSON'
  };

  const sectionOptions = [
    { id: 'overview', label: 'نظرة عامة', description: 'ملخص المؤشرات الرئيسية' },
    { id: 'financial', label: 'التقارير المالية', description: 'الإيرادات والأرباح والتكاليف' },
    { id: 'performance', label: 'تقارير الأداء', description: 'أداء العقارات الفردية' },
    { id: 'occupancy', label: 'تحليل الإشغال', description: 'معدلات الإشغال والشغور' },
    { id: 'portfolio', label: 'تحليل المحفظة', description: 'تحليل شامل للمحفظة العقارية' },
    { id: 'analytics', label: 'التحليلات المتقدمة', description: 'اتجاهات السوق والتوصيات' }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(options);
      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير التقرير بصيغة ${formatLabels[options.format]} بنجاح`
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير التقرير",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const updateOption = <K extends keyof ExportOptions>(
    key: K, 
    value: ExportOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const toggleSection = (sectionId: string) => {
    setOptions(prev => ({
      ...prev,
      sections: prev.sections.includes(sectionId)
        ? prev.sections.filter(id => id !== sectionId)
        : [...prev.sections, sectionId]
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          تصدير التقرير
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            إعدادات تصدير التقرير
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">صيغة التصدير</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(formatLabels).map(([format, label]) => {
                  const Icon = formatIcons[format as keyof typeof formatIcons];
                  return (
                    <div
                      key={format}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        options.format === format
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => updateOption('format', format as any)}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Sections Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">أقسام التقرير</CardTitle>
              <p className="text-sm text-muted-foreground">اختر الأقسام التي تريد تضمينها في التقرير</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sectionOptions.map((section) => (
                  <div key={section.id} className="flex items-start space-x-2 space-x-reverse">
                    <Checkbox
                      id={section.id}
                      checked={options.sections.includes(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                    />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor={section.id} className="text-sm font-medium">
                        {section.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Design Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5" />
                خيارات التصميم
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="includeLogo"
                  checked={options.includeLogo}
                  onCheckedChange={(checked) => updateOption('includeLogo', !!checked)}
                />
                <Label htmlFor="includeLogo">تضمين شعار الشركة</Label>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="includeCharts"
                  checked={options.includeCharts}
                  onCheckedChange={(checked) => updateOption('includeCharts', !!checked)}
                />
                <Label htmlFor="includeCharts">تضمين الرسوم البيانية</Label>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="customColors"
                  checked={options.customColors}
                  onCheckedChange={(checked) => updateOption('customColors', !!checked)}
                />
                <Label htmlFor="customColors">استخدام ألوان مخصصة</Label>
              </div>

              {options.customColors && (
                <div className="space-y-2">
                  <Label>نظام الألوان</Label>
                  <Select
                    value={options.colorScheme}
                    onValueChange={(value: any) => updateOption('colorScheme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blue">أزرق</SelectItem>
                      <SelectItem value="green">أخضر</SelectItem>
                      <SelectItem value="purple">بنفسجي</SelectItem>
                      <SelectItem value="orange">برتقالي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                جدولة التقارير
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="scheduleEnabled"
                  checked={options.schedule?.enabled}
                  onCheckedChange={(checked) => updateOption('schedule', {
                    ...options.schedule!,
                    enabled: !!checked
                  })}
                />
                <Label htmlFor="scheduleEnabled">تفعيل الجدولة التلقائية</Label>
              </div>

              {options.schedule?.enabled && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>تكرار الإرسال</Label>
                    <Select
                      value={options.schedule.frequency}
                      onValueChange={(value: any) => updateOption('schedule', {
                        ...options.schedule!,
                        frequency: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">يومي</SelectItem>
                        <SelectItem value="weekly">أسبوعي</SelectItem>
                        <SelectItem value="monthly">شهري</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>البريد الإلكتروني للمستلمين</Label>
                    <Input
                      placeholder="أدخل عناوين البريد الإلكتروني مفصولة بفواصل"
                      onChange={(e) => updateOption('schedule', {
                        ...options.schedule!,
                        recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                      })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">ملخص التصدير</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>الصيغة:</span>
                  <Badge>{formatLabels[options.format]}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>عدد الأقسام:</span>
                  <Badge variant="outline">{options.sections.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>تضمين الرسوم البيانية:</span>
                  <Badge variant={options.includeCharts ? "default" : "secondary"}>
                    {options.includeCharts ? 'نعم' : 'لا'}
                  </Badge>
                </div>
                {options.schedule?.enabled && (
                  <div className="flex justify-between">
                    <span>الجدولة:</span>
                    <Badge variant="outline">{
                      options.schedule.frequency === 'daily' ? 'يومي' :
                      options.schedule.frequency === 'weekly' ? 'أسبوعي' : 'شهري'
                    }</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  جاري التصدير...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  تصدير الآن
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};