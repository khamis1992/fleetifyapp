import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  X, 
  Eye, 
  Star, 
  StarOff,
  Download,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface PropertyImage {
  id?: string;
  url: string;
  file?: File;
  caption?: string;
  is_primary?: boolean;
  order_index?: number;
}

interface PropertyImageUploadProps {
  images: PropertyImage[];
  onImagesChange: (images: PropertyImage[]) => void;
  maxImages?: number;
  isLoading?: boolean;
}

export const PropertyImageUpload: React.FC<PropertyImageUploadProps> = ({
  images,
  onImagesChange,
  maxImages = 10,
  isLoading = false,
}) => {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages: PropertyImage[] = acceptedFiles.map((file, index) => ({
      url: URL.createObjectURL(file),
      file,
      caption: file.name,
      is_primary: images.length === 0 && index === 0,
      order_index: images.length + index,
    }));

    // التحقق من الحد الأقصى للصور
    const totalImages = images.length + newImages.length;
    if (totalImages > maxImages) {
      const allowedImages = newImages.slice(0, maxImages - images.length);
      onImagesChange([...images, ...allowedImages]);
    } else {
      onImagesChange([...images, ...newImages]);
    }
  }, [images, maxImages, onImagesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: true,
    disabled: isLoading || uploading || images.length >= maxImages,
  });

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    // إذا تم حذف الصورة الأساسية، اجعل الصورة الأولى هي الأساسية
    if (images[index].is_primary && newImages.length > 0) {
      newImages[0].is_primary = true;
    }
    onImagesChange(newImages);
  };

  const setPrimaryImage = (index: number) => {
    const newImages = images.map((image, i) => ({
      ...image,
      is_primary: i === index,
    }));
    onImagesChange(newImages);
  };

  const updateImageCaption = (index: number, caption: string) => {
    const newImages = images.map((image, i) => 
      i === index ? { ...image, caption } : image
    );
    onImagesChange(newImages);
  };

  const downloadImage = (image: PropertyImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.caption || 'property-image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          صور العقار
          <Badge variant="secondary">
            {images.length} / {maxImages}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* منطقة رفع الصور */}
        {images.length < maxImages && (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
              }
              ${isLoading || uploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {isDragActive
                ? 'اسحب الصور هنا...'
                : 'اسحب الصور هنا أو اضغط للاختيار'
              }
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              يدعم: JPEG, PNG, GIF, WebP (حد أقصى {maxImages} صور)
            </p>
          </div>
        )}

        {/* عرض الصور المرفوعة */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={image.url}
                    alt={image.caption || `صورة ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* تراكب الإجراءات */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 space-x-reverse">
                    {/* معاينة الصورة */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="secondary">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>{image.caption || `صورة ${index + 1}`}</DialogTitle>
                        </DialogHeader>
                        <div className="aspect-video">
                          <img
                            src={image.url}
                            alt={image.caption || `صورة ${index + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* تحديد كصورة أساسية */}
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => setPrimaryImage(index)}
                    >
                      {image.is_primary ? (
                        <Star className="h-4 w-4 fill-current" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </Button>

                    {/* تحميل الصورة */}
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => downloadImage(image)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    {/* حذف الصورة */}
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* مؤشر الصورة الأساسية */}
                  {image.is_primary && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="default" className="text-xs">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        أساسية
                      </Badge>
                    </div>
                  )}
                </div>

                {/* وصف الصورة */}
                <div className="mt-2">
                  <input
                    type="text"
                    value={image.caption || ''}
                    onChange={(e) => updateImageCaption(index, e.target.value)}
                    placeholder="وصف الصورة..."
                    className="w-full text-xs p-1 border rounded text-center bg-background"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* رسالة عدم وجود صور */}
        {images.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Upload className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p>لم يتم رفع أي صور بعد</p>
            <p className="text-xs">ابدأ برفع صور العقار لعرضها للعملاء</p>
          </div>
        )}

        {/* مؤشر التحميل */}
        {(isLoading || uploading) && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">
              {uploading ? 'جاري رفع الصور...' : 'جاري التحميل...'}
            </span>
          </div>
        )}

        {/* نصائح */}
        <div className="bg-muted/50 rounded-lg p-3">
          <h4 className="text-sm font-medium mb-2">نصائح لأفضل النتائج:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• استخدم صور عالية الجودة (1920x1080 أو أعلى)</li>
            <li>• تأكد من الإضاءة الجيدة والوضوح</li>
            <li>• صور متنوعة: خارجية، داخلية، غرف، مرافق</li>
            <li>• حدد الصورة الأساسية التي ستظهر في القوائم</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};