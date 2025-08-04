import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { FileText, Download, Eye, Settings, Wand2, Check, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

// أنواع البيانات
interface DocumentTemplate {
  id: string;
  name: string;
  type: 'contract' | 'agreement' | 'memo' | 'letter' | 'report';
  description: string;
  fields: TemplateField[];
  complexity: 'simple' | 'medium' | 'complex';
  estimatedTime: number; // بالدقائق
}

interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface GeneratedDocument {
  id: string;
  title: string;
  type: string;
  content: string;
  createdAt: string;
  status: 'draft' | 'review' | 'final';
  wordCount: number;
  confidence: number;
}

interface DocumentGeneratorProps {
  onDocumentGenerated?: (document: GeneratedDocument) => void;
}

const LegalDocumentGenerator: React.FC<DocumentGeneratorProps> = ({ onDocumentGenerated }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocument[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');

  // قوالب الوثائق المتاحة
  const documentTemplates: DocumentTemplate[] = [
    {
      id: 'rental-contract',
      name: 'عقد إيجار',
      type: 'contract',
      description: 'عقد إيجار شامل للعقارات السكنية والتجارية',
      complexity: 'medium',
      estimatedTime: 5,
      fields: [
        { id: 'landlord_name', name: 'landlord_name', type: 'text', label: 'اسم المؤجر', required: true, placeholder: 'أدخل اسم المؤجر' },
        { id: 'tenant_name', name: 'tenant_name', type: 'text', label: 'اسم المستأجر', required: true, placeholder: 'أدخل اسم المستأجر' },
        { id: 'property_address', name: 'property_address', type: 'textarea', label: 'عنوان العقار', required: true, placeholder: 'أدخل العنوان الكامل للعقار' },
        { id: 'rental_amount', name: 'rental_amount', type: 'number', label: 'مبلغ الإيجار الشهري', required: true, placeholder: '0' },
        { id: 'lease_duration', name: 'lease_duration', type: 'select', label: 'مدة الإيجار', required: true, options: ['سنة واحدة', 'سنتين', 'ثلاث سنوات', 'خمس سنوات'] },
        { id: 'start_date', name: 'start_date', type: 'date', label: 'تاريخ البداية', required: true },
        { id: 'deposit_amount', name: 'deposit_amount', type: 'number', label: 'مبلغ التأمين', required: true, placeholder: '0' }
      ]
    },
    {
      id: 'employment-contract',
      name: 'عقد عمل',
      type: 'contract',
      description: 'عقد توظيف شامل يحدد حقوق وواجبات الطرفين',
      complexity: 'complex',
      estimatedTime: 8,
      fields: [
        { id: 'company_name', name: 'company_name', type: 'text', label: 'اسم الشركة', required: true, placeholder: 'أدخل اسم الشركة' },
        { id: 'employee_name', name: 'employee_name', type: 'text', label: 'اسم الموظف', required: true, placeholder: 'أدخل اسم الموظف' },
        { id: 'job_title', name: 'job_title', type: 'text', label: 'المسمى الوظيفي', required: true, placeholder: 'أدخل المسمى الوظيفي' },
        { id: 'salary', name: 'salary', type: 'number', label: 'الراتب الشهري', required: true, placeholder: '0' },
        { id: 'start_date', name: 'start_date', type: 'date', label: 'تاريخ بداية العمل', required: true },
        { id: 'work_hours', name: 'work_hours', type: 'select', label: 'ساعات العمل', required: true, options: ['دوام كامل (8 ساعات)', 'دوام جزئي (4 ساعات)', 'مرن'] },
        { id: 'probation_period', name: 'probation_period', type: 'select', label: 'فترة التجربة', required: true, options: ['3 أشهر', '6 أشهر', 'بدون فترة تجربة'] }
      ]
    },
    {
      id: 'legal-memo',
      name: 'مذكرة قانونية',
      type: 'memo',
      description: 'مذكرة قانونية تحليلية للقضايا والاستشارات',
      complexity: 'medium',
      estimatedTime: 6,
      fields: [
        { id: 'memo_title', name: 'memo_title', type: 'text', label: 'عنوان المذكرة', required: true, placeholder: 'أدخل عنوان المذكرة' },
        { id: 'client_name', name: 'client_name', type: 'text', label: 'اسم العميل', required: true, placeholder: 'أدخل اسم العميل' },
        { id: 'case_summary', name: 'case_summary', type: 'textarea', label: 'ملخص القضية', required: true, placeholder: 'أدخل ملخص مفصل للقضية' },
        { id: 'legal_issue', name: 'legal_issue', type: 'select', label: 'نوع المسألة القانونية', required: true, options: ['عقود', 'عمالية', 'تجارية', 'عقارية', 'أحوال شخصية', 'جنائية'] },
        { id: 'jurisdiction', name: 'jurisdiction', type: 'select', label: 'الاختصاص', required: true, options: ['السعودية', 'الإمارات', 'الكويت', 'قطر', 'البحرين', 'عُمان'] }
      ]
    },
    {
      id: 'partnership-agreement',
      name: 'اتفاقية شراكة',
      type: 'agreement',
      description: 'اتفاقية شراكة تجارية شاملة',
      complexity: 'complex',
      estimatedTime: 10,
      fields: [
        { id: 'company_name', name: 'company_name', type: 'text', label: 'اسم الشركة', required: true, placeholder: 'أدخل اسم الشركة' },
        { id: 'partner1_name', name: 'partner1_name', type: 'text', label: 'اسم الشريك الأول', required: true, placeholder: 'أدخل اسم الشريك الأول' },
        { id: 'partner2_name', name: 'partner2_name', type: 'text', label: 'اسم الشريك الثاني', required: true, placeholder: 'أدخل اسم الشريك الثاني' },
        { id: 'partner1_share', name: 'partner1_share', type: 'number', label: 'نسبة الشريك الأول (%)', required: true, placeholder: '50' },
        { id: 'partner2_share', name: 'partner2_share', type: 'number', label: 'نسبة الشريك الثاني (%)', required: true, placeholder: '50' },
        { id: 'business_type', name: 'business_type', type: 'select', label: 'نوع النشاط', required: true, options: ['تجاري', 'صناعي', 'خدمي', 'تقني', 'استشاري'] },
        { id: 'capital_amount', name: 'capital_amount', type: 'number', label: 'رأس المال', required: true, placeholder: '0' }
      ]
    }
  ];

  // توليد الوثيقة
  const generateDocument = async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setCurrentStep('تحليل البيانات المدخلة...');

    try {
      // محاكاة عملية التوليد مع تحديث التقدم
      const steps = [
        'تحليل البيانات المدخلة...',
        'اختيار القالب المناسب...',
        'تطبيق القوانين المحلية...',
        'تحليل المخاطر القانونية...',
        'صياغة المحتوى...',
        'مراجعة النص النهائي...',
        'تنسيق الوثيقة...'
      ];

      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(steps[i]);
        setGenerationProgress((i + 1) / steps.length * 100);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // محاكاة محتوى الوثيقة المولدة
      const documentContent = generateDocumentContent(selectedTemplate, fieldValues);
      
      const newDocument: GeneratedDocument = {
        id: Date.now().toString(),
        title: `${selectedTemplate.name} - ${fieldValues[selectedTemplate.fields[0]?.name] || 'جديد'}`,
        type: selectedTemplate.name,
        content: documentContent,
        createdAt: new Date().toISOString(),
        status: 'draft',
        wordCount: documentContent.split(' ').length,
        confidence: 92 + Math.random() * 7 // 92-99%
      };

      setGeneratedDocuments(prev => [newDocument, ...prev]);
      onDocumentGenerated?.(newDocument);
      
      toast.success('تم توليد الوثيقة بنجاح!');
      
    } catch (error) {
      toast.error('حدث خطأ في توليد الوثيقة');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
      setCurrentStep('');
    }
  };

  // محاكاة محتوى الوثيقة
  const generateDocumentContent = (template: DocumentTemplate, values: Record<string, string>): string => {
    switch (template.id) {
      case 'rental-contract':
        return `
عقد إيجار

بين الأطراف الموقعة أدناه:

المؤجر: ${values.landlord_name || '[اسم المؤجر]'}
المستأجر: ${values.tenant_name || '[اسم المستأجر]'}

تفاصيل العقار:
العنوان: ${values.property_address || '[عنوان العقار]'}

الشروط المالية:
مبلغ الإيجار الشهري: ${values.rental_amount || '[مبلغ الإيجار]'} ريال سعودي
مدة الإيجار: ${values.lease_duration || '[مدة الإيجار]'}
تاريخ البداية: ${values.start_date || '[تاريخ البداية]'}
مبلغ التأمين: ${values.deposit_amount || '[مبلغ التأمين]'} ريال سعودي

أحكام وشروط:
1. يتعهد المستأجر بدفع الإيجار في الموعد المحدد
2. يتعهد المؤجر بتسليم العقار في حالة جيدة
3. لا يحق للمستأجر تأجير العقار للغير دون موافقة خطية من المؤجر
4. يتحمل المستأجر تكاليف الصيانة البسيطة
5. يحق للمؤجر فسخ العقد في حالة عدم دفع الإيجار لمدة شهرين متتاليين

التوقيعات:
المؤجر: ________________    التاريخ: ________________
المستأجر: ________________    التاريخ: ________________
        `;
      
      case 'employment-contract':
        return `
عقد عمل

بين:
الشركة: ${values.company_name || '[اسم الشركة]'}
الموظف: ${values.employee_name || '[اسم الموظف]'}

تفاصيل العمل:
المسمى الوظيفي: ${values.job_title || '[المسمى الوظيفي]'}
الراتب الشهري: ${values.salary || '[الراتب]'} ريال سعودي
تاريخ بداية العمل: ${values.start_date || '[تاريخ البداية]'}
ساعات العمل: ${values.work_hours || '[ساعات العمل]'}
فترة التجربة: ${values.probation_period || '[فترة التجربة]'}

الحقوق والواجبات:
1. يلتزم الموظف بالحضور في المواعيد المحددة
2. يحق للموظف الحصول على إجازة سنوية مدفوعة الأجر
3. تلتزم الشركة بدفع الراتب في موعده
4. يخضع الموظف لأنظمة العمل السعودية

التوقيعات:
الشركة: ________________    التاريخ: ________________
الموظف: ________________    التاريخ: ________________
        `;
      
      default:
        return `وثيقة قانونية مولدة آليًا\n\nالمحتوى التفصيلي للوثيقة...`;
    }
  };

  // تحديث قيم الحقول
  const updateFieldValue = (fieldName: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));
  };

  // التحقق من اكتمال الحقول المطلوبة
  const areRequiredFieldsComplete = (): boolean => {
    if (!selectedTemplate) return false;
    return selectedTemplate.fields
      .filter(field => field.required)
      .every(field => fieldValues[field.name]?.trim());
  };

  // رموز التعقيد
  const getComplexityIcon = (complexity: string) => {
    switch (complexity) {
      case 'simple': return <Check className="h-4 w-4 text-green-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'complex': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'medium': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'complex': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'review': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'final': return 'bg-green-500/10 text-green-700 border-green-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'مسودة';
      case 'review': return 'قيد المراجعة';
      case 'final': return 'نهائي';
      default: return status;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Wand2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">مولد الوثائق القانونية</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          أنشئ وثائق قانونية احترافية باستخدام الذكاء الاصطناعي
        </p>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">إنشاء وثيقة</TabsTrigger>
          <TabsTrigger value="documents">الوثائق المولدة</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          {/* اختيار القالب */}
          {!selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  اختر نوع الوثيقة
                </CardTitle>
                <CardDescription>
                  اختر نوع الوثيقة القانونية التي تريد إنشاءها
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documentTemplates.map(template => (
                    <Card 
                      key={template.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-lg">{template.name}</h3>
                          <div className="flex items-center gap-2">
                            {getComplexityIcon(template.complexity)}
                            <Badge className={getComplexityColor(template.complexity)}>
                              {template.complexity === 'simple' ? 'بسيط' : 
                               template.complexity === 'medium' ? 'متوسط' : 'معقد'}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-muted-foreground text-sm mb-3">
                          {template.description}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          الوقت المقدر: {template.estimatedTime} دقائق
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* نموذج إدخال البيانات */}
          {selectedTemplate && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      {selectedTemplate.name}
                    </CardTitle>
                    <CardDescription>{selectedTemplate.description}</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedTemplate(null);
                      setFieldValues({});
                    }}
                  >
                    تغيير القالب
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTemplate.fields.map(field => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    
                    {field.type === 'text' && (
                      <Input
                        id={field.id}
                        placeholder={field.placeholder}
                        value={fieldValues[field.name] || ''}
                        onChange={(e) => updateFieldValue(field.name, e.target.value)}
                      />
                    )}
                    
                    {field.type === 'number' && (
                      <Input
                        id={field.id}
                        type="number"
                        placeholder={field.placeholder}
                        value={fieldValues[field.name] || ''}
                        onChange={(e) => updateFieldValue(field.name, e.target.value)}
                      />
                    )}
                    
                    {field.type === 'date' && (
                      <Input
                        id={field.id}
                        type="date"
                        value={fieldValues[field.name] || ''}
                        onChange={(e) => updateFieldValue(field.name, e.target.value)}
                      />
                    )}
                    
                    {field.type === 'textarea' && (
                      <Textarea
                        id={field.id}
                        placeholder={field.placeholder}
                        value={fieldValues[field.name] || ''}
                        onChange={(e) => updateFieldValue(field.name, e.target.value)}
                        rows={3}
                      />
                    )}
                    
                    {field.type === 'select' && (
                      <Select
                        value={fieldValues[field.name] || ''}
                        onValueChange={(value) => updateFieldValue(field.name, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر من القائمة" />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map(option => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}

                {/* زر التوليد */}
                <div className="pt-4">
                  <Button 
                    onClick={generateDocument}
                    disabled={!areRequiredFieldsComplete() || isGenerating}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        جاري التوليد...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4" />
                        إنشاء الوثيقة
                      </div>
                    )}
                  </Button>
                </div>

                {/* شريط التقدم */}
                {isGenerating && (
                  <div className="space-y-2">
                    <Progress value={generationProgress} className="w-full" />
                    <p className="text-sm text-muted-foreground text-center">
                      {currentStep}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                الوثائق المولدة ({generatedDocuments.length})
              </CardTitle>
              <CardDescription>
                جميع الوثائق التي تم إنشاؤها باستخدام المولد
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لم يتم إنشاء أي وثائق بعد
                </div>
              ) : (
                <div className="space-y-4">
                  {generatedDocuments.map(doc => (
                    <Card key={doc.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{doc.title}</h3>
                              <Badge className={getStatusColor(doc.status)}>
                                {getStatusText(doc.status)}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              نوع الوثيقة: {doc.type} • {doc.wordCount} كلمة • 
                              الثقة: {doc.confidence.toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              تم الإنشاء: {new Date(doc.createdAt).toLocaleString('ar-SA')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                              معاينة
                            </Button>
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4" />
                              تحميل
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LegalDocumentGenerator;