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

// Timeout helper function
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('انتهت المهلة الزمنية للعملية')), timeoutMs)
    )
  ]);
};

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
  const [uploadProgress, setUploadProgress] = useState(0);

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

  const compressImage = async (file: File, maxWidth = 1200, quality = 0.75): Promise<File> => {
    return new Promise((resolve, reject) => {
      // Skip compression for small files (< 500KB)
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB < 0.5) {
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      // Add timeout for image loading
      const timeoutId = setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('انتهت المهلة الزمنية لتحميل الصورة'));
      }, 10000); // 10 seconds timeout

      img.onerror = () => {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(objectUrl);
        reject(new Error('فشل تحميل الصورة'));
      };

      img.onload = () => {
        clearTimeout(timeoutId);
        
        try {
          // Calculate new dimensions
          let { width, height } = img;
          
          // Only compress if image is larger than maxWidth
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress with timeout
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressionTimeout = setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
            resolve(file); // Fallback to original file if compression takes too long
          }, 5000);

          canvas.toBlob(
            (blob) => {
              clearTimeout(compressionTimeout);
              URL.revokeObjectURL(objectUrl);
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            file.type === 'image/png' ? 'image/png' : 'image/jpeg',
            quality
          );
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          console.error('Compression error:', error);
          resolve(file); // Fallback to original file
        }
      };

      img.src = objectUrl;
    });
  };

  const uploadImage = async (file: File, retryCount = 0): Promise<string | null> => {
    if (!user?.profile?.company_id) {
      toast.error('لا يمكن تحديد الشركة');
      return null;
    }

    if (!validateFile(file)) {
      return null;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Show compression status
      toast.loading('جاري ضغط الصورة...', { id: 'upload-status' });
      
      // Compress image with timeout (max 15 seconds)
      const compressedFile = await withTimeout(
        compressImage(file, 1200, 0.75),
        15000
      );

      setUploadProgress(30);
      toast.loading('جاري رفع الصورة...', { id: 'upload-status' });

      // Create file path
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = folder 
        ? `${user.profile.company_id}/${folder}/${fileName}`
        : `${user.profile.company_id}/${fileName}`;

      setUploadProgress(50);

      // Upload to Supabase Storage with timeout (max 60 seconds)
      const uploadPromise = supabase.storage
        .from(bucket)
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      const { error: uploadError } = await withTimeout(uploadPromise, 60000);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        
        // Retry logic for network errors
        if (uploadError.message?.includes('network') || uploadError.message?.includes('timeout')) {
          if (retryCount < 2) {
            toast.loading(`إعادة المحاولة... (${retryCount + 1}/2)`, { id: 'upload-status' });
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
            return uploadImage(file, retryCount + 1);
          }
        }

        let errorMessage = 'فشل في رفع الصورة';
        if (uploadError.message?.includes('duplicate') || uploadError.message?.includes('already exists')) {
          errorMessage = 'الصورة موجودة مسبقاً';
        } else if (uploadError.message?.includes('permission') || uploadError.message?.includes('denied')) {
          errorMessage = 'ليس لديك صلاحية لرفع الصورة';
        } else if (uploadError.message?.includes('network') || uploadError.message?.includes('timeout')) {
          errorMessage = 'انتهت المهلة الزمنية أو فشل الاتصال بالخادم';
        }

        toast.error(errorMessage, { id: 'upload-status' });
        return null;
      }

      setUploadProgress(90);

      // Get public URL
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      
      setUploadProgress(100);
      toast.success('تم رفع الصورة بنجاح', { id: 'upload-status' });
      
      // Reset progress after a short delay
      setTimeout(() => setUploadProgress(0), 500);
      
      return data.publicUrl;

    } catch (error: any) {
      console.error('Upload error:', error);
      
      let errorMessage = 'حدث خطأ أثناء رفع الصورة';
      if (error.message?.includes('انتهت المهلة الزمنية')) {
        errorMessage = 'انتهت المهلة الزمنية للعملية. يرجى المحاولة مرة أخرى';
      } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
        errorMessage = 'فشل الاتصال بالخادم. يرجى التحقق من الاتصال بالإنترنت';
      }

      toast.error(errorMessage, { id: 'upload-status' });
      setUploadProgress(0);
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
    uploadProgress,
    uploadImage,
    deleteImage,
    createPreview,
    clearPreview,
    validateFile
  };
};