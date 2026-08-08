import * as React from 'react';
import { Brain, Loader2, ScanLine } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useRunAgentReview } from '@/hooks/useAgentReviews';

export interface CustomerIdAutofillResult {
  nameArabic: string;
  nationalId: string;
  nationality: string;
  dateOfBirth: string;
  idExpiry: string;
  confidence: number;
}

export function CustomerIdAutofillButton({ onExtract, disabled }: {
  onExtract: (result: CustomerIdAutofillResult) => void;
  disabled?: boolean;
}) {
  const runAgent = useRunAgentReview('customer_autofill');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const imageBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error || new Error('تعذر قراءة الصورة'));
      reader.readAsDataURL(file);
    });

    try {
      const data = await runAgent.mutateAsync({ imageBase64 });
      if (!data?.nationalId && !data?.nameArabic) {
        toast.warning('تعذر استخراج بيانات واضحة من الصورة — جرّب صورة أوضح');
        return;
      }
      onExtract(data as CustomerIdAutofillResult);
      toast.success('تم استخراج بيانات البطاقة — راجع الحقول قبل الحفظ');
    } catch {
      // toast handled by the hook
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || runAgent.isPending}
        className="gap-1.5 border-[#C7D2FE] bg-[#EEF2FF] text-[#3730A3] hover:bg-[#E0E7FF]"
      >
        {runAgent.isPending
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <ScanLine className="h-4 w-4" />}
        {runAgent.isPending ? 'الوكيل يقرأ البطاقة...' : 'استخراج من البطاقة'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
    </>
  );
}
