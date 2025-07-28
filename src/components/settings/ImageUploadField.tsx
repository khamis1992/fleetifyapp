import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Upload, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ImageUploadFieldProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  placeholder?: string;
  folder?: string;
  aspectRatio?: 'square' | 'auto';
  maxWidth?: number;
  showUrlInput?: boolean;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  onChange,
  placeholder = "اسحب الصورة هنا أو انقر للاختيار",
  folder = '',
  aspectRatio = 'auto',
  maxWidth = 200,
  showUrlInput = true
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading, uploadImage, deleteImage, createPreview, preview, clearPreview } = useImageUpload({
    folder,
    maxSizeMB: 5,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  });

  const handleFileSelect = async (file: File) => {
    createPreview(file);
    const uploadedUrl = await uploadImage(file);
    if (uploadedUrl) {
      onChange(uploadedUrl);
      clearPreview();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleDelete = async () => {
    if (value && value.includes('supabase')) {
      const deleted = await deleteImage(value);
      if (deleted) {
        onChange('');
      }
    } else {
      onChange('');
    }
  };

  const handleUrlChange = (url: string) => {
    onChange(url);
    clearPreview();
  };

  const displayImage = preview || value;

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">{label}</Label>
      
      {/* Image Preview/Upload Area */}
      <div className="space-y-3">
        {displayImage ? (
          <div className="relative group">
            <div 
              className={`relative overflow-hidden rounded-lg border-2 border-border bg-muted ${
                aspectRatio === 'square' ? 'aspect-square' : ''
              }`}
              style={{ maxWidth: `${maxWidth}px` }}
            >
              <img
                src={displayImage}
                alt={label}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4" />
                  تغيير
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={uploading}
                >
                  <Trash2 className="h-4 w-4" />
                  حذف
                </Button>
              </div>
              
              {uploading && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer group"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <LoadingSpinner size="sm" />
                <p className="text-sm text-muted-foreground">جاري رفع الصورة...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="h-8 w-8 text-muted-foreground group-hover:text-foreground transition-colors" />
                <p className="text-sm text-muted-foreground group-hover:text-foreground">
                  {placeholder}
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WebP (حد أقصى 5MB)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Manual URL input (optional) */}
        {showUrlInput && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">أو أدخل رابط الصورة</Label>
            <Input
              type="url"
              placeholder="https://example.com/image.png"
              value={value || ''}
              onChange={(e) => handleUrlChange(e.target.value)}
              disabled={uploading}
            />
          </div>
        )}
      </div>
    </div>
  );
};