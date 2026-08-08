import * as React from 'react';
import { CloudUpload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';

/**
 * Drop zone feeding the violation-inbox cron agent: files dropped here are
 * extracted, matched to contracts, and imported automatically within minutes.
 */
export function ViolationInboxDropzone() {
  const { companyId } = useUnifiedCompanyAccess();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!companyId || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        const path = `${companyId}/inbox/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('moi-inbox').upload(path, file);
        if (error) throw error;
      }
      toast.success(
        files.length > 1
          ? `أُرسلت ${files.length} ملفات للاستيراد الذاتي`
          : 'أُرسل الملف للاستيراد الذاتي',
        { description: 'سيستخرجها النظام ويطابقها مع العقود تلقائياً خلال دقائق — بلا أي خطوة إضافية.' },
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إرسال الملف');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[#9FDCCB] bg-[#F0FBF7] p-4" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#D8F3E8] text-[#0D876A]">
          <CloudUpload className="h-5 w-5" />
        </div>
        <div>
          <p className="font-black text-[#142033]">الاستيراد الذاتي (بلا لمس)</p>
          <p className="text-xs leading-5 text-[#6A7688]">
            ارمِ ملف وزارة الداخلية هنا — الاستخراج والمطابقة والحفظ والإخطار كلها تلقائية.
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="gap-2 bg-[#0D876A] text-white hover:bg-[#0A6E57]"
      >
        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
        إرسال للصندوق الذاتي
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        className="hidden"
        onChange={upload}
      />
    </div>
  );
}
