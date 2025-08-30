import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentCompanyId } from './useUnifiedCompanyAccess';

export interface VehicleStatusUpdate {
  vehicleId: string;
  newStatus: 'available' | 'rented' | 'maintenance' | 'out_of_service' | 'reserved';
  reason?: string;
  maintenanceId?: string;
}

// Hook to update vehicle status and ensure Fleet/Maintenance integration
export const useVehicleStatusUpdate = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const companyId = useCurrentCompanyId();

  return useMutation({
    mutationFn: async ({ vehicleId, newStatus, reason, maintenanceId }: VehicleStatusUpdate) => {
      console.log(`🔄 Updating vehicle ${vehicleId} status to ${newStatus}`);
      
      const { data, error } = await supabase
        .from('vehicles')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating vehicle status:', error);
        throw error;
      }

      // If moving to maintenance, optionally link to maintenance record
      if (newStatus === 'maintenance' && maintenanceId) {
        const { error: maintenanceError } = await supabase
          .from('vehicle_maintenance')
          .update({ status: 'in_progress' })
          .eq('id', maintenanceId);

        if (maintenanceError) {
          console.warn('⚠️ Could not update maintenance record status:', maintenanceError);
        }
      }

      return data;
    },
    onSuccess: (data, variables) => {
      const { vehicleId, newStatus } = variables;
      
      console.log(`✅ Vehicle ${vehicleId} status updated to ${newStatus}`);
      
      // Invalidate all relevant queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['vehicles-paginated', companyId] });
      queryClient.invalidateQueries({ queryKey: ['vehicles', companyId] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-vehicles', companyId] });
      queryClient.invalidateQueries({ queryKey: ['available-vehicles-maintenance', companyId] });
      queryClient.invalidateQueries({ queryKey: ['fleet-status', companyId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance'] });

      // Show appropriate toast message
      if (newStatus === 'maintenance') {
        toast({
          title: "تم نقل المركبة للصيانة",
          description: `تم نقل المركبة ${data.plate_number} إلى قسم الصيانة وستختفي من قائمة الأسطول حتى انتهاء الصيانة`
        });
      } else if (newStatus === 'available') {
        toast({
          title: "تم إكمال الصيانة",
          description: `تم إرجاع المركبة ${data.plate_number} إلى قائمة الأسطول المتاح`
        });
      } else {
        toast({
          title: "تم تحديث حالة المركبة",
          description: `تم تغيير حالة المركبة ${data.plate_number} إلى ${getStatusLabel(newStatus)}`
        });
      }
    },
    onError: (error: any) => {
      console.error('❌ Failed to update vehicle status:', error);
      toast({
        title: "خطأ في تحديث حالة المركبة",
        description: error.message || "حدث خطأ أثناء تحديث حالة المركبة",
        variant: "destructive"
      });
    }
  });
};

// Helper function to get status label in Arabic
const getStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    available: 'متاحة',
    rented: 'مؤجرة',
    maintenance: 'قيد الصيانة',
    out_of_service: 'خارج الخدمة',
    reserved: 'محجوزة'
  };
  return statusLabels[status] || status;
};

// Hook specifically for scheduling maintenance (moves vehicle to maintenance status)
export const useScheduleMaintenanceStatus = () => {
  const vehicleStatusUpdate = useVehicleStatusUpdate();

  return useMutation({
    mutationFn: async ({ vehicleId, maintenanceId }: { vehicleId: string; maintenanceId?: string }) => {
      return vehicleStatusUpdate.mutateAsync({
        vehicleId,
        newStatus: 'maintenance',
        reason: 'Scheduled for maintenance',
        maintenanceId
      });
    }
  });
};

// Hook specifically for completing maintenance (returns vehicle to available status)
export const useCompleteMaintenanceStatus = () => {
  const vehicleStatusUpdate = useVehicleStatusUpdate();

  return useMutation({
    mutationFn: async ({ vehicleId, maintenanceId }: { vehicleId: string; maintenanceId?: string }) => {
      // First complete the maintenance record
      if (maintenanceId) {
        const { error: maintenanceError } = await supabase
          .from('vehicle_maintenance')
          .update({ 
            status: 'completed',
            completed_date: new Date().toISOString()
          })
          .eq('id', maintenanceId);

        if (maintenanceError) {
          throw new Error(`Failed to complete maintenance record: ${maintenanceError.message}`);
        }
      }

      // Then return vehicle to available status
      return vehicleStatusUpdate.mutateAsync({
        vehicleId,
        newStatus: 'available',
        reason: 'Maintenance completed'
      });
    }
  });
};