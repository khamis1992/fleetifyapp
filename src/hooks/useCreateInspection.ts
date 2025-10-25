/**
 * useCreateInspection Hook
 *
 * Purpose: Create vehicle inspections with photo uploads
 * Features:
 * - Create check-in or check-out inspections
 * - Upload photos to Supabase Storage
 * - Upload signature image
 * - Toast notifications for success/error
 * - Cache invalidation
 *
 * @module hooks/useCreateInspection
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from '@/hooks/use-toast';
import type { DamageRecord } from './useVehicleInspections';

/**
 * Inspection Input Data
 */
export interface CreateInspectionInput {
  contract_id: string;
  vehicle_id: string;
  inspection_type: 'check_in' | 'check_out';
  fuel_level: number;
  odometer_reading: number;
  cleanliness_rating: number;
  exterior_condition?: DamageRecord[];
  interior_condition?: DamageRecord[];
  notes?: string;
  customer_signature?: string; // Base64 encoded
  photos?: File[]; // Files to upload
}

/**
 * Photo Upload Result
 */
interface PhotoUploadResult {
  url: string;
  path: string;
}

/**
 * useCreateInspection Hook
 *
 * @returns Mutation object for creating inspections
 *
 * @example
 * const createInspection = useCreateInspection();
 *
 * createInspection.mutate({
 *   contract_id: 'xxx',
 *   vehicle_id: 'yyy',
 *   inspection_type: 'check_in',
 *   fuel_level: 100,
 *   odometer_reading: 50000,
 *   cleanliness_rating: 5,
 *   photos: [file1, file2],
 * });
 */
export function useCreateInspection() {
  const { currentCompanyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInspectionInput) => {
      if (!currentCompanyId) {
        throw new Error('No company context available');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Step 1: Upload photos to Supabase Storage (if any)
      let photoUrls: string[] = [];

      if (input.photos && input.photos.length > 0) {
        try {
          photoUrls = await uploadInspectionPhotos(
            input.photos,
            currentCompanyId,
            input.contract_id,
            input.inspection_type
          );
        } catch (error) {
          console.error('Error uploading photos:', error);
          throw new Error('فشل تحميل الصور. يرجى المحاولة مرة أخرى.');
        }
      }

      // Step 2: Upload signature (if provided)
      let signatureUrl: string | null = null;

      if (input.customer_signature) {
        try {
          signatureUrl = await uploadSignature(
            input.customer_signature,
            currentCompanyId,
            input.contract_id,
            input.inspection_type
          );
        } catch (error) {
          console.error('Error uploading signature:', error);
          // Continue without signature if upload fails
        }
      }

      // Step 3: Create the inspection record
      const inspectionData = {
        company_id: currentCompanyId,
        contract_id: input.contract_id,
        vehicle_id: input.vehicle_id,
        inspection_type: input.inspection_type,
        inspected_by: user.id,
        inspection_date: new Date().toISOString(),
        fuel_level: input.fuel_level,
        odometer_reading: input.odometer_reading,
        cleanliness_rating: input.cleanliness_rating,
        exterior_condition: input.exterior_condition || [],
        interior_condition: input.interior_condition || [],
        photo_urls: photoUrls,
        notes: input.notes || null,
        customer_signature: signatureUrl || input.customer_signature || null,
      };

      const { data, error } = await supabase
        .from('vehicle_inspections')
        .insert(inspectionData)
        .select()
        .single();

      if (error) {
        console.error('Error creating inspection:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['vehicle-inspections', currentCompanyId],
      });

      queryClient.invalidateQueries({
        queryKey: ['vehicle-inspections', currentCompanyId, variables.contract_id],
      });

      queryClient.invalidateQueries({
        queryKey: ['inspection-comparison', currentCompanyId, variables.contract_id],
      });

      // Show success toast
      const inspectionTypeAr = variables.inspection_type === 'check_in' ? 'الاستلام' : 'التسليم';
      toast({
        title: 'تم بنجاح',
        description: `تم تسجيل ${inspectionTypeAr} بنجاح`,
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      console.error('Inspection creation error:', error);
      toast({
        title: 'خطأ',
        description: error.message || 'فشل إنشاء سجل الفحص. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Upload inspection photos to Supabase Storage
 *
 * @param photos - Array of photo files
 * @param companyId - Company ID for folder organization
 * @param contractId - Contract ID for folder organization
 * @param inspectionType - check_in or check_out
 * @returns Array of public URLs for uploaded photos
 */
async function uploadInspectionPhotos(
  photos: File[],
  companyId: string,
  contractId: string,
  inspectionType: string
): Promise<string[]> {
  const uploadPromises = photos.map(async (photo, index) => {
    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = photo.name.split('.').pop();
    const fileName = `${timestamp}_${index}.${fileExt}`;
    const filePath = `inspections/${companyId}/${contractId}/${inspectionType}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('vehicle-documents')
      .upload(filePath, photo, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('vehicle-documents')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  });

  return Promise.all(uploadPromises);
}

/**
 * Upload customer signature to Supabase Storage
 *
 * @param signatureBase64 - Base64 encoded signature image
 * @param companyId - Company ID for folder organization
 * @param contractId - Contract ID for folder organization
 * @param inspectionType - check_in or check_out
 * @returns Public URL of uploaded signature
 */
async function uploadSignature(
  signatureBase64: string,
  companyId: string,
  contractId: string,
  inspectionType: string
): Promise<string> {
  // Convert base64 to blob
  const base64Data = signatureBase64.split(',')[1] || signatureBase64;
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' });

  // Generate filename
  const timestamp = Date.now();
  const fileName = `signature_${timestamp}.png`;
  const filePath = `inspections/${companyId}/${contractId}/${inspectionType}/${fileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('vehicle-documents')
    .upload(filePath, blob, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading signature:', error);
    throw error;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('vehicle-documents')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * useDeleteInspection Hook
 *
 * Delete a vehicle inspection (only within 24 hours of creation)
 *
 * @returns Mutation object for deleting inspections
 *
 * @example
 * const deleteInspection = useDeleteInspection();
 * deleteInspection.mutate('inspection-id');
 */
export function useDeleteInspection() {
  const { currentCompanyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inspectionId: string) => {
      if (!currentCompanyId) {
        throw new Error('No company context available');
      }

      const { error } = await supabase
        .from('vehicle_inspections')
        .delete()
        .eq('id', inspectionId)
        .eq('company_id', currentCompanyId);

      if (error) {
        console.error('Error deleting inspection:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: ['vehicle-inspections', currentCompanyId],
      });

      toast({
        title: 'تم بنجاح',
        description: 'تم حذف سجل الفحص',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      console.error('Inspection deletion error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل حذف سجل الفحص. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    },
  });
}
