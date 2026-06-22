/**
 * Template Selector Component
 * Allows user to select a document template
 */

import { motion } from 'framer-motion';
import { FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DocumentTemplate, CategoryInfo } from '@/types/legal-document-generator';

interface TemplateSelectorProps {
  templates: DocumentTemplate[];
  categoryInfo: CategoryInfo;
  onSelect: (templateId: string) => void;
  onBack: () => void;
}

export function TemplateSelector({ templates, categoryInfo, onSelect, onBack }: TemplateSelectorProps) {
  return (
    <div className="space-y-4">
      {/* Category Info */}
      <div className={`p-4 ${categoryInfo.color} bg-opacity-10 rounded-xl flex items-center gap-4 mb-6`}>
        <div className={`w-12 h-12 ${categoryInfo.color} rounded-xl flex items-center justify-center text-2xl`}>
          {categoryInfo.icon}
        </div>
        <div>
          <h3 className="font-bold text-lg">{categoryInfo.name_ar}</h3>
          <p className="text-sm text-muted-foreground">{categoryInfo.name_en}</p>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template, index) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <button
              onClick={() => onSelect(template.id)}
              className="w-full h-full text-right"
            >
              <div className="p-4 border rounded-xl hover:border-primary hover:shadow-md transition-all duration-200 bg-card">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold mb-1">{template.name_ar}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {template.description_ar}
                    </p>
                    {template.requires_approval && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        يتطلب موافقة
                      </span>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
                </div>
              </div>
            </button>
          </motion.div>
        ))}
      </div>

      {/* Back Button */}
      <div className="pt-4">
        <Button variant="outline" onClick={onBack}>
          رجوع لاختيار الفئة
        </Button>
      </div>
    </div>
  );
}
