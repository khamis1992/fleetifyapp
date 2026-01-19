import { useState, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LazyImage } from '@/components/common/LazyImage';

interface InvoiceCameraCaptureProps {
  onImageCapture: (file: File) => void;
  onCancel: () => void;
}

export const InvoiceCameraCapture = ({ onImageCapture, onCancel }: InvoiceCameraCaptureProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    }
  };

  const processImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setCapturedFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (capturedFile) {
      onImageCapture(capturedFile);
    }
  };

  const handleRetake = () => {
    setPreview(null);
    setCapturedFile(null);
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">تصوير الفاتورة</h3>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {!preview ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => cameraInputRef.current?.click()}
                className="h-32 flex flex-col gap-2"
                variant="outline"
              >
                <Camera className="h-8 w-8" />
                <span>التقط صورة بالكاميرا</span>
              </Button>

              <Button
                onClick={() => fileInputRef.current?.click()}
                className="h-32 flex flex-col gap-2"
                variant="outline"
              >
                <Upload className="h-8 w-8" />
                <span>اختر صورة من المعرض</span>
              </Button>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <p className="text-sm text-muted-foreground text-center">
              التقط صورة واضحة للفاتورة أو اختر صورة موجودة
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden">
              <LazyImage
                src={preview}
                alt="Invoice preview"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={handleRetake} variant="outline" className="flex-1">
                إعادة التقاط
              </Button>
              <Button onClick={handleConfirm} className="flex-1">
                تأكيد ومتابعة
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
