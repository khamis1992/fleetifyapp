import * as React from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Camera,
  CheckCircle2,
  FileText,
  FilePlus2,
  Loader2,
  RotateCw,
  ScanLine,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  rotateScannedPage,
  scanDocumentPage,
  type ScannedDocumentPage,
} from '@/utils/documentScanner';
import { toast } from 'sonner';

interface ScannerPage extends ScannedDocumentPage {
  id: string;
}

export interface SignedContractScanFiles {
  pdfFile: File;
  pageImages: File[];
}

interface SignedContractScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (files: SignedContractScanFiles) => Promise<void>;
  isSubmitting?: boolean;
}

const MAX_PAGES = 30;

async function dataUrlToImageFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  return new File([blob], fileName, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

export function SignedContractScannerDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: SignedContractScannerDialogProps) {
  const [pages, setPages] = React.useState<ScannerPage[]>([]);
  const [processingCount, setProcessingCount] = React.useState(0);
  const [processingProgress, setProcessingProgress] = React.useState(0);
  const [isBuildingPdf, setIsBuildingPdf] = React.useState(false);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const pdfInputRef = React.useRef<HTMLInputElement>(null);

  const isBusy = processingCount > 0 || isBuildingPdf || isSubmitting;
  const warningCount = pages.filter((page) => page.quality.warnings.length > 0).length;

  React.useEffect(() => {
    if (!open) {
      setPages([]);
      setProcessingCount(0);
      setProcessingProgress(0);
      setIsBuildingPdf(false);
    }
  }, [open]);

  const processFiles = async (files: File[]) => {
    const availableSlots = MAX_PAGES - pages.length;
    const selectedFiles = files
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, availableSlots);

    if (selectedFiles.length === 0) {
      toast.error(availableSlots === 0 ? `الحد الأقصى ${MAX_PAGES} صفحة` : 'اختر صورًا صالحة');
      return;
    }

    setProcessingCount(selectedFiles.length);
    setProcessingProgress(0);
    const scannedPages: ScannerPage[] = [];

    for (let index = 0; index < selectedFiles.length; index += 1) {
      try {
        const result = await scanDocumentPage(selectedFiles[index]);
        scannedPages.push({
          ...result,
          id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        });
      } catch (error) {
        console.error('[SignedContractScanner] Page processing failed:', error);
        toast.error(`تعذرت معالجة الصفحة ${index + 1}. أعد تصويرها.`);
      } finally {
        setProcessingProgress(Math.round(((index + 1) / selectedFiles.length) * 100));
        setProcessingCount(selectedFiles.length - index - 1);
      }
    }

    setPages((current) => [...current, ...scannedPages]);
    if (scannedPages.length > 0) {
      toast.success(`تمت معالجة ${scannedPages.length} صفحة وقصها إلى A4`);
    }
  };

  const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    await processFiles(files);
  };

  const handlePdfInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      toast.error('يرجى اختيار ملف PDF فقط');
      return;
    }

    setIsBuildingPdf(true);
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const pdfFile = new File([file], `signed-contract-upload-${timestamp}.pdf`, {
        type: 'application/pdf',
        lastModified: Date.now(),
      });

      await onSubmit({ pdfFile, pageImages: [] });
      toast.success('تم حفظ ملف PDF كنسخة العقد الموقع');
      onOpenChange(false);
    } catch (error) {
      console.error('[SignedContractScanner] PDF upload failed:', error);
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ ملف PDF');
    } finally {
      setIsBuildingPdf(false);
    }
  };

  const movePage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= pages.length) return;
    setPages((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const rotatePage = async (pageId: string) => {
    const page = pages.find((item) => item.id === pageId);
    if (!page) return;
    try {
      const rotated = await rotateScannedPage(page.dataUrl);
      setPages((current) =>
        current.map((item) => (item.id === pageId ? { ...item, dataUrl: rotated } : item))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تدوير الصفحة');
    }
  };

  const buildAndSubmitPdf = async () => {
    if (pages.length === 0) {
      toast.error('صوّر صفحة واحدة على الأقل');
      return;
    }

    setIsBuildingPdf(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      pages.forEach((page, index) => {
        if (index > 0) pdf.addPage('a4', 'portrait');
        pdf.addImage(page.dataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      });

      pdf.setProperties({
        title: 'نسخة العقد الموقع',
        subject: 'نسخة عقد ممسوحة بالكاميرا',
        creator: 'Fleetify Document Scanner',
      });

      const blob = pdf.output('blob');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const pdfFile = new File([blob], `signed-contract-scan-${timestamp}.pdf`, {
        type: 'application/pdf',
        lastModified: Date.now(),
      });
      const pageImages = await Promise.all(
        pages.map((page, index) =>
          dataUrlToImageFile(
            page.dataUrl,
            `signed-contract-page-${String(index + 1).padStart(2, '0')}-${timestamp}.jpg`,
          ),
        ),
      );

      await onSubmit({ pdfFile, pageImages });
      toast.success(`تم حفظ ${pages.length} صورة للعقد مع ملف PDF مجمّع`);
      onOpenChange(false);
    } catch (error) {
      console.error('[SignedContractScanner] PDF creation failed:', error);
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء ملف PDF');
    } finally {
      setIsBuildingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isBusy && onOpenChange(nextOpen)}>
      <DialogContent
        dir="rtl"
        className="flex max-h-[95svh] w-[calc(100vw-1rem)] max-w-5xl flex-col overflow-hidden rounded-lg p-0"
      >
        <DialogHeader className="border-b border-[#E5EAF1] px-5 py-4 text-right">
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-[#142033]">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E9FBF6] text-[#0D876A]">
              <ScanLine className="h-5 w-5" />
            </span>
            مسح نسخة العقد الموقع
          </DialogTitle>
          <DialogDescription className="text-right leading-6">
            صوّر صفحات العقد بالترتيب. سيتم اكتشاف الورقة وتصحيح المنظور وتحسين الوضوح على جهازك.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleInputChange}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleInputChange}
          />
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handlePdfInputChange}
          />

          {pages.length === 0 && processingCount === 0 ? (
            <section className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-[#B8C6D8] bg-[#F8FAFC] px-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white text-[#173A63] shadow-sm">
                <Camera className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-black text-[#142033]">ابدأ بتصوير الصفحة الأولى</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#6A7688]">
                ضع الورقة فوق سطح مختلف اللون، اجعل الحواف الأربع ظاهرة، وتجنب الظلال والانعكاس.
              </p>
              <div className="mt-5 flex w-full max-w-md flex-col gap-2 sm:flex-row">
                <Button
                  className="h-12 flex-1 gap-2 rounded-lg bg-[#11A37F] text-white hover:bg-[#0D876A]"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-5 w-5" />
                  فتح الكاميرا
                </Button>
                <Button
                  variant="outline"
                  className="h-12 flex-1 gap-2 rounded-lg"
                  onClick={() => pdfInputRef.current?.click()}
                >
                  <FileText className="h-5 w-5" />
                  رفع PDF
                </Button>
              </div>
            </section>
          ) : (
            <div className="space-y-4">
              <section className="flex flex-col gap-3 rounded-lg border border-[#DDE5EF] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-[#142033]">صفحات العقد</h3>
                    <Badge variant="outline" className="rounded-md">
                      {pages.length} من {MAX_PAGES}
                    </Badge>
                    {warningCount > 0 && (
                      <Badge className="rounded-md bg-[#FFF3E5] text-[#B45309] hover:bg-[#FFF3E5]">
                        {warningCount} تحتاج مراجعة
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#6A7688]">
                    راجع الترتيب والوضوح قبل إنشاء النسخة النهائية.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="gap-2 rounded-lg"
                    disabled={isBusy || pages.length >= MAX_PAGES}
                    onClick={() => galleryInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    صور من الجهاز
                  </Button>
                  <Button
                    className="gap-2 rounded-lg bg-[#173A63] hover:bg-[#102E50]"
                    disabled={isBusy || pages.length >= MAX_PAGES}
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <FilePlus2 className="h-4 w-4" />
                    تصوير صفحة
                  </Button>
                </div>
              </section>

              {processingCount > 0 && (
                <section className="rounded-lg border border-[#BDEDE1] bg-[#F2FCF9] p-4">
                  <div className="flex items-center justify-between text-sm font-bold text-[#0D876A]">
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري اكتشاف الورقة وتحسين الصفحة
                    </span>
                    <span>{processingProgress}%</span>
                  </div>
                  <Progress value={processingProgress} className="mt-3 h-2" />
                </section>
              )}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pages.map((page, index) => (
                  <article
                    key={page.id}
                    className="overflow-hidden rounded-lg border border-[#DDE5EF] bg-white shadow-sm"
                  >
                    <div className="relative aspect-[1/1.414] bg-[#EEF2F6]">
                      <img
                        src={page.dataUrl}
                        alt={`صفحة ${index + 1}`}
                        className="h-full w-full object-contain"
                      />
                      <span className="absolute right-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-md bg-[#142033] px-2 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <Badge
                        className={`absolute left-2 top-2 rounded-md ${
                          page.quality.score >= 70
                            ? 'bg-[#E9FBF6] text-[#0D876A]'
                            : 'bg-[#FFF3E5] text-[#B45309]'
                        }`}
                      >
                        جودة {page.quality.score}%
                      </Badge>
                    </div>

                    <div className="space-y-3 p-3">
                      <div className="flex items-center gap-2 text-xs">
                        {page.documentDetected ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-[#11A37F]" />
                            <span className="font-semibold text-[#0D876A]">
                              تم اكتشاف الورقة وقصها
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4 text-[#D97706]" />
                            <span className="font-semibold text-[#B45309]">راجع حدود الصفحة</span>
                          </>
                        )}
                      </div>

                      {page.quality.warnings.length > 0 && (
                        <Alert className="border-[#FDE68A] bg-[#FFFBEB] py-2">
                          <AlertTriangle className="h-4 w-4 text-[#D97706]" />
                          <AlertDescription className="text-xs leading-5 text-[#92400E]">
                            {page.quality.warnings[0]}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="grid grid-cols-4 gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          title="تقديم الصفحة"
                          disabled={index === 0}
                          onClick={() => movePage(index, -1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          title="تأخير الصفحة"
                          disabled={index === pages.length - 1}
                          onClick={() => movePage(index, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          title="تدوير الصفحة"
                          onClick={() => rotatePage(page.id)}
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          title="حذف الصفحة"
                          className="border-[#F8CBD0] text-[#BE123C] hover:bg-[#FFF1F2]"
                          onClick={() =>
                            setPages((current) => current.filter((item) => item.id !== page.id))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-[#E5EAF1] bg-white px-5 py-4 sm:justify-between">
          <div className="hidden items-center gap-2 text-xs text-[#6A7688] sm:flex">
            <Sparkles className="h-4 w-4 text-[#38BDF8]" />
            معالجة آمنة على الجهاز دون تعديل محتوى العقد
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              variant="outline"
              className="flex-1 rounded-lg sm:flex-none"
              disabled={isBusy}
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button
              className="flex-1 gap-2 rounded-lg bg-[#11A37F] text-white hover:bg-[#0D876A] sm:min-w-[210px]"
              disabled={isBusy || pages.length === 0}
              onClick={buildAndSubmitPdf}
            >
              {isBuildingPdf || isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              حفظ الصور وPDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
