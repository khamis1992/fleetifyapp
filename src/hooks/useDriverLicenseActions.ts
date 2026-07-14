import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  driverLicensesTable,
  type DriverLicenseUpdate,
} from '@/integrations/supabase/driverLicensesClient';
import type { DriverLicenseFormData } from '@/types/customer';

import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

const DRIVER_LICENSES_BUCKET = 'driver-licenses';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const uploadImageToStorage = async (
  file: File,
  folder: string
): Promise<string> => {
  const extensionsByType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };
  const fileExtension = extensionsByType[file.type];

  if (!fileExtension) {
    throw new Error('نوع الملف غير مدعوم. ارفع صورة JPG أو PNG أو WebP أو ملف PDF.');
  }

  const maxSizeBytes = 10 * 1024 * 1024;
  if (file.size <= 0 || file.size > maxSizeBytes) {
    throw new Error('يجب أن يكون حجم الملف أكبر من صفر ولا يتجاوز 10MB.');
  }

  const fileName = `${crypto.randomUUID()}.${fileExtension}`;
  const filePath = `${folder}/${fileName}`;
  const { error } = await supabase.storage
    .from(DRIVER_LICENSES_BUCKET)
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (error) throw new Error(`فشل رفع الملف: ${error.message}`);

  return supabase.storage.from(DRIVER_LICENSES_BUCKET).getPublicUrl(filePath).data
    .publicUrl;
};

const deleteImageFromStorage = async (url: string | null | undefined) => {
  if (!url) return;

  try {
    const marker = `${DRIVER_LICENSES_BUCKET}/`;
    const markerIndex = url.indexOf(marker);
    if (markerIndex < 0) return;

    const encodedPath = url.slice(markerIndex + marker.length).split('?')[0];
    const filePath = decodeURIComponent(encodedPath);
    const { error } = await supabase.storage
      .from(DRIVER_LICENSES_BUCKET)
      .remove([filePath]);

    if (error) console.error('Error deleting driver license file:', error);
  } catch (error) {
    console.error('Error deleting driver license file:', error);
  }
};

export const useDriverLicenseActions = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { user } = useAuth();

  const createLicense = useMutation({
    mutationFn: async ({
      customerId,
      formData,
    }: {
      customerId: string;
      formData: DriverLicenseFormData;
    }) => {
      if (!companyId) throw new Error('Company ID is required');

      const licenseNumber = formData.license_number.trim();
      const issuingCountry = formData.issuing_country.trim();
      if (!licenseNumber || !issuingCountry || !formData.expiry_date) {
        throw new Error('رقم الرخصة وتاريخ الانتهاء ودولة الإصدار حقول مطلوبة.');
      }
      if (formData.issue_date && formData.issue_date >= formData.expiry_date) {
        throw new Error('يجب أن يكون تاريخ انتهاء الرخصة بعد تاريخ الإصدار.');
      }

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('id', customerId)
        .eq('company_id', companyId)
        .maybeSingle();

      if (customerError) throw customerError;
      if (!customer) throw new Error('العميل غير موجود ضمن الشركة الحالية.');

      let frontImageUrl: string | undefined;
      let backImageUrl: string | undefined;
      const uploadFolder = `${companyId}/${customerId}`;

      try {
        if (formData.front_image) {
          frontImageUrl = await uploadImageToStorage(formData.front_image, uploadFolder);
        }
        if (formData.back_image) {
          backImageUrl = await uploadImageToStorage(formData.back_image, uploadFolder);
        }

        const { data, error } = await driverLicensesTable()
          .insert({
            company_id: companyId,
            customer_id: customerId,
            license_number: licenseNumber,
            issue_date: formData.issue_date || null,
            expiry_date: formData.expiry_date,
            issuing_country: issuingCountry,
            front_image_url: frontImageUrl || null,
            back_image_url: backImageUrl || null,
            notes: formData.notes?.trim() || null,
            verification_status: 'pending',
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        await Promise.all([
          deleteImageFromStorage(frontImageUrl),
          deleteImageFromStorage(backImageUrl),
        ]);
        throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['driver-licenses', variables.customerId] });
      queryClient.invalidateQueries({
        queryKey: ['driver-licenses-count', variables.customerId],
      });
      queryClient.invalidateQueries({ queryKey: ['expiring-licenses'] });
      toast.success('تمت إضافة رخصة القيادة بنجاح');
    },
    onError: (error: unknown) => {
      console.error('Error creating driver license:', error);
      toast.error(getErrorMessage(error, 'فشلت إضافة رخصة القيادة'));
    },
  });

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
      if (!companyId) throw new Error('Company ID is required');

      const updateData: DriverLicenseUpdate = {
        verification_status: status,
        verification_notes: notes?.trim() || null,
      };

      if (status === 'verified') {
        if (!user?.id) throw new Error('يجب تسجيل الدخول للتحقق من الرخصة.');

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .eq('company_id', companyId)
          .maybeSingle();

        if (profileError) throw profileError;
        const profileId = profile?.id || user.profile?.id;
        if (!profileId) throw new Error('تعذر تحديد ملف الموظف الذي تحقق من الرخصة.');

        updateData.verified_by = profileId;
        updateData.verified_at = new Date().toISOString();
      } else {
        updateData.verified_by = null;
        updateData.verified_at = null;
      }

      const { data, error } = await driverLicensesTable()
        .update(updateData)
        .eq('id', licenseId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['driver-licenses', data.customer_id] });
      queryClient.invalidateQueries({ queryKey: ['driver-license', data.id] });
      queryClient.invalidateQueries({ queryKey: ['expiring-licenses'] });

      const statusText =
        data.verification_status === 'verified'
          ? 'تم التحقق من'
          : data.verification_status === 'rejected'
            ? 'تم رفض'
            : 'تم تحديث';
      toast.success(`${statusText} رخصة القيادة`);
    },
    onError: (error: unknown) => {
      console.error('Error updating driver license verification:', error);
      toast.error(getErrorMessage(error, 'فشل تحديث حالة التحقق'));
    },
  });

  const deleteLicense = useMutation({
    mutationFn: async ({ licenseId }: { licenseId: string }) => {
      if (!companyId) throw new Error('Company ID is required');

      const { data: license, error: fetchError } = await driverLicensesTable()
        .select('*')
        .eq('id', licenseId)
        .eq('company_id', companyId)
        .single();

      if (fetchError) throw fetchError;

      const { error: deleteError } = await driverLicensesTable()
        .delete()
        .eq('id', licenseId)
        .eq('company_id', companyId);

      if (deleteError) throw deleteError;

      await Promise.all([
        deleteImageFromStorage(license.front_image_url),
        deleteImageFromStorage(license.back_image_url),
      ]);
      return license;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['driver-licenses', data.customer_id] });
      queryClient.invalidateQueries({
        queryKey: ['driver-licenses-count', data.customer_id],
      });
      queryClient.invalidateQueries({ queryKey: ['expiring-licenses'] });
      toast.success('تم حذف رخصة القيادة بنجاح');
    },
    onError: (error: unknown) => {
      console.error('Error deleting driver license:', error);
      toast.error(getErrorMessage(error, 'فشل حذف رخصة القيادة'));
    },
  });

  const updateNotes = useMutation({
    mutationFn: async ({ licenseId, notes }: { licenseId: string; notes: string }) => {
      if (!companyId) throw new Error('Company ID is required');

      const { data, error } = await driverLicensesTable()
        .update({ notes: notes.trim() || null })
        .eq('id', licenseId)
        .eq('company_id', companyId)
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
    onError: (error: unknown) => {
      console.error('Error updating driver license notes:', error);
      toast.error(getErrorMessage(error, 'فشل تحديث الملاحظات'));
    },
  });

  return { createLicense, updateVerificationStatus, deleteLicense, updateNotes };
};
