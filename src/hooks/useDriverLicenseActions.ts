import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DriverLicenseFormData } from '@/types/customer';

/**
 * Upload image file to Supabase storage
 * @param file - File to upload
 * @param bucket - Storage bucket name
 * @param folder - Folder path within bucket
 * @returns Public URL of uploaded file
 */
const uploadImageToStorage = async (
  file: File,
  bucket: string = 'driver-licenses',
  folder: string
): Promise<string> => {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('نوع الملف غير مدعوم. يرجى رفع صورة (JPG, PNG, WebP) أو ملف PDF');
  }

  // Validate file size (max 10MB)
  const maxSizeMB = 10;
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    throw new Error(`حجم الملف كبير جداً. الحد الأقصى: ${maxSizeMB}MB`);
  }

  // Generate unique file name
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  // Upload to Supabase storage
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw new Error(`فشل رفع الملف: ${uploadError.message}`);
  }

  // Get public URL
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return data.publicUrl;
};

/**
 * Delete image from Supabase storage
 * @param url - Public URL of image to delete
 * @param bucket - Storage bucket name
 */
const deleteImageFromStorage = async (
  url: string | undefined,
  bucket: string = 'driver-licenses'
): Promise<void> => {
  if (!url) return;

  try {
    // Extract file path from URL
    const urlParts = url.split(`${bucket}/`);
    if (urlParts.length < 2) return;

    const filePath = urlParts[1];

    const { error } = await supabase.storage.from(bucket).remove([filePath]);

    if (error) {
      console.error('Error deleting file from storage:', error);
    }
  } catch (error) {
    console.error('Error in deleteImageFromStorage:', error);
  }
};

/**
 * Hook for driver license mutation actions
 */
export const useDriverLicenseActions = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { user } = useAuth();

  /**
   * Create new driver license with image uploads
   */
  const createLicense = useMutation({
    mutationFn: async ({
      customerId,
      formData,
    }: {
      customerId: string;
      formData: DriverLicenseFormData;
    }) => {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      // Upload images if provided
      let frontImageUrl: string | undefined;
      let backImageUrl: string | undefined;

      const uploadFolder = `${companyId}/${customerId}`;

      try {
        if (formData.front_image) {
          frontImageUrl = await uploadImageToStorage(
            formData.front_image,
            'driver-licenses',
            uploadFolder
          );
        }

        if (formData.back_image) {
          backImageUrl = await uploadImageToStorage(
            formData.back_image,
            'driver-licenses',
            uploadFolder
          );
        }

        // Create license record
        const { data, error } = await supabase
          .from('driver_licenses')
          .insert({
            company_id: companyId,
            customer_id: customerId,
            license_number: formData.license_number,
            issue_date: formData.issue_date || null,
            expiry_date: formData.expiry_date,
            issuing_country: formData.issuing_country,
            front_image_url: frontImageUrl,
            back_image_url: backImageUrl,
            notes: formData.notes || null,
            verification_status: 'pending',
          })
          .select()
          .single();

        if (error) {
          // Clean up uploaded images on error
          if (frontImageUrl) await deleteImageFromStorage(frontImageUrl);
          if (backImageUrl) await deleteImageFromStorage(backImageUrl);
          throw error;
        }

        return data;
      } catch (error) {
        // Clean up uploaded images on error
        if (frontImageUrl) await deleteImageFromStorage(frontImageUrl);
        if (backImageUrl) await deleteImageFromStorage(backImageUrl);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['driver-licenses', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['driver-licenses-count', variables.customerId] });
      toast.success('تم إضافة رخصة القيادة بنجاح');
    },
    onError: (error: any) => {
      console.error('Error creating driver license:', error);
      toast.error(error.message || 'فشل إضافة رخصة القيادة');
    },
  });

  /**
   * Update verification status of a license
   */
  const updateVerificationStatus = useMutation({
    mutationFn: async ({
      licenseId,
      status,
      notes,
    }: {
      licenseId: string;
      status: 'verified' | 'rejected' | 'pending';
      notes?: string;
    }) => {
      const updateData: any = {
        verification_status: status,
        verification_notes: notes || null,
      };

      if (status === 'verified') {
        updateData.verified_by = user?.id;
        updateData.verified_at = new Date().toISOString();
      } else {
        updateData.verified_by = null;
        updateData.verified_at = null;
      }

      const { data, error } = await supabase
        .from('driver_licenses')
        .update(updateData)
        .eq('id', licenseId)
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['driver-licenses', data.customer_id] });
      queryClient.invalidateQueries({ queryKey: ['driver-license', data.id] });
      queryClient.invalidateQueries({ queryKey: ['expiring-licenses'] });

      const statusText = data.verification_status === 'verified' ? 'تم التحقق من' :
                         data.verification_status === 'rejected' ? 'تم رفض' : 'تم تحديث';
      toast.success(`${statusText} رخصة القيادة`);
    },
    onError: (error: any) => {
      console.error('Error updating verification status:', error);
      toast.error(error.message || 'فشل تحديث حالة التحقق');
    },
  });

  /**
   * Delete driver license and associated images
   */
  const deleteLicense = useMutation({
    mutationFn: async ({ licenseId }: { licenseId: string }) => {
      // First, get the license to retrieve image URLs
      const { data: license, error: fetchError } = await supabase
        .from('driver_licenses')
        .select('*')
        .eq('id', licenseId)
        .single();

      if (fetchError) throw fetchError;

      // Delete the license record
      const { error: deleteError } = await supabase
        .from('driver_licenses')
        .delete()
        .eq('id', licenseId);

      if (deleteError) throw deleteError;

      // Delete images from storage
      if (license.front_image_url) {
        await deleteImageFromStorage(license.front_image_url);
      }
      if (license.back_image_url) {
        await deleteImageFromStorage(license.back_image_url);
      }

      return license;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['driver-licenses', data.customer_id] });
      queryClient.invalidateQueries({ queryKey: ['driver-licenses-count', data.customer_id] });
      toast.success('تم حذف رخصة القيادة بنجاح');
    },
    onError: (error: any) => {
      console.error('Error deleting driver license:', error);
      toast.error(error.message || 'فشل حذف رخصة القيادة');
    },
  });

  /**
   * Update license notes
   */
  const updateNotes = useMutation({
    mutationFn: async ({
      licenseId,
      notes,
    }: {
      licenseId: string;
      notes: string;
    }) => {
      const { data, error } = await supabase
        .from('driver_licenses')
        .update({ notes })
        .eq('id', licenseId)
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['driver-licenses', data.customer_id] });
      queryClient.invalidateQueries({ queryKey: ['driver-license', data.id] });
      toast.success('تم تحديث الملاحظات بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating notes:', error);
      toast.error(error.message || 'فشل تحديث الملاحظات');
    },
  });

  return {
    createLicense,
    updateVerificationStatus,
    deleteLicense,
    updateNotes,
  };
};
