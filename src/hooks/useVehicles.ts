import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSystemLogger } from "@/hooks/useSystemLogger";
import { useCompanyIdWithInit, useCurrentCompanyId } from "./useUnifiedCompanyAccess";
import { createAuditLog } from "@/hooks/useAuditLog";
import { queryKeys } from "@/utils/queryKeys";
import type { Database } from '@/integrations/supabase/types';
import type {
  Vehicle,
  VehiclePricing,
  VehicleInsurance,
  VehicleMaintenance,
  OdometerReading,
  VehicleInspection,
  TrafficViolation,
  VehicleActivityLog
} from '@/types/vehicle.types';

type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
type VehicleUpdate = Database['public']['Tables']['vehicles']['Update'];
type VehiclePricingInsert = Database['public']['Tables']['vehicle_pricing']['Insert'];
type VehicleInsuranceInsert = Database['public']['Tables']['vehicle_insurance']['Insert'];
type VehicleMaintenanceInsert = Database['public']['Tables']['vehicle_maintenance']['Insert'];
type VehicleMaintenanceUpdate = Database['public']['Tables']['vehicle_maintenance']['Update'];
type VehicleMaintenanceRow = Database['public']['Tables']['vehicle_maintenance']['Row'];
type VehiclePricingRow = Database['public']['Tables']['vehicle_pricing']['Row'];
type OdometerReadingInsert = Database['public']['Tables']['odometer_readings']['Insert'];
type VehicleInspectionInsert = Database['public']['Tables']['vehicle_inspections']['Insert'];
type VehicleActivityInsert = Database['public']['Tables']['vehicle_activity_log']['Insert'];

// Types - Import from centralized vehicle types file
export type {
  Vehicle,
  VehiclePricing,
  VehicleInsurance,
  VehicleMaintenance,
  OdometerReading,
  VehicleInspection,
  TrafficViolation,
  VehicleActivityLog
};

export const useVehicles = (options?: { limit?: number; status?: string }) => {
  const { companyId, isInitializing } = useCompanyIdWithInit()
  const queryClient = useQueryClient()
  const { limit, status } = options || {}

  return useQuery({
    queryKey: queryKeys.vehicles.list({ companyId: companyId ?? undefined, status, pageSize: limit }),
    queryFn: async ({ signal }) => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Fetching vehicles data", level: "info" }); // ✅ Extract signal from query context

      // Wait for initialization to complete before checking companyId
      if (isInitializing) {
        throw new Error('Initializing company context');
      }

      if (!companyId) return []
      
      let query = supabase
        .from("vehicles")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("plate_number")
      
      if (status) {
        query = query.eq("status", status as any) // Type cast for dynamic status filtering
      }
      
      if (limit) {
        query = query.limit(limit)
      }

      // Handle abort signal properly - Supabase doesn't support .abortSignal() directly
      // The signal will be used by React Query's fetch implementation
      const { data, error } = await query

      if (signal?.aborted) {
        throw new Error('Request aborted')
      }

      if (error) {
        console.error("Error fetching vehicles:", error)
        throw error
      }

      if (!data || data.length === 0) {
        return []
      }

      // التحقق من العقود النشطة المرتبطة بالمركبات وتحديث حالة المركبة
      const vehicleIds = data.map(v => v.id)
      const plateNumbers = data.map(v => v.plate_number).filter(Boolean)
      
      // إنشاء خريطة للمركبات بناءً على رقم اللوحة المُطبّع (بدون مسافات)
      const normalizedPlateToVehicleId = new Map<string, string>()
      data.forEach(v => {
        if (v.plate_number) {
          const normalized = v.plate_number.trim().replace(/\s+/g, '')
          normalizedPlateToVehicleId.set(normalized, v.id)
        }
      })

      // إضافة اللوحات القديمة من سجل اللوحات (لتجنب كسر العقود/المخالفات القديمة)
      try {
        const { data: plateHistory } = await supabase
          .from('vehicle_plate_history')
          .select('vehicle_id, old_plate_normalized')
          .eq('company_id', companyId)
          .in('vehicle_id', vehicleIds)

        ;(plateHistory || []).forEach(h => {
          if (h.old_plate_normalized && h.vehicle_id) {
            normalizedPlateToVehicleId.set(h.old_plate_normalized, h.vehicle_id)
          }
        })
      } catch (e) {
        console.warn('⚠️ [useVehicles] Failed to load vehicle plate history:', e)
      }
      
      // جلب جميع العقود المرتبطة بهذه المركبات (باستخدام vehicle_id)
      const { data: contractsByVehicleId, error: contractsError1 } = await supabase
        .from("contracts")
        .select("id, vehicle_id, license_plate, status, start_date, end_date")
        .in("vehicle_id", vehicleIds)
        .eq("company_id", companyId)
        .not("vehicle_id", "is", null)

      // جلب جميع العقود النشطة للشركة (للتصفية بالمطابقة المرنة لرقم اللوحة)
      // هذا ضروري لأن license_plate قد يحتوي على مسافات مختلفة (مثل "185 513" vs "185513")
      const { data: allActiveContracts, error: contractsError2 } = await supabase
        .from("contracts")
        .select("id, vehicle_id, license_plate, status, start_date, end_date")
        .eq("company_id", companyId)
        .eq("status", "active")

      if (contractsError1) {
        console.warn("Error fetching contracts by vehicle_id:", contractsError1)
      }
      if (contractsError2) {
        console.warn("Error fetching all active contracts:", contractsError2)
      }

      // تصفية العقود النشطة التي تتطابق مع أرقام اللوحات (مطابقة مرنة)
      const contractsByPlate = (allActiveContracts || []).filter(contract => {
        if (!contract.license_plate) return false
        const normalizedContractPlate = contract.license_plate.trim().replace(/\s+/g, '')
        return normalizedPlateToVehicleId.has(normalizedContractPlate)
      })

      console.log(`🔍 [useVehicles] Found ${contractsByVehicleId?.length || 0} contracts by vehicle_id, ${contractsByPlate.length} by license_plate`)

      // دمج العقود وإزالة التكرارات
      const allContracts = [
        ...(contractsByVehicleId || []),
        ...contractsByPlate
      ]
      
      // إزالة التكرارات بناءً على id
      const uniqueContracts = Array.from(
        new Map(allContracts.map(c => [c.id, c])).values()
      )
      
      // ربط العقود بالمركبات بناءً على vehicle_id أو license_plate (مطابقة مرنة)
      const contracts = uniqueContracts.map(contract => {
        // التحقق من أن vehicle_id في العقد يطابق إحدى المركبات المطلوبة
        if (contract.vehicle_id && vehicleIds.includes(contract.vehicle_id)) {
          return contract
        }
        
        // إذا كان vehicle_id غير موجود أو لا يطابق أي مركبة
        // ابحث عن المركبة باستخدام license_plate مع مطابقة مرنة (إزالة المسافات)
        const normalizedContractPlate = contract.license_plate?.trim().replace(/\s+/g, '') || ''
        const matchedVehicleId = normalizedPlateToVehicleId.get(normalizedContractPlate)
        
        if (matchedVehicleId) {
          const vehicle = data.find(v => v.id === matchedVehicleId)
          console.log(`🔗 [useVehicles] Matched contract ${contract.id} (vehicle_id: ${contract.vehicle_id || 'null'}, license_plate: '${contract.license_plate}') to vehicle ${vehicle?.plate_number} (${matchedVehicleId}) via normalized plate matching`)
          return {
            ...contract,
            vehicle_id: matchedVehicleId
          }
        }
        
        return contract
      }).filter(c => {
        // إزالة العقود التي لا يمكن ربطها بمركبة من القائمة المطلوبة
        return c.vehicle_id && vehicleIds.includes(c.vehicle_id)
      })

      // إنشاء Map للعقود النشطة لكل مركبة
      const vehicleActiveContractsMap = new Map<string, boolean>()
      if (contracts) {
        const today = new Date()
        today.setHours(0, 0, 0, 0) // تصفير الوقت للمقارنة
        
        console.log(`🔍 [useVehicles] Checking ${contracts.length} contracts for ${vehicleIds.length} vehicles`)
        
        contracts.forEach(contract => {
          if (contract.vehicle_id && contract.status === 'active') {
            const startDate = new Date(contract.start_date)
            startDate.setHours(0, 0, 0, 0)
            const endDate = contract.end_date ? new Date(contract.end_date) : null
            if (endDate) {
              endDate.setHours(0, 0, 0, 0)
            }
            
            // التحقق من أن العقد نشط في التاريخ الحالي
            const isActiveNow = startDate <= today && (endDate === null || endDate >= today)
            
            if (isActiveNow) {
              vehicleActiveContractsMap.set(contract.vehicle_id, true)
              console.log(`✅ [useVehicles] Vehicle ${contract.vehicle_id} has active contract ${contract.id} (${contract.start_date} to ${contract.end_date || 'no end'})`)
            } else {
              console.log(`⚠️ [useVehicles] Contract ${contract.id} for vehicle ${contract.vehicle_id} is active but not in date range (start: ${contract.start_date}, end: ${contract.end_date || 'null'}, today: ${today.toISOString().split('T')[0]})`)
            }
          }
        })
        
        if (vehicleActiveContractsMap.size > 0) {
          console.log(`✅ [useVehicles] Found ${vehicleActiveContractsMap.size} vehicles with active contracts:`, Array.from(vehicleActiveContractsMap.keys()))
        } else {
          console.log(`⚠️ [useVehicles] No vehicles with active contracts found`)
        }
      } else {
        console.log(`⚠️ [useVehicles] No contracts found for vehicles`)
      }

      // تحديث حالة المركبات التي لديها عقود نشطة
      const vehiclesToUpdate: Array<{ id: string; newStatus: 'rented' | 'available' }> = []
      
      const updatedVehicles = data.map(vehicle => {
        const hasActiveContract = vehicleActiveContractsMap.has(vehicle.id)
        
        // إذا كانت المركبة لديها عقد نشط ولكن حالتها ليست "rented"، نحدثها
        if (hasActiveContract && vehicle.status !== 'rented') {
          console.log(`🔄 [useVehicles] Vehicle ${vehicle.plate_number} (${vehicle.id}) has active contract but status is ${vehicle.status}, updating to rented`)
          vehiclesToUpdate.push({ id: vehicle.id, newStatus: 'rented' })
          return {
            ...vehicle,
            status: 'rented' as const
          }
        }
        
        // إذا لم تكن لديها عقد نشط ولكن حالتها "rented"، نعيدها إلى "available"
        if (!hasActiveContract && vehicle.status === 'rented') {
          console.log(`🔄 [useVehicles] Vehicle ${vehicle.plate_number} (${vehicle.id}) has no active contract but status is rented, updating to available`)
          vehiclesToUpdate.push({ id: vehicle.id, newStatus: 'available' })
          return {
            ...vehicle,
            status: 'available' as const
          }
        }
        
        return vehicle
      })

      // تحديث قاعدة البيانات بشكل متزامن قبل إرجاع البيانات
      if (vehiclesToUpdate.length > 0) {
        console.log(`🔄 [useVehicles] Updating ${vehiclesToUpdate.length} vehicle statuses based on active contracts`)
        
        try {
          // تحديث كل مركبة بشكل متزامن
          await Promise.all(
            vehiclesToUpdate.map(({ id, newStatus }) =>
              supabase
                .from("vehicles")
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq("id", id)
                .then(({ error }) => {
                  if (error) {
                    console.warn(`⚠️ [useVehicles] Failed to update vehicle ${id} status:`, error)
                    throw error
                  } else {
                    console.log(`✅ [useVehicles] Updated vehicle ${id} status to ${newStatus}`)
                  }
                })
            )
          )
          console.log(`✅ [useVehicles] Successfully updated ${vehiclesToUpdate.length} vehicle statuses`)
          
          // إعادة جلب البيانات لضمان تحديث الواجهة
          queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.list({ companyId: companyId ?? undefined, status, pageSize: limit }) })
          queryClient.invalidateQueries({ queryKey: ['vehicles'] })
        } catch (err) {
          console.error("❌ [useVehicles] Error updating vehicle statuses:", err)
          // لا نرمي الخطأ هنا، نستمر بإرجاع البيانات المحدثة في الذاكرة
        }
      }

      return updatedVehicles as Vehicle[]
    },
    enabled: !!companyId && !isInitializing,
    staleTime: 3 * 60 * 1000, // 3 minutes cache
  })
}

export const useAvailableVehicles = () => {
  const companyId = useCurrentCompanyId()
  
  return useQuery({
    queryKey: queryKeys.vehicles.available(companyId ?? undefined),
    queryFn: async ({ signal }) => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Fetching vehicles data", level: "info" }); // ✅ Extract signal from query context
      if (!companyId) return []
      
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .eq("status", "available")
        .order("plate_number")

      if (signal?.aborted) {
        throw new Error('Request aborted')
      }

      if (error) {
        console.error("Error fetching available vehicles:", error)
        throw error
      }

      return data as Vehicle[]
    },
    enabled: !!companyId
  })
}

export const useCreateVehicle = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()
  const { log } = useSystemLogger()
  const companyId = useCurrentCompanyId()
  
  return useMutation({
    mutationFn: async (vehicleData: VehicleInsert) => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Vehicle mutation started", level: "info" });
      console.log("🚗 [USE_CREATE_VEHICLE] Starting vehicle creation");
      console.log("📋 [USE_CREATE_VEHICLE] Input data:", vehicleData);
      
      // Additional validation
      if (!vehicleData.company_id) {
        console.error("❌ [USE_CREATE_VEHICLE] Missing company_id");
        throw new Error("معرف الشركة مطلوب");
      }
      
      if (!vehicleData.plate_number) {
        console.error("❌ [USE_CREATE_VEHICLE] Missing plate_number");
        throw new Error("رقم اللوحة مطلوب");
      }
      
      if (!vehicleData.make) {
        console.error("❌ [USE_CREATE_VEHICLE] Missing make");
        throw new Error("الشركة المصنعة مطلوبة");
      }
      
      if (!vehicleData.model) {
        console.error("❌ [USE_CREATE_VEHICLE] Missing model");
        throw new Error("الطراز مطلوب");
      }
      
      // Check if user has permission to create vehicles for this company
      if (vehicleData.company_id !== companyId) {
        console.error("❌ [USE_CREATE_VEHICLE] User company mismatch:", {
          userCompanyId: companyId,
          vehicleCompanyId: vehicleData.company_id
        });
        throw new Error("ليس لديك صلاحية لإنشاء مركبة لهذه الشركة");
      }
      
      console.log("📤 [USE_CREATE_VEHICLE] Inserting vehicle into database");
      
      const { data, error } = await supabase
        .from("vehicles")
        .insert([vehicleData])
        .select()
        .single()

      if (error) {
        console.error("❌ [USE_CREATE_VEHICLE] Database error:", error);
        console.error("❌ [USE_CREATE_VEHICLE] Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Provide more specific error messages based on error codes
        if (error.code === '23505') {
          throw new Error("رقم اللوحة موجود مسبقاً في النظام");
        } else if (error.code === '23503') {
          throw new Error("خطأ في البيانات المرجعية - تأكد من صحة معرف الشركة");
        } else if (error.code === '23502') {
          throw new Error("هناك حقول مطلوبة لم يتم تزويدها");
        } else if (error.message.includes('permission denied') || error.message.includes('RLS')) {
          throw new Error("ليس لديك صلاحية لإنشاء مركبة");
        } else if (error.message.includes('trigger') || error.message.includes('function')) {
          console.warn("⚠️ [USE_CREATE_VEHICLE] Trigger warning, but vehicle may have been created");
          throw new Error("تم إنشاء المركبة ولكن حدث خطأ في المعالجة الإضافية");
        } else {
          throw new Error(`خطأ في قاعدة البيانات: ${error.message}`);
        }
      }
      
      console.log("✅ [USE_CREATE_VEHICLE] Vehicle created successfully:", data);
      
      // Log the vehicle creation
      log.info('fleet', 'create', `تم إنشاء مركبة جديدة ${data.plate_number}`, {
        resource_type: 'vehicle',
        resource_id: data.id,
        metadata: {
          plate_number: data.plate_number,
          make: data.make,
          model: data.model,
          year: data.year,
          status: data.status
        }
      });
      
      // Log audit trail
      await createAuditLog(
        'CREATE',
        'vehicle',
        data.id,
        data.plate_number,
        {
          new_values: {
            plate_number: data.plate_number,
            make: data.make,
            model: data.model,
            year: data.year,
            status: data.status,
            body_type: data.body_type,
          },
          changes_summary: `Created vehicle ${data.plate_number}`,
          metadata: {
            make: data.make,
            model: data.model,
            year: data.year,
          },
          severity: 'medium',
        }
      );
      
      return data
    },
    onSuccess: (data) => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Operation completed successfully", level: "info" });
      console.log("🎉 [USE_CREATE_VEHICLE] Success callback triggered for vehicle:", data.plate_number);
      console.log("🔄 [USE_CREATE_VEHICLE] Invalidating vehicle queries...");
      
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.fleetAnalytics() })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.fleetStatus() })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.paginated() })
      
      // Force a refetch to ensure data is updated immediately
      queryClient.refetchQueries({ queryKey: queryKeys.vehicles.lists() })
      
      console.log("✅ [USE_CREATE_VEHICLE] Success flow completed");
    },
    onError: (error) => {
      console.error("❌ [USE_CREATE_VEHICLE] Error callback triggered");
      console.error("❌ [USE_CREATE_VEHICLE] Error object:", error);
      console.error("❌ [USE_CREATE_VEHICLE] Error stack:", error instanceof Error ? error.stack : "No stack trace");
      
      let errorMessage = "فشل في إنشاء المركبة - خطأ غير معروف";
      
      if (error instanceof Error) {
        console.error("❌ [USE_CREATE_VEHICLE] Error message:", error.message);
        errorMessage = error.message;
      }
      
      // Don't show toast here if it's already handled in the form
      console.log("⚠️ [USE_CREATE_VEHICLE] Error handled, message:", errorMessage);
    }
  })
}

export const useUpdateVehicle = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }: VehicleUpdate & { id: string }) => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Vehicle mutation started", level: "info" });
      // Get old data before update
      const { data: oldData } = await supabase
        .from("vehicles")
        .select('plate_number, status, make, model')
        .eq("id", id)
        .single()
      
      const { data, error } = await supabase
        .from("vehicles")
        .update(updateData)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return { data, oldData }
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.paginated() })
      
      // Log audit trail
      await createAuditLog(
        'UPDATE',
        'vehicle',
        result.data.id,
        result.data.plate_number,
        {
          old_values: {
            status: result.oldData?.status,
          },
          new_values: {
            status: result.data.status,
          },
          changes_summary: `Updated vehicle ${result.data.plate_number}`,
          metadata: {
            make: result.data.make,
            model: result.data.model,
            status_changed: result.oldData?.status !== result.data.status,
          },
          severity: 'medium',
        }
      );
      
      toast({
        title: "Success",
        description: "Vehicle updated successfully",
      })
    },
    onError: (error) => {
      console.error("Error updating vehicle:", error)
      toast({
        title: "Error",
        description: "Failed to update vehicle",
        variant: "destructive",
      })
    }
  })
}

// -----------------------------------------------------------------------------
// Vehicle Plate History & Official Plate Change
// -----------------------------------------------------------------------------

function normalizePlateNumberForHistory(plate: string): string {
  return (plate || '').trim().replace(/\s+/g, '').toUpperCase();
}

export type VehiclePlateChangeType = 'correction' | 'traffic_authority_change';

export const useVehiclePlateHistory = (vehicleId?: string) => {
  const { companyId, isInitializing } = useCompanyIdWithInit();

  return useQuery({
    queryKey: ['vehicle-plate-history', companyId, vehicleId],
    enabled: !!companyId && !!vehicleId && !isInitializing,
    queryFn: async () => {
      if (!companyId || !vehicleId) return [];
      const { data, error } = await supabase
        .from('vehicle_plate_history')
        .select('id, old_plate_number, new_plate_number, change_type, changed_at, notes')
        .eq('company_id', companyId)
        .eq('vehicle_id', vehicleId)
        .order('changed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Change plate number officially (traffic authority change).
 * This records history (old->new) then updates vehicles.plate_number.
 * Old plate remains searchable/matchable to prevent breaking historical data.
 */
export const useChangeVehiclePlateFromTrafficAuthority = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { companyId, isInitializing } = useCompanyIdWithInit();

  return useMutation({
    mutationFn: async (params: { vehicleId: string; newPlateNumber: string; notes?: string | null }) => {
      if (isInitializing) throw new Error('Initializing company context');
      if (!companyId) throw new Error('Company ID not found');

      const newPlate = (params.newPlateNumber || '').trim();
      if (!newPlate) throw new Error('رقم اللوحة الجديد مطلوب');

      const { data: currentVehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, plate_number, company_id')
        .eq('id', params.vehicleId)
        .eq('company_id', companyId)
        .single();

      if (vehicleError) throw vehicleError;

      const oldPlate = (currentVehicle?.plate_number || '').trim();
      if (!oldPlate) throw new Error('لا يوجد رقم لوحة حالي للمركبة');
      if (normalizePlateNumberForHistory(oldPlate) === normalizePlateNumberForHistory(newPlate)) {
        throw new Error('رقم اللوحة الجديد مطابق للحالي');
      }

      // Record history first
      const { error: historyError } = await supabase
        .from('vehicle_plate_history')
        .insert({
          company_id: companyId,
          vehicle_id: params.vehicleId,
          old_plate_number: oldPlate,
          old_plate_normalized: normalizePlateNumberForHistory(oldPlate),
          new_plate_number: newPlate,
          new_plate_normalized: normalizePlateNumberForHistory(newPlate),
          change_type: 'traffic_authority_change' as VehiclePlateChangeType,
          changed_by: user?.id ?? null,
          notes: params.notes ?? null,
        });

      if (historyError) throw historyError;

      // Update vehicle plate
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ plate_number: newPlate })
        .eq('id', params.vehicleId)
        .eq('company_id', companyId);

      if (updateError) throw updateError;

      return { vehicleId: params.vehicleId, oldPlate, newPlate };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all });
      queryClient.invalidateQueries({ queryKey: ['vehicle-plate-history'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });

      await createAuditLog(
        'UPDATE',
        'vehicle',
        result.vehicleId,
        result.newPlate,
        {
          old_values: { plate_number: result.oldPlate },
          new_values: { plate_number: result.newPlate },
          changes_summary: `Official plate change (traffic authority): ${result.oldPlate} -> ${result.newPlate}`,
          severity: 'high',
        }
      );

      toast({
        title: 'تم تغيير رقم اللوحة',
        description: `تم ربط اللوحة القديمة (${result.oldPlate}) بالمركبة لضمان سلامة البيانات القديمة.`,
      });
    },
    onError: (error: any) => {
      console.error('Error changing vehicle plate:', error);
      toast({
        title: 'تعذر تغيير رقم اللوحة',
        description: error?.message || 'حدث خطأ غير معروف',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteVehicle = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const companyId = useCurrentCompanyId()
  
  return useMutation({
    mutationFn: async (vehicleId: string) => {
      if (!companyId) throw new Error('Company ID not found')
      Sentry.addBreadcrumb({ category: "vehicles", message: "Vehicle deletion started", level: "info" });
      const { data: vehicleData, error: vehicleError } = await supabase
        .from("vehicles")
        .select('plate_number, make, model, year, vin, fixed_asset_id')
        .eq("id", vehicleId)
        .eq("company_id", companyId)
        .single()
      if (vehicleError) throw vehicleError

      const relatedChecks = await Promise.all([
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('vehicle_id', vehicleId).eq('company_id', companyId),
        supabase.from('contract_vehicles').select('id', { count: 'exact', head: true }).eq('vehicle_id', vehicleId).eq('company_id', companyId),
        supabase.from('vehicle_maintenance').select('id', { count: 'exact', head: true }).eq('vehicle_id', vehicleId).eq('company_id', companyId),
        supabase.from('traffic_violations').select('id', { count: 'exact', head: true }).eq('vehicle_id', vehicleId).eq('company_id', companyId),
        supabase.from('vehicle_installments').select('id', { count: 'exact', head: true }).eq('vehicle_id', vehicleId).eq('company_id', companyId),
      ])
      const relatedError = relatedChecks.find((result) => result.error)?.error
      if (relatedError) throw relatedError
      const relatedCount = relatedChecks.reduce((sum, result) => sum + (result.count || 0), 0)
      if (vehicleData.fixed_asset_id || relatedCount > 0) {
        throw new Error('لا يمكن حذف مركبة مرتبطة بأصل ثابت أو عقود أو صيانة أو مخالفات أو أقساط. عطّل المركبة للحفاظ على السجل التشغيلي والمالي.')
      }

      const { data: deletedVehicle, error } = await supabase
        .from("vehicles")
        .delete()
        .eq("id", vehicleId)
        .eq("company_id", companyId)
        .select('id')
        .single()

      if (error) throw error
      if (!deletedVehicle) throw new Error('Vehicle not found in the current company')
      
      return { vehicleId, vehicleData }
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.paginated() })
      
      // Log audit trail
      const vehicleName = `${result.vehicleData?.make} ${result.vehicleData?.model} (${result.vehicleData?.plate_number})`
      
      await createAuditLog(
        'DELETE',
        'vehicle',
        result.vehicleId,
        vehicleName,
        {
          old_values: {
            plate_number: result.vehicleData?.plate_number,
            make: result.vehicleData?.make,
            model: result.vehicleData?.model,
            year: result.vehicleData?.year,
            vin: result.vehicleData?.vin,
          },
          new_values: undefined,
          changes_summary: `Permanently deleted vehicle ${vehicleName}`,
          severity: 'critical',
        }
      )
      
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف المركبة نهائياً من النظام",
      })
    },
    onError: (error) => {
      console.error("Error deleting vehicle:", error)
      toast({
        title: "خطأ",
        description: "فشل في حذف المركبة",
        variant: "destructive",
      })
    }
  })
}

// Vehicle Pricing Hooks
export const useVehiclePricing = (vehicleId: string) => {
  return useQuery({
    queryKey: queryKeys.vehicles.pricing(vehicleId),
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Fetching vehicles data", level: "info" });
      const { data, error } = await supabase
        .from("vehicle_pricing")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("effective_from", { ascending: false })

      if (error) throw error
      return data as VehiclePricing[]
    },
    enabled: !!vehicleId
  })
}

export const useCreateVehiclePricing = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (pricingData: VehiclePricingInsert) => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Vehicle mutation started", level: "info" });
      const { data, error } = await supabase
        .from("vehicle_pricing")
        .insert([pricingData])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Operation completed successfully", level: "info" });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.pricing(data.vehicle_id) })
      toast({
        title: "Success",
        description: "Vehicle pricing created successfully",
      })
    }
  })
}

// Vehicle Insurance Hooks
export const useVehicleInsurance = (vehicleId: string) => {
  return useQuery({
    queryKey: queryKeys.vehicles.insurance(vehicleId),
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Fetching vehicles data", level: "info" });
      const { data, error } = await supabase
        .from("vehicle_insurance")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .eq("is_active", true)
        .order("start_date", { ascending: false })

      if (error) throw error
      return data as VehicleInsurance[]
    },
    enabled: !!vehicleId
  })
}

export const useCreateVehicleInsurance = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (insuranceData: VehicleInsuranceInsert) => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Vehicle mutation started", level: "info" });
      const { data, error } = await supabase
        .from("vehicle_insurance")
        .insert([insuranceData])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Operation completed successfully", level: "info" });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.insurance(data.vehicle_id) })
      toast({
        title: "Success",
        description: "Vehicle insurance created successfully",
      })
    }
  })
}

// Vehicle Maintenance Hooks - Performance Optimized
export const useVehicleMaintenance = (vehicleId?: string, options?: {
  limit?: number;
  status?: string;
  priority?: boolean;
}) => {
  const { user } = useAuth()
  const { limit = 50, status, priority = false } = options || {}
  
  return useQuery({
    queryKey: queryKeys.vehicles.maintenance(vehicleId),
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Fetching vehicles data", level: "info" });
      if (!user?.profile?.company_id) return []
      
      let query = supabase
        .from("vehicle_maintenance")
        .select(`
          id,
          maintenance_number,
          maintenance_type,
          priority,
          status,
          scheduled_date,
          actual_cost,
          estimated_cost,
          description,
          created_at,
          vehicle_id,
          vehicles!inner(plate_number, make, model)
        `)
        .eq("company_id", user.profile.company_id)

      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId)
      }
      
      if (status) {
        // Map status values properly
        const statusValue = status === 'inProgress' ? 'in_progress' : status;
        query = query.eq("status", statusValue as any) // Type cast for dynamic status filtering
      }
      
      // Add ordering and limit
      query = query.order("created_at", { ascending: false }).limit(limit)

      const { data, error } = await query

      if (error) throw error
      return data as any[]
    },
    enabled: !!user?.profile?.company_id,
    staleTime: priority ? 30 * 1000 : 5 * 60 * 1000, // 30s for priority, 5min otherwise (increased)
    gcTime: 10 * 60 * 1000, // 10 minutes cache (increased)
    refetchOnWindowFocus: false, // Disabled for better performance
  })
}

export const useCreateVehicleMaintenance = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Fetching vehicles data", level: "info" });
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });
  
  return useMutation({
    mutationFn: async (maintenanceData: Omit<VehicleMaintenanceInsert, 'maintenance_number'>) => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Vehicle mutation started", level: "info" });
      // Generate maintenance number
      const { data: maintenanceNumber, error: numberError } = await supabase
        .rpc('generate_maintenance_number', { company_id_param: maintenanceData.company_id })

      if (numberError) throw numberError

      // Get maintenance cost center if not provided
      let costCenterId = maintenanceData.cost_center_id;
      if (!costCenterId && profile?.company_id) {
        const { data: defaultCostCenter } = await supabase.rpc('get_maintenance_cost_center', {
          company_id_param: profile.company_id
        });
        costCenterId = defaultCostCenter;
      }

      const { data, error } = await supabase
        .from("vehicle_maintenance")
        .insert([{ 
          ...maintenanceData, 
          maintenance_number: maintenanceNumber,
          cost_center_id: costCenterId 
        }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.maintenance() })
      
      // Log audit trail
      await createAuditLog(
        'CREATE',
        'maintenance',
        data.id,
        data.maintenance_number,
        {
          new_values: {
            maintenance_number: data.maintenance_number,
            vehicle_id: data.vehicle_id,
            maintenance_type: data.maintenance_type,
            estimated_cost: data.estimated_cost,
            scheduled_date: data.scheduled_date,
          },
          changes_summary: `Created maintenance ${data.maintenance_number}`,
          metadata: {
            maintenance_type: data.maintenance_type,
            estimated_cost: data.estimated_cost,
            description: data.description,
          },
          severity: 'medium',
        }
      )
      
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      toast({
        title: "نجح",
        description: "تم إنشاء طلب الصيانة بنجاح",
      })
    }
  })
}

export const useUpdateVehicleMaintenance = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const companyId = useCurrentCompanyId()
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }: VehicleMaintenanceUpdate & { id: string }) => {
      if (!companyId) throw new Error('Company ID not found')
      Sentry.addBreadcrumb({ category: "vehicles", message: "Vehicle mutation started", level: "info" });
      // Get old data before update
      const { data: oldData } = await supabase
        .from("vehicle_maintenance")
        .select('maintenance_number, status, estimated_cost, actual_cost')
        .eq("id", id)
        .eq("company_id", companyId)
        .single()
      
      const { data, error } = await supabase
        .from("vehicle_maintenance")
        .update(updateData)
        .eq("id", id)
        .eq("company_id", companyId)
        .select()
        .single()

      if (error) throw error
      return { data, oldData }
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.maintenance() })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      
      // Log audit trail
      await createAuditLog(
        'UPDATE',
        'maintenance',
        result.data.id,
        result.data.maintenance_number,
        {
          old_values: {
            status: result.oldData?.status,
            estimated_cost: result.oldData?.estimated_cost,
            actual_cost: result.oldData?.actual_cost,
          },
          new_values: {
            status: result.data.status,
            estimated_cost: result.data.estimated_cost,
            actual_cost: result.data.actual_cost,
          },
          changes_summary: `Updated maintenance ${result.data.maintenance_number}`,
          metadata: {
            maintenance_type: result.data.maintenance_type,
          },
          severity: 'medium',
        }
      )
      
      toast({
        title: "نجح",
        description: "تم تحديث طلب الصيانة بنجاح",
      })
    }
  })
}

export const useDeleteVehicleMaintenance = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const companyId = useCurrentCompanyId()
  
  return useMutation({
    mutationFn: async ({ maintenanceId }: { maintenanceId: string; vehicleId?: string }) => {
      if (!companyId) throw new Error('Company ID not found')
      Sentry.addBreadcrumb({ category: "vehicles", message: "Vehicle mutation started", level: "info" });
      const { data: maintenance, error: fetchError } = await supabase
        .from("vehicle_maintenance")
        .select("maintenance_number, vehicle_id, status, maintenance_type, estimated_cost, journal_entry_id, expense_recorded")
        .eq("id", maintenanceId)
        .eq("company_id", companyId)
        .single()

      if (fetchError) throw fetchError
      if (maintenance.journal_entry_id || maintenance.expense_recorded) {
        throw new Error('لا يمكن إلغاء صيانة مرتبطة بقيد محاسبي دون إجراء عكس محاسبي معتمد.')
      }

      const { error } = await supabase
        .from("vehicle_maintenance")
        .update({ status: 'cancelled' })
        .eq("id", maintenanceId)
        .eq("company_id", companyId)
        .neq("status", 'cancelled')

      if (error) throw error

      return { success: true, maintenanceId, maintenance }
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.maintenance() })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      queryClient.invalidateQueries({ queryKey: ['maintenance-vehicles'] })
      
      // Log audit trail
      await createAuditLog(
        'UPDATE',
        'maintenance',
        result.maintenanceId,
        result.maintenance.maintenance_number,
        {
          old_values: {
            maintenance_number: result.maintenance.maintenance_number,
            vehicle_id: result.maintenance.vehicle_id,
            status: result.maintenance.status,
            maintenance_type: result.maintenance.maintenance_type,
            estimated_cost: result.maintenance.estimated_cost,
          },
          new_values: { status: 'cancelled' },
          changes_summary: `Cancelled maintenance ${result.maintenance.maintenance_number}`,
          metadata: {
            maintenance_type: result.maintenance.maintenance_type,
          },
          severity: 'high',
        }
      )
      
      toast({
        title: "تم بنجاح",
        description: "تم إلغاء طلب الصيانة مع الاحتفاظ بسجله",
      })
    },
    onError: (error: any) => {
      console.error("Error cancelling maintenance:", error)
      toast({
        title: "خطأ",
        description: error.message || "فشل في إلغاء طلب الصيانة",
        variant: "destructive",
      })
    }
  })
}

// Add new hooks for enhanced fleet management
export const useProcessVehicleDepreciation = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Fetching vehicles data", level: "info" });
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  return useMutation({
    mutationFn: async (date?: string) => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Vehicle mutation started", level: "info" });
      if (!profile?.company_id) {
        throw new Error('Company ID not found');
      }

      const { data, error } = await supabase.rpc('process_vehicle_depreciation', {
        company_id_param: profile.company_id,
        depreciation_date_param: date || new Date().toISOString().split('T')[0]
      })

      if (error) throw error
      return data
    },
    onSuccess: (processedCount) => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Operation completed successfully", level: "info" });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      queryClient.invalidateQueries({ queryKey: ["fixed-assets"] })
      queryClient.invalidateQueries({ queryKey: ["depreciation-records"] })
      toast({
        title: "Success",
        description: `Processed depreciation for ${processedCount} vehicles.`,
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process vehicle depreciation: " + error.message,
        variant: "destructive",
      })
    },
  })
}

// استعلام المركبات المتاحة للعقود - محسن لـ super admin
export const useAvailableVehiclesForContracts = (companyId?: string) => {
  const { log } = useSystemLogger();
  
  return useQuery({
    queryKey: queryKeys.vehicles.availableForContracts(companyId),
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Fetching vehicles data", level: "info" });
      log.info('vehicles', 'fetch_available_for_contracts', `استعلام المركبات للشركة ${companyId}`, {
        resource_type: 'vehicle',
        metadata: { companyId, timestamp: Date.now() }
      });

      if (!companyId) {
        console.warn('🚨 [useAvailableVehiclesForContracts] لا يوجد companyId - إرجاع مصفوفة فارغة');
        return [];
      }

      console.log('🔄 [useAvailableVehiclesForContracts] بدء استعلام المركبات المتاحة للعقود:', { 
        companyId,
        timestamp: new Date().toISOString()
      });

      try {
        // استخدام الدالة المحدثة الموحدة
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_available_vehicles_for_contracts', {
          company_id_param: companyId
        });

        if (!rpcError && rpcData) {
          console.log('✅ [useAvailableVehiclesForContracts] نجح RPC function:', {
            count: rpcData.length,
            companyId,
            sampleVehicles: rpcData.slice(0, 3).map(v => ({ 
              id: v.id, 
              plate_number: v.plate_number,
              company_id: v.company_id
            }))
          });
          return rpcData;
        }

        console.warn('⚠️ [useAvailableVehiclesForContracts] RPC function فشل، استخدام fallback:', {
          error: rpcError,
          companyId
        });

        // Fallback إلى direct query
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('vehicles')
          .select(`
            id,
            plate_number,
            make,
            model,
            year,
            color,
            status,
            daily_rate,
            weekly_rate,
            monthly_rate,
            minimum_rental_price,
            enforce_minimum_price,
            company_id
          `)
          .eq('company_id', companyId)
          .eq('is_active', true)
          .eq('status', 'available')
          .order('plate_number');

        if (fallbackError) {
          console.error('❌ [useAvailableVehiclesForContracts] خطأ في fallback query:', {
            error: fallbackError,
            companyId
          });
          throw fallbackError;
        }

        console.log('✅ [useAvailableVehiclesForContracts] نجح fallback query:', {
          count: fallbackData?.length || 0,
          companyId,
          sampleVehicles: fallbackData?.slice(0, 3)?.map(v => ({ 
            id: v.id, 
            plate_number: v.plate_number,
            company_id: v.company_id
          })) || []
        });

        return fallbackData || [];

      } catch (error) {
        console.error('❌ [useAvailableVehiclesForContracts] خطأ شامل:', {
          error,
          companyId,
          message: error instanceof Error ? error.message : 'خطأ غير معروف'
        });
        throw error;
      }
    },
    enabled: !!companyId,
    retry: 2,
    retryDelay: 1000,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });
};

// Hook for fleet analytics and reports
export const useFleetAnalytics = (companyId?: string) => {
  return useQuery({
    queryKey: queryKeys.vehicles.fleetAnalytics(companyId),
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Fetching vehicles data", level: "info" });
      if (!companyId) throw new Error("Company ID is required")

      console.log("Starting fleet analytics fetch for company:", companyId)

      try {
        // First, get basic vehicle data
        const { data: vehicles, error: vehiclesError } = await supabase
          .from("vehicles")
          .select("*")
          .eq("company_id", companyId)
          .eq("is_active", true)

        if (vehiclesError) {
          console.error("Error fetching vehicles:", vehiclesError)
          throw vehiclesError
        }

        console.log("Fetched vehicles:", vehicles?.length || 0)

        // Get vehicle pricing data separately
        let vehiclePricing: Pick<VehiclePricingRow, 'vehicle_id' | 'daily_rate' | 'weekly_rate' | 'monthly_rate'>[] = []
        if (vehicles && vehicles.length > 0) {
          const { data: pricingData, error: pricingError } = await supabase
            .from("vehicle_pricing")
            .select("vehicle_id, daily_rate, weekly_rate, monthly_rate")
            .in("vehicle_id", vehicles.map(v => v.id))
            .eq("is_active", true)

          if (pricingError) {
            console.warn("Error fetching vehicle pricing:", pricingError)
          } else {
            vehiclePricing = pricingData || []
          }
        }

        console.log("Fetched vehicle pricing:", vehiclePricing.length)

        // Get fixed assets data separately
        let fixedAssets: Array<{
          id: string
          book_value: number | null
          accumulated_depreciation: number | null
          purchase_cost: number | null
        }> = []
        if (vehicles && vehicles.length > 0) {
          const { data: assetsData, error: assetsError } = await supabase
            .from("fixed_assets")
            .select("id, book_value, accumulated_depreciation, purchase_cost")
            .eq("company_id", companyId)
            .eq("is_active", true)

          if (assetsError) {
            console.warn("Error fetching fixed assets:", assetsError)
          } else {
            fixedAssets = assetsData || []
          }
        }

        console.log("Fetched fixed assets:", fixedAssets.length)

        // Get maintenance statistics
        let maintenance: Array<VehicleMaintenanceRow & { vehicles: { plate_number: string } | null }> = []
        if (vehicles && vehicles.length > 0) {
          const { data: maintenanceData, error: maintenanceError } = await supabase
            .from("vehicle_maintenance")
            .select("*, vehicles(plate_number)")
            .in("vehicle_id", vehicles.map(v => v.id))

          if (maintenanceError) {
            console.warn("Error fetching maintenance data:", maintenanceError)
          } else {
            maintenance = maintenanceData || []
          }
        }

        console.log("Fetched maintenance records:", maintenance.length)

        // Calculate analytics
        const totalVehicles = vehicles?.length || 0
        const availableVehicles = vehicles?.filter(v => v.status === 'available').length || 0
        const maintenanceVehicles = vehicles?.filter(v => v.status === 'maintenance').length || 0
        const rentedVehicles = vehicles?.filter(v => v.status === 'rented').length || 0

        // Calculate total book value from fixed assets
        const totalBookValue = fixedAssets.reduce((sum, asset) => {
          return sum + (asset.book_value || 0)
        }, 0)

        // Calculate total depreciation from fixed assets
        const totalDepreciation = fixedAssets.reduce((sum, asset) => {
          return sum + (asset.accumulated_depreciation || 0)
        }, 0)

        // Calculate monthly maintenance cost
        const monthlyMaintenanceCost = maintenance
          ?.filter(m => {
            if (!m.scheduled_date) return false
            const date = new Date(m.scheduled_date)
            const now = new Date()
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
          })
          .reduce((sum, m) => sum + (m.estimated_cost || 0), 0) || 0

        // Combine vehicles with their pricing data
        const vehiclesWithPricing = vehicles?.map(vehicle => {
          const pricing = vehiclePricing.find(p => p.vehicle_id === vehicle.id)
          return {
            ...vehicle,
            daily_rate: pricing?.daily_rate || 0,
            weekly_rate: pricing?.weekly_rate || 0,
            monthly_rate: pricing?.monthly_rate || 0,
          }
        }) || []

        const result = {
          totalVehicles,
          availableVehicles,
          maintenanceVehicles,
          rentedVehicles,
          totalBookValue,
          totalDepreciation,
          monthlyMaintenanceCost,
          utilizationRate: totalVehicles > 0 ? ((rentedVehicles / totalVehicles) * 100) : 0,
          maintenanceRate: totalVehicles > 0 ? ((maintenanceVehicles / totalVehicles) * 100) : 0,
          vehicles: vehiclesWithPricing,
          maintenance: maintenance,
        }

        console.log("Fleet analytics result:", result)
        return result

      } catch (error) {
        console.error("Error in fleet analytics:", error)
        throw error
      }
    },
    enabled: !!companyId,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hooks for enhanced fleet management features

// Odometer Readings Hooks
export const useOdometerReadings = (vehicleId?: string) => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.vehicles.odometerReadings(vehicleId),
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Fetching vehicles data", level: "info" });
      if (!user?.profile?.company_id) return []
      
      let query = supabase
        .from("odometer_readings")
        .select(`
          *,
          vehicles!inner(plate_number, make, model)
        `)
        .eq("company_id", user.profile.company_id)
        .order("reading_date", { ascending: false })

      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as any[]
    },
    enabled: !!user?.profile?.company_id
  })
}

export const useCreateOdometerReading = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (readingData: OdometerReadingInsert) => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Vehicle mutation started", level: "info" });
      const { data, error } = await supabase
        .from("odometer_readings")
        .insert([readingData])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Operation completed successfully", level: "info" });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      toast({
        title: "نجح",
        description: "تم تسجيل قراءة العداد بنجاح",
      })
    }
  })
}

// Vehicle Inspections Hooks
export const useVehicleInspections = (vehicleId?: string) => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.vehicles.inspections(vehicleId),
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Fetching vehicles data", level: "info" });
      if (!user?.profile?.company_id) return []
      
      let query = supabase
        .from("vehicle_inspections")
        .select(`
          *,
          vehicles!inner(plate_number, make, model)
        `)
        .eq("company_id", user.profile.company_id)
        .order("inspection_date", { ascending: false })

      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as any[]
    },
    enabled: !!user?.profile?.company_id
  })
}

export const useCreateVehicleInspection = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (inspectionData: VehicleInspectionInsert) => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Vehicle mutation started", level: "info" });
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .insert([inspectionData])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Operation completed successfully", level: "info" });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      toast({
        title: "نجح",
        description: "تم تسجيل تقييم المركبة بنجاح",
      })
    }
  })
}

// Traffic Violations Hook - temporariliy disabled until database types are updated
// Will be implemented in Phase 2 with proper TypeScript integration

// Vehicle Activity Log Hooks
export const useVehicleActivityLog = (vehicleId?: string) => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.vehicles.activityLog(vehicleId),
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Fetching vehicles data", level: "info" });
      if (!user?.profile?.company_id) return []
      
      let query = supabase
        .from("vehicle_activity_log")
        .select(`
          *,
          vehicles!inner(plate_number, make, model),
          cost_centers(center_name, center_name_ar)
        `)
        .eq("company_id", user.profile.company_id)
        .order("activity_date", { ascending: false })

      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as any[]
    },
    enabled: !!user?.profile?.company_id
  })
}

export const useCreateVehicleActivity = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (activityData: VehicleActivityInsert) => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Vehicle mutation started", level: "info" });
      const { data, error } = await supabase
        .from("vehicle_activity_log")
        .insert([activityData])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      Sentry.addBreadcrumb({ category: "vehicles", message: "Operation completed successfully", level: "info" });
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      toast({
        title: "نجح",
        description: "تم تسجيل النشاط بنجاح",
      })
    }
  })
}
