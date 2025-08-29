import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VehicleConditionReport {
  id: string;
  company_id: string;
  dispatch_permit_id?: string; // Optional for contract reports
  vehicle_id: string;
  inspector_id: string;
  inspection_type: 'pre_dispatch' | 'post_dispatch' | 'contract_inspection';
  overall_condition: 'excellent' | 'good' | 'fair' | 'poor';
  mileage_reading?: number;
  fuel_level?: number;
  inspection_date: string;
  notes?: string;
  photos: string[];
  condition_items: Record<string, any>;
  damage_points: any[];
  inspector_signature?: string;
  customer_signature?: string;
  status: 'pending' | 'approved' | 'requires_attention';
  created_at: string;
  updated_at: string;
}

export interface CreateConditionReportData {
  dispatch_permit_id?: string | null; // Optional for contract reports
  vehicle_id: string;
  inspection_type: 'pre_dispatch' | 'post_dispatch' | 'contract_inspection';
  overall_condition: 'excellent' | 'good' | 'fair' | 'poor';
  mileage_reading?: number;
  fuel_level?: number;
  notes?: string;
  condition_items: Record<string, any>;
  damage_points?: any[];
  photos?: string[];
  contract_id?: string | null; // Optional for contract reports
}

export interface UpdateConditionReportData {
  overall_condition?: 'excellent' | 'good' | 'fair' | 'poor';
  mileage_reading?: number;
  fuel_level?: number;
  notes?: string;
  condition_items?: Record<string, any>;
  damage_points?: any[];
  photos?: string[];
  inspector_signature?: string;
  customer_signature?: string;
  status?: 'pending' | 'approved' | 'requires_attention';
}

export const useVehicleConditionReports = (permitId?: string) => {
  return useQuery({
    queryKey: ['vehicle-condition-reports', permitId],
    queryFn: async () => {
      if (!permitId) return [];
      
      const { data, error } = await supabase
        .from('vehicle_condition_reports')
        .select('*')
        .eq('dispatch_permit_id', permitId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching condition reports:', error);
        throw error;
      }

      return (data || []) as VehicleConditionReport[];
    },
    enabled: !!permitId,
  });
};

export const useCreateConditionReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportData: CreateConditionReportData) => {
      console.log('Creating condition report with data:', reportData);
      
      // Validate required fields
      if (!reportData.vehicle_id) {
        throw new Error('معرف المركبة مطلوب');
      }
      
      if (!reportData.inspection_type) {
        throw new Error('نوع الفحص مطلوب');
      }

      // Validate mileage if provided
      if (reportData.mileage_reading !== undefined && reportData.mileage_reading <= 0) {
        throw new Error('قراءة العداد يجب أن تكون أكبر من 0');
      }

      // Validate fuel level if provided
      if (reportData.fuel_level !== undefined && (reportData.fuel_level < 0 || reportData.fuel_level > 100)) {
        throw new Error('مستوى الوقود يجب أن يكون بين 0 و 100');
      }

      // Get user's company_id first
      const userResult = await supabase.auth.getUser();
      if (!userResult.data.user?.id) {
        throw new Error('يجب تسجيل الدخول أولاً');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', userResult.data.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw new Error('فشل في الحصول على بيانات المستخدم');
      }

      if (!profile?.company_id) {
        throw new Error('لم يتم العثور على بيانات الشركة للمستخدم');
      }

      // Prepare the data for insertion
      const insertData = {
        ...reportData,
        dispatch_permit_id: reportData.dispatch_permit_id || null,
        contract_id: reportData.contract_id || null,
        company_id: profile.company_id,
        inspector_id: userResult.data.user.id,
      };

      console.log('Inserting condition report data:', insertData);

      // Create the condition report
      const { data, error } = await supabase
        .from('vehicle_condition_reports')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('Error creating condition report:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        console.error('Data that failed:', JSON.stringify(insertData, null, 2));
        
        // Provide more specific error messages
        if (error.message?.includes('invalid input value')) {
          throw new Error('خطأ في البيانات المدخلة. تحقق من صحة جميع الحقول');
        } else if (error.message?.includes('permission denied') || error.code === '42501') {
          throw new Error('غير مصرح لك بإنشاء تقارير حالة المركبات');
        } else if (error.message?.includes('foreign key') || error.code === '23503') {
          throw new Error('المركبة المحددة غير موجودة أو غير صحيحة');
        } else if (error.message?.includes('duplicate key') || error.code === '23505') {
          throw new Error('يوجد تقرير حالة مسبق لهذه المركبة والعقد');
        } else if (error.message?.includes('null value') || error.code === '23502') {
          throw new Error('بعض الحقول المطلوبة فارغة');
        }
        
        throw new Error(`فشل في إنشاء تقرير حالة المركبة: ${error.message || 'خطأ غير محدد'}`);
      }

      // Update vehicle's odometer reading if mileage is provided
      if (reportData.mileage_reading && reportData.vehicle_id) {
        console.log('Updating vehicle odometer reading:', reportData.mileage_reading);
        
        const { error: vehicleUpdateError } = await supabase
          .from('vehicles')
          .update({
            odometer_reading: reportData.mileage_reading,
            current_mileage: reportData.mileage_reading,
            updated_at: new Date().toISOString()
          })
          .eq('id', reportData.vehicle_id);

        if (vehicleUpdateError) {
          console.error('Error updating vehicle odometer:', vehicleUpdateError);
          // Don't throw error here - condition report was created successfully
          // Just log the error and continue
        } else {
          console.log('Vehicle odometer updated successfully');
        }
      }

      console.log('Condition report created successfully:', data);
      return data as VehicleConditionReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-condition-reports'] });
      toast.success('تم إنشاء تقرير حالة المركبة بنجاح');
    },
    onError: (error: any) => {
      console.error('Error creating condition report:', error);
      const errorMessage = error.message || 'فشل في إنشاء تقرير حالة المركبة';
      toast.error(errorMessage);
    },
  });
};

export const useUpdateConditionReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateConditionReportData }) => {
      console.log('Updating condition report:', id, updates);
      
      // Get the current session to ensure authentication
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        throw new Error('يجب تسجيل الدخول لتحديث تقرير حالة المركبة');
      }

      console.log('Authenticated user:', session.session.user.id);
      
      const { data, error } = await supabase
        .from('vehicle_condition_reports')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating condition report:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Provide more specific error messages
        if (error.message?.includes('permission denied') || error.code === '42501') {
          throw new Error('غير مصرح لك بتحديث تقارير حالة المركبات. تحقق من صلاحياتك.');
        } else if (error.message?.includes('row level security')) {
          throw new Error('لا يمكنك تحديث هذا التقرير. تأكد من أنك مالك التقرير.');
        } else if (error.message?.includes('foreign key') || error.code === '23503') {
          throw new Error('بيانات غير صحيحة في التقرير');
        }
        
        throw new Error(`فشل في تحديث تقرير حالة المركبة: ${error.message || 'خطأ غير محدد'}`);
      }

      console.log('Update successful:', data);
      return data as VehicleConditionReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-condition-reports'] });
      toast.success('تم تحديث تقرير حالة المركبة بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating condition report:', error);
      const errorMessage = error.message || 'فشل في تحديث تقرير حالة المركبة';
      toast.error(errorMessage);
    },
  });
};

export const useCreateConditionReportForPermit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ permitId, inspectionType = 'pre_dispatch' }: { 
      permitId: string; 
      inspectionType?: 'pre_dispatch' | 'post_dispatch' 
    }) => {
      console.log('Creating condition report for permit:', permitId, inspectionType);
      
      // Use the database function to create the report
      const { data, error } = await supabase
        .rpc('create_condition_report_for_permit', {
          permit_id_param: permitId,
          inspection_type_param: inspectionType
        });

      if (error) {
        console.error('Error creating condition report for permit:', error);
        throw error;
      }

      // Fetch the created report
      const { data: reportData, error: fetchError } = await supabase
        .from('vehicle_condition_reports')
        .select('*')
        .eq('id', data)
        .single();

      if (fetchError) {
        console.error('Error fetching created report:', fetchError);
        throw fetchError;
      }

      console.log('Created report:', reportData);
      return reportData as VehicleConditionReport;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-condition-reports'] });
      toast.success('Vehicle condition report created successfully');
    },
    onError: (error) => {
      console.error('Error creating condition report for permit:', error);
      toast.error('Failed to create condition report');
    },
  });
};