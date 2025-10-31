import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSystemLogger } from "@/hooks/useSystemLogger";
import { useCurrentCompanyId } from "./useUnifiedCompanyAccess";
import { useMaintenanceJournalIntegration } from "@/hooks/useMaintenanceJournalIntegration";
import { queryKeys } from "@/utils/queryKeys";

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
} from '@/types/vehicle.types';

export const useVehicles = (options?: { limit?: number; status?: string }) => {
  const companyId = useCurrentCompanyId()
  const { limit, status } = options || {}
  
  return useQuery({
    queryKey: queryKeys.vehicles.list({ companyId, status, pageSize: limit }),
    queryFn: async ({ signal }) => { // ✅ Extract signal from query context
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

      return data as Vehicle[]
    },
    enabled: !!companyId,
    staleTime: 3 * 60 * 1000, // 3 minutes cache
  })
}

export const useAvailableVehicles = () => {
  const companyId = useCurrentCompanyId()
  
  return useQuery({
    queryKey: queryKeys.vehicles.available(companyId),
    queryFn: async ({ signal }) => { // ✅ Extract signal from query context
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
    mutationFn: async (vehicleData: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) => {
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
      
      return data
    },
    onSuccess: (data) => {
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
    mutationFn: async ({ id, ...updateData }: Partial<Vehicle> & { id: string }) => {
      const { data, error } = await supabase
        .from("vehicles")
        .update(updateData)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.paginated() })
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

export const useDeleteVehicle = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async (vehicleId: string) => {
      const { error } = await supabase
        .from("vehicles")
        .update({ is_active: false })
        .eq("id", vehicleId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.paginated() })
      toast({
        title: "Success",
        description: "Vehicle deactivated successfully",
      })
    },
    onError: (error) => {
      console.error("Error deactivating vehicle:", error)
      toast({
        title: "Error",
        description: "Failed to deactivate vehicle",
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
    mutationFn: async (pricingData: Omit<VehiclePricing, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("vehicle_pricing")
        .insert([pricingData])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
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
    mutationFn: async (insuranceData: Omit<VehicleInsurance, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("vehicle_insurance")
        .insert([insuranceData])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
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
    staleTime: priority ? 30 * 1000 : 2 * 60 * 1000, // 30s for priority, 2min otherwise
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: priority, // Only auto-refocus for priority
  })
}

export const useCreateVehicleMaintenance = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()
  const { createMaintenanceJournalEntry } = useMaintenanceJournalIntegration()

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
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
    mutationFn: async (maintenanceData: Omit<VehicleMaintenance, 'id' | 'created_at' | 'updated_at' | 'maintenance_number'>) => {
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
      
      // Create journal entry for maintenance
      try {
        await createMaintenanceJournalEntry({
          maintenanceId: data.id,
          amount: data.estimated_cost || 0,
          taxAmount: data.tax_amount || 0,
          isPaid: false,
          description: data.description,
          date: data.scheduled_date || new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to create journal entry for maintenance:', error);
      }
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
  
  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<VehicleMaintenance> & { id: string }) => {
      const { data, error } = await supabase
        .from("vehicle_maintenance")
        .update(updateData)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.maintenance() })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      toast({
        title: "Success",
        description: "Maintenance updated successfully",
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
          company_id_param: companyId,
          contract_start_date: null,
          contract_end_date: null
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
          .in('status', ['available', 'reserved'])
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
        let vehiclePricing: VehiclePricing[] = []
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
          book_value?: number
          accumulated_depreciation?: number
          purchase_cost?: number
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
        let maintenance: Array<VehicleMaintenance & { vehicles?: { plate_number: string } }> = []
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
    mutationFn: async (readingData: Omit<OdometerReading, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("odometer_readings")
        .insert([readingData])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
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
    mutationFn: async (inspectionData: Omit<VehicleInspection, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .insert([inspectionData])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
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
    mutationFn: async (activityData: Omit<VehicleActivityLog, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("vehicle_activity_log")
        .insert([activityData])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.vehicles.all })
      toast({
        title: "نجح",
        description: "تم تسجيل النشاط بنجاح",
      })
    }
  })
}