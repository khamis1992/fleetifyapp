import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface UseImageUploadOptions {
  bucket?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
  folder?: string;
}

export const useImageUpload = (options: UseImageUploadOptions = {}) => {
  const {
    bucket = 'branding-assets',
    maxSizeMB = 5,
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    folder = ''
  } = options;

  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      toast.error(`نوع الملف غير مدعوم. الأنواع المدعومة: ${allowedTypes.join(', ')}`);
      return false;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast.error(`حجم الملف كبير جداً. الحد الأقصى: ${maxSizeMB}MB`);
      return false;
    }

    return true;
  };

  const compressImage = async (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user?.profile?.company_id) {
      toast.error('لا يمكن تحديد الشركة');
      return null;
    }

    if (!validateFile(file)) {
      return null;
    }

    setUploading(true);

    try {
      // Compress image before upload
      const compressedFile = await compressImage(file);

      // Create file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = folder 
        ? `${user.profile.company_id}/${folder}/${fileName}`
        : `${user.profile.company_id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('فشل في رفع الصورة');
        return null;
      }

      // Get public URL
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      
      toast.success('تم رفع الصورة بنجاح');
      return data.publicUrl;

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('حدث خطأ أثناء رفع الصورة');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (url: string): Promise<boolean> => {
    if (!url || !user?.profile?.company_id) return false;

    try {
      // Extract file path from URL
      const urlParts = url.split('/');
      const bucketIndex = urlParts.findIndex(part => part === bucket);
      if (bucketIndex === -1 || bucketIndex === urlParts.length - 1) {
        return false;
      }

      const filePath = urlParts.slice(bucketIndex + 1).join('/');

      // Delete from Supabase Storage
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        toast.error('فشل في حذف الصورة');
        return false;
      }

      toast.success('تم حذف الصورة بنجاح');
      return true;

    } catch (error) {
      console.error('Delete error:', error);
      toast.error('حدث خطأ أثناء حذف الصورة');
      return false;
    }
  };

  const createPreview = (file: File): void => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearPreview = (): void => {
    setPreview(null);
  };

  return {
    uploading,
    preview,
    uploadImage,
    deleteImage,
    createPreview,
    clearPreview,
    validateFile
  };
};