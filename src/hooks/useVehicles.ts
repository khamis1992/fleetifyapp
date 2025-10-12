import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { useSystemLogger } from "@/hooks/useSystemLogger"
import { useCurrentCompanyId } from "./useUnifiedCompanyAccess"

export interface Vehicle {
  id: string
  company_id: string
  category_id?: string
  plate_number: string
  make: string
  model: string
  year: number
  color?: string
  color_ar?: string
  vin_number?: string
  registration_number?: string
  insurance_policy?: string
  insurance_expiry?: string
  license_expiry?: string
  status?: 'available' | 'rented' | 'maintenance' | 'out_of_service' | 'reserved'
  odometer_reading?: number
  fuel_level?: number
  location?: string
  daily_rate?: number
  weekly_rate?: number
  monthly_rate?: number
  deposit_amount?: number
  notes?: string
  images?: any[]
  features?: any[]
  is_active?: boolean
  created_at: string
  updated_at: string
  // Enhanced vehicle fields
  vin?: string
  engine_number?: string
  fuel_capacity?: number
  seating_capacity?: number
  transmission_type?: string
  drive_type?: string
  vehicle_category?: string
  registration_date?: string
  registration_expiry?: string
  inspection_due_date?: string
  warranty_start_date?: string
  warranty_end_date?: string
  current_location?: string
  gps_tracking_device?: string
  safety_features?: any[]
  entertainment_features?: any[]
  comfort_features?: any[]
  vehicle_condition?: string
  fuel_type?: string
  ownership_status?: string
  lease_start_date?: string
  lease_end_date?: string
  monthly_lease_amount?: number
  lease_company?: string
  expected_depreciation_rate?: number
  total_fuel_cost?: number
  average_fuel_consumption?: number
  total_distance_km?: number
  vehicle_documents?: any[]
  emergency_contact_info?: any
  maintenance_schedule?: any[]
  performance_metrics?: any
  // Legacy fields for backward compatibility
  transmission?: string
  body_type?: string
  current_mileage?: number
  last_service_mileage?: number
  next_service_mileage?: number
  purchase_date?: string
  purchase_cost?: number
  useful_life_years?: number
  residual_value?: number
  depreciation_method?: string
  annual_depreciation_rate?: number
  accumulated_depreciation?: number
  book_value?: number
  fixed_asset_id?: string
  cost_center_id?: string
  last_maintenance_date?: string
  // Additional financial integration fields
  journal_entry_id?: string
  salvage_value?: number
  // Minimum pricing fields
  minimum_rental_price?: number
  minimum_daily_rate?: number
  minimum_weekly_rate?: number
  minimum_monthly_rate?: number
  enforce_minimum_price?: boolean
}

export interface VehiclePricing {
  id: string
  vehicle_id: string
  daily_rate: number
  weekly_rate: number
  monthly_rate: number
  annual_rate: number
  daily_rate_min?: number
  daily_rate_max?: number
  weekly_rate_min?: number
  weekly_rate_max?: number
  monthly_rate_min?: number
  monthly_rate_max?: number
  annual_rate_min?: number
  annual_rate_max?: number
  extra_km_charge?: number
  included_km_daily?: number
  included_km_weekly?: number
  included_km_monthly?: number
  included_km_annual?: number
  security_deposit?: number
  currency: string
  effective_from: string
  effective_to?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Enhanced pricing fields from migration
  mileage_limit_daily?: number
  mileage_limit_weekly?: number
  mileage_limit_monthly?: number
  excess_mileage_rate?: number
  late_return_hourly_rate?: number
  cleaning_fee?: number
  fuel_policy?: string
  cancellation_fee?: number
  peak_season_multiplier?: number
  weekend_multiplier?: number
}

export interface VehicleInsurance {
  id: string
  vehicle_id: string
  insurance_company: string
  policy_number: string
  coverage_type: string
  coverage_amount?: number
  deductible_amount?: number
  premium_amount: number
  start_date: string
  end_date: string
  status: 'active' | 'expired' | 'cancelled' | 'pending'
  contact_person?: string
  contact_phone?: string
  contact_email?: string
  policy_document_url?: string
  notes?: string
  is_active: boolean
}

export interface VehicleMaintenance {
  id: string
  vehicle_id: string
  company_id: string
  maintenance_number: string
  maintenance_type: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  scheduled_date?: string
  started_date?: string
  completed_date?: string
  estimated_cost?: number
  actual_cost?: number
  mileage_at_service?: number
  service_provider?: string
  service_provider_contact?: string
  warranty_until?: string
  parts_replaced?: string[]
  cost_center_id?: string
  invoice_id?: string
  journal_entry_id?: string
  created_by?: string
  assigned_to?: string
  notes?: string
  attachments?: any[]
}

// New interfaces for enhanced fleet management
export interface OdometerReading {
  id: string
  vehicle_id: string
  company_id: string
  reading_date: string
  odometer_reading: number
  fuel_level_percentage?: number
  notes?: string
  recorded_by?: string
  location?: string
  photo_url?: string
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface VehicleInspection {
  id: string
  vehicle_id: string
  company_id: string
  inspection_date: string
  inspector_name: string
  inspection_type: string
  overall_condition: string
  mileage_at_inspection?: number
  engine_condition?: string
  transmission_condition?: string
  brake_condition?: string
  tire_condition?: string
  battery_condition?: string
  lights_condition?: string
  ac_condition?: string
  interior_condition?: string
  exterior_condition?: string
  safety_equipment_status?: string
  identified_issues?: string[]
  repair_recommendations?: string[]
  estimated_repair_cost?: number
  next_inspection_due?: string
  inspection_certificate_url?: string
  photos?: any[]
  is_passed: boolean
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface TrafficViolation {
  id: string
  vehicle_id: string
  company_id: string
  violation_number: string
  violation_date: string
  violation_time?: string
  violation_type: string
  violation_description?: string
  location?: string
  fine_amount: number
  late_fee?: number
  total_amount: number
  currency: string
  issuing_authority?: string
  officer_name?: string
  status: 'pending' | 'paid' | 'appealed' | 'cancelled' | 'overdue'
  due_date?: string
  paid_date?: string
  payment_method?: string
  payment_reference?: string
  discount_applied?: number
  driver_name?: string
  driver_license?: string
  driver_phone?: string
  court_date?: string
  court_status?: string
  appeal_date?: string
  appeal_status?: string
  vehicle_impounded: boolean
  impound_location?: string
  impound_release_date?: string
  photos?: any[]
  documents?: any[]
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface VehicleActivityLog {
  id: string
  vehicle_id: string
  company_id: string
  activity_type: string
  description?: string
  activity_date: string
  activity_time?: string
  mileage?: number
  location?: string
  performed_by?: string
  cost_amount?: number
  cost_center_id?: string
  reference_document?: string
  notes?: string
  created_at: string
  updated_at: string
}

export const useVehicles = (options?: { limit?: number; status?: string }) => {
  const companyId = useCurrentCompanyId()
  const { limit, status } = options || {}
  
  return useQuery({
    queryKey: ["vehicles", companyId, limit, status],
    queryFn: async () => {
      if (!companyId) return []
      
      let query = supabase
        .from("vehicles")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("plate_number")
      
      if (status) {
        query = query.eq("status", status)
      }
      
      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query

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
    queryKey: ["available-vehicles", companyId],
    queryFn: async () => {
      if (!companyId) return []
      
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .eq("status", "available")
        .order("plate_number")

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
      queryClient.invalidateQueries({ queryKey: ["vehicles", companyId] })
      queryClient.invalidateQueries({ queryKey: ["available-vehicles", companyId] })
      queryClient.invalidateQueries({ queryKey: ["fleet-analytics"] })
      queryClient.invalidateQueries({ queryKey: ["fleet-status"] })
      queryClient.invalidateQueries({ queryKey: ["vehicles-paginated"] })
      
      // Force a refetch to ensure data is updated immediately
      queryClient.refetchQueries({ queryKey: ["vehicles", companyId] })
      
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
      queryClient.invalidateQueries({ queryKey: ["vehicles"] })
      queryClient.invalidateQueries({ queryKey: ["available-vehicles"] })
      queryClient.invalidateQueries({ queryKey: ["vehicles-paginated"] })
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
      queryClient.invalidateQueries({ queryKey: ["vehicles"] })
      queryClient.invalidateQueries({ queryKey: ["available-vehicles"] })
      queryClient.invalidateQueries({ queryKey: ["vehicles-paginated"] })
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
    queryKey: ["vehicle-pricing", vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_pricing")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .eq("is_active", true)
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
      queryClient.invalidateQueries({ queryKey: ["vehicle-pricing", data.vehicle_id] })
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
    queryKey: ["vehicle-insurance", vehicleId],
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
      queryClient.invalidateQueries({ queryKey: ["vehicle-insurance", data.vehicle_id] })
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
    queryKey: ["vehicle-maintenance", vehicleId, user?.profile?.company_id, status, limit],
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
        .order("created_at", { ascending: false })
        .limit(limit)

      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId)
      }
      
      if (status) {
        query = query.eq("status", status)
      }

      const { data, error } = await query

      if (error) throw error
      return data as any[]
    },
    enabled: !!user?.profile?.company_id,
    staleTime: priority ? 0 : 2 * 60 * 1000, // 2 minutes for non-priority
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  })
}

export const useCreateVehicleMaintenance = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-maintenance"] })
      queryClient.invalidateQueries({ queryKey: ["vehicles"] })
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
      queryClient.invalidateQueries({ queryKey: ["vehicle-maintenance"] })
      queryClient.invalidateQueries({ queryKey: ["vehicles"] })
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
      queryClient.invalidateQueries({ queryKey: ["vehicles"] })
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
    queryKey: ['available-vehicles-for-contracts', companyId],
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
    queryKey: ["fleet-analytics", companyId],
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
        let vehiclePricing: any[] = []
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
        let fixedAssets: any[] = []
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
        let maintenance: any[] = []
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
    queryKey: ["odometer-readings", vehicleId, user?.profile?.company_id],
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
      queryClient.invalidateQueries({ queryKey: ["odometer-readings"] })
      queryClient.invalidateQueries({ queryKey: ["vehicles"] })
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
    queryKey: ["vehicle-inspections", vehicleId, user?.profile?.company_id],
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
      queryClient.invalidateQueries({ queryKey: ["vehicle-inspections"] })
      queryClient.invalidateQueries({ queryKey: ["vehicles"] })
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
    queryKey: ["vehicle-activity-log", vehicleId, user?.profile?.company_id],
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
      queryClient.invalidateQueries({ queryKey: ["vehicle-activity-log"] })
      queryClient.invalidateQueries({ queryKey: ["vehicles"] })
      toast({
        title: "نجح",
        description: "تم تسجيل النشاط بنجاح",
      })
    }
  })
}