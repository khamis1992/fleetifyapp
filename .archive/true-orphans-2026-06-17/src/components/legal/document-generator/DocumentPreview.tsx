/**
 * Document Preview Component
 * Shows the generated document with export options
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Printer, FileText, File, Share2, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useMarkDocumentAsSent, useApproveDocument } from '@/hooks/useDocumentGenerations';
import type { GeneratedDocument, DocumentTemplate } from '@/types/legal-document-generator';

interface DocumentPreviewProps {
  document: GeneratedDocument;
  generationId: string;
  template: DocumentTemplate;
  onNew: () => void;
  onEdit: () => void;
}

export function DocumentPreview({
  document,
  generationId,
  template,
  onNew,
  onEdit,
}: DocumentPreviewProps) {
  const { toast } = useToast();
  const markAsSentMutation = useMarkDocumentAsSent();
  const approveMutation = useApproveDocument();

  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx' | 'html'>('pdf');

  /**
   * Export document
   */
  const handleExport = async (format: 'pdf' | 'docx' | 'html') => {
    try {
      // In a real implementation, this would call a PDF/Word generation service
      // For now, we'll just print the document

      if (format === 'pdf' || format === 'html') {
        // Print dialog
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(document.previewHtml);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 500);
        }
      } else if (format === 'docx') {
        // For now, just copy HTML to clipboard
        await navigator.clipboard.writeText(document.body);
        toast({
          title: 'تم النسخ',
          description: 'تم نسخ نص الكتاب للحافظة',
        });
      }

      toast({
        title: 'تم التصدير',
        description: `تم تصدير الكتاب بصيغة ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: 'خطأ في التصدير',
        description: error.message || 'حدث خطأ أثناء التصدير',
        variant: 'destructive',
      });
    }
  };

  /**
   * Print document
   */
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(document.previewHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  /**
   * Copy to clipboard
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(document.body);
      toast({
        title: 'تم النسخ',
        description: 'تم نسخ نص الكتاب للحافظة',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ في النسخ',
        description: error.message || 'حدث خطأ أثناء النسخ',
        variant: 'destructive',
      });
    }
  };

  /**
   * Mark as sent
   */
  const handleMarkAsSent = async () => {
    try {
      await markAsSentMutation.mutateAsync(generationId);
      toast({
        title: 'تم الإرسال',
        description: 'تم تحديث حالة الكتاب إلى مرسل',
      });
    } catch (error: any) {
      toast({
        title: 'خطأ في التحديث',
        description: error.message || 'حدث خطأ أثناء تحديث الحالة',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl"
      >
        <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
        <div>
          <h3 className="font-semibold text-green-900 dark:text-green-100">
            تم إنشاء الكتاب بنجاح
          </h3>
          <p className="text-sm text-green-700 dark:text-green-300">
            {document.documentNumber && `رقم الكتاب: ${document.documentNumber}`}
          </p>
        </div>
      </motion.div>

      {/* Document Preview */}
      <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
        <div className="p-4 bg-muted border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">معاينة الكتاب</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{template.name_ar}</Badge>
            {document.documentNumber && (
              <Badge>{document.documentNumber}</Badge>
            )}
          </div>
        </div>

        <div
          className="p-8 prose prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: document.previewHtml }}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 border rounded-xl bg-card">
        <div className="flex flex-wrap gap-2">
          <Button onClick={handlePrint} variant="outline">
            <Printer className="h-4 w-4 ml-2" />
            طباعة
          </Button>

          <div className="flex items-center gap-2">
            <Select value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="docx">Word</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => handleExport(exportFormat)}>
              <Download className="h-4 w-4 ml-2" />
              تحميل {exportFormat.toUpperCase()}
            </Button>
          </div>

          <Button onClick={handleCopy} variant="outline">
            <File className="h-4 w-4 ml-2" />
            نسخ
          </Button>
        </div>

        <Separator orientation="vertical" className="h-8 hidden sm:block" />

        <div className="flex flex-wrap gap-2">
          <Button onClick={onEdit} variant="outline">
            تعديل
          </Button>
          <Button onClick={onNew}>
            كتاب جديد
          </Button>
        </div>
      </div>

      {/* Additional Actions */}
      {template.requires_approval && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-amber-900 dark:text-amber-100">
                يتطلب موافقة
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                هذا الكتاب يتطلب موافقة من المدير أو المحامي قبل إرساله
              </p>
            </div>
            <Button
              onClick={() => approveMutation.mutateAsync(generationId)}
              disabled={approveMutation.isPending}
            >
              <Share2 className="h-4 w-4 ml-2" />
              إرسال للموافقة
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
