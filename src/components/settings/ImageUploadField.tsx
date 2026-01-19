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
  const { uploading, uploadImage, deleteImage, createPreview, preview, clearPreview, uploadProgress } = useImageUpload({
    folder,
    maxSizeMB: 5,
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  });

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Validate file size (already done in useImageUpload, but add explicit check)
    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
      return;
    }

    // Create preview first
    createPreview(file);

    // Upload the image
    try {
      const uploadedUrl = await uploadImage(file);
      if (uploadedUrl) {
        onChange(uploadedUrl);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      clearPreview();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleDelete = async () => {
    try {
      if (value && value.includes('supabase')) {
        const deleted = await deleteImage(value);
        if (deleted) {
          onChange('');
        }
      } else {
        onChange('');
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      // Still clear the value even if deletion failed
      onChange('');
    }
  };

  const handleUrlChange = (url: string) => {
    // Basic URL validation
    if (url && !url.match(/^https?:\/\/.+/)) {
      return; // Invalid URL
    }
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
                <div className="absolute inset-0 bg-background/50 flex flex-col items-center justify-center gap-2">
                  <LoadingSpinner size="sm" />
                  {uploadProgress > 0 && (
                    <div className="w-3/4 bg-background/80 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-foreground">
                    {uploadProgress > 0 ? `${uploadProgress}%` : 'جاري المعالجة...'}
                  </p>
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
              <div className="flex flex-col items-center gap-3">
                <LoadingSpinner size="sm" />
                {uploadProgress > 0 && (
                  <div className="w-48 bg-background/80 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {uploadProgress > 0 ? `جاري رفع الصورة... ${uploadProgress}%` : 'جاري المعالجة...'}
                </p>
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