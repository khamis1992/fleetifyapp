import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { InvoiceCameraCapture } from './InvoiceCameraCapture';
import { InvoiceOCRResults } from './InvoiceOCRResults';
import { InvoiceMatchingView } from './InvoiceMatchingView';
import { useInvoiceOCR } from '@/hooks/useInvoiceOCR';
import { useInvoiceMatching } from '@/hooks/useInvoiceMatching';
import { supabase } from '@/integrations/supabase/client';
import { ExtractedInvoiceData, InvoiceMatchResult } from '@/types/invoiceOCR';
import { Camera, Loader2, Save, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

type Step = 'capture' | 'results' | 'matching' | 'save';

export const InvoiceScannerDashboard = () => {
  const [step, setStep] = useState<Step>('capture');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [extractedData, setExtractedData] = useState<ExtractedInvoiceData>({});
  const [confidence, setConfidence] = useState<number>(0);
  const [matchResult, setMatchResult] = useState<InvoiceMatchResult | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>();
  const [selectedContractId, setSelectedContractId] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  const { processImage, isProcessing } = useInvoiceOCR();
  const { findMatches, isMatching } = useInvoiceMatching();
  const { toast } = useToast();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const handleImageCapture = async (file: File) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    // Process OCR
    const result = await processImage(file);
    if (result && result.success && result.data) {
      setExtractedData(result.data);
      setConfidence(result.confidence || 0);
      setStep('results');
    }
  };

  const handleDataChange = (field: keyof ExtractedInvoiceData, value: unknown) => {
    setExtractedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProceedToMatching = async () => {
    if (!profile?.company_id) {
      toast({
        title: "خطأ",
        description: "لم يتم العثور على معلومات الشركة",
        variant: "destructive"
      });
      return;
    }

    setStep('matching');

    // Find matches
    const matches = await findMatches(extractedData, profile.company_id);
    setMatchResult(matches);
  };

  const handleSelectMatch = (customerId?: string, contractId?: string) => {
    setSelectedCustomerId(customerId);
    setSelectedContractId(contractId);
    setStep('save');
  };

  const handleSave = async () => {
    if (!profile?.company_id || !imageFile) {
      toast({
        title: "خطأ",
        description: "البيانات غير مكتملة",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      // Upload image to storage
      const fileName = `${profile.company_id}/${Date.now()}_${imageFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('scanned-invoices')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('scanned-invoices')
        .getPublicUrl(fileName);

      // Create invoice record
      const invoiceData: any = {
        company_id: profile.company_id,
        customer_id: selectedCustomerId,
        contract_id: selectedContractId,
        invoice_number: extractedData.invoice_number || `SCN-${Date.now()}`,
        invoice_date: extractedData.invoice_date || new Date().toISOString().split('T')[0],
        total_amount: extractedData.total_amount || 0,
        is_legacy: true,
        scanned_image_url: publicUrl,
        ocr_confidence: confidence,
        ocr_data: extractedData,
        manual_review_required: confidence < 70,
        notes: extractedData.notes,
        status: confidence >= 70 ? 'paid' : 'pending'
      };

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create OCR log
      const ocrLogData: any = {
        company_id: profile.company_id,
        invoice_id: invoice.id,
        image_url: publicUrl,
        ocr_confidence: confidence,
        extracted_data: extractedData,
        matched_customer_id: selectedCustomerId,
        matched_contract_id: selectedContractId,
        match_confidence: matchResult?.confidence,
        match_reasons: matchResult?.match_reasons,
        processing_status: 'completed',
        processed_by: profile.user_id
      };

      await supabase.from('invoice_ocr_logs').insert([ocrLogData]);

      toast({
        title: "تم الحفظ بنجاح",
        description: "تم حفظ الفاتورة الممسوحة ضوئياً"
      });

      // Reset and navigate
      navigate('/invoices');

    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: "خطأ في الحفظ",
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء الحفظ',
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">مسح الفواتير القديمة</h1>
        <p className="text-muted-foreground">
          التقط صورة للفاتورة وسيقوم النظام باستخراج البيانات تلقائياً
        </p>
      </div>

      {/* Progress Steps */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${step === 'capture' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
            <div className={`rounded-full h-8 w-8 flex items-center justify-center ${step === 'capture' ? 'bg-primary text-white' : 'bg-muted'}`}>
              1
            </div>
            <span>التقاط الصورة</span>
          </div>
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step === 'results' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
            <div className={`rounded-full h-8 w-8 flex items-center justify-center ${step === 'results' ? 'bg-primary text-white' : 'bg-muted'}`}>
              2
            </div>
            <span>استخراج البيانات</span>
          </div>
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step === 'matching' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
            <div className={`rounded-full h-8 w-8 flex items-center justify-center ${step === 'matching' ? 'bg-primary text-white' : 'bg-muted'}`}>
              3
            </div>
            <span>المطابقة</span>
          </div>
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          <div className={`flex items-center gap-2 ${step === 'save' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
            <div className={`rounded-full h-8 w-8 flex items-center justify-center ${step === 'save' ? 'bg-primary text-white' : 'bg-muted'}`}>
              4
            </div>
            <span>الحفظ</span>
          </div>
        </div>
      </Card>

      {/* Content based on step */}
      {isProcessing && (
        <Card className="p-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-semibold">جاري معالجة الصورة...</p>
            <p className="text-muted-foreground mt-2">قد يستغرق هذا بضع ثوانٍ</p>
          </div>
        </Card>
      )}

      {!isProcessing && step === 'capture' && (
        <InvoiceCameraCapture
          onImageCapture={handleImageCapture}
          onCancel={() => navigate('/invoices')}
        />
      )}

      {!isProcessing && step === 'results' && (
        <div className="space-y-4">
          <InvoiceOCRResults
            data={extractedData}
            confidence={confidence}
            imageUrl={imageUrl}
            onChange={handleDataChange}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setStep('capture')}>
              رجوع
            </Button>
            <Button onClick={handleProceedToMatching} disabled={isMatching}>
              {isMatching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              متابعة للمطابقة
            </Button>
          </div>
        </div>
      )}

      {step === 'matching' && matchResult && (
        <div className="space-y-4">
          <InvoiceMatchingView
            matchResult={matchResult}
            onSelectMatch={handleSelectMatch}
            onCreateNew={() => setStep('save')}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setStep('results')}>
              رجوع
            </Button>
          </div>
        </div>
      )}

      {step === 'save' && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">تأكيد الحفظ</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">رقم الفاتورة:</span>
                <p className="font-medium">{extractedData.invoice_number || 'غير محدد'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">التاريخ:</span>
                <p className="font-medium">{extractedData.invoice_date || 'غير محدد'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">المبلغ:</span>
                <p className="font-medium">{extractedData.total_amount?.toFixed(3) || '0.000'} د.ك</p>
              </div>
              <div>
                <span className="text-muted-foreground">درجة الثقة:</span>
                <p className="font-medium">{confidence}%</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button variant="outline" onClick={() => setStep('matching')}>
                رجوع
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    حفظ الفاتورة
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
