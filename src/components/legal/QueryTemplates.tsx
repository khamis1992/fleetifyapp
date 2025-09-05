import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Gavel, 
  Scale, 
  Shield, 
  Building, 
  Users, 
  AlertTriangle,
  Search,
  BookOpen,
  FileCheck
} from 'lucide-react';

interface QueryTemplate {
  id: string;
  title: string;
  description: string;
  category: 'contract' | 'consultation' | 'analysis' | 'research' | 'compliance';
  icon: React.ReactNode;
  template: string;
  complexity: 'basic' | 'intermediate' | 'advanced';
  estimatedTime: string;
  tags: string[];
}

interface QueryTemplatesProps {
  onSelectTemplate: (template: QueryTemplate) => void;
  onClose: () => void;
}

const queryTemplates: QueryTemplate[] = [
  {
    id: 'contract_review',
    title: 'مراجعة العقد',
    description: 'تحليل شامل لبنود العقد والمخاطر المحتملة',
    category: 'contract',
    icon: <FileCheck className="h-5 w-5" />,
    template: 'أريد مراجعة شاملة لهذا العقد مع التركيز على: البنود الرئيسية، المخاطر القانونية، الالتزامات المالية، شروط الإنهاء، وأي بنود مشكوك فيها.',
    complexity: 'advanced',
    estimatedTime: '10-15 دقيقة',
    tags: ['عقود', 'مراجعة', 'تحليل', 'مخاطر']
  },
  {
    id: 'legal_consultation',
    title: 'استشارة قانونية عامة',
    description: 'استشارة قانونية حول موضوع محدد',
    category: 'consultation',
    icon: <Scale className="h-5 w-5" />,
    template: 'أحتاج استشارة قانونية حول [اكتب الموضوع هنا]. يرجى تقديم: الوضع القانوني الحالي، الخيارات المتاحة، المخاطر المحتملة، والخطوات المقترحة.',
    complexity: 'intermediate',
    estimatedTime: '5-10 دقائق',
    tags: ['استشارة', 'قانوني', 'نصائح']
  },
  {
    id: 'compliance_check',
    title: 'فحص الامتثال',
    description: 'التحقق من الامتثال للقوانين واللوائح',
    category: 'compliance',
    icon: <Shield className="h-5 w-5" />,
    template: 'أريد فحص امتثال [نوع النشاط/الشركة] للقوانين الكويتية ذات الصلة. يرجى مراجعة: المتطلبات القانونية، التراخيص المطلوبة، اللوائح الحكومية، ومتطلبات التقارير.',
    complexity: 'advanced',
    estimatedTime: '15-20 دقيقة',
    tags: ['امتثال', 'قوانين', 'لوائح', 'تراخيص']
  },
  {
    id: 'risk_assessment',
    title: 'تقييم المخاطر القانونية',
    description: 'تحليل المخاطر القانونية لقرار أو إجراء',
    category: 'analysis',
    icon: <AlertTriangle className="h-5 w-5" />,
    template: 'أريد تقييم المخاطر القانونية لـ [اكتب القرار/الإجراء]. يرجى تحليل: المخاطر المحتملة، احتمالية حدوثها، التأثير المتوقع، واستراتيجيات التخفيف.',
    complexity: 'advanced',
    estimatedTime: '10-15 دقيقة',
    tags: ['مخاطر', 'تقييم', 'تحليل', 'استراتيجية']
  },
  {
    id: 'precedent_research',
    title: 'البحث في السوابق القضائية',
    description: 'البحث عن قضايا مشابهة وأحكام قضائية',
    category: 'research',
    icon: <Search className="h-5 w-5" />,
    template: 'أبحث عن سوابق قضائية في موضوع [اكتب الموضوع]. يرجى العثور على: قضايا مشابهة، الأحكام الصادرة، المبادئ القانونية المطبقة، والدروس المستفادة.',
    complexity: 'intermediate',
    estimatedTime: '5-10 دقائق',
    tags: ['سوابق', 'أحكام', 'قضايا', 'بحث']
  },
  {
    id: 'document_analysis',
    title: 'تحليل الوثائق القانونية',
    description: 'تحليل مفصل للوثائق القانونية',
    category: 'analysis',
    icon: <FileText className="h-5 w-5" />,
    template: 'أريد تحليل هذه الوثيقة القانونية بالتفصيل. يرجى مراجعة: صحة الصياغة، الالتزامات والحقوق، المخاطر المحتملة، والتوصيات للتحسين.',
    complexity: 'advanced',
    estimatedTime: '10-15 دقيقة',
    tags: ['وثائق', 'تحليل', 'صياغة', 'مراجعة']
  },
  {
    id: 'company_formation',
    title: 'تأسيس الشركات',
    description: 'إرشادات حول تأسيس الشركات في الكويت',
    category: 'consultation',
    icon: <Building className="h-5 w-5" />,
    template: 'أريد معلومات شاملة عن تأسيس شركة [نوع الشركة] في الكويت. يرجى تقديم: المتطلبات القانونية، الإجراءات المطلوبة، التكاليف المتوقعة، والجدول الزمني.',
    complexity: 'intermediate',
    estimatedTime: '8-12 دقيقة',
    tags: ['تأسيس', 'شركات', 'إجراءات', 'متطلبات']
  },
  {
    id: 'employment_law',
    title: 'قانون العمل',
    description: 'استشارات حول قانون العمل الكويتي',
    category: 'consultation',
    icon: <Users className="h-5 w-5" />,
    template: 'أحتاج استشارة حول قانون العمل الكويتي فيما يخص [اكتب الموضوع]. يرجى شرح: الأحكام ذات الصلة، حقوق والتزامات الطرفين، العقوبات المحتملة، والإجراءات المطلوبة.',
    complexity: 'intermediate',
    estimatedTime: '6-10 دقائق',
    tags: ['عمل', 'موظفين', 'حقوق', 'التزامات']
  }
];

const getCategoryIcon = (category: QueryTemplate['category']) => {
  switch (category) {
    case 'contract': return <FileCheck className="h-4 w-4" />;
    case 'consultation': return <Scale className="h-4 w-4" />;
    case 'analysis': return <FileText className="h-4 w-4" />;
    case 'research': return <Search className="h-4 w-4" />;
    case 'compliance': return <Shield className="h-4 w-4" />;
    default: return <BookOpen className="h-4 w-4" />;
  }
};

const getComplexityColor = (complexity: QueryTemplate['complexity']) => {
  switch (complexity) {
    case 'basic': return 'bg-green-100 text-green-800';
    case 'intermediate': return 'bg-yellow-100 text-yellow-800';
    case 'advanced': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getCategoryLabel = (category: QueryTemplate['category']) => {
  switch (category) {
    case 'contract': return 'العقود';
    case 'consultation': return 'الاستشارات';
    case 'analysis': return 'التحليل';
    case 'research': return 'البحث';
    case 'compliance': return 'الامتثال';
    default: return 'عام';
  }
};

export const QueryTemplates: React.FC<QueryTemplatesProps> = ({ onSelectTemplate, onClose }) => {
  const categories = Array.from(new Set(queryTemplates.map(t => t.category)));

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              قوالب الاستشارات القانونية
            </CardTitle>
            <CardDescription>
              اختر من القوالب الجاهزة لبدء استشارتك بسرعة وفعالية
            </CardDescription>
          </div>
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-6">
            {categories.map(category => (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(category)}
                  <h3 className="font-semibold text-lg">{getCategoryLabel(category)}</h3>
                </div>
                
                <div className="grid gap-3 md:grid-cols-2">
                  {queryTemplates
                    .filter(template => template.category === category)
                    .map(template => (
                      <Card 
                        key={template.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary/20 hover:border-l-primary"
                        onClick={() => onSelectTemplate(template)}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                {template.icon}
                                <h4 className="font-medium">{template.title}</h4>
                              </div>
                              <Badge 
                                variant="secondary" 
                                className={getComplexityColor(template.complexity)}
                              >
                                {template.complexity === 'basic' ? 'أساسي' : 
                                 template.complexity === 'intermediate' ? 'متوسط' : 'متقدم'}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              {template.description}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex flex-wrap gap-1">
                                {template.tags.slice(0, 3).map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                ⏱️ {template.estimatedTime}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default QueryTemplates;