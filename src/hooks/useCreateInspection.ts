import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from '@/hooks/use-toast';
import type { DamageRecord } from './useVehicleInspections';

type ConditionReportInsert = Database['public']['Tables']['vehicle_condition_reports']['Insert'];

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
  customer_signature?: string;
  photos?: File[];
}

interface UploadedFile {
  path: string;
  url: string;
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function overallCondition(cleanliness: number): string {
  if (cleanliness >= 5) return 'excellent';
  if (cleanliness >= 4) return 'good';
  if (cleanliness >= 2) return 'fair';
  return 'poor';
}

function validateInput(input: CreateInspectionInput): void {
  if (!input.contract_id || !input.vehicle_id) throw new Error('بيانات العقد والمركبة مطلوبة');
  if (input.fuel_level < 0 || input.fuel_level > 100) throw new Error('مستوى الوقود يجب أن يكون بين 0 و100');
  if (input.odometer_reading < 0) throw new Error('قراءة العداد غير صحيحة');
  if (input.cleanliness_rating < 1 || input.cleanliness_rating > 5) throw new Error('تقييم النظافة يجب أن يكون بين 1 و5');
  if ((input.photos?.length || 0) > 10) throw new Error('الحد الأقصى للصور هو 10');
}

export function useCreateInspection() {
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInspectionInput) => {
      if (!companyId) throw new Error('تعذر تحديد الشركة');
      validateInput(input);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('يجب تسجيل الدخول أولًا');

      const uploadedFiles: UploadedFile[] = [];
      try {
        if (input.photos?.length) {
          uploadedFiles.push(...await uploadInspectionPhotos(
            input.photos,
            companyId,
            input.contract_id,
            input.inspection_type
          ));
        }

        let signature: UploadedFile | null = null;
        if (input.customer_signature) {
          signature = await uploadSignature(
            input.customer_signature,
            companyId,
            input.contract_id,
            input.inspection_type
          );
          uploadedFiles.push(signature);
        }

        const insert: ConditionReportInsert = {
          company_id: companyId,
          contract_id: input.contract_id,
          vehicle_id: input.vehicle_id,
          inspector_id: user.id,
          inspection_type: input.inspection_type,
          inspection_date: new Date().toISOString(),
          fuel_level: input.fuel_level,
          mileage_reading: input.odometer_reading,
          overall_condition: overallCondition(input.cleanliness_rating),
          condition_items: toJson({
            cleanliness_rating: input.cleanliness_rating,
            interior_condition: input.interior_condition || [],
          }),
          damage_points: toJson(input.exterior_condition || []),
          photos: toJson(uploadedFiles.filter(file => file !== signature).map(file => file.url)),
          notes: input.notes?.trim() || null,
          customer_signature: signature?.url || input.customer_signature || null,
          status: 'approved',
        };

        const { data, error } = await supabase
          .from('vehicle_condition_reports')
          .insert(insert)
          .select('*')
          .single();
        if (error) throw error;

        const { error: mileageError } = await supabase
          .from('vehicles')
          .update({
            current_mileage: input.odometer_reading,
            odometer_reading: input.odometer_reading,
            updated_at: new Date().toISOString(),
          })
          .eq('id', input.vehicle_id)
          .eq('company_id', companyId);
        if (mileageError) console.error('Inspection saved, but vehicle mileage update failed:', mileageError);

        return data;
      } catch (error) {
        if (uploadedFiles.length > 0) {
          await supabase.storage.from('vehicle-documents').remove(uploadedFiles.map(file => file.path));
        }
        throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-inspections', companyId] });
      queryClient.invalidateQueries({ queryKey: ['inspection-comparison', companyId, variables.contract_id] });
      toast({
        title: 'تم الحفظ',
        description: variables.inspection_type === 'check_in' ? 'تم تسجيل استلام المركبة.' : 'تم تسجيل تسليم المركبة.',
      });
    },
    onError: error => {
      console.error('Inspection creation error:', error);
      toast({
        title: 'تعذر حفظ الفحص',
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع.',
        variant: 'destructive',
      });
    },
  });
}

async function uploadInspectionPhotos(
  photos: File[],
  companyId: string,
  contractId: string,
  inspectionType: string
): Promise<UploadedFile[]> {
  return Promise.all(photos.map(async photo => {
    if (!photo.type.startsWith('image/')) throw new Error('ملفات الصور فقط مسموحة');
    if (photo.size > 10 * 1024 * 1024) throw new Error('حجم الصورة يجب ألا يتجاوز 10 ميجابايت');
    const extension = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `inspections/${companyId}/${contractId}/${inspectionType}/${crypto.randomUUID()}.${extension}`;
    const { data, error } = await supabase.storage
      .from('vehicle-documents')
      .upload(path, photo, { cacheControl: '3600', upsert: false, contentType: photo.type });
    if (error) throw error;
    const { data: publicUrl } = supabase.storage.from('vehicle-documents').getPublicUrl(data.path);
    return { path: data.path, url: publicUrl.publicUrl };
  }));
}

async function uploadSignature(
  signatureBase64: string,
  companyId: string,
  contractId: string,
  inspectionType: string
): Promise<UploadedFile> {
  const base64Data = signatureBase64.split(',')[1] || signatureBase64;
  const bytes = Uint8Array.from(atob(base64Data), character => character.charCodeAt(0));
  if (bytes.byteLength > 2 * 1024 * 1024) throw new Error('حجم التوقيع كبير جدًا');
  const blob = new Blob([bytes], { type: 'image/png' });
  const path = `inspections/${companyId}/${contractId}/${inspectionType}/signature-${crypto.randomUUID()}.png`;
  const { data, error } = await supabase.storage
    .from('vehicle-documents')
    .upload(path, blob, { contentType: 'image/png', cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data: publicUrl } = supabase.storage.from('vehicle-documents').getPublicUrl(data.path);
  return { path: data.path, url: publicUrl.publicUrl };
}

export function useDeleteInspection() {
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inspectionId: string) => {
      if (!companyId) throw new Error('تعذر تحديد الشركة');
      const { data: inspection, error: readError } = await supabase
        .from('vehicle_condition_reports')
        .select('id, created_at')
        .eq('id', inspectionId)
        .eq('company_id', companyId)
        .maybeSingle();
      if (readError) throw readError;
      if (!inspection) throw new Error('سجل الفحص غير موجود');
      if (Date.now() - new Date(inspection.created_at).getTime() > 24 * 60 * 60 * 1000) {
        throw new Error('لا يمكن حذف سجل فحص مضى عليه أكثر من 24 ساعة');
      }
      const { error } = await supabase
        .from('vehicle_condition_reports')
        .delete()
        .eq('id', inspectionId)
        .eq('company_id', companyId)
        .select('id')
        .single();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-inspections', companyId] });
      toast({ title: 'تم الحذف', description: 'تم حذف سجل الفحص.' });
    },
    onError: error => {
      toast({
        title: 'تعذر حذف الفحص',
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع.',
        variant: 'destructive',
      });
    },
  });
}
