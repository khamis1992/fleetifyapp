/**
 * Legal Document Generator Page
 * Main page for generating official legal documents
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Plus, Clock, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { CATEGORY_INFO } from '@/types/legal-document-generator';
import { useDocumentGenerations } from '@/hooks/useDocumentGenerations';
import { useTemplatesByCategory } from '@/hooks/useDocumentTemplates';

import { CategorySelector } from '@/components/legal/document-generator/CategorySelector';
import { TemplateSelector } from '@/components/legal/document-generator/TemplateSelector';
import { DocumentWizard } from '@/components/legal/document-generator/DocumentWizard';
import { DocumentPreview } from '@/components/legal/document-generator/DocumentPreview';
import { DocumentHistory } from '@/components/legal/document-generator/DocumentHistory';

type WizardStep = 'category' | 'template' | 'form' | 'preview';

export default function LegalDocumentGeneratorPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<WizardStep>('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [generatedDocument, setGeneratedDocument] = useState<any>(null);
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  // Fetch templates by category
  const { data: templatesByCategory, isLoading: templatesLoading } = useTemplatesByCategory();

  // Fetch document history
  const { data: documents, isLoading: documentsLoading } = useDocumentGenerations();

  // Get templates for selected category
  const categoryTemplates = selectedCategory && templatesByCategory
    ? templatesByCategory[selectedCategory as keyof typeof templatesByCategory] || []
    : [];

  // Get selected template
  const selectedTemplate = categoryTemplates.find(t => t.id === selectedTemplateId) || null;

  /**
   * Handle category selection
   */
  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentStep('template');
    setSelectedTemplateId(null);
    setFormData({});
    setGeneratedDocument(null);
  };

  /**
   * Handle template selection
   */
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setCurrentStep('form');
  };

  /**
   * Handle form submission
   */
  const handleFormSubmit = (data: Record<string, any>, document: any, generationId: string) => {
    setFormData(data);
    setGeneratedDocument(document);
    setGeneratedId(generationId);
    setCurrentStep('preview');
  };

  /**
   * Handle back to previous step
   */
  const handleBack = () => {
    switch (currentStep) {
      case 'template':
        setCurrentStep('category');
        setSelectedCategory(null);
        break;
      case 'form':
        setCurrentStep('template');
        setSelectedTemplateId(null);
        break;
      case 'preview':
        setCurrentStep('form');
        setGeneratedDocument(null);
        break;
    }
  };

  /**
   * Handle new document
   */
  const handleNewDocument = () => {
    setCurrentStep('category');
    setSelectedCategory(null);
    setSelectedTemplateId(null);
    setFormData({});
    setGeneratedDocument(null);
    setGeneratedId(null);
  };

  /**
   * Handle edit document
   */
  const handleEdit = () => {
    setCurrentStep('form');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-xl sticky top-0 z-10 border-slate-200/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">مولد الكتب الرسمية</h1>
                <p className="text-sm text-slate-600">
                  نظام توليد الكتب الرسمية لشركة العراف
                </p>
              </div>
            </div>

            {currentStep !== 'category' && (
              <Button variant="outline" onClick={handleNewDocument} className="border-slate-200/50 hover:border-teal-500/30 hover:bg-teal-50/30 rounded-xl">
                <Plus className="h-4 w-4 ml-2" />
                كتاب جديد
              </Button>
            )}
          </div>

          {/* Progress Steps */}
          {currentStep !== 'category' && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <StepIndicator
                number={1}
                label="التصنيف"
                active={currentStep === 'category' || currentStep === 'template' || currentStep === 'form' || currentStep === 'preview'}
                completed={!!selectedCategory}
              />
              <div className="w-16 h-0.5 bg-muted" />
              <StepIndicator
                number={2}
                label="القالب"
                active={currentStep === 'template' || currentStep === 'form' || currentStep === 'preview'}
                completed={!!selectedTemplateId}
              />
              <div className="w-16 h-0.5 bg-muted" />
              <StepIndicator
                number={3}
                label="البيانات"
                active={currentStep === 'form' || currentStep === 'preview'}
                completed={currentStep === 'preview'}
              />
              <div className="w-16 h-0.5 bg-muted" />
              <StepIndicator
                number={4}
                label="المعاينة"
                active={currentStep === 'preview'}
                completed={false}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="generator" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 bg-white/80 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200/50">
            <TabsTrigger value="generator" className="hover:bg-teal-50/30 rounded-xl">
              <FileText className="h-4 w-4 ml-2" />
              إنشاء كتاب
            </TabsTrigger>
            <TabsTrigger value="history" className="hover:bg-teal-50/30 rounded-xl">
              <Clock className="h-4 w-4 ml-2" />
              السجل
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="space-y-6">
            {/* Step 1: Category Selection */}
            {currentStep === 'category' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="text-slate-900">اختر نوع الكتاب</CardTitle>
                    <CardDescription className="text-slate-600">
                      اختر الفئة المناسبة للكتاب الذي تريد إنشاءه
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {templatesLoading ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <CategorySelector
                        categories={Object.values(CATEGORY_INFO)}
                        onSelect={handleSelectCategory}
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 2: Template Selection */}
            {currentStep === 'template' && selectedCategory && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-slate-900">اختر القالب</CardTitle>
                        <CardDescription className="text-slate-600">
                          اختر القالب المناسب من فئة {CATEGORY_INFO[selectedCategory as keyof typeof CATEGORY_INFO]?.name_ar}
                        </CardDescription>
                      </div>
                      <Button variant="ghost" onClick={handleBack} className="hover:bg-teal-50/30 rounded-xl">
                        رجوع
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <TemplateSelector
                      templates={categoryTemplates}
                      categoryInfo={CATEGORY_INFO[selectedCategory as keyof typeof CATEGORY_INFO]}
                      onSelect={handleSelectTemplate}
                      onBack={handleBack}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 3: Form */}
            {currentStep === 'form' && selectedTemplate && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-slate-900">{selectedTemplate.name_ar}</CardTitle>
                        <CardDescription className="text-slate-600">
                          {selectedTemplate.description_ar}
                        </CardDescription>
                      </div>
                      <Button variant="ghost" onClick={handleBack} className="hover:bg-teal-50/30 rounded-xl">
                        رجوع
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DocumentWizard
                      template={selectedTemplate}
                      onSubmit={handleFormSubmit}
                      onBack={handleBack}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 4: Preview */}
            {currentStep === 'preview' && generatedDocument && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-slate-900">
                          <CheckCircle className="h-5 w-5 text-teal-500" />
                          معاينة الكتاب
                        </CardTitle>
                        <CardDescription className="text-slate-600">
                          راجع الكتاب وقم بتصديره أو إرساله للموافقة
                        </CardDescription>
                      </div>
                      <Button variant="ghost" onClick={handleEdit} className="hover:bg-teal-50/30 rounded-xl">
                        تعديل
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DocumentPreview
                      document={generatedDocument}
                      generationId={generatedId!}
                      template={selectedTemplate!}
                      onNew={handleNewDocument}
                      onEdit={handleEdit}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-slate-900">سجل الكتب</CardTitle>
                <CardDescription className="text-slate-600">
                  عرض جميع الكتب التي تم إنشاؤها
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentHistory
                  documents={documents || []}
                  loading={documentsLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/**
 * Step Indicator Component
 */
interface StepIndicatorProps {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}

function StepIndicator({ number, label, active, completed }: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`
          w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all
          ${completed ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/20' : ''}
          ${active && !completed ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/20' : ''}
          ${!active && !completed ? 'bg-slate-100 text-slate-500' : ''}
        `}
      >
        {completed ? <CheckCircle className="h-5 w-5" /> : number}
      </div>
      <span className={`text-xs mt-1 ${active ? 'text-teal-600 font-medium' : 'text-slate-500'}`}>
        {label}
      </span>
    </div>
  );
}
