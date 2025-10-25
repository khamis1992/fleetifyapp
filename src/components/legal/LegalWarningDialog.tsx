import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Download,
  Send,
  Printer,
  Copy,
  Mail,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Loader2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import type { GeneratedWarning } from '@/hooks/useGenerateLegalWarning';
import type { DelinquentCustomer } from '@/hooks/useDelinquentCustomers';

interface LegalWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warning: GeneratedWarning | null;
  customer: DelinquentCustomer | null;
  isGenerating?: boolean;
  onSendEmail?: (warning: GeneratedWarning) => void;
  onSendSMS?: (warning: GeneratedWarning) => void;
  onPrint?: (warning: GeneratedWarning) => void;
  onDownloadPDF?: (warning: GeneratedWarning) => void;
}

export const LegalWarningDialog: React.FC<LegalWarningDialogProps> = ({
  open,
  onOpenChange,
  warning,
  customer,
  isGenerating = false,
  onSendEmail,
  onSendSMS,
  onPrint,
  onDownloadPDF
}) => {
  const [activeTab, setActiveTab] = useState('preview');

  const handleCopyToClipboard = () => {
    if (warning?.content) {
      navigator.clipboard.writeText(warning.content);
      toast.success('تم نسخ الإنذار إلى الحافظة');
    }
  };

  const handleSendEmail = () => {
    if (warning && onSendEmail) {
      onSendEmail(warning);
    } else {
      toast.info('إرسال عبر البريد الإلكتروني', {
        description: 'سيتم تطبيق هذه الميزة قريباً'
      });
    }
  };

  const handleSendSMS = () => {
    if (warning && onSendSMS) {
      onSendSMS(warning);
    } else {
      toast.info('إرسال عبر رسالة نصية', {
        description: 'سيتم تطبيق هذه الميزة قريباً'
      });
    }
  };

  const handlePrint = () => {
    if (warning && onPrint) {
      onPrint(warning);
    } else {
      // Default print behavior
      const printWindow = window.open('', '_blank');
      if (printWindow && warning) {
        printWindow.document.write(`
          <html dir="rtl">
            <head>
              <title>إنذار قانوني - ${warning.document_number}</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  padding: 40px;
                  line-height: 1.8;
                  direction: rtl;
                }
                h1 { color: #1e40af; text-align: center; }
                .content { white-space: pre-wrap; }
                @media print {
                  body { padding: 20px; }
                }
              </style>
            </head>
            <body>
              <div class="content">${warning.content}</div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleDownloadPDF = () => {
    if (warning && onDownloadPDF) {
      onDownloadPDF(warning);
    } else {
      toast.info('تحميل PDF', {
        description: 'سيتم تطبيق هذه الميزة قريباً'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  {isGenerating ? 'جاري إنشاء الإنذار القانوني...' : 'إنذار قانوني'}
                </DialogTitle>
                <DialogDescription>
                  {isGenerating 
                    ? 'الذكاء الاصطناعي يقوم بصياغة الإنذار القانوني الآن...'
                    : warning 
                      ? `رقم الوثيقة: ${warning.document_number}`
                      : 'معاينة الإنذار القانوني'
                  }
                </DialogDescription>
              </div>
            </div>
            {customer && (
              <Badge variant="outline" className="gap-1">
                <FileText className="h-3 w-3" />
                {customer.customer_name}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-lg font-medium">جاري إنشاء الإنذار القانوني...</p>
              <p className="text-sm text-muted-foreground mt-2">
                المستشار القانوني الذكي يقوم بصياغة وثيقة رسمية ومهنية
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                قد يستغرق هذا من 5-15 ثانية
              </p>
            </div>
          </div>
        ) : warning ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview" className="gap-2">
                <FileText className="h-4 w-4" />
                معاينة الإنذار
              </TabsTrigger>
              <TabsTrigger value="actions" className="gap-2">
                <Send className="h-4 w-4" />
                إجراءات الإرسال
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="flex-1 overflow-hidden mt-4">
              <ScrollArea className="h-[500px] rounded-md border p-6 bg-muted/30">
                <div className="prose prose-sm max-w-none" dir="rtl">
                  <pre className="whitespace-pre-wrap font-sans leading-relaxed text-sm">
                    {warning.content}
                  </pre>
                </div>
              </ScrollArea>

              <div className="flex items-center justify-between mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>تم إنشاء الإنذار بواسطة الذكاء الاصطناعي القانوني</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToClipboard}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  نسخ النص
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="actions" className="flex-1 overflow-hidden mt-4">
              <div className="space-y-4">
                {/* Customer Info */}
                {customer && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <h4 className="font-medium text-sm">معلومات العميل</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">الاسم:</span>{' '}
                        <span className="font-medium">{customer.customer_name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الهاتف:</span>{' '}
                        <span className="font-medium">{customer.phone || 'غير محدد'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">البريد:</span>{' '}
                        <span className="font-medium">{customer.email || 'غير محدد'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الإجمالي المستحق:</span>{' '}
                        <span className="font-bold text-destructive">
                          {customer.total_debt.toLocaleString('ar-KW')} د.ك
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="default"
                    className="gap-2 h-20 flex-col"
                    onClick={handleSendEmail}
                    disabled={!customer?.email}
                  >
                    <Mail className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">إرسال عبر البريد</div>
                      <div className="text-xs opacity-80">
                        {customer?.email || 'لا يوجد بريد'}
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="default"
                    className="gap-2 h-20 flex-col"
                    onClick={handleSendSMS}
                    disabled={!customer?.phone}
                  >
                    <MessageSquare className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">إرسال رسالة نصية</div>
                      <div className="text-xs opacity-80">
                        {customer?.phone || 'لا يوجد هاتف'}
                      </div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="gap-2 h-20 flex-col"
                    onClick={handlePrint}
                  >
                    <Printer className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">طباعة</div>
                      <div className="text-xs opacity-80">طباعة مباشرة</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="gap-2 h-20 flex-col"
                    onClick={handleDownloadPDF}
                  >
                    <Download className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">تحميل PDF</div>
                      <div className="text-xs opacity-80">حفظ كملف</div>
                    </div>
                  </Button>
                </div>

                {/* Warning Info */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-900">
                      <p className="font-medium mb-1">تنبيه مهم:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>تأكد من مراجعة محتوى الإنذار قبل الإرسال</li>
                        <li>احتفظ بنسخة من الإنذار المرسل للملف القانوني</li>
                        <li>سيتم حفظ الإنذار تلقائياً في سجل الوثائق القانونية</li>
                        <li>يُنصح بإرسال الإنذار عبر طريقتين (بريد + رسالة)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <p>لا يوجد إنذار للمعاينة</p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            <X className="h-4 w-4 ml-2" />
            إغلاق
          </Button>
          {warning && !isGenerating && (
            <Button onClick={handleSendEmail} disabled={!customer?.email}>
              <Send className="h-4 w-4 ml-2" />
              إرسال الآن
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LegalWarningDialog;
