import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Copy, Printer, FileJson } from 'lucide-react';
import { toast } from 'sonner';
import { NoticeAutoFiller } from './NoticeAutoFiller';
import { NoticeTemplates, getTemplateList, type NoticeVariables } from './NoticeTemplateManager';

interface EnhancedLegalNoticeGeneratorProps {
  companyId: string;
  onDocumentGenerated?: (document: { content: string; type: string; variables: NoticeVariables }) => void;
}

export const EnhancedLegalNoticeGenerator: React.FC<EnhancedLegalNoticeGeneratorProps> = ({
  companyId,
  onDocumentGenerated,
}) => {
  const [noticeVariables, setNoticeVariables] = useState<NoticeVariables | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('pre_warning');
  const [generatedContent, setGeneratedContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const templates = getTemplateList();
  const selectedTemplateObj = templates.find((t) => t.id === selectedTemplate);

  const handleVariablesReady = (variables: NoticeVariables) => {
    setNoticeVariables(variables);
    setShowPreview(true);
  };

  const generateDocument = () => {
    if (!noticeVariables) {
      toast.error('يرجى ملء البيانات أولاً');
      return;
    }

    try {
      let content = '';

      switch (selectedTemplate) {
        case 'pre_warning':
          content = NoticeTemplates.preWarning(noticeVariables);
          break;
        case 'final_demand':
          content = NoticeTemplates.finalDemand(noticeVariables);
          break;
        case 'court_filing':
          content = NoticeTemplates.courtFiling(noticeVariables);
          break;
        case 'settlement':
          content = NoticeTemplates.settlement(noticeVariables);
          break;
        case 'payment_acknowledgment':
          content = NoticeTemplates.paymentAcknowledgment(noticeVariables);
          break;
        default:
          content = NoticeTemplates.preWarning(noticeVariables);
      }

      setGeneratedContent(content);

      if (onDocumentGenerated) {
        onDocumentGenerated({
          content,
          type: selectedTemplate,
          variables: noticeVariables,
        });
      }

      toast.success('تم إنشاء الوثيقة بنجاح');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('حدث خطأ في إنشاء الوثيقة');
    }
  };

  const handleCopyDocument = () => {
    navigator.clipboard.writeText(generatedContent);
    toast.success('تم نسخ الوثيقة');
  };

  const handleDownloadText = () => {
    const blob = new Blob([generatedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedTemplate}_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('تم تحميل الوثيقة');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html dir="rtl" style="font-family: Arial, sans-serif;">
          <head>
            <title>طباعة الوثيقة</title>
            <style>
              body { line-height: 1.6; color: #333; padding: 20px; }
              pre { white-space: pre-wrap; word-wrap: break-word; font-family: Arial, sans-serif; }
            </style>
          </head>
          <body>
            <pre>${generatedContent}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={showPreview && generatedContent ? 'preview' : 'setup'} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="setup">إعداد الوثيقة</TabsTrigger>
          <TabsTrigger value="preview" disabled={!generatedContent}>
            معاينة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle>اختر نوع الوثيقة</CardTitle>
              <CardDescription>حدد نوع الإنذار أو الوثيقة القانونية</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      selectedTemplate === template.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{template.nameAr}</div>
                        <div className="text-sm text-muted-foreground mt-1">{template.description}</div>
                      </div>
                      {template.daysOverdue > 0 && (
                        <Badge variant="secondary">يوم +{template.daysOverdue}</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Auto-Fill Section */}
          <NoticeAutoFiller
            companyId={companyId}
            onVariablesReady={handleVariablesReady}
          />

          {/* Manual Edit Option */}
          {noticeVariables && (
            <Card>
              <CardHeader>
                <CardTitle>البيانات المملوءة</CardTitle>
                <CardDescription>تم جمع البيانات من النظام تلقائياً</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">العميل</div>
                    <div className="font-semibold">{noticeVariables.customerName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">المبلغ الكلي</div>
                    <div className="font-semibold">
                      {noticeVariables.totalDebt.toLocaleString('ar-KW')} {noticeVariables.invoiceCurrency}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">أيام التأخير</div>
                    <div className="font-semibold">{noticeVariables.daysOverdue} يوم</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">مهلة السداد</div>
                    <div className="font-semibold">{noticeVariables.deadlineDays} أيام</div>
                  </div>
                </div>

                <Button onClick={generateDocument} size="lg" className="w-full">
                  <FileText className="ml-2 h-4 w-4" />
                  إنشاء الوثيقة
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {generatedContent && (
            <>
              {/* Document Preview */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>معاينة الوثيقة</CardTitle>
                    <CardDescription>
                      {selectedTemplateObj?.nameAr || 'وثيقة'}
                    </CardDescription>
                  </div>
                  {selectedTemplateObj && selectedTemplateObj.daysOverdue > 0 && (
                    <Badge>يوم +{selectedTemplateObj.daysOverdue}</Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] rounded-md border p-4">
                    <div
                      id="notice-preview"
                      dir="rtl"
                      style={{
                        fontFamily: 'Arial, sans-serif',
                        lineHeight: 1.8,
                        color: '#000',
                        padding: '20px',
                      }}
                    >
                      <pre
                        style={{
                          whiteSpace: 'pre-wrap',
                          wordWrap: 'break-word',
                          fontFamily: 'Arial, sans-serif',
                          fontSize: '14px',
                        }}
                      >
                        {generatedContent}
                      </pre>
                    </div>
                  </ScrollArea>

                  {/* Action Buttons */}
                  <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
                    <Button
                      variant="outline"
                      onClick={handleCopyDocument}
                      size="sm"
                    >
                      <Copy className="ml-2 h-4 w-4" />
                      نسخ
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownloadText}
                      size="sm"
                    >
                      <Download className="ml-2 h-4 w-4" />
                      نص
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handlePrint}
                      size="sm"
                    >
                      <Printer className="ml-2 h-4 w-4" />
                      طباعة
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        toast.info('يمكنك استخدام خيار الطباعة وحفظ كـ PDF');
                      }}
                      size="sm"
                    >
                      <FileJson className="ml-2 h-4 w-4" />
                      PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Document Metadata */}
              {noticeVariables && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">معلومات الوثيقة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">رقم الوثيقة:</span>
                        <span className="font-semibold">{noticeVariables.documentNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">تاريخ الإصدار:</span>
                        <span className="font-semibold">
                          {new Date(noticeVariables.dateIssued).toLocaleDateString('ar-KW')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">نوع الوثيقة:</span>
                        <span className="font-semibold">{selectedTemplateObj?.nameAr}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">حالة الوثيقة:</span>
                        <Badge variant="secondary">جاهزة للاستخدام</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedLegalNoticeGenerator;
