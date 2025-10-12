import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { OCRResult, ExtractedInvoiceData } from '@/types/invoiceOCR';

export const useInvoiceOCR = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const processImage = async (imageFile: File): Promise<OCRResult | null> => {
    setIsProcessing(true);
    
    try {
      // Convert image to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      console.log('Processing image with OCR...', imageFile.name);

      // Call edge function for OCR
      const { data, error } = await supabase.functions.invoke('scan-invoice', {
        body: {
          imageBase64: base64,
          fileName: imageFile.name
        }
      });

      if (error) {
        console.error('OCR error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'فشلت معالجة الصورة');
      }

      console.log('OCR result:', data);

      toast({
        title: "تم استخراج البيانات بنجاح",
        description: `درجة الثقة: ${data.confidence}%`,
      });

      return {
        success: true,
        data: data.data as ExtractedInvoiceData,
        confidence: data.confidence,
        raw_response: data.raw_response
      };

    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "خطأ في معالجة الصورة",
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
        variant: "destructive",
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processImage,
    isProcessing
  };
};
