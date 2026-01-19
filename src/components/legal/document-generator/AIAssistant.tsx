/**
 * AI Assistant Component
 * GLM-powered intelligent document generation helper
 */

import { useState } from 'react';
import { Sparkles, Wand2, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

import { glmService } from '@/services/ai/GLMService';
import { useToast } from '@/components/ui/use-toast';
import type { DocumentTemplate } from '@/types/legal-document-generator';

interface AIAssistantProps {
  template: DocumentTemplate;
  onGenerateDocument: (content: string) => void;
  onSuggestValues: (suggestions: Record<string, any>) => void;
  onImproveDocument: (improvedContent: string) => void;
}

type AIAction = 'generate' | 'suggest' | 'improve';

export function AIAssistant({ 
  template, 
  onGenerateDocument, 
  onSuggestValues, 
  onImproveDocument 
}: AIAssistantProps) {
  const [isConfigured, setIsConfigured] = useState(false);
  const [selectedAction, setSelectedAction] = useState<AIAction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState('');
  const { toast } = useToast();

  // Check if GLM is configured on mount
  useState(() => {
    const configured = glmService.isConfigured();
    setIsConfigured(configured);
    if (configured) {
      const storedKey = localStorage.getItem('glm_api_key') || '';
      setApiKey(storedKey);
    }
  });

  /**
   * Handle configuration save
   */
  const handleSaveConfig = async () => {
    if (!apiKey.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال مفتاح API',
        variant: 'destructive',
      });
      return;
    }

    try {
      await glmService.saveConfig(apiKey);
      setIsConfigured(true);
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إعدادات GLM بنجاح',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في حفظ الإعدادات',
        variant: 'destructive',
      });
    }
  };

  /**
   * Test GLM connection
   */
  const handleTestConnection = async () => {
    setIsProcessing(true);
    try {
      const testResult = await glmService.testConnection();
      
      if (testResult.success) {
        toast({
          title: 'نجح',
          description: testResult.message,
          variant: 'default',
        });
      } else {
        toast({
          title: 'فشل',
          description: testResult.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: error instanceof Error ? error.message : 'فشل في اختبار الاتصال',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle AI action
   */
  const handleAIAction = async () => {
    if (!isConfigured) {
      toast({
        title: 'غير مهيأ',
        description: 'يرجى إعداد GLM أولاً',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setSelectedAction(null);
    setResult('');

    try {
      switch (selectedAction) {
        case 'generate':
          await handleGenerate();
          break;
        case 'suggest':
          await handleSuggest();
          break;
        case 'improve':
          await handleImprove();
          break;
      }
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Generate document with GLM
   */
  const handleGenerate = async () => {
    const response = await glmService.generateDocument(
      template.body_template || '',
      {
        documentType: template.name_ar || template.name_en || '',
        companyInfo: null,
        additionalData: {},
      }
    );

    if (response.success && response.content) {
      setResult(response.content);
      onGenerateDocument(response.content);
      toast({
        title: 'تم التوليد',
        description: 'تم توليد الكتاب باستخدام GLM بنجاح',
        variant: 'default',
      });
    } else {
      toast({
        title: 'فشل',
        description: response.error || 'فشل في توليد الكتاب',
        variant: 'destructive',
      });
    }
  };

  /**
   * Suggest field values
   */
  const handleSuggest = async () => {
    const response = await glmService.suggestFieldValues(
      template.name_ar || template.name_en || '',
      {
        companyId: '',
      }
    );

    if (response.success && response.content) {
      try {
        const parsed = JSON.parse(response.content || '{}');
        onSuggestValues(parsed);
        setResult(`تم اقتراح القيم:\n${JSON.stringify(parsed, null, 2)}`);
        toast({
          title: 'تم الاقتراح',
          description: 'تم اقتراح قيم للحقول',
          variant: 'default',
        });
      } catch {
        setResult(response.content || '');
        toast({
          title: 'تم الاقتراح',
          description: 'تم اقتراح قيم للحقول',
          variant: 'default',
        });
      }
    } else {
      toast({
        title: 'فشل',
        description: response.error || 'فشل في اقتراح القيم',
        variant: 'destructive',
      });
    }
  };

  /**
   * Improve document
   */
  const handleImprove = async () => {
    if (!context) {
      toast({
        title: 'مطلوب محتوى',
        description: 'يرجى إدخال الكتاب لتحسينه',
        variant: 'destructive',
      });
      return;
    }

    const response = await glmService.improveDocument(
      context,
      template.name_ar || template.name_en || '',
      [
        'تحسين اللغة والأسلوب',
        'إضافة تفاصيل قانونية',
        'تحسين التنسيق والعرض',
      ]
    );

    if (response.success && response.content) {
      setResult(response.content);
      onImproveDocument(response.content);
      toast({
        title: 'تم التحسين',
        description: 'تم تحسين الكتاب بنجاح',
        variant: 'default',
      });
    } else {
      toast({
        title: 'فشل',
        description: response.error || 'فشل في تحسين الكتاب',
        variant: 'destructive',
      });
    }
  };

  /**
   * Clear API key
   */
  const handleClearKey = () => {
    localStorage.removeItem('glm_api_key');
    localStorage.removeItem('glm_model');
    setApiKey('');
    setIsConfigured(false);
    toast({
      title: 'تم المسح',
      description: 'تم مسح مفتاح API',
      variant: 'default',
    });
  };

  return (
    <div className="space-y-4">
      {/* AI Status Card */}
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <CardTitle className="text-indigo-900 dark:text-indigo-100">
                المساعد الذكي - GLM
              </CardTitle>
            </div>
            <Badge variant={isConfigured ? 'default' : 'secondary'}>
              {isConfigured ? 'نشط' : 'غير مهيأ'}
            </Badge>
          </div>
          <CardDescription>
            استخدم GLM لتوليد وتحسين الكتب الرسمية بذكاء
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConfigured ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  مفتاح API الخاص بـ GLM
                </label>
                <Input
                  type="password"
                  placeholder="sk-proj-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono"
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleTestConnection}
                  disabled={!apiKey.trim() || isProcessing}
                  variant="outline"
                >
                  اختبار الاتصال
                </Button>
                <Button 
                  onClick={handleSaveConfig}
                  disabled={!apiKey.trim() || isProcessing}
                >
                  حفظ الإعدادات
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                احصل على مفتاح API من: 
                <a 
                  href="https://open.bigmodel.cn/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  open.bigmodel.cn
                </a>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3">
                {/* Generate Document */}
                <Button
                  onClick={() => setSelectedAction('generate')}
                  disabled={isProcessing}
                  className="h-24 flex-col gap-2"
                  variant={selectedAction === 'generate' ? 'default' : 'outline'}
                >
                  <Wand2 className="h-6 w-6" />
                  <span className="text-sm">توليد تلقائي</span>
                  <span className="text-xs text-muted-foreground">
                    توليد الكتاب كاملًاً باستخدام GLM
                  </span>
                </Button>

                {/* Suggest Values */}
                <Button
                  onClick={() => setSelectedAction('suggest')}
                  disabled={isProcessing}
                  className="h-24 flex-col gap-2"
                  variant={selectedAction === 'suggest' ? 'default' : 'outline'}
                >
                  <Lightbulb className="h-6 w-6" />
                  <span className="text-sm">اقتراح الحقول</span>
                  <span className="text-xs text-muted-foreground">
                    اقتراح قيم واقعية للحقول
                  </span>
                </Button>

                {/* Improve Document */}
                <Button
                  onClick={() => setSelectedAction('improve')}
                  disabled={isProcessing}
                  className="h-24 flex-col gap-2"
                  variant={selectedAction === 'improve' ? 'default' : 'outline'}
                >
                  <ChevronUp className="h-6 w-6" />
                  <span className="text-sm">تحسين محتوى</span>
                  <span className="text-xs text-muted-foreground">
                    تحسين وتطوير الكتاب
                  </span>
                </Button>
              </div>

              {/* Context Input for Improve */}
              {selectedAction === 'improve' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2"
                >
                  <label className="text-sm font-medium text-foreground">
                    المحتوى للتحسين
                  </label>
                  <Textarea
                    placeholder="لصق الكتاب الذي تريد تحسينه هنا..."
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    rows={6}
                    className="font-mono text-sm"
                  />
                </motion.div>
              )}

              {/* Result Display */}
              <AnimatePresence>
                {selectedAction && result && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mt-4"
                  >
                    <Alert>
                      <AlertDescription className="font-mono text-sm whitespace-pre-wrap">
                        {result}
                      </AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Clear Config */}
              <Button
                variant="ghost"
                onClick={handleClearKey}
                className="w-full text-destructive hover:text-destructive"
              >
                مسح مفتاح API
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="flex items-center justify-center gap-2 py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 dark:border-indigo-400" />
          <span className="text-sm text-muted-foreground">
            {selectedAction === 'generate' && 'جاري التوليد...'}
            {selectedAction === 'suggest' && 'جاري الاقتراح...'}
            {selectedAction === 'improve' && 'جاري التحسين...'}
            {!selectedAction && 'جاري المعالجة...'}
          </span>
        </div>
      )}
    </div>
  );
}

