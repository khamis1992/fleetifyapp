import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LegalDocumentGeneratorProps {
  companyId: string;
  country: 'kuwait' | 'saudi' | 'qatar';
  onDocumentGenerated?: (document: any) => void;
}

export const LegalDocumentGenerator: React.FC<LegalDocumentGeneratorProps> = ({
  companyId,
  country,
  onDocumentGenerated
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [documentType, setDocumentType] = useState<'legal_warning' | 'payment_claim' | 'contract_termination'>('legal_warning');
  const [generatedDocument, setGeneratedDocument] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['customers', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, customer_type')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId
  });

  const handleGenerateDocument = async () => {
    if (!selectedCustomer) {
      toast.error('يرجى اختيار عميل');
      return;
    }

    setIsGenerating(true);

    try {
      // Fetch customer details
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*, contracts(*), payments(*)')
        .eq('id', selectedCustomer)
        .single();

      if (error) throw error;

      // Generate document based on type
      const document = generateDocumentContent(customer, documentType, country);
      setGeneratedDocument(document);

      // Save to database
      await supabase.from('legal_documents').insert({
        company_id: companyId,
        customer_id: selectedCustomer,
        document_type: documentType,
        content: document,
        country_law: country
      });

      toast.success('تم إنشاء الوثيقة بنجاح');
      
      if (onDocumentGenerated) {
        onDocumentGenerated({ content: document, type: documentType });
      }
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('حدث خطأ في إنشاء الوثيقة');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyDocument = () => {
    navigator.clipboard.writeText(generatedDocument);
    toast.success('تم نسخ الوثيقة');
  };

  const handleDownloadDocument = () => {
    const blob = new Blob([generatedDocument], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentType}_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('تم تحميل الوثيقة');
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Document Settings */}
      <Card>
        <CardHeader>
          <CardTitle>إعدادات الوثيقة</CardTitle>
          <CardDescription>اختر نوع الوثيقة والعميل</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Document Type */}
          <div className="space-y-2">
            <Label>نوع الوثيقة</Label>
            <Select value={documentType} onValueChange={(value: unknown) => setDocumentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="legal_warning">إنذار قانوني</SelectItem>
                <SelectItem value="payment_claim">مطالبة مالية</SelectItem>
                <SelectItem value="contract_termination">إنهاء عقد</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Customer Selection */}
          <div className="space-y-2">
            <Label>اختر العميل</Label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="اختر عميل..." />
              </SelectTrigger>
              <SelectContent>
                {customers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.customer_type === 'company' 
                      ? customer.company_name 
                      : `${customer.first_name} ${customer.last_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Country Badge */}
          <div className="flex items-center gap-2">
            <Label>القانون المطبق:</Label>
            <Badge>
              {country === 'kuwait' ? '🇰🇼 الكويت' : 
               country === 'saudi' ? '🇸🇦 السعودية' : 
               '🇶🇦 قطر'}
            </Badge>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerateDocument}
            disabled={!selectedCustomer || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <FileText className="ml-2 h-4 w-4" />
                إنشاء الوثيقة
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Document Preview */}
      <Card>
        <CardHeader>
          <CardTitle>معاينة الوثيقة</CardTitle>
          <CardDescription>
            {generatedDocument ? 'الوثيقة المُنشأة' : 'ستظهر الوثيقة هنا بعد الإنشاء'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {generatedDocument ? (
            <div className="space-y-4">
              <ScrollArea className="h-[400px] rounded-md border p-4">
                <pre className="text-sm whitespace-pre-wrap font-arabic">
                  {generatedDocument}
                </pre>
              </ScrollArea>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopyDocument}
                  className="flex-1"
                >
                  <Copy className="ml-2 h-4 w-4" />
                  نسخ
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadDocument}
                  className="flex-1"
                >
                  <Download className="ml-2 h-4 w-4" />
                  تحميل
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
              <FileText className="h-12 w-12 mb-4" />
              <p>لم يتم إنشاء وثيقة بعد</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function generateDocumentContent(customer: any, type: string, country: string): string {
  const customerName = customer.customer_type === 'company' 
    ? customer.company_name 
    : `${customer.first_name} ${customer.last_name}`;

  const today = new Date().toLocaleDateString('ar-EG');
  
  const unpaidAmount = customer.payments
    ?.filter((p: any) => p.status === 'pending')
    .reduce((sum: number, p: any) => sum + p.amount, 0) || 0;

  const templates = {
    legal_warning_kuwait: `
بسم الله الرحمن الرحيم

إنذار قانوني

بموجب قانون التجارة الكويتي رقم 68 لسنة 1980

إلى: ${customerName}

نحيطكم علماً بموجب هذا الإنذار أن لديكم مستحقات مالية متأخرة بقيمة ${unpaidAmount.toFixed(3)} دينار كويتي.

وبناءً على العقود المبرمة بيننا والتي لم يتم الوفاء بالتزاماتها، نطالبكم بسداد كامل المبلغ المذكور أعلاه خلال مدة أقصاها سبعة (7) أيام من تاريخ استلام هذا الإنذار.

وفي حالة عدم السداد خلال المدة المحددة، سنضطر لاتخاذ الإجراءات القانونية اللازمة للمطالبة بحقوقنا دون أدنى مسؤولية علينا.

مع حفظ كافة حقوقنا القانونية.

التاريخ: ${today}

---
تم الإنشاء بواسطة النظام القانوني
    `.trim(),

    legal_warning_saudi: `
بسم الله الرحمن الرحيم

إنذار رسمي

وفقاً لنظام المعاملات المدنية السعودي

إلى السيد/ة: ${customerName}

نفيدكم بأن لديكم مستحقات مالية متأخرة بمبلغ ${unpaidAmount.toFixed(2)} ريال سعودي.

بموجب العقود المبرمة معنا، نطالبكم بسداد المبلغ كاملاً خلال سبعة (7) أيام من تاريخ استلام هذا الإنذار.

في حالة التقاعس عن السداد، سنلجأ للجهات القضائية المختصة.

والله الموفق،

التاريخ: ${today}

---
تم الإنشاء بواسطة النظام القانوني
    `.trim(),

    payment_claim_kuwait: `
بسم الله الرحمن الرحيم

مطالبة مالية

إلى: ${customerName}

نتقدم بموجب هذه المطالبة الرسمية للمطالبة بمبلغ ${unpaidAmount.toFixed(3)} دينار كويتي المستحق لنا.

تفاصيل المستحقات:
- المبلغ الأصلي: ${unpaidAmount.toFixed(3)} د.ك
- تاريخ الاستحقاق: [حسب العقد]
- عدد الأيام المتأخرة: [يتم الحساب]

نطالبكم بسداد المبلغ فوراً وإلا سنضطر لاتخاذ الإجراءات القانونية.

التاريخ: ${today}

---
تم الإنشاء بواسطة النظام القانوني
    `.trim()
  };

  const key = `${type}_${country}`;
  return templates[key as keyof typeof templates] || templates.legal_warning_kuwait;
}
