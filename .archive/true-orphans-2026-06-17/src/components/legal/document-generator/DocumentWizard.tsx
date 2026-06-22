/**
 * Document Wizard Component
 * Dynamic form based on template variables
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGenerateDocument } from '@/hooks/useDocumentGenerations';
import { useCompanies } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import type { DocumentTemplate, TemplateVariable, TemplateRenderContext } from '@/types/legal-document-generator';
import { renderTemplate } from '@/utils/legal-document-template-engine';
import { useToast } from '@/components/ui/use-toast';
import { AIAssistant } from './AIAssistant';

interface DocumentWizardProps {
  template: DocumentTemplate;
  onSubmit: (data: Record<string, any>, document: any, generationId: string) => void;
  onBack: () => void;
}

export function DocumentWizard({ template, onSubmit, onBack }: DocumentWizardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: companies } = useCompanies();
  const generateMutation = useGenerateDocument();

  // Build form schema from template variables
  const schema = buildFormSchema(template.variables);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: getDefaultValues(template.variables),
  });

  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  // Group variables by sections
  const variableGroups = groupVariables(template.variables);

  /**
   * Handle form submission
   */
  const handleSubmit = async (values: z.infer<typeof schema>) => {
    try {
      const context: TemplateRenderContext = {
        template,
        data: values,
        company: companies?.[0],
        user: {
          name_ar: user?.user_metadata?.name_ar || user?.email || '',
          name_en: user?.user_metadata?.name_en || '',
          title: user?.user_metadata?.title || '',
        },
      };

      const result = await generateMutation.mutateAsync({
        templateId: template.id,
        companyId: companies?.[0]?.id || '',
        variablesData: values,
        context,
      });

      onSubmit(values, result.document, result.generation.id);
    } catch (error: any) {
      toast({
        title: 'خطأ في إنشاء الكتاب',
        description: error.message || 'حدث خطأ أثناء إنشاء الكتاب',
        variant: 'destructive',
      });
    }
  };

  /**
   * Handle preview
   */
  const handlePreview = () => {
    const values = form.getValues();
    const context: TemplateRenderContext = {
      template,
      data: values,
      company: companies?.[0],
      user: {
        name_ar: user?.user_metadata?.name_ar || user?.email || '',
        name_en: user?.user_metadata?.name_en || '',
        title: user?.user_metadata?.title || '',
      },
    };

    const result = renderTemplate(template, values, context);
    setPreviewData(result);
    setIsPreviewing(true);
  };

  if (isPreviewing && previewData) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">معاينة الكتاب</h3>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsPreviewing(false)}>
              <ArrowLeft className="h-4 w-4 ml-2" />
              رجوع
            </Button>
            <Button onClick={form.handleSubmit(handleSubmit)} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : null}
              تأكيد وإنشاء
            </Button>
          </div>
        </div>

        <div
          className="border rounded-lg p-8 bg-white dark:bg-slate-900"
          dangerouslySetInnerHTML={{ __html: previewData.html }}
        />

        {previewData.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc list-inside">
                {previewData.errors.map((error: string, i: number) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Form Fields by Group */}
        {Object.entries(variableGroups).map(([groupName, variables]) => (
          <div key={groupName} className="space-y-4">
            <h3 className="text-lg font-semibold">{groupName}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {variables.map((variable) => (
                <FormFieldComponent
                  key={variable.name}
                  variable={variable}
                  control={form.control}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 ml-2" />
            رجوع
          </Button>
            <Button type="button" variant="outline" onClick={handlePreview}>
              معاينة
            </Button>
          </div>

          <div className="flex gap-2">
            {/* AI Assistant Button */}
            <Button 
              type="button" 
              variant="outline"
              onClick={() => setShowAIAssistant(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              <Sparkles className="h-4 w-4 ml-2" />
              <span className="hidden md:inline">مساعد GLM</span>
            </Button>

            <Button type="submit" disabled={generateMutation.isPending}>
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : null}
              إنشاء الكتاب
              <ArrowRight className="h-4 w-4 mr-2" />
            </Button>
          </div>
        </div>

        {/* AI Assistant Dialog */}
        <Dialog open={showAIAssistant} onOpenChange={setShowAIAssistant}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-indigo-600" />
                المساعد الذكي - GLM
              </DialogTitle>
              <DialogDescription>
                استخدم الذكاء الاصطناعي GLM لتوليد وتحسين الكتب الرسمية
              </DialogDescription>
            </DialogHeader>
            <AIAssistant 
              template={template}
              onGenerateDocument={(content) => {
                setPreviewData({ html: content, errors: [] });
                setIsPreviewing(true);
                setShowAIAssistant(false);
              }}
              onSuggestValues={(suggestions) => {
                // Apply suggested values to form
                Object.entries(suggestions).forEach(([key, value]) => {
                  if (key !== 'suggestions') {
                    form.setValue(key, value, { shouldValidate: false, shouldDirty: true });
                  }
                });
                setShowAIAssistant(false);
              }}
              onImproveDocument={(improvedContent) => {
                setPreviewData({ html: improvedContent, errors: [] });
                setIsPreviewing(true);
                setShowAIAssistant(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </form>
    </Form>
  );
}

/**
 * Form Field Component
 */
interface FormFieldComponentProps {
  variable: TemplateVariable;
  control: any;
}

function FormFieldComponent({ variable, control }: FormFieldComponentProps) {
  return (
    <FormField
      control={control}
      name={variable.name as any}
      render={({ field }) => (
        <FormItem className="text-right">
          <FormLabel>
            {variable.label}
            {variable.required && <span className="text-red-500 mr-1">*</span>}
          </FormLabel>
          <FormControl>
            {variable.type === 'textarea' ? (
              <Textarea
                placeholder={variable.placeholder || ''}
                className="min-h-[100px]"
                {...field}
              />
            ) : variable.type === 'select' ? (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={variable.placeholder || 'اختر...'} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {variable.options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : variable.type === 'date' ? (
              <Input type="date" {...field} />
            ) : variable.type === 'number' ? (
              <Input type="number" placeholder={variable.placeholder || ''} {...field} />
            ) : (
              <Input
                type="text"
                placeholder={variable.placeholder || ''}
                {...field}
              />
            )}
          </FormControl>
          {variable.placeholder && (
            <FormDescription>{variable.placeholder}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * Build Zod schema from template variables
 */
function buildFormSchema(variables: TemplateVariable[]) {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  for (const variable of variables) {
    let fieldSchema: z.ZodTypeAny = z.string();

    // Add validation rules
    if (variable.validation) {
      for (const rule of variable.validation) {
        switch (rule.type) {
          case 'minLength':
            fieldSchema = (fieldSchema as z.ZodString).min(rule.value, { message: rule.message });
            break;
          case 'maxLength':
            fieldSchema = (fieldSchema as z.ZodString).max(rule.value, { message: rule.message });
            break;
          case 'pattern':
            fieldSchema = (fieldSchema as z.ZodString).regex(new RegExp(rule.value), {
              message: rule.message,
            });
            break;
          case 'min':
            fieldSchema = (fieldSchema as any).min(rule.value, { message: rule.message });
            break;
          case 'max':
            fieldSchema = (fieldSchema as any).max(rule.value, { message: rule.message });
            break;
        }
      }
    }

    // Make optional if not required
    if (!variable.required) {
      fieldSchema = fieldSchema.optional();
    }

    schemaFields[variable.name] = fieldSchema;
  }

  return z.object(schemaFields);
}

/**
 * Get default values from template variables
 */
function getDefaultValues(variables: TemplateVariable[]): Record<string, any> {
  const defaults: Record<string, any> = {};

  for (const variable of variables) {
    if (variable.defaultValue !== undefined) {
      defaults[variable.name] = variable.defaultValue;
    }
  }

  return defaults;
}

/**
 * Group variables into sections
 */
function groupVariables(variables: TemplateVariable[]): Record<string, TemplateVariable[]> {
  const groups: Record<string, TemplateVariable[]> = {
    'معلومات أساسية': [],
    'تفاصيل إضافية': [],
  };

  for (const variable of variables) {
    if (
      variable.name.includes('recipient') ||
      variable.name.includes('sender') ||
      variable.name.includes('policy') ||
      variable.name.includes('contract')
    ) {
      groups['معلومات أساسية'].push(variable);
    } else {
      groups['تفاصيل إضافية'].push(variable);
    }
  }

  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([_, vars]) => vars.length > 0)
  );
}
